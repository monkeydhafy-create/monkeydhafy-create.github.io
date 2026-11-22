import { LOCKED_PUZZLE_KINDS, type LockedPuzzleKind } from "../LootSystem.ts";
import { TILE_SIZE, type Point } from "../types.ts";
import type {
  DungeonBranchRoomId,
  DungeonChestNode,
  DungeonDirection,
  DungeonMazeScareNode,
  DungeonMazeStyle,
  DungeonMinigameKind,
  DungeonRoomId,
  DungeonRoomLayout,
  DungeonRunState,
  DungeonScareKind,
} from "./DungeonTypes.ts";

const MAZE_STYLES: readonly DungeonMazeStyle[] = ["dfs", "prim", "growing_tree", "kruskal_chambers"];
const RARE_CHEST_CHANCE = 0.1;
let dungeonRunSeq = 0;
const recentMazeHashes = new Set<string>();
let lastDirToRoom: Record<DungeonDirection, DungeonBranchRoomId> | null = null;
let lastExitDirection: DungeonDirection | null = null;
let lastBargeDirToRoom: Record<DungeonDirection, DungeonBranchRoomId> | null = null;
let lastBargeExitDirection: DungeonDirection | null = null;

function createFreshSeed(): number {
  dungeonRunSeq += 1;
  let randBits = Math.floor(Math.random() * 0xffffffff);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const arr = new Uint32Array(1);
    globalThis.crypto.getRandomValues(arr);
    randBits = arr[0];
  }
  const mixed = (Date.now() ^ randBits ^ Math.imul(dungeonRunSeq, 2654435761)) >>> 0;
  return mixed || dungeonRunSeq;
}

function hashMazeCollision(collision: Uint8Array, style: DungeonMazeStyle, startPt: Point): string {
  let h = 2166136261;
  for (let i = 0; i < collision.length; i++) {
    h ^= collision[i];
    h = Math.imul(h, 16777619);
  }
  return `${style}:${Math.round(startPt.x)}x${Math.round(startPt.y)}:${(h >>> 0).toString(36)}`;
}

const BRANCH_ROOM_IDS: readonly DungeonBranchRoomId[] = ["room_sort", "room_beans", "room_free", "room_maze"];
const BARGE_BRANCH_ROOM_IDS: readonly DungeonBranchRoomId[] = ["room_beer", "room_boat", "room_rafts", "room_free"];
const DIRECTIONS: readonly DungeonDirection[] = ["north", "south", "east", "west"];
const DIRECTION_LABELS: Record<DungeonDirection, string> = {
  north: "Hướng Bắc",
  south: "Hướng Nam",
  east: "Hướng Đông",
  west: "Hướng Tây",
};

function makeSurfaceExitPortal(
  runId: string,
  roomId: DungeonBranchRoomId,
  x: number,
  y: number,
  requiresStationClear = false,
  exitLabel = "🚪 Cửa Thoát Lên Mặt Đất",
  exitTag = "🚪 LÊN MẶT ĐẤT",
) {
  return {
    id: `${runId}_${roomId}_exit_surface`,
    targetRoom: "exit_world" as const,
    label: exitLabel,
    shortTag: exitTag,
    x,
    y,
    color: 0x10b981,
    requiresStationClear,
  };
}

function createRng(seed: number): () => number {
  let a = (seed >>> 0) || 1;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < 4; i++) next();
  return next;
}

function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildAllPermutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  const result: T[][] = [];
  for (let i = 0; i < items.length; i++) {
    const rest = items.filter((_, idx) => idx !== i);
    for (const sub of buildAllPermutations(rest)) {
      result.push([items[i], ...sub]);
    }
  }
  return result;
}

const ALL_HOANG_THANH_PERMS: readonly (readonly DungeonBranchRoomId[])[] = buildAllPermutations(BRANCH_ROOM_IDS);
const ALL_BARGE_PERMS: readonly (readonly DungeonBranchRoomId[])[] = buildAllPermutations(BARGE_BRANCH_ROOM_IDS);

function pickDirToRoomFromPerms(
  perms: readonly (readonly DungeonBranchRoomId[])[],
  rng: () => number,
  prev: Record<DungeonDirection, DungeonBranchRoomId> | null,
): Record<DungeonDirection, DungeonBranchRoomId> {
  const pool = prev
    ? perms.filter((perm) => DIRECTIONS.every((dir, idx) => perm[idx] !== prev[dir]))
    : perms;
  const chosen = pool[Math.floor(rng() * pool.length)];
  const dirToRoom = {} as Record<DungeonDirection, DungeonBranchRoomId>;
  DIRECTIONS.forEach((dir, idx) => {
    dirToRoom[dir] = chosen[idx];
  });
  return dirToRoom;
}

function pickPuzzle(rng: () => number): { kind: LockedPuzzleKind; seed: number } {
  const kind = LOCKED_PUZZLE_KINDS[Math.floor(rng() * LOCKED_PUZZLE_KINDS.length)];
  const seed = 1 + Math.floor(rng() * 0x7ffffff0);
  return { kind, seed };
}

function createBoxCollision(cols: number, rows: number, obstacles: ReadonlyArray<[number, number]> = []): Uint8Array {
  const col = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r <= 1 || r >= rows - 1 || c === 0 || c === cols - 1) {
        col[r * cols + c] = 1;
      }
    }
  }
  for (const [oc, or] of obstacles) {
    if (oc > 0 && oc < cols - 1 && or > 1 && or < rows - 1) {
      col[or * cols + oc] = 1;
    }
  }
  return col;
}

