import {
  GREEN_END_COL,
  isBuildingProp,
  MAP_COLS,
  MAP_ROWS,
  TILE_SIZE,
  YELLOW_END_COL,
  type BiomeId,
  type ChestKind,
  type MapId,
  type Point,
  type PropKind,
  type RoadNetworkMeta,
  type SecurityZone,
  type TileType,
  type WorldChest,
  type WorldData,
  type WorldLandmark,
  type WorldProp,
} from "./types.ts";

function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2D(ix: number, iy: number, seed: number): number {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function valueNoise2D(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);

  const a = hash2D(ix, iy, seed);
  const b = hash2D(ix + 1, iy, seed);
  const c = hash2D(ix, iy + 1, seed);
  const d = hash2D(ix + 1, iy + 1, seed);

  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fbm(x: number, y: number, seed: number): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    value += amp * valueNoise2D(x * freq, y * freq, seed + i * 97);
    freq *= 2;
    amp *= 0.5;
  }
  return value;
}

export function generateOpenWorld(seed = 202611, mapId: MapId = "vietnam"): WorldData {
  const isJapan = mapId === "japan";
  const effectiveSeed = isJapan ? (seed ^ 0x4a504e) >>> 0 : seed;
  const cols = MAP_COLS;
  const rows = MAP_ROWS;
  const total = cols * rows;
  const rng = createRng(effectiveSeed);

  const tiles = Array.from<TileType>({ length: total });
  const puddleUnderlay = Array.from<TileType>({ length: total }).fill("grass");
  const biomes = Array.from<BiomeId>({ length: total });
  const securityZones = Array.from<SecurityZone>({ length: total });
  const collision = new Uint8Array(total);
  const reserved = new Uint8Array(total);
  const props: WorldProp[] = [];
  const chests: WorldChest[] = [];
  const lilypads: Point[] = [];

  // Visual Biome boundaries (expanded +50% across Yellow & Red loot zones):
  // City [2..55], Plains [56..138], Countryside [139..201]
  const CITY_END_COL = 55;
  const PLAINS_END_COL = 138;

  // Gameplay Security Zones (from types.ts):
  // - Green (Safe): [0..31] (32 cols — home, shops, collection hall, airport, hospital, police)
  // - Yellow (Standard / Majority): [32..141] (110 cols, +50.7% larger)
  // - Red (High Risk / Rich Loot): [142..203] (62 cols, +51.2% larger) -> total loot area +50.9%

  // 1. Base regional terrain (City / Plains / Countryside) & Security Zones
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const secZone: SecurityZone =
        col <= GREEN_END_COL ? "green" : col <= YELLOW_END_COL ? "yellow" : "red";
      securityZones[idx] = secZone;
      const isBorder = col <= 1 || row <= 1 || col >= cols - 2 || row >= rows - 2;
      if (isBorder) {
        tiles[idx] = "water";
        biomes[idx] = col <= CITY_END_COL ? "city" : col <= PLAINS_END_COL ? "plains" : "countryside";
        collision[idx] = 1;
        reserved[idx] = 1;
        continue;
      }

      const zone: BiomeId =
        col <= CITY_END_COL ? "city" : col <= PLAINS_END_COL ? "plains" : "countryside";
      biomes[idx] = zone;
      collision[idx] = 0;

      if (zone === "city") {
        tiles[idx] = "grass";
        continue;
      }

      const elevation = fbm(col * 0.068, row * 0.068, effectiveSeed);
      const moisture = fbm(col * 0.085 + 42, row * 0.085 + 42, effectiveSeed + 409);

      if (zone === "plains") {
        // Plains: broad open meadow & soft grass with sparse shoreline water pockets
        if (elevation < 0.23) {
          tiles[idx] = "water";
        } else if (elevation < 0.28) {
          tiles[idx] = "sand";
        } else if (elevation > 0.52) {
          tiles[idx] = "meadow";
        } else {
          tiles[idx] = "grass";
        }
      } else {
        // Countryside: lush woods, deep greens, natural ponds
        if (elevation < 0.25) {
          tiles[idx] = "water";
        } else if (elevation < 0.305) {
          tiles[idx] = "sand";
        } else if (moisture > 0.48) {
          tiles[idx] = "forest";
        } else if (elevation > 0.56) {
          tiles[idx] = "meadow";
        } else {
          tiles[idx] = "grass";
        }
      }
    }
  }

  // 2. Sculpt scenic lakes & parks across all 3 zones (guaranteeing puddle + lake swim/wade!)
  const carvePond = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    withSandRim: boolean,
  ): void => {
    for (let r = Math.floor(cy - ry - 2); r <= Math.ceil(cy + ry + 2); r++) {
      for (let c = Math.floor(cx - rx - 2); c <= Math.ceil(cx + rx + 2); c++) {
        if (c <= 2 || r <= 2 || c >= cols - 3 || r >= rows - 3) continue;
        const norm = Math.hypot((c - cx) / rx, (r - cy) / ry);
        const idx = r * cols + c;
        if (norm <= 1.0) {
          tiles[idx] = "water";
          collision[idx] = 0;
          reserved[idx] = 1;
        } else if (withSandRim && norm <= 1.24) {
          tiles[idx] = "sand";
          collision[idx] = 0;
          reserved[idx] = 1;
        }
      }
    }
  };

  const carveSandbarIslet = (cx: number, cy: number, rx: number, ry: number): void => {
    for (let r = Math.floor(cy - ry - 1); r <= Math.ceil(cy + ry + 1); r++) {
      for (let c = Math.floor(cx - rx - 1); c <= Math.ceil(cx + rx + 1); c++) {
        if (c <= 2 || r <= 2 || c >= cols - 3 || r >= rows - 3) continue;
        if (Math.hypot((c - cx) / rx, (r - cy) / ry) <= 1.0) {
          const idx = r * cols + c;
          tiles[idx] = "sand";
          collision[idx] = 0;
          reserved[idx] = 1;
        }
      }
    }
  };

  if (isJapan) {
    // Japan Yellow Plains: Scenic Koi & Bamboo Lakes across expanded col 56..138
    carvePond(70, 26, 5.6, 4.2, true);
    carvePond(74, 66, 4.8, 3.6, true);
    carvePond(104, 48, 5.2, 3.8, true);
    carvePond(124, 24, 4.6, 3.4, true);
    carvePond(126, 64, 4.6, 3.4, true);
  } else {
    // Hanoi Map: Extra-Wide Red River (Sông Hồng) running N-S through Yellow Zone + 2 wide scenic branches
    const paintRiverDisk = (cx: number, cy: number, radius: number, sandRim = 1.0): void => {
      const rMin = Math.floor(cy - radius - sandRim - 1);
      const rMax = Math.ceil(cy + radius + sandRim + 1);
      const cMin = Math.floor(cx - radius - sandRim - 1);
      const cMax = Math.ceil(cx + radius + sandRim + 1);
      for (let r = rMin; r <= rMax; r++) {
        for (let c = cMin; c <= cMax; c++) {
          if (c <= 2 || r <= 2 || c >= cols - 3 || r >= rows - 3) continue;
          const dist = Math.hypot(c - cx, r - cy);
          const idx = r * cols + c;
          if (dist <= radius) {
            tiles[idx] = "water";
            collision[idx] = 0;
            reserved[idx] = 1;
          } else if (dist <= radius + sandRim && tiles[idx] !== "water") {
            tiles[idx] = "sand";
            collision[idx] = 0;
            reserved[idx] = 1;
          }
        }
      }
    };

    // Main River (Sông Hồng): flows full North -> South (~10-11 tiles wide!)
    for (let r = 2; r <= rows - 3; r++) {
      const mainCenterC = 92 + Math.sin((r - 12) * 0.08) * 4.0;
      paintRiverDisk(mainCenterC, r, 5.0, 0.9);
    }

    // Branch 1 (Nhánh Tây Nam): wide river arm splitting West around row 50 -> lotus bay at (63, 49)
    for (let c = 63; c <= 93; c++) {
      const brRow = 50 + Math.sin((c - 63) * 0.14) * 2.8;
      paintRiverDisk(c, brRow, 3.2, 0.8);
    }
    carvePond(63, 49, 4.8, 3.8, true);

    // Branch 2 (Nhánh Đông Bắc): wide river arm splitting East around row 27 -> delta lagoon at (128, 25)
    for (let c = 95; c <= 128; c++) {
      const brRow = 27 + Math.sin((c - 95) * 0.13) * 2.6;
      paintRiverDisk(c, brRow, 3.2, 0.8);
    }
    carvePond(128, 25, 4.8, 3.8, true);

    // 3 Mid-River Sandbar Treasure Islets (Bãi Giữa Sông Hồng + 2 Cồn Nhánh Sông)
    carveSandbarIslet(95, 40, 2.0, 1.8);  // Bãi Giữa Sông Hồng (midway between Cầu Bắc & Cầu Nam)
    carveSandbarIslet(64, 49, 1.6, 1.4);  // Cồn Đảo Nhánh Tây
    carveSandbarIslet(128, 25, 1.6, 1.4); // Cồn Đảo Nhánh Đông
  }

  // Countryside (Expanded Red Zone col 142..201): 4 Scenic Alpine / Forest Lakes with Mid-Lake Treasure Islets
  carvePond(158, 25, 5.0, 3.8, true);
  carveSandbarIslet(158, 25, 1.5, 1.3);

  carvePond(158, 60, 5.0, 3.8, true);
  carveSandbarIslet(158, 60, 1.5, 1.3);

  carvePond(184, 25, 5.2, 3.8, true);
  carveSandbarIslet(184, 25, 1.5, 1.3);

  carvePond(185, 61, 6.0, 4.4, true);
  carveSandbarIslet(185, 61, 2.4, 1.6);

  // 3. Carve City Park Blocks BEFORE laying asphalt roads so roads cut cleanly around parks
  const carveParkBlock = (
    c0: number,
    r0: number,
    c1: number,
    r1: number,
    hasLake: boolean,
  ): void => {
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const idx = r * cols + c;
        tiles[idx] = "meadow";
        collision[idx] = 0;
      }
    }
    // Crisp stone promenade paths inside the park
    const midC = Math.floor((c0 + c1) / 2);
    const midR = Math.floor((r0 + r1) / 2);
    for (let c = c0 + 1; c <= c1 - 1; c++) {
      tiles[midR * cols + c] = "stone";
      reserved[midR * cols + c] = 1;
    }
    for (let r = r0 + 1; r <= r1 - 1; r++) {
      tiles[r * cols + midC] = "stone";
      reserved[r * cols + midC] = 1;
    }
    if (hasLake) {
      carvePond(midC, midR + 1, 2.3, 2.1, false);
      // Little wooden park footbridge horizontally across center
      for (let c = midC - 2; c <= midC + 2; c++) {
        const idx = midR * cols + c;
        if (tiles[idx] === "water") {
          tiles[idx] = "bridge";
        }
      }
    }
  };

  // Parks inside Safe Green Zone & Yellow Border:
  carveParkBlock(15, 19, 23, 30, true);  // Park 1: Safe North Lake Park / Tokyo Koi Zen Garden
  carveParkBlock(3, 42, 10, 58, false);  // Park 2: Safe West Breeze Park / Asakusa Bamboo Garden
  carveParkBlock(15, 42, 23, 49, false); // Park 3: Green Safe Central Plaza / Sakura Torii Promenade (Spawn!)
  carveParkBlock(28, 65, 36, 77, false); // Park 4: South Border Pocket Park

  if (isJapan) {
    // Japanese Zen dry-sand gravel courtyard borders in West Asakusa Bamboo Garden & North Koi Park
    for (let r = 44; r <= 56; r++) {
      for (let c = 4; c <= 9; c++) {
        if (tiles[r * cols + c] === "meadow") {
          tiles[r * cols + c] = (r + c) % 4 === 0 ? "sand" : "meadow";
        }
      }
    }
    for (let r = 20; r <= 29; r++) {
      for (let c = 16; c <= 22; c++) {
        if ((r === 20 || r === 29) && tiles[r * cols + c] === "meadow") {
          tiles[r * cols + c] = "sand";
        }
      }
    }
  }

  // 4. City Asphalt Road Network + Cross-Plains Boulevard + Dirt Patrol Trails
  const roadNetwork: RoadNetworkMeta = {
    horizontalRoads: isJapan
      ? [
          { row: 16, startCol: 4, endCol: 54 },
          { row: 39, startCol: 4, endCol: 139 }, // Grand Avenue connecting Tokyo -> Samurai Plains East
          { row: 62, startCol: 4, endCol: 54 },
        ]
      : [
          { row: 16, startCol: 4, endCol: 54 },
          { row: 39, startCol: 4, endCol: 83 }, // West Grand Avenue ending at Sông Hồng West Bank
          { row: 39, startCol: 104, endCol: 139 }, // East Boulevard resuming past Sông Hồng
          { row: 62, startCol: 4, endCol: 54 },
        ],
    verticalRoads: [
      { col: 12, startRow: 6, endRow: 75 },
      { col: 25, startRow: 6, endRow: 75 },
      { col: 38, startRow: 6, endRow: 75 },
      { col: 52, startRow: 6, endRow: 75 }, // Yellow Urban East Street
    ],
  };

  const paintSidewalkAround = (col: number, row: number): void => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nc = col + dx;
        const nr = row + dy;
        if (nc <= 2 || nr <= 2 || nc >= cols - 3 || nr >= rows - 3) continue;
        const idx = nr * cols + nc;
        if (tiles[idx] !== "road" && tiles[idx] !== "water" && tiles[idx] !== "bridge") {
          tiles[idx] = "sidewalk";
          collision[idx] = 0;
          reserved[idx] = 1;
        }
      }
    }
  };

  const carveDirtCorridorTile = (c: number, r: number, preserveAsphalt = false): void => {
    if (c <= 2 || r <= 2 || c >= cols - 3 || r >= rows - 3) return;
    const idx = r * cols + c;
    if (tiles[idx] === "water") {
      tiles[idx] = "bridge";
    } else if (!preserveAsphalt || (tiles[idx] !== "road" && tiles[idx] !== "sidewalk")) {
      tiles[idx] = "dirt";
    }
    collision[idx] = 0;
    reserved[idx] = 1;
  };

  const carveHorizontalDirtTrail = (
    rowTop: number,
    startCol: number,
    endCol: number,
    wobbleAmplitude = 0,
  ): void => {
    for (let c = startCol; c <= endCol; c++) {
      const wobble =
        wobbleAmplitude > 0 && c > startCol + 2 ? Math.round(Math.sin(c * 0.22) * wobbleAmplitude) : 0;
      for (let dy = 0; dy <= 1; dy++) {
        carveDirtCorridorTile(c, rowTop + wobble + dy, wobbleAmplitude === 0);
      }
    }
  };

  const carveVerticalDirtTrail = (colLeft: number, startRow: number, endRow: number): void => {
    for (let r = startRow; r <= endRow; r++) {
      for (let dx = 0; dx <= 1; dx++) {
        carveDirtCorridorTile(colLeft + dx, r, true);
      }
    }
  };

  // Paint 2-lane horizontal asphalt roads
  for (const hr of roadNetwork.horizontalRoads) {
    for (let c = hr.startCol; c <= hr.endCol; c++) {
      for (let r = hr.row; r <= hr.row + 1; r++) {
        const idx = r * cols + c;
        tiles[idx] = "road";
        collision[idx] = 0;
        reserved[idx] = 1;
      }
    }
  }

  // Paint 2-lane vertical asphalt streets
  for (const vr of roadNetwork.verticalRoads) {
    for (let r = vr.startRow; r <= vr.endRow; r++) {
      for (let c = vr.col; c <= vr.col + 1; c++) {
        const idx = r * cols + c;
        tiles[idx] = "road";
        collision[idx] = 0;
        reserved[idx] = 1;
      }
    }
  }

  // Add sidewalks bordering all asphalt roads
  for (let row = 3; row < rows - 3; row++) {
    for (let col = 3; col < cols - 3; col++) {
      if (tiles[row * cols + col] === "road") {
        paintSidewalkAround(col, row);
      }
    }
  }

  // Plains dirt patrol corridors (+50% expanded Yellow Plains col 55..140)
  if (isJapan) {
    carveHorizontalDirtTrail(17, 55, 140); // North Samurai Trail
    carveHorizontalDirtTrail(65, 55, 140); // South Samurai Trail
    carveVerticalDirtTrail(68, 12, 75);    // West Kyoto Trail
    carveVerticalDirtTrail(94, 12, 75);    // Central Samurai Trail
    carveVerticalDirtTrail(116, 12, 75);   // East Kyoto Trail
    carveVerticalDirtTrail(135, 12, 75);   // Yellow-Red Foothill Road
  } else {
    // Hanoi Yellow Plains: 2 widely separated East-West bridge corridors across Sông Hồng
    // Bridge 1 (Cầu Bắc): row 14..16 (3-tile wide grand bridge), Bridge 2 (Cầu Nam): row 67..69 (53 tiles apart!)
    carveHorizontalDirtTrail(15, 55, 140);
    carveHorizontalDirtTrail(68, 55, 140);
    // Widen both grand river bridges to 3 tiles thick across the Main River water span
    for (const [bridgeRowTop, minC, maxC] of [
      [14, 82, 104],
      [67, 79, 99],
    ] as const) {
      for (let c = minC; c <= maxC; c++) {
        const hasWaterInSpan =
          tiles[bridgeRowTop * cols + c] === "water" ||
          tiles[(bridgeRowTop + 1) * cols + c] === "water" ||
          tiles[(bridgeRowTop + 2) * cols + c] === "water" ||
          tiles[(bridgeRowTop + 1) * cols + c] === "bridge" ||
          tiles[(bridgeRowTop + 2) * cols + c] === "bridge";
        if (!hasWaterInSpan) continue;
        for (let r = bridgeRowTop; r <= bridgeRowTop + 2; r++) {
          const idx = r * cols + c;
          tiles[idx] = "bridge";
          collision[idx] = 0;
          reserved[idx] = 1;
        }
      }
    }
    // Dry-land N-S connectors staying completely clear of both river branches (ZERO accidental 3rd bridge!)
    carveVerticalDirtTrail(56, 14, 72);    // West Plains Ring Road (West of Branch 1 cove)
    carveVerticalDirtTrail(78, 14, 41);    // North-West Riverside Connector (Cầu Bắc <-> Grand Ave)
    carveVerticalDirtTrail(76, 58, 71);    // South-West Riverside Connector (South of Branch 1 <-> Cầu Nam)
    carveVerticalDirtTrail(106, 39, 71);   // Central-East Riverside Connector (East Blvd <-> Cầu Nam)
    carveVerticalDirtTrail(135, 14, 72);   // East Plains Ring Road (East of Branch 2 lagoon, Cầu Bắc <-> East Blvd <-> Cầu Nam)
  }

  // Red Zone arterial dirt highway + patrol loop network (expanded +51%, col 140..200)
  carveHorizontalDirtTrail(39, 140, 199, 1.0); // Main East-West Red Artery continuing from East Boulevard
  carveHorizontalDirtTrail(18, 140, 199);      // North Red Patrol Trail
  carveHorizontalDirtTrail(69, 140, 199);      // South Red Patrol Trail
  carveVerticalDirtTrail(151, 13, 75);         // West Red N-S Trail
  carveVerticalDirtTrail(170, 13, 75);         // Central Red N-S Trail (clear of all 4 Red Zone lakes)
  carveVerticalDirtTrail(198, 13, 75);         // Deep East Red N-S Trail

  // Convert inner shoreline edges of all water bodies into walkable "shallow" wade rim!
  const waterSnapshot = tiles.slice();
  for (let row = 2; row < rows - 2; row++) {
    for (let col = 2; col < cols - 2; col++) {
      const idx = row * cols + col;
      if (waterSnapshot[idx] !== "water") continue;
      const touchesLand =
        waterSnapshot[(row - 1) * cols + col] !== "water" ||
        waterSnapshot[(row + 1) * cols + col] !== "water" ||
        waterSnapshot[row * cols + (col - 1)] !== "water" ||
        waterSnapshot[row * cols + (col + 1)] !== "water";
      if (touchesLand) {
        tiles[idx] = "shallow";
        collision[idx] = 0;
      }
    }
  }

  // 5. Discoverable Landmarks spanning Green, Yellow & Red Zones
  const landmarks: WorldLandmark[] = isJapan
    ? [
        {
          id: "jp-tokyo-plaza",
          name: "Đại Đô Thị Tokyo (Vùng Xanh)",
          subtitle: "Khu An Toàn Shibuya – Akihabara với Tháp Tokyo, Ga Shinkansen & Tiệm Kimono",
          x: 19 * TILE_SIZE,
          y: 44 * TILE_SIZE,
          radius: 260,
          accentColor: 0x10b981,
          discovered: true,
        },
        {
          id: "jp-narita-airport",
          name: "Sân Bay Narita & Ga Shinkansen",
          subtitle: "Cửa ngõ bay về Việt Nam (5.000 Vàng) hoặc bay Thái Lan đổi giới tính",
          x: 19 * TILE_SIZE,
          y: 51 * TILE_SIZE,
          radius: 240,
          accentColor: 0x38bdf8,
          discovered: false,
        },
        {
          id: "jp-kyoto-shrine",
          name: "Nông Thôn Samurai Cổ Trang (Vùng Vàng)",
          subtitle: "Vùng chiếm đa số — Dinh thự Samurai, làng thợ rèn & Tuần tra Shinsengumi",
          x: 106 * TILE_SIZE,
          y: 17 * TILE_SIZE,
          radius: 260,
          accentColor: 0xeab308,
          discovered: false,
        },
        {
          id: "jp-iga-ninja-village",
          name: "Đèo Núi Tuyết & Làng Ninja (Vùng Đỏ Bắc)",
          subtitle: "Giá rét khắc nghiệt làm tụt thân nhiệt & Đặc nhiệm Áo Đỏ gắt gao",
          x: 163 * TILE_SIZE,
          y: 16 * TILE_SIZE,
          radius: 280,
          accentColor: 0xef4444,
          discovered: false,
        },
        {
          id: "jp-osaka-shogun-castle",
          name: "Núi Tuyết Shogun & Đền Onsen (Vùng Đỏ Đông)",
          subtitle: "Vùng tuyết giá rét tột độ — Thành Cổ Shogun, Muramasa & Kho báu Đỏ",
          x: 192 * TILE_SIZE,
          y: 50 * TILE_SIZE,
          radius: 280,
          accentColor: 0xf43f5e,
          discovered: false,
        },
      ]
    : [
        {
          id: "city-central-park",
          name: "Quảng Trường Vùng Xanh",
          subtitle: "Vùng An Toàn — Tập trung Nhà Riêng, toàn bộ Cửa Hàng & Sân Bay",
          x: 19 * TILE_SIZE,
          y: 44 * TILE_SIZE,
          radius: 260,
          accentColor: 0x10b981,
          discovered: true,
        },
        {
          id: "city-airport-hub",
          name: "Sân Bay Quốc Tế Vùng Xanh",
          subtitle: "Cửa ngõ bay sang Nhật Bản hoặc bay Thái Lan đổi giới tính",
          x: 19 * TILE_SIZE,
          y: 51 * TILE_SIZE,
          radius: 240,
          accentColor: 0x38bdf8,
          discovered: false,
        },
        {
          id: "plains-lotus-pagoda",
          name: "Sông Hồng & Đồng Bằng Vàng (Vùng Vàng)",
          subtitle: "Con sông rộng chia đôi Vùng Vàng với 2 nhánh sông & 2 cây cầu Bắc – Nam",
          x: 93 * TILE_SIZE,
          y: 16 * TILE_SIZE,
          radius: 280,
          accentColor: 0xeab308,
          discovered: false,
        },
        {
          id: "red-zone-north",
          name: "Phức Hợp Kho Báu Bắc (Vùng Đỏ)",
          subtitle: "Khu nhà nhiều đồ Vàng & Đỏ — Đặc nhiệm tuần tra theo trục đường",
          x: 163 * TILE_SIZE,
          y: 16 * TILE_SIZE,
          radius: 280,
          accentColor: 0xef4444,
          discovered: false,
        },
        {
          id: "countryside-village",
          name: "Làng Kho Báu Rừng Sâu (Vùng Đỏ Đông)",
          subtitle: "Khu vực giàu tài nguyên nhất bản đồ — Nhiều nhà & rương Vàng/Đỏ",
          x: 192 * TILE_SIZE,
          y: 50 * TILE_SIZE,
          radius: 280,
          accentColor: 0xf43f5e,
          discovered: false,
        },
      ];

  // 6. Place Props & Curated 600-Pack Buildings cleanly without blocking roads
  let propId = 1;

  const placeProp = (
    kind: PropKind,
    anchorCol: number,
    anchorRow: number,
    blockCols: number,
    blockRows: number,
    offsetX = 0.5,
    offsetY = 0.92,
    blocking = true,
  ): void => {
    const halfW = Math.floor(blockCols / 2);
    const isBld = isBuildingProp(kind);
    // For buildings with a baked oval courtyard at the bottom, shift wall collision up 1 tile
    // so the player can walk freely onto the front yard/doorstep.
    const rowEnd = isBld ? anchorRow - 1 : anchorRow;
    const rowStart = rowEnd - blockRows + 1;
    for (let r = rowStart; r <= rowEnd; r++) {
      for (let c = anchorCol - halfW; c <= anchorCol + (blockCols - 1 - halfW); c++) {
        if (c <= 1 || r <= 1 || c >= cols - 2 || r >= rows - 2) continue;
        const idx = r * cols + c;
        if (blocking) collision[idx] = 1;
        reserved[idx] = 1;
      }
    }
    // Reserve full footprint + oval lawn against random trees/decor overlapping buildings
    // and ensure solid dry ground underneath placed buildings (never floating on FBM water pockets)
    for (let r = rowStart - 1; r <= anchorRow; r++) {
      for (let c = anchorCol - halfW - 1; c <= anchorCol + (blockCols - halfW); c++) {
        if (c > 1 && r > 1 && c < cols - 2 && r < rows - 2) {
          const idx = r * cols + c;
          reserved[idx] = 1;
          if (isBld && (tiles[idx] === "water" || tiles[idx] === "shallow")) {
            tiles[idx] = "grass";
          }
        }
      }
    }

    props.push({
      id: propId++,
      kind,
      x: (anchorCol + offsetX) * TILE_SIZE,
      y: (anchorRow + offsetY) * TILE_SIZE,
      blocking,
    });
  };

  // === ZONE 1: GREEN SAFE ZONE (col 2..31) — Home, ALL Shops, Airport, Hospital, Police (NO loot houses/chests, Trash Bins only!) ===
  if (isJapan) {
    // Tokyo Shibuya / Harajuku / Ginza Japanese Safe Zone Layout
    // West Block (col 5..10)
    placeProp("city_hospital", 7, 23, 5, 3);
    placeProp("city_backpack_shop", 7, 36, 4, 2);
    placeProp("city_pet_gacha", 7, 60, 4, 2);
    placeProp("city_police_station", 7, 72, 4, 2);

    // Center Block (col 15..23) — Ryokan Home, Auction House right beside it, Kimono Pavilion, Narita Airport & Harajuku Hair
    placeProp("city_home_house", 16, 13, 3, 2);
    placeProp("city_auction_house", 21, 13, 4, 2);
    placeProp("city_clothing_shop", 19, 36, 4, 2);
    placeProp("city_airport", 19, 52, 5, 3);
    placeProp("city_hair_salon", 19, 60, 4, 2);

    // East Safe Block (col 28..31) — Kanpo Apothecary, Collection Hall moved up near Home, Tokyo Ramen, Reputation Hall, Ginza Omakase & Quest Guild
    placeProp("city_pharmacy", 29, 13, 4, 2);
    placeProp("city_collection_hall", 29, 23, 4, 2);
    placeProp("city_butcher_shop", 29, 36, 4, 2);
    placeProp("city_reputation_hall", 29, 48, 4, 2);
    placeProp("plains_garden_inn", 29, 60, 5, 2);
    placeProp("city_quest_guild", 29, 72, 4, 2);
  } else {
    // West Block (col 5..10)
    placeProp("city_pharmacy", 7, 13, 4, 2);
    placeProp("city_hospital", 7, 23, 5, 3);
    placeProp("city_clothing_shop", 7, 36, 4, 2);
    placeProp("city_pet_gacha", 7, 60, 4, 2);
    placeProp("city_police_station", 7, 72, 4, 2);

    // Center Safe Block (col 15..23) — Home + Auction House right beside it
    placeProp("city_home_house", 16, 13, 3, 2);
    placeProp("city_auction_house", 21, 13, 4, 2);
    placeProp("city_backpack_shop", 19, 36, 4, 2);
    placeProp("city_airport", 19, 52, 5, 3);
    placeProp("plains_garden_inn", 19, 60, 5, 2);
    placeProp("city_hair_salon", 19, 72, 4, 2);

    // East Safe Strip (col 28..31) — Collection Hall moved up near Home!
    placeProp("city_collection_hall", 29, 13, 4, 2);
    placeProp("city_quest_guild", 29, 24, 4, 2);
    placeProp("city_butcher_shop", 29, 36, 4, 2);
    placeProp("city_reputation_hall", 29, 48, 4, 2);
  }

  // === ZONE 2: YELLOW ZONE (col 32..141, +50.7% larger — 21 loot buildings = +40%) ===
  if (isJapan) {
    // Region 1 East: Grand Tokyo Metropolis (col 32..55)
    placeProp("jp_ryokan_inn", 34, 13, 4, 2);
    placeProp("jp_shinto_shrine", 45, 13, 4, 2);
    placeProp("jp_tokyo_tower", 45, 28, 5, 3);
    placeProp("jp_akihabara_arcade", 34, 36, 4, 2);
    placeProp("jp_shinkansen_station", 45, 52, 5, 3);
    placeProp("jp_ryokan_inn", 34, 60, 4, 2);
    placeProp("jp_akihabara_arcade", 45, 72, 4, 2);
    // Region 2: Expanded Feudal Samurai Countryside & Estates (col 56..141)
    placeProp("jp_samurai_manor", 62, 13, 5, 3);
    placeProp("jp_village_machiya", 61, 35, 4, 2);
    placeProp("jp_village_machiya", 62, 54, 4, 2);
    placeProp("jp_ryokan_inn", 63, 75, 4, 2);
    placeProp("jp_shinto_shrine", 83, 14, 5, 3);
    placeProp("jp_samurai_manor", 84, 35, 5, 3);
    placeProp("jp_village_machiya", 84, 56, 4, 2);
    placeProp("jp_shinto_shrine", 106, 13, 5, 3);
    placeProp("jp_samurai_manor", 104, 35, 5, 3);
    placeProp("jp_village_machiya", 104, 75, 4, 2);
    placeProp("plains_pagoda", 124, 13, 5, 3);
    placeProp("jp_ninja_dojo", 123, 36, 4, 2);
    placeProp("jp_ryokan_inn", 122, 52, 4, 2);
    placeProp("jp_ninja_dojo", 131, 75, 4, 2);
  } else {
    // Urban East Streets (col 32..55)
    placeProp("city_fire_station", 34, 13, 4, 2);
    placeProp("city_post_office", 45, 13, 4, 2);
    placeProp("city_courtyard_apt", 45, 28, 5, 3);
    placeProp("city_arcade_house", 34, 36, 4, 2);
    placeProp("city_green_terrace", 45, 52, 5, 3);
    placeProp("city_terrace_houses", 34, 60, 4, 2);
    placeProp("city_flower_shop", 45, 72, 4, 2);
    // West Bank of Sông Hồng & Branch 1 Surroundings (col 58..86)
    placeProp("plains_tea_house", 65, 12, 4, 2);
    placeProp("plains_archway", 65, 35, 4, 2);
    placeProp("plains_parasol_market", 74, 26, 5, 2);
    placeProp("city_courtyard_apt", 83, 35, 5, 3);
    placeProp("plains_riverside_tavern", 72, 62, 4, 2);
    placeProp("rural_twin_cottage", 65, 76, 4, 2);
    // East Bank of Sông Hồng, Bridgeheads & Branch 2 Surroundings (col 100..140)
    placeProp("plains_pagoda", 107, 12, 5, 3);
    placeProp("rural_orchard_farm", 124, 12, 5, 2);
    placeProp("plains_riverside_tavern", 106, 36, 4, 2);
    placeProp("city_green_terrace", 122, 36, 5, 3);
    placeProp("plains_parasol_market", 116, 53, 5, 2);
    placeProp("rural_twin_cottage", 101, 64, 4, 2);
    placeProp("rural_orchard_farm", 122, 76, 5, 2);
    placeProp("plains_tea_house", 139, 53, 4, 2);
  }

  // Park furniture, food carts & park lanterns inside Green Safe Zone Parks
  const tryStreetDecor = (kind: PropKind, col: number, row: number, blocking = true): void => {
    const idx = row * cols + col;
    if (col <= 2 || row <= 2 || col >= cols - 3 || row >= rows - 3) return;
    if (tiles[idx] === "road" || tiles[idx] === "water" || tiles[idx] === "shallow" || collision[idx] !== 0) {
      return;
    }
    // Keep tall trees & props off tiles immediately south of pond water
    const above = tiles[(row - 1) * cols + col];
    if (above === "water" || above === "shallow") return;
    if (blocking) collision[idx] = 1;
    reserved[idx] = 1;
    props.push({
      id: propId++,
      kind,
      x: (col + 0.5) * TILE_SIZE,
      y: (row + 0.9) * TILE_SIZE,
      blocking,
    });
  };

  if (isJapan) {
    // Tokyo Sakura & Torii Central Plaza (around Spawn col 19, row 44)
    tryStreetDecor("jp_torii_gate", 19, 42, false);
    tryStreetDecor("jp_torii_gate", 19, 49, false);
    tryStreetDecor("jp_stone_lantern", 16, 42);
    tryStreetDecor("jp_stone_lantern", 22, 42);
    tryStreetDecor("jp_stone_lantern", 16, 48);
    tryStreetDecor("jp_stone_lantern", 22, 48);
    tryStreetDecor("sakura_small", 15, 47);
    tryStreetDecor("sakura_small", 23, 47);
    tryStreetDecor("bench", 17, 47);
    tryStreetDecor("bench", 21, 47);
    tryStreetDecor("food_cart", 22, 44);

    // North Koi Pond & Zen Park
    tryStreetDecor("jp_stone_lantern", 16, 20);
    tryStreetDecor("jp_stone_lantern", 22, 20);
    tryStreetDecor("jp_bamboo_cluster", 15, 22);
    tryStreetDecor("jp_bamboo_cluster", 23, 27);
    tryStreetDecor("bench", 17, 29);
    tryStreetDecor("sakura_small", 16, 29);
    tryStreetDecor("sakura_small", 22, 29);

    // West Asakusa Bamboo & Lantern Garden + South Pocket Park
    tryStreetDecor("jp_stone_lantern", 5, 44);
    tryStreetDecor("jp_bamboo_cluster", 4, 48);
    tryStreetDecor("jp_bamboo_cluster", 9, 49);
    tryStreetDecor("jp_bamboo_cluster", 5, 55);
    tryStreetDecor("bench", 7, 48);
    tryStreetDecor("food_cart", 9, 46);
    tryStreetDecor("sakura_tree", 6, 53);
    tryStreetDecor("jp_stone_lantern", 30, 67);
    tryStreetDecor("bench", 33, 71);
    tryStreetDecor("sakura_small", 30, 74);

    // Japanese sidewalk drink vending machines & Kyoto Shrine Torii / lanterns
    tryStreetDecor("jp_vending_machine", 10, 37);
    tryStreetDecor("jp_vending_machine", 23, 38);
    tryStreetDecor("jp_vending_machine", 28, 38);
    tryStreetDecor("jp_vending_machine", 23, 55);
    tryStreetDecor("jp_vending_machine", 10, 26);
    tryStreetDecor("jp_vending_machine", 27, 61);
    tryStreetDecor("jp_torii_gate", 106, 16, false);
    tryStreetDecor("jp_stone_lantern", 104, 16);
    tryStreetDecor("jp_stone_lantern", 108, 16);
    tryStreetDecor("jp_stone_lantern", 161, 17);
    tryStreetDecor("jp_stone_lantern", 165, 17);
  } else {
    // Safe Central Plaza (around Spawn col 19, row 44)
    tryStreetDecor("park_lantern", 16, 42);
    tryStreetDecor("park_lantern", 22, 42);
    tryStreetDecor("bench", 17, 47);
    tryStreetDecor("bench", 21, 47);
    tryStreetDecor("food_cart", 22, 44);

    // Safe North Lake Park
    tryStreetDecor("park_lantern", 16, 20);
    tryStreetDecor("park_lantern", 22, 20);
    tryStreetDecor("bench", 17, 29);
    tryStreetDecor("city_tree", 16, 29);
    tryStreetDecor("city_tree_warm", 22, 29);

    // Safe Breeze Park & Pocket Park
    tryStreetDecor("park_lantern", 5, 44);
    tryStreetDecor("bench", 7, 48);
    tryStreetDecor("food_cart", 9, 46);
    tryStreetDecor("oak_warm", 6, 53);
    tryStreetDecor("park_lantern", 30, 67);
    tryStreetDecor("bench", 33, 71);
    tryStreetDecor("city_tree", 30, 74);
  }

  // Streetlamps, traffic signals & hydrants along City sidewalks
  for (const hr of roadNetwork.horizontalRoads) {
    for (let c = hr.startCol + 2; c <= hr.endCol - 2; c += 7) {
      tryStreetDecor("street_lamp", c, hr.row - 1);
      if (c % 14 === 6 && c <= CITY_END_COL) {
        tryStreetDecor("hydrant", c + 2, hr.row + 2);
      }
    }
  }
  for (const vr of roadNetwork.verticalRoads) {
    for (const hr of roadNetwork.horizontalRoads) {
      tryStreetDecor("traffic_light", vr.col - 1, hr.row - 1);
    }
  }

  // Sparse aesthetic trees inside empty City lawn patches & Parks
  for (let row = 4; row < rows - 4; row++) {
    for (let col = 3; col <= CITY_END_COL; col++) {
      const idx = row * cols + col;
      const t = tiles[idx];
      if (collision[idx] !== 0 || reserved[idx] !== 0) continue;
      if (t !== "meadow" && t !== "grass") continue;
      const r = rng();
      if (r < 0.032) {
        if (isJapan) {
          const jpPick = rng();
          const jpKind: PropKind =
            jpPick < 0.56
              ? "sakura_small"
              : jpPick < 0.82
                ? "jp_bamboo_cluster"
                : jpPick < 0.92
                  ? "jp_stone_lantern"
                  : "city_tree";
          tryStreetDecor(jpKind, col, row, true);
        } else {
          tryStreetDecor(rng() < 0.55 ? "city_tree" : "city_tree_warm", col, row, true);
        }
      } else if (r < 0.055) {
        props.push({
          id: propId++,
          kind: rng() < 0.5 ? "bush_a" : "bush_b",
          x: (col + 0.5) * TILE_SIZE,
          y: (row + 0.8) * TILE_SIZE,
          blocking: false,
        });
      }
    }
  }

  // === ZONE 3: RED DANGER ZONE (col 142..201, +51.2% larger — 16 loot buildings = +45.5%) ===
  if (isJapan) {
    // Band 1: West Snowy Iga Foothills (col 143..150)
    placeProp("jp_ninja_dojo", 146, 15, 4, 2);
    placeProp("jp_samurai_manor", 146, 35, 5, 3);
    placeProp("jp_snow_onsen_temple", 146, 52, 5, 3);
    placeProp("jp_village_machiya", 146, 77, 4, 2);
    // Band 2: Mid-West Alpine Shogun Valley (col 156..168)
    placeProp("jp_shogun_castle", 163, 15, 5, 3);
    placeProp("plains_pagoda", 164, 35, 5, 3);
    placeProp("jp_ninja_dojo", 164, 49, 4, 2);
    placeProp("jp_snow_onsen_temple", 163, 77, 5, 3);
    // Band 3: Mid-East Frozen Temple Ridge (col 172..185)
    placeProp("jp_shinto_shrine", 178, 15, 4, 2);
    placeProp("jp_samurai_manor", 178, 35, 5, 3);
    placeProp("jp_snow_onsen_temple", 178, 52, 5, 3);
    placeProp("jp_ninja_dojo", 178, 77, 4, 2);
    // Band 4: Deep East Shogun Summit Fortress (col 190..200)
    placeProp("jp_shinto_shrine", 194, 15, 4, 2);
    placeProp("jp_samurai_manor", 194, 34, 5, 3);
    placeProp("jp_shogun_castle", 194, 55, 5, 3);
    placeProp("jp_shogun_castle", 194, 77, 5, 3);
  } else {
    // Band 1: West Red Gate (col 143..150)
    placeProp("city_twin_towers", 146, 15, 5, 3);
    placeProp("rural_twin_cottage", 146, 35, 4, 2);
    placeProp("city_museum", 146, 52, 5, 3);
    placeProp("rural_log_cabin", 146, 77, 4, 2);
    // Band 2: Mid-West Red Valley (col 156..168)
    placeProp("city_mansion_block", 163, 15, 5, 3);
    placeProp("rural_dutch_barn", 164, 35, 4, 2);
    placeProp("rural_orchard_farm", 164, 49, 5, 2);
    placeProp("rural_stilt_hut", 163, 77, 4, 2);
    // Band 3: Mid-East Red Stronghold (col 172..185)
    placeProp("city_twin_towers", 178, 15, 5, 3);
    placeProp("city_museum", 178, 35, 5, 3);
    placeProp("rural_dutch_barn", 178, 52, 4, 2);
    placeProp("rural_log_cabin", 178, 77, 4, 2);
    // Band 4: Deep East Red Woods (col 190..200)
    placeProp("rural_stilt_hut", 194, 15, 4, 2);
    placeProp("rural_dutch_barn", 194, 34, 4, 2);
    placeProp("city_mansion_block", 194, 55, 5, 3);
    placeProp("city_mansion_block", 194, 77, 5, 3);
  }

  // 7. Spawn Position: Safe Green Central Plaza right beside Shops, Home & Airport (col 19, row 44)
  const spawnCol = 19;
  const spawnRow = 44;
  collision[spawnRow * cols + spawnCol] = 0;

  // 8. Puddles across all 3 zones
  const puddleSpots: Array<[number, number, number]> = [
    [17, 45, 1.1], // Green plaza edge puddle
    [18, 28, 1.2], // North lake park puddle
    [6, 49, 1.3],  // Breeze Park puddle
    [32, 70, 1.2], // South Pocket Park puddle
    [59, 37, 1.4], // Yellow zone puddles
    [77, 44, 1.5],
    [108, 46, 1.5],
    [131, 36, 1.4],
    [147, 42, 1.6], // Red zone puddles
    [166, 37, 1.5],
    [181, 46, 1.6],
    [195, 62, 1.5],
  ];

  for (const [pc, pr, rad] of puddleSpots) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.hypot(dx, dy) > rad) continue;
        const nc = pc + dx;
        const nr = pr + dy;
        if (nc <= 3 || nr <= 3 || nc >= cols - 4 || nr >= rows - 4) continue;
        if (nc === spawnCol && nr === spawnRow) continue;
        const idx = nr * cols + nc;
        const cur = tiles[idx];
        if (collision[idx] !== 0 || cur === "water" || cur === "shallow" || cur === "bridge" || cur === "road") {
          continue;
        }
        puddleUnderlay[idx] = cur;
        tiles[idx] = "puddle";
        reserved[idx] = 1;
      }
    }
  }

  const chestSpots: Array<{ id: string; name: string; kind: ChestKind; col: number; row: number }> =
    isJapan
      ? [
          // Green Safe Zone Tokyo: ONLY Trash Bins
          { id: "jp_trash-green-plaza-w", name: "Thùng Rác Ga Shibuya Tây", kind: "trash", col: 15, row: 43 },
          { id: "jp_trash-green-plaza-e", name: "Thùng Rác Ga Shibuya Đông", kind: "trash", col: 23, row: 43 },
          { id: "jp_trash-green-shop", name: "Thùng Rác Phố Akihabara", kind: "trash", col: 23, row: 37 },
          { id: "jp_trash-green-hospital", name: "Thùng Rác Bệnh Viện Tokyo", kind: "trash", col: 10, row: 25 },
          { id: "jp_trash-green-park", name: "Thùng Rác Công Viên Anh Đào", kind: "trash", col: 23, row: 21 },
          { id: "jp_trash-green-breeze", name: "Thùng Rác Vườn Ueno", kind: "trash", col: 9, row: 52 },

          // Yellow Zone Kyoto (Expanded +50%, 16 Loot Spots = +45%)
          { id: "jp_chest-yellow-1", name: "Rương Ngã Tư Phố Cổ Kyoto", kind: "wooden", col: 36, row: 44 },
          { id: "jp_chest-yellow-2", name: "Rương Lữ Quán Suối Khoáng", kind: "wooden", col: 41, row: 21 },
          { id: "jp_chest-yellow-3", name: "Rương Phố Đèn Lồng Đông", kind: "wooden", col: 50, row: 60 },
          { id: "jp_chest-yellow-4", name: "Rương Hồ Kamo Tây", kind: "wooden", col: 60, row: 26 },
          { id: "jp_chest-yellow-5", name: "Rương Rừng Trúc Arashiyama", kind: "wooden", col: 78, row: 46 },
          { id: "jp_chest-yellow-6", name: "Rương Bến Thuyền Kyoto Nam", kind: "wooden", col: 82, row: 72 },
          { id: "jp_chest-yellow-7", name: "Rương Vườn Thiền Trung Tâm", kind: "wooden", col: 98, row: 28 },
          { id: "jp_chest-yellow-8", name: "Rương Cổng Phủ Samurai Đông", kind: "wooden", col: 112, row: 54 },
          { id: "jp_chest-yellow-9", name: "Rương Hồ Anh Đào Đông", kind: "wooden", col: 129, row: 44 },
          { id: "jp_chest-yellow-10", name: "Rương Võ Đường Ngoại Ô", kind: "wooden", col: 138, row: 64 },
          { id: "jp_chest-yellow-royal-1", name: "Rương Hoàng Kim Đền Inari", kind: "royal", col: 88, row: 14 },
          { id: "jp_chest-yellow-royal-2", name: "Rương Mật Mã Phố Chợ Kyoto", kind: "royal", col: 50, row: 35 },
          { id: "jp_chest-yellow-royal-3", name: "Rương Hoàng Kim Chùa Cổ Đông", kind: "royal", col: 128, row: 14 },
          { id: "jp_trash-plains-road", name: "Thùng Rác Đại Lộ Kyoto", kind: "trash", col: 74, row: 38 },
          { id: "jp_trash-plains-mid", name: "Thùng Rác Ngã Ba Samurai", kind: "trash", col: 100, row: 64 },
          { id: "jp_trash-plains-east", name: "Thùng Rác Cổng Đông Kyoto", kind: "trash", col: 133, row: 38 },

          // Red Zone Iga & Osaka Castle (Expanded +51%, 14 High-Value Spots = +40%)
          { id: "jp_chest-red-w1", name: "Rương Ám Khí Ninja Iga", kind: "wooden", col: 144, row: 23 },
          { id: "jp_chest-red-w2", name: "Rương Cổng Đền Thần Bí", kind: "wooden", col: 149, row: 44 },
          { id: "jp_chest-red-w3", name: "Rương Hồ Lá Phong Tây", kind: "wooden", col: 158, row: 52 },
          { id: "jp_chest-red-w4", name: "Rương Đèo Tuyết Trung Tâm", kind: "wooden", col: 171, row: 26 },
          { id: "jp_chest-red-w5", name: "Rương Rừng Trúc Mạc Phủ", kind: "wooden", col: 174, row: 64 },
          { id: "jp_chest-red-w6", name: "Rương Đền Tuyết Phương Đông", kind: "wooden", col: 190, row: 24 },
          { id: "jp_chest-red-w7", name: "Rương Chân Thành Osaka Nam", kind: "wooden", col: 197, row: 64 },
          { id: "jp_chest-red-royal-1", name: "Rương Hoàng Kim Thành Shogun", kind: "royal", col: 167, row: 15 },
          { id: "jp_chest-red-royal-2", name: "Rương Báu Vật Suối Khoáng", kind: "royal", col: 174, row: 44 },
          { id: "jp_chest-red-royal-3", name: "Rương Cổ Vật Rừng Phong", kind: "royal", col: 155, row: 76 },
          { id: "jp_chest-red-royal-4", name: "Rương Báu Vật Đền Băng", kind: "royal", col: 184, row: 15 },
          { id: "jp_chest-red-royal-5", name: "Rương Hoàng Gia Thành Đông", kind: "royal", col: 191, row: 44 },
          { id: "jp_chest-red-royal-6", name: "Rương Quốc Bảo Mạc Phủ", kind: "royal", col: 197, row: 76 },
          // Red Zone Mid-Lake Island Treasures (5 chests across 4 alpine lakes)
          { id: "jp_chest-red-lake-1", name: "Rương Báu Hồ Băng Iga", kind: "royal", col: 158, row: 25 },
          { id: "jp_chest-red-lake-2", name: "Rương Cổ Vật Hồ Tuyết Nam", kind: "wooden", col: 158, row: 60 },
          { id: "jp_chest-red-lake-3", name: "Rương Hoàng Kim Hồ Shogun", kind: "royal", col: 184, row: 25 },
          { id: "jp_chest-red-lake-4", name: "Rương Quốc Bảo Đảo Băng Sâu", kind: "royal", col: 184, row: 61 },
          { id: "jp_chest-red-lake-5", name: "Rương Trôi Dạt Đảo Băng", kind: "wooden", col: 186, row: 61 },
          { id: "jp_trash-rural-trail", name: "Thùng Rác Cổng Làng Ninja", kind: "trash", col: 143, row: 41 },
        ]
      : [
          // Green Safe Zone: ONLY Trash Bins (scarce C/B items, zero chests!)
          { id: "trash-green-plaza-w", name: "Thùng Rác Quảng Trường Tây", kind: "trash", col: 15, row: 43 },
          { id: "trash-green-plaza-e", name: "Thùng Rác Quảng Trường Đông", kind: "trash", col: 23, row: 43 },
          { id: "trash-green-shop", name: "Thùng Rác Phố Mua Sắm", kind: "trash", col: 23, row: 37 },
          { id: "trash-green-hospital", name: "Thùng Rác Bệnh Viện", kind: "trash", col: 10, row: 25 },
          { id: "trash-green-park", name: "Thùng Rác Hồ Tây Xanh", kind: "trash", col: 23, row: 21 },
          { id: "trash-green-breeze", name: "Thùng Rác Công Viên Gió", kind: "trash", col: 9, row: 52 },

          // Yellow Zone (Expanded +50%, 16 Loot Spots = +45%: Urban East + Sông Hồng + 2 Branches + 2 Bridges + East Plains)
          { id: "chest-yellow-1", name: "Rương Ngã Tư Phố Đông", kind: "wooden", col: 36, row: 44 },
          { id: "chest-yellow-2", name: "Rương Khu Tập Thể Bắc", kind: "wooden", col: 41, row: 21 },
          { id: "chest-yellow-3", name: "Rương Phố Chợ Đông", kind: "wooden", col: 50, row: 60 },
          { id: "chest-yellow-4", name: "Rương Bãi Bồi Tây Bắc", kind: "wooden", col: 61, row: 24 },
          { id: "chest-yellow-5", name: "Rương Bến Đò Nhánh Tây", kind: "wooden", col: 72, row: 57 },
          { id: "chest-yellow-6", name: "Rương Đầu Cầu Bắc Tây", kind: "wooden", col: 83, row: 12 },
          { id: "chest-yellow-7", name: "Rương Bờ Đông Cầu Nam", kind: "wooden", col: 97, row: 73 },
          { id: "chest-yellow-8", name: "Rương Ven Nhánh Sông Đông", kind: "wooden", col: 114, row: 35 },
          { id: "chest-yellow-9", name: "Rương Cánh Đồng Bờ Đông", kind: "wooden", col: 128, row: 55 },
          { id: "chest-yellow-10", name: "Rương Trang Trại Biên Giới", kind: "wooden", col: 138, row: 64 },
          { id: "chest-yellow-royal-1", name: "Rương Hoàng Kim Đầu Cầu Bắc", kind: "royal", col: 112, row: 12 },
          { id: "chest-yellow-royal-2", name: "Rương Mật Mã Phố Đông", kind: "royal", col: 50, row: 35 },
          { id: "chest-yellow-royal-3", name: "Rương Báu Vật Bờ Sông Hồng", kind: "royal", col: 112, row: 60 },
          // 3 Mid-River Sandbar Treasure Chests (Bãi Giữa Sông Hồng & 2 Cồn Nhánh Sông)
          { id: "chest-yellow-river-royal-1", name: "Rương Báu Bãi Giữa Sông Hồng", kind: "royal", col: 95, row: 40 },
          { id: "chest-yellow-river-2", name: "Rương Kho Báu Cồn Nhánh Tây", kind: "wooden", col: 64, row: 49 },
          { id: "chest-yellow-river-3", name: "Rương Báu Cồn Nhánh Đông", kind: "royal", col: 128, row: 25 },
          { id: "trash-plains-road", name: "Thùng Rác Quốc Lộ Vàng Tây", kind: "trash", col: 74, row: 38 },
          { id: "trash-plains-mid", name: "Thùng Rác Bến Cầu Nam", kind: "trash", col: 80, row: 71 },
          { id: "trash-plains-east", name: "Thùng Rác Ngã Ba Đồng Bằng Đông", kind: "trash", col: 133, row: 38 },

          // Red Zone (Expanded +51%, 19 High-Value Spots including 5 Mid-Lake Treasures)
          { id: "chest-red-w1", name: "Rương Kho Báu Tháp Đôi", kind: "wooden", col: 144, row: 23 },
          { id: "chest-red-w2", name: "Rương Bến Rừng Tây", kind: "wooden", col: 149, row: 44 },
          { id: "chest-red-w3", name: "Rương Ven Hồ Rừng Tây", kind: "wooden", col: 158, row: 52 },
          { id: "chest-red-w4", name: "Rương Trại Rừng Trung Tâm", kind: "wooden", col: 171, row: 26 },
          { id: "chest-red-w5", name: "Rương Góc Rừng Trung Nam", kind: "wooden", col: 174, row: 64 },
          { id: "chest-red-w6", name: "Rương Rừng Sâu Phương Đông", kind: "wooden", col: 190, row: 24 },
          { id: "chest-red-w7", name: "Rương Góc Rừng Đông Nam", kind: "wooden", col: 197, row: 64 },
          { id: "chest-red-royal-1", name: "Rương Đỏ Hoàng Gia Bắc", kind: "royal", col: 167, row: 15 },
          { id: "chest-red-royal-2", name: "Rương Hoàng Kim Thung Lũng", kind: "royal", col: 174, row: 44 },
          { id: "chest-red-royal-3", name: "Rương Bí Ẩn Rừng Tây Nam", kind: "royal", col: 155, row: 76 },
          { id: "chest-red-royal-4", name: "Rương Đỏ Hoàng Gia Đông Bắc", kind: "royal", col: 184, row: 15 },
          { id: "chest-red-royal-5", name: "Rương Hoàng Kim Ao Làng Đông", kind: "royal", col: 191, row: 44 },
          { id: "chest-red-royal-6", name: "Rương Kho Báu Tận Cùng", kind: "royal", col: 197, row: 76 },
          // Red Zone Mid-Lake Island Treasures (5 chests across 4 Red Zone lakes)
          { id: "chest-red-lake-1", name: "Rương Báu Giữa Hồ Rừng Đỏ", kind: "royal", col: 158, row: 25 },
          { id: "chest-red-lake-2", name: "Rương Cổ Vật Hồ Nam Đỏ", kind: "wooden", col: 158, row: 60 },
          { id: "chest-red-lake-3", name: "Rương Hoàng Kim Hồ Đông Bắc", kind: "royal", col: 184, row: 25 },
          { id: "chest-red-lake-4", name: "Rương Tuyệt Phẩm Đảo Hồ Sâu", kind: "royal", col: 184, row: 61 },
          { id: "chest-red-lake-5", name: "Rương Trôi Dạt Đảo Hồ Sâu", kind: "wooden", col: 186, row: 61 },
          { id: "trash-rural-trail", name: "Thùng Rác Đầu Vùng Đỏ", kind: "trash", col: 143, row: 41 },
        ];

  // Reserve chest coordinates before procedural flora so trees/rocks never cover chests
  for (const spot of chestSpots) {
    const idx = spot.row * cols + spot.col;
    if (tiles[idx] === "water" || tiles[idx] === "shallow") {
      tiles[idx] = "grass";
    }
    reserved[idx] = 1;
  }

  // 9. Populate Plains (moderate flora) and Countryside (abundant dense forests & flora) + Lilypads
  for (let row = 4; row < rows - 4; row++) {
    for (let col = 4; col < cols - 4; col++) {
      const idx = row * cols + col;
      const tile = tiles[idx];
      const zone = biomes[idx];

      if (tile === "water" || tile === "shallow") {
        if (rng() < 0.042) {
          lilypads.push({
            x: (col + 0.5) * TILE_SIZE,
            y: (row + 0.5) * TILE_SIZE,
          });
        }
        continue;
      }

      if (zone === "city") continue;
      if (collision[idx] !== 0 || reserved[idx] !== 0) continue;
      if (tile === "road" || tile === "sidewalk" || tile === "dirt" || tile === "stone" || tile === "bridge" || tile === "puddle") {
        continue;
      }

      const r = rng();

      if (zone === "countryside") {
        // Countryside: on Japan map, alpine snowy mountain forests (Yuki-Matsu, Snow Jizo & crimson Momiji)
        const bigTreeKind = isJapan ? (rng() < 0.25 ? "momiji_tree" : "jp_snow_pine") : "oak_moss";
        const smallTreeKind = isJapan ? "jp_snow_pine" : "tree_small_moss";
        const warmBigKind = isJapan ? (rng() < 0.35 ? "momiji_tree" : "jp_snow_pine") : "oak_warm";
        const warmSmallKind = isJapan ? "momiji_small" : "tree_small_warm";
        if (tile === "forest") {
          if (r < 0.072 && canFitMultiTile(cols, rows, collision, reserved, tiles, col, row, 3, 2)) {
            placeProp(bigTreeKind, col, row, 3, 1, 0.5, 0.92);
          } else if (r < 0.175) {
            placeProp(isJapan && rng() < 0.2 ? "jp_snowman_jizo" : smallTreeKind, col, row, 1, 1, 0.5, 0.92);
          } else if (r < 0.215) {
            placeProp(rng() < 0.55 ? "boulder" : "stump", col, row, 1, 1, 0.5, 0.92);
          } else if (r < 0.285) {
            props.push({
              id: propId++,
              kind: rng() < 0.5 ? "bush_a" : "bush_b",
              x: (col + 0.5) * TILE_SIZE,
              y: (row + 0.8) * TILE_SIZE,
              blocking: false,
            });
          }
        } else if (tile === "grass" || tile === "meadow") {
          if (r < 0.042 && canFitMultiTile(cols, rows, collision, reserved, tiles, col, row, 3, 2)) {
            placeProp(warmBigKind, col, row, 3, 1, 0.5, 0.92);
          } else if (r < 0.105) {
            placeProp(isJapan && rng() < 0.3 ? "jp_snowman_jizo" : warmSmallKind, col, row, 1, 1, 0.5, 0.92);
          } else if (r < 0.135) {
            placeProp(rng() < 0.5 ? "stone_small" : "stump", col, row, 1, 1, 0.5, 0.88);
          } else if (r < 0.195) {
            props.push({
              id: propId++,
              kind: rng() < 0.5 ? "bush_a" : "bush_b",
              x: (col + 0.5) * TILE_SIZE,
              y: (row + 0.8) * TILE_SIZE,
              blocking: false,
            });
          }
        }
      } else if (zone === "plains") {
        // Plains: balanced open density ("số lượng model vừa vừa")
        const plainsBig = isJapan ? "sakura_tree" : "oak_warm";
        const plainsSmall = isJapan ? "sakura_small" : "tree_small_warm";
        if (tile === "grass" || tile === "meadow") {
          if (r < 0.011 && canFitMultiTile(cols, rows, collision, reserved, tiles, col, row, 3, 2)) {
            placeProp(plainsBig, col, row, 3, 1, 0.5, 0.92);
          } else if (r < 0.028) {
            placeProp(isJapan && rng() < 0.32 ? "jp_bamboo_cluster" : plainsSmall, col, row, 1, 1, 0.5, 0.92);
          } else if (r < 0.038) {
            placeProp("stone_small", col, row, 1, 1, 0.5, 0.88);
          } else if (r < 0.062) {
            props.push({
              id: propId++,
              kind: rng() < 0.5 ? "bush_a" : "bush_b",
              x: (col + 0.5) * TILE_SIZE,
              y: (row + 0.8) * TILE_SIZE,
              blocking: false,
            });
          }
        }
      }

      if (tile === "sand" && r < 0.03) {
        placeProp("stone_small", col, row, 1, 1, 0.5, 0.88);
      }
    }
  }

  // 10. Place Chests (Yellow/Red Zones) & Trash Bins (Green Safe Zone = ONLY trash bins!)
  for (const spot of chestSpots) {
    const idx = spot.row * cols + spot.col;
    if (tiles[idx] === "water" || tiles[idx] === "shallow" || tiles[idx] === "road") continue;
    collision[idx] = 1;
    reserved[idx] = 1;
    chests.push({
      id: spot.id,
      name: spot.name,
      kind: spot.kind,
      x: (spot.col + 0.5) * TILE_SIZE,
      y: (spot.row + 0.85) * TILE_SIZE,
      biome: biomes[idx],
      opened: false,
    });
  }

  const hospitalRespawnCol = 7;
  const hospitalRespawnRow = 24;
  collision[hospitalRespawnRow * cols + hospitalRespawnCol] = 0;

  const policeRespawnCol = 7;
  const policeRespawnRow = 73;
  collision[policeRespawnRow * cols + policeRespawnCol] = 0;

  return {
    mapId,
    cols,
    rows,
    tileSize: TILE_SIZE,
    tiles,
    puddleUnderlay,
    biomes,
    securityZones,
    collision,
    props,
    chests,
    landmarks,
    lilypads,
    roadNetwork,
    spawn: {
      x: (spawnCol + 0.5) * TILE_SIZE,
      y: (spawnRow + 0.5) * TILE_SIZE,
    },
    hospitalRespawn: {
      x: (hospitalRespawnCol + 0.5) * TILE_SIZE,
      y: (hospitalRespawnRow + 0.4) * TILE_SIZE,
    },
    policeDetainRespawn: {
      x: (policeRespawnCol + 0.5) * TILE_SIZE,
      y: (policeRespawnRow + 0.3) * TILE_SIZE,
    },
  };
}

function canFitMultiTile(
  cols: number,
  rows: number,
  collision: Uint8Array,
  reserved: Uint8Array,
  tiles: TileType[],
  anchorCol: number,
  anchorRow: number,
  w: number,
  h: number,
): boolean {
  const halfW = Math.floor(w / 2);
  for (let r = anchorRow - h + 1; r <= anchorRow; r++) {
    for (let c = anchorCol - halfW; c <= anchorCol + (w - 1 - halfW); c++) {
      if (c <= 3 || r <= 3 || c >= cols - 4 || r >= rows - 4) return false;
      const idx = r * cols + c;
      if (collision[idx] !== 0 || reserved[idx] !== 0) return false;
      const t = tiles[idx];
      if (
        t === "water" ||
        t === "shallow" ||
        t === "puddle" ||
        t === "stone" ||
        t === "dirt" ||
        t === "bridge" ||
        t === "road" ||
        t === "sidewalk"
      ) {
        return false;
      }
    }
  }
  return true;
}
