import {
  MAP_COLS,
  MAP_ROWS,
  TILE_SIZE,
  type BiomeId,
  type Point,
  type PropKind,
  type TileType,
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

export function generateOpenWorld(seed = 202611): WorldData {
  const cols = MAP_COLS;
  const rows = MAP_ROWS;
  const total = cols * rows;
  const rng = createRng(seed);

  const tiles = Array.from<TileType>({ length: total });
  const biomes = Array.from<BiomeId>({ length: total });
  const collision = new Uint8Array(total);
  const reserved = new Uint8Array(total);
  const props: WorldProp[] = [];
  const lilypads: Point[] = [];

  const centerCol = Math.floor(cols / 2);
  const centerRow = Math.floor(rows / 2);

  // 1. Base terrain & biome generation
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;

      const isBorder = col <= 1 || row <= 1 || col >= cols - 2 || row >= rows - 2;
      if (isBorder) {
        tiles[idx] = "water";
        biomes[idx] = "coast";
        collision[idx] = 1;
        continue;
      }

      const dx = col - centerCol;
      const dy = row - centerRow;
      const distCenter = Math.hypot(dx, dy);

      // Central Village Plaza
      if (distCenter <= 6.2) {
        tiles[idx] = "stone";
        biomes[idx] = "sanctuary";
        collision[idx] = 0;
        continue;
      }

      // Main winding dirt roads along 4 cardinal axes
      const wobbleX = Math.round(Math.sin(row * 0.22) * 1.2);
      const wobbleY = Math.round(Math.cos(col * 0.22) * 1.2);
      const onVerticalRoad = Math.abs(col - (centerCol + wobbleX)) <= 1 && Math.abs(dy) <= 26;
      const onHorizontalRoad = Math.abs(row - (centerRow + wobbleY)) <= 1 && Math.abs(dx) <= 26;

      if (onVerticalRoad || onHorizontalRoad) {
        tiles[idx] = distCenter < 11 ? "stone" : "dirt";
        biomes[idx] = distCenter < 12 ? "sanctuary" : "meadow";
        collision[idx] = 0;
        continue;
      }

      const elevation = fbm(col * 0.072, row * 0.072, seed);
      const moisture = fbm(col * 0.085 + 42, row * 0.085 + 42, seed + 409);

      if (elevation < 0.29 && distCenter > 9) {
        tiles[idx] = "water";
        biomes[idx] = "coast";
        collision[idx] = 1;
      } else if (elevation < 0.355 && distCenter > 8) {
        tiles[idx] = "sand";
        biomes[idx] = "coast";
        collision[idx] = 0;
      } else if (moisture > 0.56 && elevation > 0.42) {
        tiles[idx] = "forest";
        biomes[idx] = "woods";
        collision[idx] = 0;
      } else if (elevation > 0.55) {
        tiles[idx] = "meadow";
        biomes[idx] = "meadow";
        collision[idx] = 0;
      } else {
        tiles[idx] = "grass";
        biomes[idx] = "meadow";
        collision[idx] = 0;
      }
    }
  }

  // 2. Wooden bridges wherever main axes cross water channels
  for (let row = 4; row < rows - 4; row++) {
    for (let col = 4; col < cols - 4; col++) {
      const idx = row * cols + col;
      if (tiles[idx] !== "water") continue;

      const onBridgeAxis = Math.abs(col - centerCol) <= 1 || Math.abs(row - centerRow) <= 1;
      if (onBridgeAxis) {
        tiles[idx] = "bridge";
        collision[idx] = 0;
      }
    }
  }

  // 3. Landmarks & Hero Architectural Landmarks
  const landmarks: WorldLandmark[] = [
    {
      id: "sanctuary",
      name: "Cổ Trấn Khởi Nguyên",
      subtitle: "Quảng trường trung tâm — Chạm bất kỳ đâu để thám hiểm",
      x: (centerCol + 0.5) * TILE_SIZE,
      y: (centerRow + 0.5) * TILE_SIZE,
      radius: 260,
      accentColor: 0x10b981,
      discovered: true,
    },
    {
      id: "north-shrine",
      name: "Thánh Điện Rêu Phong",
      subtitle: "Phế tích cổ đại ẩn sâu giữa rừng thông phía Bắc",
      x: centerCol * TILE_SIZE,
      y: 16 * TILE_SIZE,
      radius: 240,
      accentColor: 0x34d399,
      discovered: false,
    },
    {
      id: "east-watchtower",
      name: "Vọng Lâu Thảo Nguyên",
      subtitle: "Tháp gỗ nhìn ra toàn cảnh đồng cỏ phía Đông",
      x: 68 * TILE_SIZE,
      y: centerRow * TILE_SIZE,
      radius: 240,
      accentColor: 0x38bdf8,
      discovered: false,
    },
    {
      id: "west-oasis",
      name: "Túp Lều Bờ Hồ Sen",
      subtitle: "Nơi trú ẩn yên bình bên hồ nước phía Tây",
      x: 16 * TILE_SIZE,
      y: centerRow * TILE_SIZE,
      radius: 240,
      accentColor: 0xfbbf24,
      discovered: false,
    },
    {
      id: "south-guardian",
      name: "Tượng Thần Hộ Vệ",
      subtitle: "Pho tượng đá cổ canh giữ cổng phía Nam",
      x: centerCol * TILE_SIZE,
      y: 68 * TILE_SIZE,
      radius: 240,
      accentColor: 0xa78bfa,
      discovered: false,
    },
  ];

  // Ensure walkable stone pads around each landmark
  for (const lm of landmarks) {
    const lc = Math.floor(lm.x / TILE_SIZE);
    const lr = Math.floor(lm.y / TILE_SIZE);
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const nc = lc + dx;
        const nr = lr + dy;
        if (nc <= 2 || nr <= 2 || nc >= cols - 3 || nr >= rows - 3) continue;
        const idx = nr * cols + nc;
        if (tiles[idx] === "water") tiles[idx] = "sand";
        if (Math.hypot(dx, dy) <= 2.6) {
          tiles[idx] = "stone";
        }
        collision[idx] = 0;
        reserved[idx] = 1;
      }
    }
  }

  let propId = 1;
  const placeProp = (
    kind: PropKind,
    anchorCol: number,
    anchorRow: number,
    blockCols: number,
    blockRows: number,
    offsetX = 0.5,
    offsetY = 0.9,
  ): void => {
    const halfW = Math.floor(blockCols / 2);
    for (let r = anchorRow - blockRows + 1; r <= anchorRow; r++) {
      for (let c = anchorCol - halfW; c <= anchorCol + (blockCols - 1 - halfW); c++) {
        if (c <= 1 || r <= 1 || c >= cols - 2 || r >= rows - 2) continue;
        const idx = r * cols + c;
        collision[idx] = 1;
        reserved[idx] = 1;
      }
    }

    // Reserve 1-tile walking clearance buffer around front/sides of buildings
    for (let r = anchorRow - blockRows; r <= anchorRow + 1; r++) {
      for (let c = anchorCol - halfW - 1; c <= anchorCol + (blockCols - halfW) + 1; c++) {
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
      blocking: true,
    });
  };

  // Place iconic landmarks & Sanctuary architecture
  // Sanctuary Lodge (north-west of center plaza) & Pillars & Cute Frog Statue
  placeProp("lodge", centerCol - 4, centerRow - 4, 3, 2, 0.5, 0.92);
  placeProp("frog_statue", centerCol + 3, centerRow - 3, 2, 1, 0.0, 0.9);
  placeProp("ruin_pillar", centerCol - 5, centerRow + 2, 1, 1, 0.5, 0.92);
  placeProp("ruin_pillar", centerCol + 5, centerRow + 2, 1, 1, 0.5, 0.92);

  // North Ruined Temple
  placeProp("shrine_ruin", centerCol, 13, 3, 2, 0.5, 0.92);
  placeProp("ruin_pillar", centerCol - 3, 15, 1, 1, 0.5, 0.92);
  placeProp("ruin_pillar", centerCol + 3, 15, 1, 1, 0.5, 0.92);

  // East Watchtower
  placeProp("watchtower", 68, centerRow - 3, 2, 2, 0.5, 0.92);

  // West Overgrown Hut
  placeProp("hut", 16, centerRow - 3, 3, 2, 0.5, 0.92);

  // South Golem Guardian
  placeProp("golem_statue", centerCol, 65, 2, 2, 0.0, 0.92);
  placeProp("boulder", centerCol - 3, 66, 2, 1, 0.0, 0.92);
  placeProp("boulder", centerCol + 3, 66, 2, 1, 0.0, 0.92);

  // Clear spawn tile safely
  const spawnCol = centerCol;
  const spawnRow = centerRow + 1;
  collision[spawnRow * cols + spawnCol] = 0;

  // 4. Populate lush natural trees, boulders, bushes, stumps & lilypads
  for (let row = 4; row < rows - 4; row++) {
    for (let col = 4; col < cols - 4; col++) {
      const idx = row * cols + col;
      const tile = tiles[idx];

      // Sprinkle blooming lilypads in calm water
      if (tile === "water") {
        if (rng() < 0.032) {
          lilypads.push({
            x: (col + 0.5) * TILE_SIZE,
            y: (row + 0.5) * TILE_SIZE,
          });
        }
        continue;
      }

      if (collision[idx] !== 0 || reserved[idx] !== 0) continue;
      if (tile === "stone" || tile === "dirt" || tile === "bridge") continue;

      const r = rng();

      if (tile === "forest") {
        if (r < 0.055 && canFitMultiTile(cols, rows, collision, reserved, tiles, col, row, 3, 2)) {
          placeProp("oak_moss", col, row, 3, 1, 0.5, 0.92);
        } else if (r < 0.145) {
          placeProp("tree_small_moss", col, row, 1, 1, 0.5, 0.92);
        } else if (r < 0.18) {
          placeProp(rng() < 0.5 ? "boulder" : "stump", col, row, 1, 1, 0.5, 0.92);
        } else if (r < 0.24) {
          props.push({
            id: propId++,
            kind: rng() < 0.5 ? "bush_a" : "bush_b",
            x: (col + 0.5) * TILE_SIZE,
            y: (row + 0.8) * TILE_SIZE,
            blocking: false,
          });
        }
      } else if (tile === "grass" || tile === "meadow") {
        if (r < 0.018 && canFitMultiTile(cols, rows, collision, reserved, tiles, col, row, 3, 2)) {
          placeProp("oak_warm", col, row, 3, 1, 0.5, 0.92);
        } else if (r < 0.045) {
          placeProp("tree_small_warm", col, row, 1, 1, 0.5, 0.92);
        } else if (r < 0.062) {
          placeProp(rng() < 0.45 ? "stone_small" : "stump", col, row, 1, 1, 0.5, 0.88);
        } else if (r < 0.095) {
          props.push({
            id: propId++,
            kind: rng() < 0.5 ? "bush_a" : "bush_b",
            x: (col + 0.5) * TILE_SIZE,
            y: (row + 0.8) * TILE_SIZE,
            blocking: false,
          });
        }
      } else if (tile === "sand" && r < 0.03) {
        placeProp("stone_small", col, row, 1, 1, 0.5, 0.88);
      }
    }
  }

  return {
    cols,
    rows,
    tileSize: TILE_SIZE,
    tiles,
    biomes,
    collision,
    props,
    landmarks,
    lilypads,
    spawn: {
      x: (spawnCol + 0.5) * TILE_SIZE,
      y: (spawnRow + 0.5) * TILE_SIZE,
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
      if (t === "water" || t === "stone" || t === "dirt" || t === "bridge") return false;
    }
  }
  return true;
}