function buildHubRoom(
  runId: string,
  dirToRoom: Record<DungeonDirection, DungeonBranchRoomId>,
  title = "🏯 Sảnh Trung Tâm — Địa Đạo Hoàng Thành",
  subtitle = "Bốn lối rẽ dẫn về Đông – Tây – Nam – Bắc. Hãy tìm cửa thoát ẩn giấu trong một trong bốn hướng để trở về mặt đất.",
  floorTint = 0x94a3b8,
  wallColor = 0x334155,
): DungeonRoomLayout {
  const cols = 22;
  const rows = 15;
  const pillars: Array<[number, number]> = [
    [4, 4],
    [17, 4],
    [4, 10],
    [17, 10],
  ];
  const collision = createBoxCollision(cols, rows, pillars);
  return {
    id: "hub",
    title,
    subtitle,
    cols,
    rows,
    collision,
    floorTint,
    wallColor,
    spawn: { x: 11 * TILE_SIZE, y: 7.4 * TILE_SIZE },
    portals: [
      {
        id: `${runId}_p_north`,
        targetRoom: dirToRoom.north,
        label: "🧭 Lối Vào Hướng Bắc",
        shortTag: "⬆️ HƯỚNG BẮC",
        x: 11 * TILE_SIZE,
        y: 2.8 * TILE_SIZE,
        color: 0xf59e0b,
      },
      {
        id: `${runId}_p_south`,
        targetRoom: dirToRoom.south,
        label: "🧭 Lối Vào Hướng Nam",
        shortTag: "⬇️ HƯỚNG NAM",
        x: 11 * TILE_SIZE,
        y: 12.1 * TILE_SIZE,
        color: 0xf59e0b,
      },
      {
        id: `${runId}_p_west`,
        targetRoom: dirToRoom.west,
        label: "🧭 Lối Vào Hướng Tây",
        shortTag: "⬅️ HƯỚNG TÂY",
        x: 2.6 * TILE_SIZE,
        y: 7.4 * TILE_SIZE,
        color: 0xf59e0b,
      },
      {
        id: `${runId}_p_east`,
        targetRoom: dirToRoom.east,
        label: "🧭 Lối Vào Hướng Đông",
        shortTag: "➡️ HƯỚNG ĐÔNG",
        x: 19.4 * TILE_SIZE,
        y: 7.4 * TILE_SIZE,
        color: 0xf59e0b,
      },
    ],
    chests: [],
    torches: [
      { x: 11 * TILE_SIZE, y: 2.2 * TILE_SIZE },
      { x: 11 * TILE_SIZE, y: 12.2 * TILE_SIZE },
      { x: 2.2 * TILE_SIZE, y: 7.4 * TILE_SIZE },
      { x: 19.8 * TILE_SIZE, y: 7.4 * TILE_SIZE },
    ],
    isMaze: false,
  };
}

function buildCoinSortRoom(
  runId: string,
  rng: () => number,
  direction: DungeonDirection,
  hasSurfaceExit: boolean,
): DungeonRoomLayout {
  const cols = 20;
  const rows = 14;
  const obstacles: Array<[number, number]> = [
    [2, 2],
    [17, 2],
    [8, 4],
    [9, 4],
    [10, 4],
    [11, 4],
  ];
  const collision = createBoxCollision(cols, rows, obstacles);
  const chestSpots: ReadonlyArray<[number, number]> = [
    [3.5, 4.2],
    [3.5, 8.8],
    [16.5, 4.2],
    [16.5, 8.8],
    [6.5, 3.2],
    [13.5, 3.2],
  ];
  const chosen = shuffleInPlace([...chestSpots], rng);
  const chests: DungeonChestNode[] = chosen.map(([cx, cy], idx) => {
    const isRoyal = rng() < RARE_CHEST_CHANCE;
    return {
      id: `dungeon_${runId}_sort_${idx}`,
      roomId: "room_sort",
      name: isRoyal ? "Rương Hiếm Xưởng Đúc" : `Rương Xu Cổ #${idx + 1}`,
      x: cx * TILE_SIZE,
      y: cy * TILE_SIZE,
      locked: false,
      opened: false,
      royal: isRoyal,
      revealedInRoom: false,
    };
  });

  const portals: DungeonRoomLayout["portals"] = [
    {
      id: `${runId}_sort_back`,
      targetRoom: "hub",
      label: "⬅️ Quay Về Sảnh Trung Tâm",
      shortTag: "⬅️ VỀ SẢNH",
      x: 10 * TILE_SIZE,
      y: 12.1 * TILE_SIZE,
      color: 0x38bdf8,
    },
  ];
  if (hasSurfaceExit) {
    portals.push(makeSurfaceExitPortal(runId, "room_sort", 10 * TILE_SIZE, 2.7 * TILE_SIZE, true));
  }

  return {
    id: "room_sort",
    direction,
    title: `🧭 Địa Đạo — ${DIRECTION_LABELS[direction]}`,
    subtitle: "Hầm gạch cổ lạnh lẽo sâu dưới Hoàng Thành — Tìm kiếm cổ vật và lối thoát lên mặt đất.",
    cols,
    rows,
    collision,
    floorTint: 0x9ca3af,
    wallColor: 0x292524,
    spawn: { x: 10 * TILE_SIZE, y: 10.6 * TILE_SIZE },
    portals,
    station: {
      id: `${runId}_st_sort`,
      roomId: "room_sort",
      kind: "coin_sort",
      title: "🪙 Băng Chuyền Sàng Lọc Xu Cổ",
      promptLabel: "❗ Kiểm tra Bàn Cơ Khí Cổ [E]",
      x: 10 * TILE_SIZE,
      y: 6.2 * TILE_SIZE,
      cleared: false,
    },
    chests,
    torches: [
      { x: 4 * TILE_SIZE, y: 2.2 * TILE_SIZE },
      { x: 16 * TILE_SIZE, y: 2.2 * TILE_SIZE },
      { x: 10 * TILE_SIZE, y: 6.0 * TILE_SIZE },
    ],
    isMaze: false,
  };
}

