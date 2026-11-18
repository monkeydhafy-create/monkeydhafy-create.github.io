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

  // Visual Biome boundaries (expanded +50% across loot zones):
  // City [2..55], Plains [56..101], Countryside [102..143]
  const CITY_END_COL = 55;
  const PLAINS_END_COL = 101;

  // Gameplay Security Zones (from types.ts):
  // - Green (Safe): [0..31] (32 cols — home, shops, collection hall, airport, hospital, police)
  // - Yellow (Standard / Majority): [32..104] (73 cols, +49% larger)
  // - Red (High Risk / Rich Loot): [105..145] (41 cols, +52% larger) -> total loot area +50.0%

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

  // Plains: Grand Lotus Lake (North), South Stream Pond & East Border Pond
  carvePond(68, 28, 6.2, 4.6, true);
  carvePond(72, 68, 4.8, 3.6, true);
  carvePond(96, 48, 4.2, 3.3, true);

  // Countryside (Red Zone): Village Pond (North) + Forest Lake (South)
  carvePond(120, 26, 5.2, 4.0, true);
  carvePond(123, 60, 4.8, 3.8, true);

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
  carveParkBlock(15, 19, 23, 30, true);  // Park 1: Safe North Lake Park
  carveParkBlock(3, 42, 10, 58, false);  // Park 2: Safe West Breeze Park
  carveParkBlock(15, 42, 23, 49, false); // Park 3: Green Safe Central Plaza (Spawn!)
  carveParkBlock(28, 65, 36, 77, false); // Park 4: South Border Pocket Park

  // 4. City Asphalt Road Network + Cross-Plains Boulevard + Dirt Patrol Trails
  const roadNetwork: RoadNetworkMeta = {
    horizontalRoads: [
      { row: 16, startCol: 4, endCol: 54 },
      { row: 39, startCol: 4, endCol: 102 }, // Grand Avenue connecting Green -> Yellow Plains East!
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

  // Plains dirt patrol corridors (+50% expanded Yellow Plains)
  carveHorizontalDirtTrail(19, 55, 103); // North Plains Trail above Lotus Lake
  carveHorizontalDirtTrail(58, 55, 103); // South Plains Trail below East Pond
  carveVerticalDirtTrail(68, 13, 74);    // West Plains Trail across Lotus Lake & South Pond bridges
  carveVerticalDirtTrail(89, 13, 74);    // East Plains Trail connecting outer Yellow compounds

  // Red Zone arterial dirt highway + patrol loop network (col 103..141)
  carveHorizontalDirtTrail(39, 103, 141, 1.0); // Main East-West Red Artery continuing from Grand Avenue
  carveHorizontalDirtTrail(18, 103, 140);      // North Red Patrol Trail
  carveHorizontalDirtTrail(69, 103, 140);      // South Red Patrol Trail
  carveVerticalDirtTrail(115, 13, 75);         // West Red N-S Trail
  carveVerticalDirtTrail(132, 13, 75);         // Deep East Red N-S Trail

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
          name: "Quảng Trường Tokyo (Vùng Xanh)",
          subtitle: "Khu An Toàn Shibuya — Nơi đặt Nhà Riêng, toàn bộ Cửa Hàng & Sân Bay Narita",
          x: 19 * TILE_SIZE,
          y: 44 * TILE_SIZE,
          radius: 260,
          accentColor: 0x10b981,
          discovered: true,
        },
        {
          id: "jp-narita-airport",
          name: "Sân Bay Tokyo Narita",
          subtitle: "Cửa ngõ bay về Việt Nam hoặc chuyển sang Thái Lan đổi giới tính",
          x: 19 * TILE_SIZE,
          y: 51 * TILE_SIZE,
          radius: 240,
          accentColor: 0x38bdf8,
          discovered: false,
        },
        {
          id: "jp-kyoto-shrine",
          name: "Cố Đô Kyoto & Đền Thần Đạo (Vùng Vàng)",
          subtitle: "Vùng chiếm đa số bản đồ — Đường tuần tra & nhiều cổ vật Nhật Bản",
          x: 80 * TILE_SIZE,
          y: 18 * TILE_SIZE,
          radius: 260,
          accentColor: 0xeab308,
          discovered: false,
        },
        {
          id: "jp-iga-ninja-village",
          name: "Làng Ninja Iga (Vùng Đỏ Bắc)",
          subtitle: "Khu nhà nhiều đồ Vàng & Đỏ — Đặc nhiệm tuần tra theo trục đường",
          x: 117 * TILE_SIZE,
          y: 16 * TILE_SIZE,
          radius: 280,
          accentColor: 0xef4444,
          discovered: false,
        },
        {
          id: "jp-osaka-shogun-castle",
          name: "Thành Cổ Shogun Osaka (Vùng Đỏ Đông)",
          subtitle: "Kho báu Mạc phủ Nhật Bản — Rơi Yêu Đao Muramasa & Bảo Vật Đỏ",
          x: 135 * TILE_SIZE,
          y: 48 * TILE_SIZE,
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
          name: "Khu Đồng Bằng Mở Rộng (Vùng Vàng)",
          subtitle: "Vùng chiếm đa số bản đồ — Tuyến đường tuần tra & kho báu trải rộng",
          x: 80 * TILE_SIZE,
          y: 18 * TILE_SIZE,
          radius: 260,
          accentColor: 0xeab308,
          discovered: false,
        },
        {
          id: "red-zone-north",
          name: "Phức Hợp Kho Báu Bắc (Vùng Đỏ)",
          subtitle: "Khu nhà nhiều đồ Vàng & Đỏ — Đặc nhiệm tuần tra theo trục đường",
          x: 117 * TILE_SIZE,
          y: 16 * TILE_SIZE,
          radius: 280,
          accentColor: 0xef4444,
          discovered: false,
        },
        {
          id: "countryside-village",
          name: "Làng Kho Báu Rừng Sâu (Vùng Đỏ Đông)",
          subtitle: "Khu vực giàu tài nguyên nhất bản đồ — Nhiều nhà & rương Vàng/Đỏ",
          x: 135 * TILE_SIZE,
          y: 48 * TILE_SIZE,
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
    for (let r = rowStart - 1; r <= anchorRow; r++) {
      for (let c = anchorCol - halfW - 1; c <= anchorCol + (blockCols - halfW); c++) {
        if (c > 1 && r > 1 && c < cols - 2 && r < rows - 2) {
          reserved[r * cols + c] = 1;
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
  // West Block (col 5..10)
  placeProp("city_pharmacy", 7, 13, 4, 2);
  placeProp("city_hospital", 7, 23, 5, 3);
  placeProp("city_clothing_shop", 7, 36, 4, 2);
  placeProp("city_police_station", 7, 72, 4, 2);

  // Center Safe Block (col 15..23) — Home House & Collection Hall side-by-side
  placeProp("city_home_house", 16, 13, 3, 2);
  placeProp("city_collection_hall", 21, 13, 4, 2);
  placeProp("city_backpack_shop", 19, 36, 4, 2);
  placeProp("city_airport", 19, 52, 5, 3);
  placeProp("plains_garden_inn", 19, 60, 5, 2);
  placeProp("city_hair_salon", 19, 72, 4, 2);

  // East Safe Strip (col 28..31)
  placeProp("city_butcher_shop", 29, 36, 4, 2);

  // === ZONE 2: YELLOW ZONE (col 32..104 — Expanded +50% Area, Rearranged Urban East & Wide Plains) ===
  if (isJapan) {
    // Urban East Tokyo Streets (col 32..55)
    placeProp("jp_ryokan_inn", 34, 13, 4, 2);
    placeProp("city_post_office", 45, 13, 4, 2);
    placeProp("city_courtyard_apt", 45, 28, 5, 3);
    placeProp("city_arcade_house", 34, 36, 4, 2);
    placeProp("city_green_terrace", 45, 52, 5, 3);
    placeProp("city_terrace_houses", 34, 60, 4, 2);
    placeProp("city_flower_shop", 45, 72, 4, 2);
    // Expanded Kyoto Plains Clusters (col 56..104)
    placeProp("plains_tea_house", 61, 16, 4, 2);
    placeProp("plains_archway", 60, 36, 4, 2);
    placeProp("plains_parasol_market", 61, 52, 5, 2);
    placeProp("jp_shinto_shrine", 80, 17, 5, 3);
    placeProp("jp_ryokan_inn", 80, 36, 4, 2);
    placeProp("plains_riverside_tavern", 82, 72, 4, 2);
    placeProp("plains_pagoda", 97, 29, 5, 3);
    placeProp("jp_ninja_dojo", 97, 70, 4, 2);
  } else {
    // Urban East Streets (col 32..55)
    placeProp("city_fire_station", 34, 13, 4, 2);
    placeProp("city_post_office", 45, 13, 4, 2);
    placeProp("city_courtyard_apt", 45, 28, 5, 3);
    placeProp("city_arcade_house", 34, 36, 4, 2);
    placeProp("city_green_terrace", 45, 52, 5, 3);
    placeProp("city_terrace_houses", 34, 60, 4, 2);
    placeProp("city_flower_shop", 45, 72, 4, 2);
    // Expanded Plains Clusters (col 56..104)
    placeProp("plains_tea_house", 61, 16, 4, 2);
    placeProp("plains_archway", 60, 36, 4, 2);
    placeProp("plains_parasol_market", 61, 52, 5, 2);
    placeProp("plains_pagoda", 80, 17, 5, 3);
    placeProp("city_courtyard_apt", 80, 36, 5, 3);
    placeProp("plains_riverside_tavern", 82, 72, 4, 2);
    placeProp("rural_twin_cottage", 97, 29, 4, 2);
    placeProp("rural_orchard_farm", 97, 70, 5, 2);
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
  tryStreetDecor(isJapan ? "sakura_small" : "city_tree", 16, 29);
  tryStreetDecor(isJapan ? "sakura_small" : "city_tree_warm", 22, 29);

  // Safe Breeze Park & Pocket Park
  tryStreetDecor("park_lantern", 5, 44);
  tryStreetDecor("bench", 7, 48);
  tryStreetDecor("food_cart", 9, 46);
  tryStreetDecor(isJapan ? "sakura_tree" : "oak_warm", 6, 53);
  tryStreetDecor("park_lantern", 30, 67);
  tryStreetDecor("bench", 33, 71);
  tryStreetDecor(isJapan ? "sakura_small" : "city_tree", 30, 74);

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
          tryStreetDecor(rng() < 0.72 ? "sakura_small" : "city_tree", col, row, true);
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

  // === ZONE 3: RED DANGER ZONE (col 105..143 — Expanded +50% Deep Compounds & Vaults) ===
  if (isJapan) {
    // West Iga Border Gate (col 106..114)
    placeProp("jp_ninja_dojo", 110, 15, 4, 2);
    placeProp("jp_ryokan_inn", 110, 35, 4, 2);
    placeProp("jp_shinto_shrine", 110, 52, 4, 2);
    placeProp("rural_log_cabin", 110, 77, 4, 2);
    // Central Shogun Valley (col 118..130)
    placeProp("jp_shogun_castle", 124, 16, 5, 3);
    placeProp("plains_pagoda", 126, 36, 5, 3);
    placeProp("jp_ninja_dojo", 124, 49, 4, 2);
    placeProp("rural_stilt_hut", 124, 77, 4, 2);
    // Deep East Osaka Castle Compound (col 135..143)
    placeProp("jp_shinto_shrine", 139, 15, 4, 2);
    placeProp("jp_ryokan_inn", 139, 34, 4, 2);
    placeProp("jp_shogun_castle", 139, 55, 5, 3);
  } else {
    // West Red Gate (col 106..114)
    placeProp("city_twin_towers", 110, 15, 5, 3);
    placeProp("rural_twin_cottage", 110, 35, 4, 2);
    placeProp("city_museum", 110, 52, 5, 3);
    placeProp("rural_log_cabin", 110, 77, 4, 2);
    // Central Red Valley (col 118..130)
    placeProp("city_mansion_block", 124, 15, 5, 3);
    placeProp("rural_dutch_barn", 126, 36, 4, 2);
    placeProp("rural_orchard_farm", 124, 49, 5, 2);
    placeProp("rural_stilt_hut", 124, 77, 4, 2);
    // Deep East Red Woods (col 135..143)
    placeProp("rural_stilt_hut", 139, 15, 4, 2);
    placeProp("rural_dutch_barn", 139, 34, 4, 2);
    placeProp("city_mansion_block", 139, 55, 5, 3);
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
    [32, 70, 1.2],  // South Pocket Park puddle
    [56, 38, 1.4],  // Yellow zone avenue edge puddle
    [74, 45, 1.5],
    [85, 55, 1.5],
    [101, 36, 1.4],
    [107, 42, 1.6], // Red zone puddles
    [119, 37, 1.5],
    [129, 46, 1.6],
    [136, 58, 1.5],
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

          // Yellow Zone Kyoto
          { id: "jp_chest-yellow-1", name: "Rương Ngã Tư Phố Cổ Kyoto", kind: "wooden", col: 36, row: 44 },
          { id: "jp_chest-yellow-2", name: "Rương Lữ Quán Suối Khoáng", kind: "wooden", col: 41, row: 21 },
          { id: "jp_chest-yellow-3", name: "Rương Phố Đèn Lồng Đông", kind: "wooden", col: 50, row: 60 },
          { id: "jp_chest-yellow-4", name: "Rương Hồ Kamo Kyoto", kind: "wooden", col: 60, row: 27 },
          { id: "jp_chest-yellow-5", name: "Rương Rừng Trúc Arashiyama", kind: "wooden", col: 76, row: 52 },
          { id: "jp_chest-yellow-6", name: "Rương Vườn Thiền Kyoto", kind: "wooden", col: 93, row: 42 },
          { id: "jp_chest-yellow-7", name: "Rương Võ Đường Ngoại Ô", kind: "wooden", col: 100, row: 64 },
          { id: "jp_chest-yellow-royal-1", name: "Rương Hoàng Kim Đền Inari", kind: "royal", col: 83, row: 14 },
          { id: "jp_chest-yellow-royal-2", name: "Rương Mật Mã Phố Chợ Kyoto", kind: "royal", col: 50, row: 35 },
          { id: "jp_trash-plains-road", name: "Thùng Rác Đại Lộ Kyoto", kind: "trash", col: 74, row: 38 },
          { id: "jp_trash-plains-east", name: "Thùng Rác Ngã Ba Cố Đô", kind: "trash", col: 88, row: 57 },

          // Red Zone Iga & Osaka Castle
          { id: "jp_chest-red-w1", name: "Rương Ám Khí Ninja Iga", kind: "wooden", col: 108, row: 23 },
          { id: "jp_chest-red-w2", name: "Rương Cổng Đền Thần Bí", kind: "wooden", col: 113, row: 44 },
          { id: "jp_chest-red-w3", name: "Rương Hồ Lá Phong Đỏ", kind: "wooden", col: 120, row: 53 },
          { id: "jp_chest-red-w4", name: "Rương Rừng Trúc Mạc Phủ", kind: "wooden", col: 136, row: 26 },
          { id: "jp_chest-red-w5", name: "Rương Chân Thành Osaka Nam", kind: "wooden", col: 140, row: 64 },
          { id: "jp_chest-red-royal-1", name: "Rương Hoàng Kim Thành Shogun", kind: "royal", col: 128, row: 15 },
          { id: "jp_chest-red-royal-2", name: "Rương Báu Vật Suối Khoáng", kind: "royal", col: 135, row: 44 },
          { id: "jp_chest-red-royal-3", name: "Rương Cổ Vật Rừng Phong", kind: "royal", col: 118, row: 76 },
          { id: "jp_chest-red-royal-4", name: "Rương Quốc Bảo Mạc Phủ", kind: "royal", col: 140, row: 76 },
          { id: "jp_trash-rural-trail", name: "Thùng Rác Cổng Làng Ninja", kind: "trash", col: 106, row: 41 },
        ]
      : [
          // Green Safe Zone: ONLY Trash Bins (scarce C/B items, zero chests!)
          { id: "trash-green-plaza-w", name: "Thùng Rác Quảng Trường Tây", kind: "trash", col: 15, row: 43 },
          { id: "trash-green-plaza-e", name: "Thùng Rác Quảng Trường Đông", kind: "trash", col: 23, row: 43 },
          { id: "trash-green-shop", name: "Thùng Rác Phố Mua Sắm", kind: "trash", col: 23, row: 37 },
          { id: "trash-green-hospital", name: "Thùng Rác Bệnh Viện", kind: "trash", col: 10, row: 25 },
          { id: "trash-green-park", name: "Thùng Rác Hồ Tây Xanh", kind: "trash", col: 23, row: 21 },
          { id: "trash-green-breeze", name: "Thùng Rác Công Viên Gió", kind: "trash", col: 9, row: 52 },

          // Yellow Zone (Expanded +50%, 11 Rearranged Loot Spots = +22%: Urban East + Plains + Lakes)
          { id: "chest-yellow-1", name: "Rương Ngã Tư Phố Đông", kind: "wooden", col: 36, row: 44 },
          { id: "chest-yellow-2", name: "Rương Khu Tập Thể Bắc", kind: "wooden", col: 41, row: 21 },
          { id: "chest-yellow-3", name: "Rương Phố Chợ Đông", kind: "wooden", col: 50, row: 60 },
          { id: "chest-yellow-4", name: "Rương Bờ Hồ Sen Tây", kind: "wooden", col: 60, row: 27 },
          { id: "chest-yellow-5", name: "Rương Bãi Cỏ Đồng Bằng", kind: "wooden", col: 76, row: 52 },
          { id: "chest-yellow-6", name: "Rương Hồ Phương Đông", kind: "wooden", col: 93, row: 42 },
          { id: "chest-yellow-7", name: "Rương Trang Trại Biên Giới", kind: "wooden", col: 100, row: 64 },
          { id: "chest-yellow-royal-1", name: "Rương Hoàng Kim Chùa Cổ", kind: "royal", col: 83, row: 14 },
          { id: "chest-yellow-royal-2", name: "Rương Mật Mã Phố Đông", kind: "royal", col: 50, row: 35 },
          { id: "trash-plains-road", name: "Thùng Rác Quốc Lộ Vàng", kind: "trash", col: 74, row: 38 },
          { id: "trash-plains-east", name: "Thùng Rác Ngã Ba Đồng Bằng", kind: "trash", col: 88, row: 57 },

          // Red Zone (Expanded +50%, 10 Rearranged High-Value Spots = +25%: West / Central / Deep East Red)
          { id: "chest-red-w1", name: "Rương Kho Báu Tháp Đôi", kind: "wooden", col: 108, row: 23 },
          { id: "chest-red-w2", name: "Rương Bến Rừng Tây", kind: "wooden", col: 113, row: 44 },
          { id: "chest-red-w3", name: "Rương Ven Hồ Rừng Sâu", kind: "wooden", col: 120, row: 53 },
          { id: "chest-red-w4", name: "Rương Rừng Sâu Phương Đông", kind: "wooden", col: 136, row: 26 },
          { id: "chest-red-w5", name: "Rương Góc Rừng Đông Nam", kind: "wooden", col: 140, row: 64 },
          { id: "chest-red-royal-1", name: "Rương Đỏ Hoàng Gia Bắc", kind: "royal", col: 128, row: 15 },
          { id: "chest-red-royal-2", name: "Rương Hoàng Kim Ao Làng", kind: "royal", col: 135, row: 44 },
          { id: "chest-red-royal-3", name: "Rương Bí Ẩn Rừng Sâu", kind: "royal", col: 118, row: 76 },
          { id: "chest-red-royal-4", name: "Rương Kho Báu Tận Cùng", kind: "royal", col: 140, row: 76 },
          { id: "trash-rural-trail", name: "Thùng Rác Đầu Vùng Đỏ", kind: "trash", col: 106, row: 41 },
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
        // Countryside: flora heavily outnumbers buildings!
        const bigTreeKind = isJapan ? "momiji_tree" : "oak_moss";
        const smallTreeKind = isJapan ? "momiji_small" : "tree_small_moss";
        const warmBigKind = isJapan ? "sakura_tree" : "oak_warm";
        const warmSmallKind = isJapan ? "sakura_small" : "tree_small_warm";
        if (tile === "forest") {
          if (r < 0.068 && canFitMultiTile(cols, rows, collision, reserved, tiles, col, row, 3, 2)) {
            placeProp(bigTreeKind, col, row, 3, 1, 0.5, 0.92);
          } else if (r < 0.165) {
            placeProp(smallTreeKind, col, row, 1, 1, 0.5, 0.92);
          } else if (r < 0.205) {
            placeProp(rng() < 0.5 ? "boulder" : "stump", col, row, 1, 1, 0.5, 0.92);
          } else if (r < 0.28) {
            props.push({
              id: propId++,
              kind: rng() < 0.5 ? "bush_a" : "bush_b",
              x: (col + 0.5) * TILE_SIZE,
              y: (row + 0.8) * TILE_SIZE,
              blocking: false,
            });
          }
        } else if (tile === "grass" || tile === "meadow") {
          if (r < 0.036 && canFitMultiTile(cols, rows, collision, reserved, tiles, col, row, 3, 2)) {
            placeProp(warmBigKind, col, row, 3, 1, 0.5, 0.92);
          } else if (r < 0.095) {
            placeProp(warmSmallKind, col, row, 1, 1, 0.5, 0.92);
          } else if (r < 0.125) {
            placeProp(rng() < 0.5 ? "stone_small" : "stump", col, row, 1, 1, 0.5, 0.88);
          } else if (r < 0.19) {
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
            placeProp(plainsSmall, col, row, 1, 1, 0.5, 0.92);
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