function buildPeanutStealRoom(
  runId: string,
  rng: () => number,
  direction: DungeonDirection,
  hasSurfaceExit: boolean,
): DungeonRoomLayout {
  const cols = 20;
  const rows = 14;
  const obstacles: Array<[number, number]> = [
    [9, 5],
    [10, 5],
    [2, 2],
    [17, 2],
  ];
  const collision = createBoxCollision(cols, rows, obstacles);
  const chestSpots: ReadonlyArray<[number, number]> = [
    [3.5, 4.2],
    [3.5, 8.8],
    [16.5, 4.2],
    [16.5, 8.8],
    [6.5, 3.2],
    [13.5, 3.2],
  ];
  const chosen = shuffleInPlace([...chestSpots], rng);
  const chests: DungeonChestNode[] = chosen.map(([cx, cy], idx) => {
    const isRoyal = rng() < RARE_CHEST_CHANCE;
    return {
      id: `dungeon_${runId}_beans_${idx}`,
      roomId: "room_beans",
      name: isRoyal ? "Rương Hiếm Phòng Trà" : `Rương Kho Quan Lớn #${idx + 1}`,
      x: cx * TILE_SIZE,
      y: cy * TILE_SIZE,
      locked: false,
      opened: false,
      royal: isRoyal,
      revealedInRoom: false,
    };
  });

  const portals: DungeonRoomLayout["portals"] = [
    {
      id: `${runId}_beans_back`,
      targetRoom: "hub",
      label: "⬅️ Quay Về Sảnh Trung Tâm",
      shortTag: "⬅️ VỀ SẢNH",
      x: 10 * TILE_SIZE,
      y: 12.1 * TILE_SIZE,
      color: 0x38bdf8,
    },
  ];
  if (hasSurfaceExit) {
    portals.push(makeSurfaceExitPortal(runId, "room_beans", 10 * TILE_SIZE, 2.7 * TILE_SIZE, true));
  }

  return {
    id: "room_beans",
    direction,
    title: `🧭 Địa Đạo — ${DIRECTION_LABELS[direction]}`,
    subtitle: "Hầm gạch cổ lạnh lẽo sâu dưới Hoàng Thành — Tìm kiếm cổ vật và lối thoát lên mặt đất.",
    cols,
    rows,
    collision,
    floorTint: 0xa89f91,
    wallColor: 0x3f2e21,
    spawn: { x: 10 * TILE_SIZE, y: 10.6 * TILE_SIZE },
    portals,
    station: {
      id: `${runId}_st_beans`,
      roomId: "room_beans",
      kind: "peanut_steal",
      title: "🥜 Bàn Trà Quan Lớn",
      promptLabel: "❗ Lại gần Bàn Trà Quan Lớn [E]",
      x: 10 * TILE_SIZE,
      y: 6.9 * TILE_SIZE,
      cleared: false,
    },
    chests,
    torches: [
      { x: 4 * TILE_SIZE, y: 2.2 * TILE_SIZE },
      { x: 16 * TILE_SIZE, y: 2.2 * TILE_SIZE },
      { x: 10 * TILE_SIZE, y: 4.5 * TILE_SIZE },
    ],
    isMaze: false,
  };
}

function buildFreeRoom(
  runId: string,
  rng: () => number,
  direction: DungeonDirection,
  hasSurfaceExit: boolean,
  theme?: {
    titlePrefix: string;
    subtitle: string;
    backTag: string;
    exitLabel: string;
    exitTag: string;
    floorTint: number;
    wallColor: number;
  },
): DungeonRoomLayout {
  const cols = 20;
  const rows = 14;
  const pillars: Array<[number, number]> = [
    [5, 4],
    [14, 4],
    [5, 9],
    [14, 9],
  ];
  const collision = createBoxCollision(cols, rows, pillars);
  const chestSpots: ReadonlyArray<[number, number]> = [
    [3.5, 4.0],
    [10.0, 5.2],
    [16.5, 4.0],
    [3.5, 8.8],
    [16.5, 8.8],
    [10.0, 7.0],
  ];
  const count = 1 + Math.floor(rng() * 4); // random 1..4 chests
  const chosen = shuffleInPlace([...chestSpots], rng).slice(0, count);

  const chests: DungeonChestNode[] = chosen.map(([cx, cy], idx) => {
    const isRoyal = rng() < RARE_CHEST_CHANCE;
    const isLocked = rng() < 0.45;
    const p = isLocked ? pickPuzzle(rng) : null;
    return {
      id: `dungeon_${runId}_free_${idx}`,
      roomId: "room_free",
      name: isRoyal
        ? `Rương Hiếm Khoang Chứa #${idx + 1}`
        : isLocked
          ? `Két Cổ Bị Khóa #${idx + 1}`
          : `Rương Kho Cổ #${idx + 1}`,
      x: cx * TILE_SIZE,
      y: cy * TILE_SIZE,
      locked: isLocked,
      opened: false,
      royal: isRoyal,
      revealedInRoom: true,
      ...(p ? { puzzleKind: p.kind, puzzleSeed: p.seed } : {}),
    };
  });

  const portals: DungeonRoomLayout["portals"] = [
    {
      id: `${runId}_free_back`,
      targetRoom: "hub",
      label: "⬅️ Quay Về Sảnh Trung Tâm",
      shortTag: theme?.backTag ?? "⬅️ VỀ SẢNH",
      x: 10 * TILE_SIZE,
      y: 12.1 * TILE_SIZE,
      color: 0x38bdf8,
    },
  ];
  if (hasSurfaceExit) {
    portals.push(
      makeSurfaceExitPortal(
        runId,
        "room_free",
        10 * TILE_SIZE,
        2.7 * TILE_SIZE,
        false,
        theme?.exitLabel,
        theme?.exitTag,
      ),
    );
  }

  return {
    id: "room_free",
    direction,
    title: `${theme?.titlePrefix ?? "🧭 Địa Đạo"} — ${DIRECTION_LABELS[direction]}`,
    subtitle:
      theme?.subtitle ??
      "Hầm gạch cổ lạnh lẽo sâu dưới Hoàng Thành — Tìm kiếm cổ vật và lối thoát lên mặt đất.",
    cols,
    rows,
    collision,
    floorTint: theme?.floorTint ?? 0x8ea4b8,
    wallColor: theme?.wallColor ?? 0x1e293b,
    spawn: { x: 10 * TILE_SIZE, y: 10.6 * TILE_SIZE },
    portals,
    chests,
    torches: [
      { x: 4 * TILE_SIZE, y: 2.2 * TILE_SIZE },
      { x: 16 * TILE_SIZE, y: 2.2 * TILE_SIZE },
      { x: 10 * TILE_SIZE, y: 6.2 * TILE_SIZE },
    ],
    isMaze: false,
  };
}

function buildMazeRoom(
  runId: string,
  rng: () => number,
  direction: DungeonDirection,
  hasSurfaceExit: boolean,
): DungeonRoomLayout {
  const mCols = 22;
  const mRows = 18;
  const cellSpan = 3; // 2-tile wide corridors + 1-tile solid stone wall
  const cols = mCols * cellSpan + 1; // 67
  const rows = mRows * cellSpan + 1; // 55
  const totalCells = mCols * mRows;
  const collision = new Uint8Array(cols * rows).fill(1);
  const mazeStyle = MAZE_STYLES[Math.floor(rng() * MAZE_STYLES.length)];

  const carveCellBlock = (mx: number, my: number): void => {
    const x0 = mx * cellSpan + 1;
    const y0 = my * cellSpan + 1;
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        collision[(y0 + dy) * cols + (x0 + dx)] = 0;
      }
    }
  };

  const carveWallBetween = (ax: number, ay: number, bx: number, by: number): void => {
    if (bx === ax + 1) {
      const wx = ax * cellSpan + 3;
      const y0 = ay * cellSpan + 1;
      collision[y0 * cols + wx] = 0;
      collision[(y0 + 1) * cols + wx] = 0;
    } else if (bx === ax - 1) {
      const wx = bx * cellSpan + 3;
      const y0 = ay * cellSpan + 1;
      collision[y0 * cols + wx] = 0;
      collision[(y0 + 1) * cols + wx] = 0;
    } else if (by === ay + 1) {
      const x0 = ax * cellSpan + 1;
      const wy = ay * cellSpan + 3;
      collision[wy * cols + x0] = 0;
      collision[wy * cols + (x0 + 1)] = 0;
    } else if (by === ay - 1) {
      const x0 = ax * cellSpan + 1;
      const wy = by * cellSpan + 3;
      collision[wy * cols + x0] = 0;
      collision[wy * cols + (x0 + 1)] = 0;
    }
  };

  const adj: Array<Array<[number, number]>> = Array.from({ length: totalCells }, () => []);
  const addLink = (ax: number, ay: number, bx: number, by: number): void => {
    const aIdx = ay * mCols + ax;
    const bIdx = by * mCols + bx;
    if (adj[aIdx].some(([nx, ny]) => nx === bx && ny === by)) return;
    adj[aIdx].push([bx, by]);
    adj[bIdx].push([ax, ay]);
    carveWallBetween(ax, ay, bx, by);
  };

  const dirs: ReadonlyArray<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const startPool: ReadonlyArray<{ mx: number; my: number; portalDx: number; portalDy: number }> = [
    { mx: 0, my: 9, portalDx: -22, portalDy: 0 },
    { mx: 21, my: 9, portalDx: 22, portalDy: 0 },
    { mx: 11, my: 0, portalDx: 0, portalDy: -22 },
    { mx: 11, my: 17, portalDx: 0, portalDy: 22 },
  ];
  const startSpec = startPool[Math.floor(rng() * startPool.length)];
  const startMx = startSpec.mx;
  const startMy = startSpec.my;
  const startIdx = startMy * mCols + startMx;

  if (mazeStyle === "dfs") {
    const visited = new Uint8Array(totalCells);
    const stack: Array<[number, number]> = [[startMx, startMy]];
    visited[startIdx] = 1;
    carveCellBlock(startMx, startMy);

    while (stack.length > 0) {
      const [cx, cy] = stack[stack.length - 1];
      const unvisited: Array<[number, number]> = [];
      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= mCols || ny >= mRows) continue;
        if (visited[ny * mCols + nx] === 0) {
          unvisited.push([nx, ny]);
        }
      }
      if (unvisited.length === 0) {
        stack.pop();
        continue;
      }
      const [nx, ny] = unvisited[Math.floor(rng() * unvisited.length)];
      visited[ny * mCols + nx] = 1;
      carveCellBlock(nx, ny);
      addLink(cx, cy, nx, ny);
      stack.push([nx, ny]);
    }
  } else if (mazeStyle === "prim") {
    const inMaze = new Uint8Array(totalCells);
    const frontier: Array<[number, number, number, number]> = [];
    const pushFrontiers = (mx: number, my: number): void => {
      for (const [dx, dy] of dirs) {
        const nx = mx + dx;
        const ny = my + dy;
        if (nx < 0 || ny < 0 || nx >= mCols || ny >= mRows) continue;
        if (inMaze[ny * mCols + nx] === 0) {
          frontier.push([mx, my, nx, ny]);
        }
      }
    };
    inMaze[startIdx] = 1;
    carveCellBlock(startMx, startMy);
    pushFrontiers(startMx, startMy);

    while (frontier.length > 0) {
      const pickIdx = Math.floor(rng() * frontier.length);
      const [fx, fy, tx, ty] = frontier[pickIdx];
      frontier[pickIdx] = frontier[frontier.length - 1];
      frontier.pop();
      const tIdx = ty * mCols + tx;
      if (inMaze[tIdx] !== 0) continue;
      inMaze[tIdx] = 1;
      carveCellBlock(tx, ty);
      addLink(fx, fy, tx, ty);
      pushFrontiers(tx, ty);
    }
  } else if (mazeStyle === "growing_tree") {
    const visited = new Uint8Array(totalCells);
    const active: Array<[number, number]> = [[startMx, startMy]];
    visited[startIdx] = 1;
    carveCellBlock(startMx, startMy);

    while (active.length > 0) {
      const pickIdx = rng() < 0.5 ? active.length - 1 : Math.floor(rng() * active.length);
      const [cx, cy] = active[pickIdx];
      const unvisited: Array<[number, number]> = [];
      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= mCols || ny >= mRows) continue;
        if (visited[ny * mCols + nx] === 0) {
          unvisited.push([nx, ny]);
        }
      }
      if (unvisited.length === 0) {
        active[pickIdx] = active[active.length - 1];
        active.pop();
        continue;
      }
      const [nx, ny] = unvisited[Math.floor(rng() * unvisited.length)];
      visited[ny * mCols + nx] = 1;
      carveCellBlock(nx, ny);
      addLink(cx, cy, nx, ny);
      active.push([nx, ny]);
    }
  } else {
    // kruskal_chambers: open 2..3 interior 2x2-cell chambers + randomized Kruskal spanning tree
    for (let my = 0; my < mRows; my++) {
      for (let mx = 0; mx < mCols; mx++) {
        carveCellBlock(mx, my);
      }
    }
    const parent = Int32Array.from({ length: totalCells }, (_, i) => i);
    const find = (x: number): number => {
      let cur = x;
      while (parent[cur] !== cur) {
        parent[cur] = parent[parent[cur]];
        cur = parent[cur];
      }
      return cur;
    };
    const unionLink = (ax: number, ay: number, bx: number, by: number): void => {
      const ra = find(ay * mCols + ax);
      const rb = find(by * mCols + bx);
      if (ra !== rb) {
        parent[rb] = ra;
      }
      addLink(ax, ay, bx, by);
    };

    const chamberCount = 2 + Math.floor(rng() * 2);
    const chamberCenters: Array<{ x: number; y: number }> = [];
    for (let attempt = 0; attempt < 24 && chamberCenters.length < chamberCount; attempt++) {
      const cmX = 2 + Math.floor(rng() * (mCols - 5));
      const cmY = 2 + Math.floor(rng() * (mRows - 5));
      if (chamberCenters.some((c) => Math.abs(c.x - cmX) < 4 && Math.abs(c.y - cmY) < 4)) {
        continue;
      }
      chamberCenters.push({ x: cmX, y: cmY });
      unionLink(cmX, cmY, cmX + 1, cmY);
      unionLink(cmX, cmY, cmX, cmY + 1);
      unionLink(cmX + 1, cmY, cmX + 1, cmY + 1);
      unionLink(cmX, cmY + 1, cmX + 1, cmY + 1);
      // Clear center 1x1 pillar tile so the 2x2 cell block forms one contiguous 5x5 hall
      collision[(cmY * cellSpan + 3) * cols + (cmX * cellSpan + 3)] = 0;
    }

    const edges: Array<[number, number, number, number]> = [];
    for (let my = 0; my < mRows; my++) {
      for (let mx = 0; mx < mCols; mx++) {
        if (mx + 1 < mCols) edges.push([mx, my, mx + 1, my]);
        if (my + 1 < mRows) edges.push([mx, my, mx, my + 1]);
      }
    }
    shuffleInPlace(edges, rng);
    for (const [ax, ay, bx, by] of edges) {
      if (find(ay * mCols + ax) !== find(by * mCols + bx)) {
        unionLink(ax, ay, bx, by);
      }
    }
  }

  // Open ~8..12% extra interior connectors for alternate routes
  const loopRate =
    mazeStyle === "growing_tree" ? 0.12 : mazeStyle === "dfs" ? 0.1 : 0.08;
  for (let my = 0; my < mRows; my++) {
    for (let mx = 0; mx < mCols; mx++) {
      if (mx + 1 < mCols && rng() < loopRate) {
        addLink(mx, my, mx + 1, my);
      }
      if (my + 1 < mRows && rng() < loopRate) {
        addLink(mx, my, mx, my + 1);
      }
    }
  }

  // BFS from start cell to measure exact depths & select furthest exit + spaced chest alcoves
  const dist = new Int32Array(totalCells).fill(-1);
  const bfsQueue: Array<[number, number]> = [[startMx, startMy]];
  dist[startIdx] = 0;
  for (let head = 0; head < bfsQueue.length; head++) {
    const [cx, cy] = bfsQueue[head];
    const cd = dist[cy * mCols + cx];
    for (const [nx, ny] of adj[cy * mCols + cx]) {
      const nIdx = ny * mCols + nx;
      if (dist[nIdx] === -1) {
        dist[nIdx] = cd + 1;
        bfsQueue.push([nx, ny]);
      }
    }
  }

  let furthestMx = mCols - 1 - startMx;
  let furthestMy = mRows - 1 - startMy;
  let maxDist = -1;
  const candidateCells: Array<{ mx: number; my: number; d: number; deg: number }> = [];
  for (let my = 0; my < mRows; my++) {
    for (let mx = 0; mx < mCols; mx++) {
      const idx = my * mCols + mx;
      const d = dist[idx];
      if (d > maxDist) {
        maxDist = d;
        furthestMx = mx;
        furthestMy = my;
      }
      if ((mx !== startMx || my !== startMy) && d >= 4) {
        candidateCells.push({ mx, my, d, deg: adj[idx].length });
      }
    }
  }

  // Prefer dead-ends and deep cells, spread across the 67x55 labyrinth
  candidateCells.sort((a, b) => {
    const scoreA = (a.deg === 1 ? 10 : 0) + a.d * 0.4 + rng() * 3;
    const scoreB = (b.deg === 1 ? 10 : 0) + b.d * 0.4 + rng() * 3;
    return scoreB - scoreA;
  });

  const desiredChests = 5 + Math.floor(rng() * 4); // random 5..8 chests
  const pickedCells: Array<{ mx: number; my: number; d: number }> = [];
  for (const cand of candidateCells) {
    if (cand.mx === furthestMx && cand.my === furthestMy) continue;
    const tooClose = pickedCells.some(
      (p) => Math.abs(p.mx - cand.mx) + Math.abs(p.my - cand.my) < 4,
    );
    if (tooClose) continue;
    pickedCells.push(cand);
    if (pickedCells.length >= desiredChests) break;
  }

  if (pickedCells.length < desiredChests) {
    for (const cand of candidateCells) {
      if (cand.mx === furthestMx && cand.my === furthestMy) continue;
      if (pickedCells.some((p) => p.mx === cand.mx && p.my === cand.my)) continue;
      const tooCloseFallback = pickedCells.some(
        (p) => Math.abs(p.mx - cand.mx) + Math.abs(p.my - cand.my) < 2,
      );
      if (tooCloseFallback) continue;
      pickedCells.push(cand);
      if (pickedCells.length >= desiredChests) break;
    }
  }

  const cellCenterWorld = (mx: number, my: number): Point => ({
    x: (mx * cellSpan + 2) * TILE_SIZE,
    y: (my * cellSpan + 2) * TILE_SIZE,
  });

  const chests: DungeonChestNode[] = pickedCells.map((cell, idx) => {
    const isRoyal = rng() < (idx < 2 ? 0.5 : RARE_CHEST_CHANCE);
    const isLocked = rng() < 0.35;
    const p = isLocked ? pickPuzzle(rng) : null;
    const pt = cellCenterWorld(cell.mx, cell.my);
    return {
      id: `dungeon_${runId}_maze_${idx}`,
      roomId: "room_maze",
      name: isRoyal
        ? `Rương Hiếm Mê Cung #${idx + 1}`
        : isLocked
          ? `Két Cổ Mê Cung #${idx + 1}`
          : `Rương Địa Đạo Sâu #${idx + 1}`,
      x: pt.x,
      y: pt.y,
      locked: isLocked,
      opened: false,
      royal: isRoyal,
      revealedInRoom: true,
      ...(p ? { puzzleKind: p.kind, puzzleSeed: p.seed } : {}),
    };
  });

  // Spawn 2..3 hidden jumpscare creatures on deep corridor cells distinct from start, exit & chests
  const scareSpecs: ReadonlyArray<{ kind: DungeonScareKind; name: string; damageHp: number }> = [
    { kind: "shadow_ghost", name: "👻 Oan Hồn Địa Đạo", damageHp: 25 },
    { kind: "ancient_centipede", name: "🦂 Rết Cổ Khổng Lồ", damageHp: 22 },
    { kind: "stone_phantom", name: "👹 Tà Ảnh Hầm Gạch", damageHp: 28 },
  ];
  const scareTargetCount = 2 + Math.floor(rng() * 2);
  const scarePool = candidateCells.filter(
    (cand) =>
      !(cand.mx === furthestMx && cand.my === furthestMy) &&
      !pickedCells.some((p) => p.mx === cand.mx && p.my === cand.my),
  );
  shuffleInPlace(scarePool, rng);
  const pickedScareCells: Array<{ mx: number; my: number }> = [];
  for (const cand of scarePool) {
    if (
      pickedScareCells.some((s) => Math.abs(s.mx - cand.mx) + Math.abs(s.my - cand.my) < 4)
    ) {
      continue;
    }
    pickedScareCells.push({ mx: cand.mx, my: cand.my });
    if (pickedScareCells.length >= scareTargetCount) break;
  }
  if (pickedScareCells.length < scareTargetCount) {
    for (const cand of scarePool) {
      if (pickedScareCells.some((s) => s.mx === cand.mx && s.my === cand.my)) continue;
      if (
        pickedScareCells.some((s) => Math.abs(s.mx - cand.mx) + Math.abs(s.my - cand.my) < 2)
      ) {
        continue;
      }
      pickedScareCells.push({ mx: cand.mx, my: cand.my });
      if (pickedScareCells.length >= scareTargetCount) break;
    }
  }
  const scares: DungeonMazeScareNode[] = pickedScareCells.map((cell, idx) => {
    const spec = scareSpecs[Math.floor(rng() * scareSpecs.length)];
    const pt = cellCenterWorld(cell.mx, cell.my);
    return {
      id: `scare_${runId}_${idx}`,
      kind: spec.kind,
      name: spec.name,
      x: pt.x,
      y: pt.y,
      damageHp: spec.damageHp,
      triggered: false,
    };
  });

  const startPt = cellCenterWorld(startMx, startMy);
  const exitPt = cellCenterWorld(furthestMx, furthestMy);
  const torches: Point[] = [];
  for (let my = 0; my < mRows; my += 2) {
    for (let mx = 0; mx < mCols; mx += 2) {
      torches.push(cellCenterWorld(mx, my));
    }
  }
  torches.push(startPt);
  if (hasSurfaceExit) {
    torches.push(exitPt);
  }

  const portals: DungeonRoomLayout["portals"] = [
    {
      id: `${runId}_maze_start_back`,
      targetRoom: "hub",
      label: "⬅️ Quay Về Phòng Trung Tâm",
      shortTag: "🚪 VỀ PHÒNG TRUNG TÂM",
      x: startPt.x + startSpec.portalDx,
      y: startPt.y + startSpec.portalDy,
      color: 0x38bdf8,
    },
  ];
  if (hasSurfaceExit) {
    portals.push(makeSurfaceExitPortal(runId, "room_maze", exitPt.x, exitPt.y, false));
  }

  return {
    id: "room_maze",
    direction,
    title: `🧭 Địa Đạo — ${DIRECTION_LABELS[direction]}`,
    subtitle: "Góc nhìn 210° trước mặt • Chạm điểm để đi thẳng tới khi gặp tường • Coi chừng sinh vật ẩn trong bóng tối!",
    cols,
    rows,
    collision,
    floorTint: 0x64748b,
    wallColor: 0x0f172a,
    spawn: { x: startPt.x - startSpec.portalDx, y: startPt.y - startSpec.portalDy },
    portals,
    chests,
    scares,
    torches,
    isMaze: true,
    mazeStyle,
  };
}

export function generateHanoiDungeonRun(explicitSeed?: number): DungeonRunState {
  for (let attempt = 0; attempt < 8; attempt++) {
    const resolvedSeed = explicitSeed !== undefined ? (explicitSeed + attempt) >>> 0 : createFreshSeed();
    const rng = createRng(resolvedSeed);
    const runId = `r${(++dungeonRunSeq).toString(36)}_${resolvedSeed.toString(36)}`;
    const dirToRoom = pickDirToRoomFromPerms(
      ALL_HOANG_THANH_PERMS,
      rng,
      explicitSeed === undefined ? lastDirToRoom : null,
    );
    const roomDirections: Partial<Record<DungeonBranchRoomId, DungeonDirection>> = {};
    for (const dir of DIRECTIONS) {
      roomDirections[dirToRoom[dir]] = dir;
    }
    const exitCandidates =
      explicitSeed === undefined && lastExitDirection !== null
        ? DIRECTIONS.filter((d) => d !== lastExitDirection)
        : DIRECTIONS;
    const exitDir = exitCandidates[Math.floor(rng() * exitCandidates.length)];
    const exitRoomId = dirToRoom[exitDir];

    const mazeRoom = buildMazeRoom(
      runId,
      rng,
      roomDirections.room_maze!,
      exitRoomId === "room_maze",
    );
    const mazeSig = hashMazeCollision(
      mazeRoom.collision,
      mazeRoom.mazeStyle ?? "dfs",
      mazeRoom.spawn,
    );
    if (explicitSeed === undefined && recentMazeHashes.has(mazeSig) && attempt < 7) {
      continue;
    }
    if (recentMazeHashes.size >= 200) {
      const oldest = recentMazeHashes.values().next().value;
      if (oldest !== undefined) recentMazeHashes.delete(oldest);
    }
    recentMazeHashes.add(mazeSig);

    const rooms: Partial<Record<DungeonRoomId, DungeonRoomLayout>> & { hub: DungeonRoomLayout } = {
      hub: buildHubRoom(runId, dirToRoom),
      room_sort: buildCoinSortRoom(runId, rng, roomDirections.room_sort!, exitRoomId === "room_sort"),
      room_beans: buildPeanutStealRoom(runId, rng, roomDirections.room_beans!, exitRoomId === "room_beans"),
      room_free: buildFreeRoom(runId, rng, roomDirections.room_free!, exitRoomId === "room_free"),
      room_maze: mazeRoom,
    };

    if (explicitSeed === undefined) {
      lastDirToRoom = { ...dirToRoom };
      lastExitDirection = exitDir;
    }

    return {
      dungeonId: "hoang_thanh",
      runId,
      seed: resolvedSeed,
      startedAt: Date.now(),
      rooms,
      activeRoomId: "hub",
      roomDirections,
      exitRoomId,
      chestsOpenedCount: 0,
      roomsClearedCount: 0,
    };
  }

  throw new Error("Failed to generate unique dungeon run");
}

interface BargeRoomCfg {
  roomId: "room_beer" | "room_boat" | "room_rafts";
  kind: DungeonMinigameKind;
  stationTitle: string;
  promptLabel: string;
  chestRoyalName: string;
  chestNormalPrefix: string;
  floorTint: number;
  wallColor: number;
  stationY: number;
  obstacles: ReadonlyArray<[number, number]>;
}

const BARGE_CHALLENGE_CONFIGS: readonly BargeRoomCfg[] = [
  {
    roomId: "room_beer",
    kind: "beer_boss",
    stationTitle: "🍺 Quầy Bia Hơi Đại Ca Giang Hồ",
    promptLabel: "❗ Ngồi Vào Bàn Nhậu Đại Ca [E]",
    chestRoyalName: "Rương Hàng Nóng Đại Ca",
    chestNormalPrefix: "Rương Quầy Nhậu",
    floorTint: 0xa19484,
    wallColor: 0x3b2f2f,
    stationY: 6.9,
    obstacles: [
      [9, 5],
      [10, 5],
      [2, 2],
      [17, 2],
    ],
  },
  {
    roomId: "room_boat",
    kind: "boat_row",
    stationTitle: "🛶 Bến Thuyền Nan Ngược Dòng Sông Hồng",
    promptLabel: "❗ Xuống Thuyền Trèo Ngược Dòng [E]",
    chestRoyalName: "Rương Bãi Cát Đỏ Sông Hồng",
    chestNormalPrefix: "Rương Bến Thuyền",
    floorTint: 0x8ea9bd,
    wallColor: 0x1e293b,
    stationY: 6.2,
    obstacles: [
      [2, 2],
      [17, 2],
      [8, 4],
      [9, 4],
      [10, 4],
      [11, 4],
    ],
  },
  {
    roomId: "room_rafts",
    kind: "raft_signs",
    stationTitle: "🪵 Bè Phao 6×6 Biển Báo Sông Hồng",
    promptLabel: "❗ Lên Bè Phao Vượt Sông [E]",
    chestRoyalName: "Rương Đáy Xà Lan Cát",
    chestNormalPrefix: "Rương Bè Phao",
    floorTint: 0x9c8b75,
    wallColor: 0x292524,
    stationY: 6.2,
    obstacles: [
      [2, 2],
      [17, 2],
      [8, 4],
      [9, 4],
      [10, 4],
      [11, 4],
    ],
  },
];

function buildBargeChallengeRoom(
  cfg: BargeRoomCfg,
  runId: string,
  rng: () => number,
  direction: DungeonDirection,
  hasSurfaceExit: boolean,
): DungeonRoomLayout {
  const cols = 20;
  const rows = 14;
  const collision = createBoxCollision(cols, rows, cfg.obstacles);
  const chestSpots: ReadonlyArray<[number, number]> = [
    [3.5, 4.2],
    [3.5, 8.8],
    [16.5, 4.2],
    [16.5, 8.8],
    [6.5, 3.2],
    [13.5, 3.2],
  ];
  const chosen = shuffleInPlace([...chestSpots], rng);
  const chests: DungeonChestNode[] = chosen.map(([cx, cy], idx) => {
    const isRoyal = rng() < RARE_CHEST_CHANCE;
    return {
      id: `dungeon_${runId}_${cfg.roomId}_${idx}`,
      roomId: cfg.roomId,
      name: isRoyal ? cfg.chestRoyalName : `${cfg.chestNormalPrefix} #${idx + 1}`,
      x: cx * TILE_SIZE,
      y: cy * TILE_SIZE,
      locked: false,
      opened: false,
      royal: isRoyal,
      revealedInRoom: false,
    };
  });

  const portals: DungeonRoomLayout["portals"] = [
    {
      id: `${runId}_${cfg.roomId}_back`,
      targetRoom: "hub",
      label: "⬅️ Quay Về Boong Chính",
      shortTag: "⬅️ VỀ BOONG CHÍNH",
      x: 10 * TILE_SIZE,
      y: 12.1 * TILE_SIZE,
      color: 0x38bdf8,
    },
  ];
  if (hasSurfaceExit) {
    portals.push(
      makeSurfaceExitPortal(
        runId,
        cfg.roomId,
        10 * TILE_SIZE,
        2.7 * TILE_SIZE,
        true,
        "🚢 Mạn Tàu Thoát Về Sông Hồng",
        "🚢 RỜI TÀU",
      ),
    );
  }

  return {
    id: cfg.roomId,
    direction,
    title: `🚢 Khoang Tàu — ${DIRECTION_LABELS[direction]}`,
    subtitle: "Xà lan khai thác cát Sông Hồng — Thắng thử thách để mở rương & tìm mạn tàu thoát thân.",
    cols,
    rows,
    collision,
    floorTint: cfg.floorTint,
    wallColor: cfg.wallColor,
    spawn: { x: 10 * TILE_SIZE, y: 10.6 * TILE_SIZE },
    portals,
    station: {
      id: `${runId}_st_${cfg.roomId}`,
      roomId: cfg.roomId,
      kind: cfg.kind,
      title: cfg.stationTitle,
      promptLabel: cfg.promptLabel,
      x: 10 * TILE_SIZE,
      y: cfg.stationY * TILE_SIZE,
      cleared: false,
    },
    chests,
    torches: [
      { x: 4 * TILE_SIZE, y: 2.2 * TILE_SIZE },
      { x: 16 * TILE_SIZE, y: 2.2 * TILE_SIZE },
      { x: 10 * TILE_SIZE, y: 5.5 * TILE_SIZE },
    ],
    isMaze: false,
  };
}

export function generateRedRiverBargeRun(explicitSeed?: number): DungeonRunState {
  const resolvedSeed = explicitSeed !== undefined ? explicitSeed >>> 0 : createFreshSeed();
  const rng = createRng(resolvedSeed);
  const runId = `b${(++dungeonRunSeq).toString(36)}_${resolvedSeed.toString(36)}`;
  const dirToRoom = pickDirToRoomFromPerms(
    ALL_BARGE_PERMS,
    rng,
    explicitSeed === undefined ? lastBargeDirToRoom : null,
  );
  const roomDirections: Partial<Record<DungeonBranchRoomId, DungeonDirection>> = {};
  for (const dir of DIRECTIONS) {
    roomDirections[dirToRoom[dir]] = dir;
  }
  const exitCandidates =
    explicitSeed === undefined && lastBargeExitDirection !== null
      ? DIRECTIONS.filter((d) => d !== lastBargeExitDirection)
      : DIRECTIONS;
  const exitDir = exitCandidates[Math.floor(rng() * exitCandidates.length)];
  const exitRoomId = dirToRoom[exitDir];

  const rooms: Partial<Record<DungeonRoomId, DungeonRoomLayout>> & { hub: DungeonRoomLayout } = {
    hub: buildHubRoom(
      runId,
      dirToRoom,
      "🚢 Boong Chính — Tàu Khai Thác Cát Sông Hồng",
      "Bốn khoang dẫn về Đông – Tây – Nam – Bắc. Tìm lối xuống mạn tàu ẩn giấu trong một trong bốn hướng!",
      0xa19484,
      0x3b2f2f,
    ),
    room_free: buildFreeRoom(runId, rng, roomDirections.room_free!, exitRoomId === "room_free", {
      titlePrefix: "🚢 Khoang Tàu",
      subtitle: "Khoang chứa cát & hàng lậu — Mở rương và tìm mạn tàu thoát ra Sông Hồng.",
      backTag: "⬅️ VỀ BOONG CHÍNH",
      exitLabel: "🚢 Mạn Tàu Thoát Về Sông Hồng",
      exitTag: "🚢 RỜI TÀU",
      floorTint: 0x9c8b75,
      wallColor: 0x292524,
    }),
  };

  for (const cfg of BARGE_CHALLENGE_CONFIGS) {
    rooms[cfg.roomId] = buildBargeChallengeRoom(
      cfg,
      runId,
      rng,
      roomDirections[cfg.roomId]!,
      exitRoomId === cfg.roomId,
    );
  }

  if (explicitSeed === undefined) {
    lastBargeDirToRoom = { ...dirToRoom };
    lastBargeExitDirection = exitDir;
  }

  return {
    dungeonId: "sand_barge",
    runId,
    seed: resolvedSeed,
    startedAt: Date.now(),
    rooms,
    activeRoomId: "hub",
    roomDirections,
    exitRoomId,
    chestsOpenedCount: 0,
    roomsClearedCount: 0,
  };
}
