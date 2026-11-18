import {
  ARCADE_MINIGAME_META,
  ArcadeMinigameController,
  type ArcadeMinigameKind,
} from "./ArcadeMinigames.ts";

export type VaultPuzzleKind = "wires" | "pipes" | "signal" | "code4" | ArcadeMinigameKind;

export interface VaultPuzzleTarget {
  containerId: string;
  title: string;
  sourceType: "chest_royal" | "house_vault" | "jail_station";
  kind?: VaultPuzzleKind;
}

type Dir = 0 | 1 | 2 | 3; // 0:N, 1:E, 2:S, 3:W

const DIRS: ReadonlyArray<{ dr: number; dc: number; opp: Dir }> = [
  { dr: -1, dc: 0, opp: 2 },
  { dr: 0, dc: 1, opp: 3 },
  { dr: 1, dc: 0, opp: 0 },
  { dr: 0, dc: -1, opp: 1 },
];

const PUZZLE_TITLES: Record<VaultPuzzleKind, { badge: string; title: string; guide: string }> = {
  wires: {
    badge: "⚡ MẠCH ĐIỆN 5×5",
    title: "Nối Dây Điện Đồng Màu",
    guide: "Kéo hoặc chạm nối từng cặp chân màu giống nhau mà không cắt ngang dây khác (không giới hạn thời gian).",
  },
  pipes: {
    badge: "🔧 HỆ THỐNG ỐNG 5×5",
    title: "Xoay Ống Dẫn Nước",
    guide: "Chạm vào từng đoạn ống để xoay 90°, dẫn dòng nước từ 💧 Nguồn tới 🔋 Van Đích.",
  },
  signal: {
    badge: "📡 MA TRẬN GƯƠNG 5×5",
    title: "Đường Dẫn Tín Hiệu",
    guide: "Chạm xoay gương phản xạ (/ ↔ \\) để bẻ hướng tia tín hiệu từ 📡 Máy Phát tới 🎯 Bộ Thu.",
  },
  code4: {
    badge: "🔢 KHÓA MẬT MÃ 4 SỐ",
    title: "Đoán Mã Két An Toàn",
    guide: "Nhập 4 chữ số khác nhau (0–9). 🟢 Đúng số & đúng chỗ • 🟡 Đúng số nhưng sai chỗ.",
  },
  memory_cards: {
    badge: ARCADE_MINIGAME_META.memory_cards.badge,
    title: ARCADE_MINIGAME_META.memory_cards.title,
    guide: ARCADE_MINIGAME_META.memory_cards.guideFree,
  },
  lockpick: {
    badge: ARCADE_MINIGAME_META.lockpick.badge,
    title: ARCADE_MINIGAME_META.lockpick.title,
    guide: ARCADE_MINIGAME_META.lockpick.guideFree,
  },
  timing_bar: {
    badge: ARCADE_MINIGAME_META.timing_bar.badge,
    title: ARCADE_MINIGAME_META.timing_bar.title,
    guide: ARCADE_MINIGAME_META.timing_bar.guideFree,
  },
};

// ===================== WIRES (FLOW 5x5) =====================

interface WireTemplate {
  walls: Array<[number, number]>;
  pairs: Array<[[number, number], [number, number]]>;
}

export const WIRE_TEMPLATES: readonly WireTemplate[] = [
  {
    walls: [],
    pairs: [
      [[2, 0], [1, 2]],
      [[0, 3], [4, 4]],
      [[1, 1], [4, 0]],
      [[1, 3], [3, 2]],
      [[3, 3], [4, 1]],
    ],
  },
  {
    walls: [],
    pairs: [
      [[1, 0], [0, 2]],
      [[0, 3], [3, 4]],
      [[2, 0], [1, 2]],
      [[1, 3], [4, 2]],
      [[3, 3], [4, 4]],
    ],
  },
  {
    walls: [
      [1, 1],
      [3, 3],
    ],
    pairs: [
      [[0, 0], [1, 4]],
      [[1, 0], [4, 2]],
      [[1, 2], [4, 3]],
      [[2, 1], [3, 1]],
    ],
  },
  {
    walls: [
      [1, 3],
      [2, 1],
    ],
    pairs: [
      [[0, 1], [4, 1]],
      [[0, 2], [2, 4]],
      [[1, 1], [4, 3]],
      [[3, 1], [4, 2]],
    ],
  },
  {
    walls: [],
    pairs: [
      [[0, 2], [2, 0]],
      [[0, 3], [3, 4]],
      [[1, 1], [4, 0]],
      [[1, 3], [4, 1]],
      [[2, 3], [4, 4]],
    ],
  },
];

const WIRE_COLORS = ["#ef4444", "#38bdf8", "#facc15", "#22c55e", "#c084fc"];

interface WiresState {
  size: 5;
  walls: Set<string>;
  terminals: Map<string, number>; // key "r,c" -> wireId
  pairEnds: Array<[string, string]>;
  colors: string[];
  paths: string[][]; // wireId -> ordered "r,c"
  activeWire: number | null;
  solved: boolean;
}

// ===================== PIPES (5x5 ROTATION) =====================

type PipeShape = "straight" | "elbow" | "tee" | "block";

interface PipeCell {
  shape: PipeShape;
  rot: Dir;
}

interface PipesState {
  size: 5;
  srcRow: number;
  dstRow: number;
  grid: PipeCell[][];
  powered: boolean[][];
  solved: boolean;
}

// ===================== SIGNAL (LASER MIRRORS 5x5) =====================

type SignalCellKind = "empty" | "wall" | "slash" | "backslash" | "target";

interface SignalState {
  size: 5;
  emitter: { r: number; c: number; dir: Dir }; // sits on border pointing inward
  grid: SignalCellKind[][];
  beamPoints: Array<{ x: number; y: number }>; // normalized 0..5 SVG coords
  beamLitCells: Set<string>;
  solved: boolean;
}

// ===================== CODE4 (BULLS & COWS) =====================

interface CodeAttempt {
  guess: string;
  bulls: number;
  cows: number;
}

interface Code4State {
  secret: string;
  input: string;
  attempts: CodeAttempt[];
  solved: boolean;
}

function keyRC(r: number, c: number): string {
  return `${r},${c}`;
}

function parseRC(k: string): [number, number] {
  const [rs, cs] = k.split(",");
  return [Number(rs), Number(cs)];
}

function randInt(n: number): number {
  return Math.floor(Math.random() * n);
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function transformRC(r: number, c: number, rot: number, flipX: boolean, size = 5): [number, number] {
  let nr = r;
  let nc = flipX ? size - 1 - c : c;
  for (let i = 0; i < rot; i++) {
    const tr = nc;
    const tc = size - 1 - nr;
    nr = tr;
    nc = tc;
  }
  return [nr, nc];
}

export function createWiresState(): WiresState {
  const tpl = WIRE_TEMPLATES[randInt(WIRE_TEMPLATES.length)];
  const rot = randInt(4);
  const flip = Math.random() < 0.5;
  const colors = shuffleInPlace([...WIRE_COLORS]).slice(0, tpl.pairs.length);

  const walls = new Set<string>();
  for (const [wr, wc] of tpl.walls) {
    const [tr, tc] = transformRC(wr, wc, rot, flip);
    walls.add(keyRC(tr, tc));
  }

  const terminals = new Map<string, number>();
  const pairEnds: Array<[string, string]> = [];
  const shuffledPairs = shuffleInPlace([...tpl.pairs]);
  shuffledPairs.forEach(([[r1, c1], [r2, c2]], idx) => {
    const [aR, aC] = transformRC(r1, c1, rot, flip);
    const [bR, bC] = transformRC(r2, c2, rot, flip);
    const kA = keyRC(aR, aC);
    const kB = keyRC(bR, bC);
    terminals.set(kA, idx);
    terminals.set(kB, idx);
    pairEnds.push([kA, kB]);
  });

  return {
    size: 5,
    walls,
    terminals,
    pairEnds,
    colors,
    paths: pairEnds.map(() => []),
    activeWire: null,
    solved: false,
  };
}

function getPipePorts(shape: PipeShape, rot: Dir): Set<Dir> {
  if (shape === "block") return new Set();
  if (shape === "straight") {
    return rot % 2 === 0 ? new Set<Dir>([0, 2]) : new Set<Dir>([1, 3]);
  }
  if (shape === "elbow") {
    return new Set<Dir>([rot, ((rot + 1) % 4) as Dir]);
  }
  // tee: misses ((rot + 2) % 4)
  const missing = (rot + 2) % 4;
  const s = new Set<Dir>();
  for (let d = 0; d < 4; d++) {
    if (d !== missing) s.add(d as Dir);
  }
  return s;
}

export function evaluatePipes(state: PipesState): void {
  const { size, srcRow, dstRow, grid } = state;
  const powered = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const queue: Array<[number, number]> = [];

  if (getPipePorts(grid[srcRow][0].shape, grid[srcRow][0].rot).has(3)) {
    powered[srcRow][0] = true;
    queue.push([srcRow, 0]);
  }

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const ports = getPipePorts(grid[r][c].shape, grid[r][c].rot);
    for (const d of ports) {
      const nr = r + DIRS[d].dr;
      const nc = c + DIRS[d].dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (powered[nr][nc]) continue;
      const neighborPorts = getPipePorts(grid[nr][nc].shape, grid[nr][nc].rot);
      if (neighborPorts.has(DIRS[d].opp)) {
        powered[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }

  state.powered = powered;
  state.solved =
    powered[dstRow][size - 1] &&
    getPipePorts(grid[dstRow][size - 1].shape, grid[dstRow][size - 1].rot).has(1);
}

export function createPipesState(): PipesState {
  const size = 5;
  for (let attempt = 0; attempt < 40; attempt++) {
    const srcRow = randInt(size);
    const dstRow = randInt(size);
    const visited = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
    const path: Array<[number, number]> = [];

    const walk = (r: number, c: number): boolean => {
      visited[r][c] = true;
      path.push([r, c]);
      if (r === dstRow && c === size - 1 && path.length >= 9) {
        return true;
      }
      const nextDirs = shuffleInPlace<Dir>([0, 1, 2, 3]);
      for (const d of nextDirs) {
        const nr = r + DIRS[d].dr;
        const nc = c + DIRS[d].dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size || visited[nr][nc]) continue;
        // Avoid locking into dstRow early when too short
        if (nr === dstRow && nc === size - 1 && path.length < 8) continue;
        if (walk(nr, nc)) return true;
      }
      path.pop();
      visited[r][c] = false;
      return false;
    };

    if (!walk(srcRow, 0)) continue;

    const grid: PipeCell[][] = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => ({ shape: "elbow" as PipeShape, rot: 0 as Dir })),
    );

    const onPath = new Set<string>(path.map(([r, c]) => keyRC(r, c)));
    for (let i = 0; i < path.length; i++) {
      const [r, c] = path[i];
      let inDir: Dir = 3;
      if (i > 0) {
        const [pr, pc] = path[i - 1];
        inDir = DIRS.findIndex((dd) => pr - r === dd.dr && pc - c === dd.dc) as Dir;
      }
      let outDir: Dir = 1;
      if (i < path.length - 1) {
        const [nr, nc] = path[i + 1];
        outDir = DIRS.findIndex((dd) => nr - r === dd.dr && nc - c === dd.dc) as Dir;
      }

      if (Math.random() < 0.22) {
        // Pick a Tee rotation covering both inDir and outDir
        const rots = shuffleInPlace<Dir>([0, 1, 2, 3]);
        const validRot = rots.find((rt) => {
          const p = getPipePorts("tee", rt);
          return p.has(inDir) && p.has(outDir);
        }) ?? 0;
        grid[r][c] = { shape: "tee", rot: validRot };
      } else if ((inDir + 2) % 4 === outDir) {
        grid[r][c] = { shape: "straight", rot: (inDir % 2 === 0 ? 0 : 1) as Dir };
      } else {
        const validRot = ([0, 1, 2, 3] as Dir[]).find((rt) => {
          const p = getPipePorts("elbow", rt);
          return p.has(inDir) && p.has(outDir);
        }) ?? 0;
        grid[r][c] = { shape: "elbow", rot: validRot };
      }
    }

    // Fill off-path decor tiles
    let blocks = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (onPath.has(keyRC(r, c))) continue;
        if (blocks < 2 && Math.random() < 0.14) {
          grid[r][c] = { shape: "block", rot: 0 };
          blocks++;
        } else {
          const shapes: PipeShape[] = ["straight", "elbow", "elbow", "tee"];
          grid[r][c] = { shape: shapes[randInt(shapes.length)], rot: randInt(4) as Dir };
        }
      }
    }

    // Scramble rotations so initial board is unsolved
    for (let sTry = 0; sTry < 10; sTry++) {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (grid[r][c].shape === "block") continue;
          const delta = onPath.has(keyRC(r, c)) ? 1 + randInt(3) : randInt(4);
          grid[r][c].rot = ((grid[r][c].rot + delta) % 4) as Dir;
        }
      }
      const st: PipesState = {
        size,
        srcRow,
        dstRow,
        grid,
        powered: [],
        solved: false,
      };
      evaluatePipes(st);
      if (!st.solved) return st;
    }
  }

  // Deterministic fallback guaranteed unsolved
  const fallbackGrid: PipeCell[][] = [
    [{ shape: "straight", rot: 0 }, { shape: "elbow", rot: 0 }, { shape: "straight", rot: 0 }, { shape: "elbow", rot: 1 }, { shape: "block", rot: 0 }],
    [{ shape: "elbow", rot: 1 }, { shape: "elbow", rot: 2 }, { shape: "tee", rot: 0 }, { shape: "straight", rot: 0 }, { shape: "elbow", rot: 2 }],
    [{ shape: "straight", rot: 1 }, { shape: "straight", rot: 0 }, { shape: "elbow", rot: 0 }, { shape: "elbow", rot: 3 }, { shape: "straight", rot: 0 }],
    [{ shape: "block", rot: 0 }, { shape: "elbow", rot: 0 }, { shape: "straight", rot: 1 }, { shape: "elbow", rot: 1 }, { shape: "elbow", rot: 0 }],
    [{ shape: "elbow", rot: 0 }, { shape: "straight", rot: 1 }, { shape: "straight", rot: 1 }, { shape: "elbow", rot: 3 }, { shape: "straight", rot: 0 }],
  ];
  const fb: PipesState = { size: 5, srcRow: 2, dstRow: 1, grid: fallbackGrid, powered: [], solved: false };
  evaluatePipes(fb);
  return fb;
}

function reflectDir(mirror: "slash" | "backslash", inDir: Dir): Dir {
  // "/" connects N<->E (0<->1) and S<->W (2<->3)
  if (mirror === "slash") {
    return ([1, 0, 3, 2] as Dir[])[inDir];
  }
  // "\" connects N<->W (0<->3) and S<->E (2<->1)
  return ([3, 2, 1, 0] as Dir[])[inDir];
}

export function evaluateSignal(state: SignalState): void {
  const { size, emitter, grid } = state;
  const beamPoints: Array<{ x: number; y: number }> = [];
  const beamLitCells = new Set<string>();
  const seenStates = new Set<string>();

  // Entry point on grid border edge
  const startX = emitter.c + 0.5 - DIRS[emitter.dir].dc * 0.5;
  const startY = emitter.r + 0.5 - DIRS[emitter.dir].dr * 0.5;
  beamPoints.push({ x: startX, y: startY });

  let r = emitter.r;
  let c = emitter.c;
  let dir = emitter.dir;
  let solved = false;

  for (let step = 0; step < 48; step++) {
    if (r < 0 || r >= size || c < 0 || c >= size) {
      break;
    }
    const stateKey = `${r},${c},${dir}`;
    if (seenStates.has(stateKey)) break;
    seenStates.add(stateKey);

    const cell = grid[r][c];
    if (cell === "wall") {
      // Stop right at outer edge of wall tile
      beamPoints.push({
        x: c + 0.5 - DIRS[dir].dc * 0.42,
        y: r + 0.5 - DIRS[dir].dr * 0.42,
      });
      break;
    }

    beamLitCells.add(keyRC(r, c));
    beamPoints.push({ x: c + 0.5, y: r + 0.5 });

    if (cell === "target") {
      solved = true;
      break;
    }

    if (cell === "slash" || cell === "backslash") {
      dir = reflectDir(cell, dir);
    }

    const nr = r + DIRS[dir].dr;
    const nc = c + DIRS[dir].dc;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) {
      beamPoints.push({
        x: c + 0.5 + DIRS[dir].dc * 0.5,
        y: r + 0.5 + DIRS[dir].dr * 0.5,
      });
      break;
    }
    r = nr;
    c = nc;
  }

  state.beamPoints = beamPoints;
  state.beamLitCells = beamLitCells;
  state.solved = solved;
}

export function createSignalState(): SignalState {
  const size = 5;
  for (let attempt = 0; attempt < 60; attempt++) {
    const startRow = randInt(size);
    const grid: SignalCellKind[][] = Array.from({ length: size }, () =>
      Array<SignalCellKind>(size).fill("empty"),
    );
    const mirrorCoords: Array<[number, number]> = [];
    const passedAir = new Set<string>();

    let r = startRow;
    let c = 0;
    let dir: Dir = 1; // enter heading East
    passedAir.add(keyRC(r, c));

    const targetBounces = 3 + randInt(2); // 3..4 mirror turns
    let ok = true;
    for (let b = 0; b < targetBounces; b++) {
      // Collect possible step lengths 1..3 inside grid
      const candidates: Array<{ mr: number; mc: number; newDir: Dir }> = [];
      for (let dist = 1; dist <= 3; dist++) {
        const mr = r + DIRS[dir].dr * dist;
        const mc = c + DIRS[dir].dc * dist;
        if (mr < 0 || mr >= size || mc < 0 || mc >= size) break;
        if (passedAir.has(keyRC(mr, mc))) break; // don't place mirror on previously crossed lane
        const turnOpts: Dir[] = [((dir + 1) % 4) as Dir, ((dir + 3) % 4) as Dir];
        for (const nd of turnOpts) {
          const ar = mr + DIRS[nd].dr;
          const ac = mc + DIRS[nd].dc;
          if (ar >= 0 && ar < size && ac >= 0 && ac < size && !passedAir.has(keyRC(ar, ac))) {
            candidates.push({ mr, mc, newDir: nd });
          }
        }
      }
      if (candidates.length === 0) {
        ok = false;
        break;
      }
      const pick = candidates[randInt(candidates.length)];
      // Mark straight steps as passedAir
      let sr = r;
      let sc = c;
      while (sr !== pick.mr || sc !== pick.mc) {
        passedAir.add(keyRC(sr, sc));
        sr += DIRS[dir].dr;
        sc += DIRS[dir].dc;
      }
      passedAir.add(keyRC(pick.mr, pick.mc));

      // Determine which mirror matches dir -> pick.newDir
      const slashRes = reflectDir("slash", dir);
      grid[pick.mr][pick.mc] = slashRes === pick.newDir ? "slash" : "backslash";
      mirrorCoords.push([pick.mr, pick.mc]);
      r = pick.mr + DIRS[pick.newDir].dr;
      c = pick.mc + DIRS[pick.newDir].dc;
      dir = pick.newDir;
      if (r < 0 || r >= size || c < 0 || c >= size || passedAir.has(keyRC(r, c))) {
        ok = false;
        break;
      }
      passedAir.add(keyRC(r, c));
    }
    if (!ok) continue;

    // Walk 0..2 more untouched steps to place target
    let tr = r;
    let tc = c;
    const extraSteps = randInt(3);
    for (let s = 0; s < extraSteps; s++) {
      const nr = tr + DIRS[dir].dr;
      const nc = tc + DIRS[dir].dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size || passedAir.has(keyRC(nr, nc))) break;
      tr = nr;
      tc = nc;
      passedAir.add(keyRC(tr, tc));
    }
    grid[tr][tc] = "target";

    // Add 2..3 firewalls & 1..2 decoy mirrors on untouched cells
    const untouched: Array<[number, number]> = [];
    for (let rr = 0; rr < size; rr++) {
      for (let cc = 0; cc < size; cc++) {
        if (!passedAir.has(keyRC(rr, cc))) untouched.push([rr, cc]);
      }
    }
    shuffleInPlace(untouched);
    for (let i = 0; i < Math.min(3, untouched.length); i++) {
      const [wr, wc] = untouched[i];
      grid[wr][wc] = "wall";
    }
    for (let i = 3; i < Math.min(5, untouched.length); i++) {
      const [mr, mc] = untouched[i];
      grid[mr][mc] = Math.random() < 0.5 ? "slash" : "backslash";
      mirrorCoords.push([mr, mc]);
    }

    // Rotate 0..3 times for directional variety
    const emitter = { r: startRow, c: 0, dir: 1 as Dir };
    // Scramble mirrors and verify unsolved
    for (let sTry = 0; sTry < 8; sTry++) {
      let flippedCount = 0;
      for (const [mr, mc] of mirrorCoords) {
        if (Math.random() < 0.65) {
          grid[mr][mc] = grid[mr][mc] === "slash" ? "backslash" : "slash";
          flippedCount++;
        }
      }
      if (flippedCount === 0 && mirrorCoords.length > 0) {
        const [mr, mc] = mirrorCoords[0];
        grid[mr][mc] = grid[mr][mc] === "slash" ? "backslash" : "slash";
      }
      const st: SignalState = {
        size,
        emitter,
        grid,
        beamPoints: [],
        beamLitCells: new Set(),
        solved: false,
      };
      evaluateSignal(st);
      if (!st.solved) return st;
    }
  }

  // Deterministic guaranteed-solvable fallback
  const fbGrid: SignalCellKind[][] = [
    ["empty", "backslash", "empty", "empty", "slash"],
    ["empty", "empty", "wall", "empty", "empty"],
    ["slash", "empty", "empty", "empty", "target"],
    ["empty", "empty", "wall", "empty", "empty"],
    ["empty", "slash", "empty", "backslash", "empty"],
  ];
  // Path: enter (2,0) E -> needs backslash? No: (2,0) set "\" -> turns S? Make (2,0) set "slash" initially wrong vs solution:
  // Actually let's check simple path: (2,0) "\" turns S -> (4,0)? Wait col 0 empty at (4,0), row 4 col 1 has slash!
  // Let's make exact fallback: enter (2,0) E -> (2,1) "/" -> (0,1) "\" -> (0,4) "/" -> wait: (0,1) "\" turns E -> (0,4) needs "\" to turn S -> (2,4) target!
  fbGrid[2][0] = "empty";
  fbGrid[2][1] = "backslash"; // solution is "slash"
  fbGrid[0][1] = "slash"; // solution is "backslash"
  fbGrid[0][4] = "slash"; // solution is "backslash"
  fbGrid[2][4] = "target";
  const fb: SignalState = {
    size: 5,
    emitter: { r: 2, c: 0, dir: 1 },
    grid: fbGrid,
    beamPoints: [],
    beamLitCells: new Set(),
    solved: false,
  };
  evaluateSignal(fb);
  return fb;
}

export function createCode4State(): Code4State {
  const digits = shuffleInPlace(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  return {
    secret: digits.slice(0, 4).join(""),
    input: "",
    attempts: [],
    solved: false,
  };
}

export class PuzzleMinigameModal {
  private readonly modalEl: HTMLElement;
  private readonly badgeEl: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly subtitleEl: HTMLElement;
  private readonly guideEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly boardWrapEl: HTMLElement;
  private readonly resetBtn: HTMLButtonElement;
  private readonly closeBtn: HTMLButtonElement;

  private activeTarget: VaultPuzzleTarget | null = null;
  private kind: VaultPuzzleKind = "wires";
  private onSolvedCb: (() => void) | null = null;
  private onCancelCb: (() => void) | null = null;

  private wires: WiresState | null = null;
  private pipes: PipesState | null = null;
  private signal: SignalState | null = null;
  private code4: Code4State | null = null;
  private arcadeCtrl: ArcadeMinigameController | null = null;
  private solveTransitionPending = false;

  constructor() {
    this.modalEl = document.getElementById("vault-puzzle-modal")!;
    this.badgeEl = document.getElementById("vault-puzzle-badge")!;
    this.titleEl = document.getElementById("vault-puzzle-title")!;
    this.subtitleEl = document.getElementById("vault-puzzle-subtitle")!;
    this.guideEl = document.getElementById("vault-puzzle-guide")!;
    this.statusEl = document.getElementById("vault-puzzle-status")!;
    this.boardWrapEl = document.getElementById("vault-puzzle-board")!;
    this.resetBtn = document.getElementById("btn-vault-puzzle-reset") as HTMLButtonElement;
    this.closeBtn = document.getElementById("btn-vault-puzzle-close") as HTMLButtonElement;

    this.modalEl.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.cancel();
    });
    this.resetBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this.activeTarget || this.solveTransitionPending) return;
      this.resetCurrentPuzzle();
    });
    window.addEventListener("pointermove", this.onWirePointerMove);
    window.addEventListener("pointerup", this.onWirePointerUp);
    window.addEventListener("pointercancel", this.onWirePointerUp);
    window.addEventListener("keydown", this.onKeyDown);
  }

  public isOpen(): boolean {
    return this.activeTarget !== null;
  }

  public open(
    target: VaultPuzzleTarget,
    onSolved: () => void,
    onCancel: () => void,
  ): void {
    const pool: VaultPuzzleKind[] = [
      "wires",
      "pipes",
      "signal",
      "code4",
      "memory_cards",
      "lockpick",
      "timing_bar",
    ];
    const pickedKind = target.kind ?? pool[randInt(pool.length)];

    this.arcadeCtrl?.destroy();
    this.arcadeCtrl = null;
    this.activeTarget = target;
    this.kind = pickedKind;
    this.onSolvedCb = onSolved;
    this.onCancelCb = onCancel;
    this.solveTransitionPending = false;

    const meta = PUZZLE_TITLES[pickedKind];
    const isJail = target.sourceType === "jail_station";
    this.badgeEl.textContent = isJail
      ? `❗ MINIGAME GIẢM ÁN • ${meta.badge}`
      : `${meta.badge} • KHÔNG GIỚI HẠN THỜI GIAN`;
    this.titleEl.textContent = meta.title;
    this.subtitleEl.textContent = isJail ? "⏳ Giảm 1 phút tạm giam" : `🔐 ${target.title}`;
    this.guideEl.textContent = "";
    this.guideEl.style.display = "none";
    this.resetBtn.style.display =
      pickedKind === "code4" || pickedKind === "lockpick" || pickedKind === "timing_bar"
        ? "none"
        : "inline-flex";

    this.initPuzzleState();
    this.modalEl.classList.add("is-open");
    this.render();
  }

  public close(): void {
    this.arcadeCtrl?.destroy();
    this.arcadeCtrl = null;
    this.activeTarget = null;
    this.wires = null;
    this.pipes = null;
    this.signal = null;
    this.code4 = null;
    this.solveTransitionPending = false;
    this.modalEl.classList.remove("is-open");
  }

  private cancel(): void {
    const cb = this.onCancelCb;
    this.close();
    cb?.();
  }

  private initPuzzleState(): void {
    this.arcadeCtrl?.destroy();
    this.arcadeCtrl = null;
    this.wires = null;
    this.pipes = null;
    this.signal = null;
    this.code4 = null;
    if (this.kind === "wires") this.wires = createWiresState();
    else if (this.kind === "pipes") this.pipes = createPipesState();
    else if (this.kind === "signal") this.signal = createSignalState();
    else if (this.kind === "code4") this.code4 = createCode4State();
  }

  private resetCurrentPuzzle(): void {
    if (this.kind === "wires" && this.wires) {
      this.wires.paths = this.wires.pairEnds.map(() => []);
      this.wires.activeWire = null;
      this.wires.solved = false;
      this.render();
      return;
    }
    this.initPuzzleState();
    this.render();
  }

  private triggerSolved(): void {
    if (this.solveTransitionPending) return;
    this.solveTransitionPending = true;
    const isJail = this.activeTarget?.sourceType === "jail_station";
    this.statusEl.textContent = isJail
      ? "✅ Chiến thắng! Giảm 1 phút thời gian tạm giam!"
      : "✅ Đã mở khóa thành công! Đang mở kho báu...";
    this.statusEl.classList.add("is-solved");
    const cb = this.onSolvedCb;
    window.setTimeout(() => {
      this.close();
      cb?.();
    }, 520);
  }

  private render(): void {
    this.statusEl.classList.remove("is-solved");
    this.arcadeCtrl?.destroy();
    this.arcadeCtrl = null;
    this.boardWrapEl.replaceChildren();
    if (this.kind === "wires" && this.wires) {
      this.renderWires(this.wires);
    } else if (this.kind === "pipes" && this.pipes) {
      this.renderPipes(this.pipes);
    } else if (this.kind === "signal" && this.signal) {
      this.renderSignal(this.signal);
    } else if (this.kind === "code4" && this.code4) {
      this.renderCode4(this.code4);
    } else if (
      this.kind === "memory_cards" ||
      this.kind === "lockpick" ||
      this.kind === "timing_bar"
    ) {
      this.arcadeCtrl = new ArcadeMinigameController({
        kind: this.kind,
        mode: "free",
        boardEl: this.boardWrapEl,
        statusEl: this.statusEl,
        onWin: () => this.triggerSolved(),
        onFail: () => {},
      });
    }
  }

  // -------------------- RENDER: WIRES --------------------

  private stepWireOntoCell(r: number, c: number): void {
    const st = this.wires;
    if (!st || this.kind !== "wires" || this.solveTransitionPending || st.activeWire === null) {
      return;
    }
    const wIdx = st.activeWire;
    const k = keyRC(r, c);
    if (st.walls.has(k)) return;

    const termOwner = st.terminals.get(k);
    if (termOwner !== undefined && termOwner !== wIdx) return;

    const path = st.paths[wIdx];
    if (path.length === 0) return;
    const last = path[path.length - 1];
    if (last === k) return;

    // Backtrack if stepping onto an existing cell of THIS wire
    const selfIdx = path.indexOf(k);
    if (selfIdx !== -1) {
      st.paths[wIdx] = path.slice(0, selfIdx + 1);
      this.render();
      return;
    }

    // Stop if this wire already links both terminals
    const [endA, endB] = st.pairEnds[wIdx];
    if (
      path.length >= 2 &&
      ((path[0] === endA && last === endB) || (path[0] === endB && last === endA))
    ) {
      return;
    }

    const [lr, lc] = parseRC(last);
    if (Math.abs(lr - r) + Math.abs(lc - c) !== 1) return;

    // Cut any other wire crossing this non-terminal cell
    for (let oi = 0; oi < st.paths.length; oi++) {
      if (oi === wIdx) continue;
      const cutIdx = st.paths[oi].indexOf(k);
      if (cutIdx !== -1) {
        st.paths[oi] = st.paths[oi].slice(0, cutIdx);
      }
    }

    path.push(k);
    const allSolved = st.pairEnds.every(([a, b], idx) => {
      const p = st.paths[idx];
      return p.length >= 2 && ((p[0] === a && p[p.length - 1] === b) || (p[0] === b && p[p.length - 1] === a));
    });
    if (allSolved) {
      st.activeWire = null;
      st.solved = true;
    }
    this.render();
    if (st.solved) this.triggerSolved();
  }

  private readonly onWirePointerMove = (e: PointerEvent): void => {
    const st = this.wires;
    if (!st || this.kind !== "wires" || st.activeWire === null || this.solveTransitionPending) {
      return;
    }
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>(".vp-wire-cell");
    if (!el || !this.boardWrapEl.contains(el)) return;
    const rr = Number(el.dataset.r);
    const cc = Number(el.dataset.c);
    if (Number.isFinite(rr) && Number.isFinite(cc)) {
      this.stepWireOntoCell(rr, cc);
    }
  };

  private readonly onWirePointerUp = (): void => {
    if (this.wires) {
      this.wires.activeWire = null;
    }
  };

  private renderWires(st: WiresState): void {
    const completedCount = st.pairEnds.filter(([endA, endB], idx) => {
      const p = st.paths[idx];
      return p.length >= 2 && ((p[0] === endA && p[p.length - 1] === endB) || (p[0] === endB && p[p.length - 1] === endA));
    }).length;
    this.statusEl.textContent = `⚡ Đã nối hoàn chỉnh: ${completedCount}/${st.pairEnds.length} cặp dây`;

    const grid = document.createElement("div");
    grid.className = "vp-grid vp-grid-5";

    const cellWireOwner = new Map<string, number>();
    st.paths.forEach((p, wIdx) => {
      for (const k of p) cellWireOwner.set(k, wIdx);
    });

    for (let r = 0; r < st.size; r++) {
      for (let c = 0; c < st.size; c++) {
        const k = keyRC(r, c);
        const cell = document.createElement("div");
        cell.className = "vp-cell vp-wire-cell";
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);

        if (st.walls.has(k)) {
          cell.classList.add("is-wall");
          cell.textContent = "✖";
          grid.appendChild(cell);
          continue;
        }

        const wireId = cellWireOwner.get(k) ?? st.terminals.get(k);
        if (wireId !== undefined && cellWireOwner.has(k)) {
          const path = st.paths[wireId];
          const idx = path.indexOf(k);
          const color = st.colors[wireId % st.colors.length];
          const dirs = new Set<string>();
          for (const adjIdx of [idx - 1, idx + 1]) {
            if (adjIdx >= 0 && adjIdx < path.length) {
              const [ar, ac] = parseRC(path[adjIdx]);
              if (ar < r) dirs.add("n");
              if (ar > r) dirs.add("s");
              if (ac < c) dirs.add("w");
              if (ac > c) dirs.add("e");
            }
          }
          for (const d of dirs) {
            const seg = document.createElement("span");
            seg.className = `vp-wire-seg dir-${d}`;
            seg.style.background = color;
            cell.appendChild(seg);
          }
          if (dirs.size > 0) {
            const joint = document.createElement("span");
            joint.className = "vp-wire-joint";
            joint.style.background = color;
            cell.appendChild(joint);
          }
        }

        const termId = st.terminals.get(k);
        if (termId !== undefined) {
          const dot = document.createElement("span");
          dot.className = "vp-wire-node";
          dot.style.background = st.colors[termId % st.colors.length];
          dot.textContent = String(termId + 1);
          cell.appendChild(dot);
        }

        cell.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.solveTransitionPending) return;
          if (termId !== undefined) {
            st.activeWire = termId;
            st.paths[termId] = [k];
            this.render();
            return;
          }
          const owner = cellWireOwner.get(k);
          if (owner !== undefined) {
            const pIdx = st.paths[owner].indexOf(k);
            st.activeWire = owner;
            st.paths[owner] = st.paths[owner].slice(0, pIdx + 1);
            this.render();
            return;
          }
          this.stepWireOntoCell(r, c);
        });

        grid.appendChild(cell);
      }
    }

    this.boardWrapEl.appendChild(grid);
  }

  // -------------------- RENDER: PIPES --------------------

  private renderPipes(st: PipesState): void {
    this.statusEl.textContent = `💧 Nước vào ở Hàng ${st.srcRow + 1} (Trái) → 🔋 Đích ở Hàng ${st.dstRow + 1} (Phải)`;

    const shell = document.createElement("div");
    shell.className = "vp-pipes-shell";

    const grid = document.createElement("div");
    grid.className = "vp-grid vp-grid-5";

    for (let r = 0; r < st.size; r++) {
      for (let c = 0; c < st.size; c++) {
        const cellData = st.grid[r][c];
        const isLit = st.powered[r]?.[c] ?? false;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `vp-cell vp-pipe-cell${cellData.shape === "block" ? " is-wall" : ""}${isLit ? " is-lit" : ""}`;

        if (r === st.srcRow && c === 0) {
          const tag = document.createElement("span");
          tag.className = "vp-edge-badge is-src";
          tag.textContent = "💧";
          btn.appendChild(tag);
        }
        if (r === st.dstRow && c === st.size - 1) {
          const tag = document.createElement("span");
          tag.className = "vp-edge-badge is-dst";
          tag.textContent = "🔋";
          btn.appendChild(tag);
        }

        if (cellData.shape === "block") {
          btn.disabled = true;
          btn.textContent = "🧱";
        } else {
          const ports = getPipePorts(cellData.shape, cellData.rot);
          const hub = document.createElement("span");
          hub.className = "vp-pipe-hub";
          btn.appendChild(hub);
          for (const d of ports) {
            const arm = document.createElement("span");
            arm.className = `vp-pipe-arm dir-${d === 0 ? "n" : d === 1 ? "e" : d === 2 ? "s" : "w"}`;
            btn.appendChild(arm);
          }

          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.solveTransitionPending) return;
            cellData.rot = ((cellData.rot + 1) % 4) as Dir;
            evaluatePipes(st);
            this.render();
            if (st.solved) this.triggerSolved();
          });
        }

        grid.appendChild(btn);
      }
    }

    shell.appendChild(grid);
    this.boardWrapEl.appendChild(shell);
  }

  // -------------------- RENDER: SIGNAL MIRRORS --------------------

  private renderSignal(st: SignalState): void {
    this.statusEl.textContent = st.solved
      ? "📡 Tín hiệu đã truyền thẳng tới 🎯 Bộ Thu!"
      : `📡 Tia tín hiệu chiếu qua ${st.beamLitCells.size} ô • Chạm gương để đảo góc / ↔ \\`;

    const wrap = document.createElement("div");
    wrap.className = "vp-signal-wrap";

    const grid = document.createElement("div");
    grid.className = "vp-grid vp-grid-5";

    for (let r = 0; r < st.size; r++) {
      for (let c = 0; c < st.size; c++) {
        const cellType = st.grid[r][c];
        const isLit = st.beamLitCells.has(keyRC(r, c));
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `vp-cell vp-signal-cell${isLit ? " is-lit" : ""}`;

        if (r === st.emitter.r && c === st.emitter.c) {
          const badge = document.createElement("span");
          badge.className = "vp-edge-badge is-src";
          badge.textContent = "📡";
          btn.appendChild(badge);
        }

        if (cellType === "wall") {
          btn.classList.add("is-wall");
          btn.disabled = true;
          btn.textContent = "🧱";
        } else if (cellType === "target") {
          btn.classList.add("is-target");
          btn.disabled = true;
          btn.textContent = "🎯";
        } else if (cellType === "slash" || cellType === "backslash") {
          btn.classList.add("is-mirror");
          const bar = document.createElement("span");
          bar.className = `vp-mirror-bar ${cellType === "slash" ? "is-slash" : "is-backslash"}`;
          btn.appendChild(bar);
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.solveTransitionPending) return;
            st.grid[r][c] = st.grid[r][c] === "slash" ? "backslash" : "slash";
            evaluateSignal(st);
            this.render();
            if (st.solved) this.triggerSolved();
          });
        } else {
          btn.disabled = true;
        }

        grid.appendChild(btn);
      }
    }

    // SVG Beam overlay matching 5x5 grid normalized 0..5
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 5 5");
    svg.setAttribute("class", "vp-signal-svg");

    if (st.beamPoints.length >= 2) {
      const polyline = document.createElementNS(svgNS, "polyline");
      polyline.setAttribute(
        "points",
        st.beamPoints.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(" "),
      );
      polyline.setAttribute("fill", "none");
      polyline.setAttribute("stroke", st.solved ? "#22c55e" : "#facc15");
      polyline.setAttribute("stroke-width", "0.14");
      polyline.setAttribute("stroke-linecap", "round");
      polyline.setAttribute("stroke-linejoin", "round");
      svg.appendChild(polyline);

      const tip = st.beamPoints[st.beamPoints.length - 1];
      const dot = document.createElementNS(svgNS, "circle");
      dot.setAttribute("cx", tip.x.toFixed(3));
      dot.setAttribute("cy", tip.y.toFixed(3));
      dot.setAttribute("r", "0.16");
      dot.setAttribute("fill", st.solved ? "#4ade80" : "#fde047");
      svg.appendChild(dot);
    }

    wrap.append(grid, svg);
    this.boardWrapEl.appendChild(wrap);
  }

  // -------------------- RENDER: CODE4 (BULLS & COWS) --------------------

  private renderCode4(st: Code4State): void {
    this.statusEl.textContent = st.attempts.length === 0
      ? "🔢 Nhập 4 chữ số khác nhau (không giới hạn lượt thử)"
      : `🔢 Đã thử ${st.attempts.length} lượt • Tiếp tục suy luận mật mã`;

    const wrap = document.createElement("div");
    wrap.className = "vp-code-wrap";

    // Display 4 digit boxes
    const slots = document.createElement("div");
    slots.className = "vp-code-slots";
    for (let i = 0; i < 4; i++) {
      const box = document.createElement("div");
      box.className = `vp-code-slot${i < st.input.length ? " is-filled" : ""}`;
      box.textContent = st.input[i] ?? "•";
      slots.appendChild(box);
    }

    // Attempts history log
    const log = document.createElement("div");
    log.className = "vp-code-history";
    if (st.attempts.length === 0) {
      const hint = document.createElement("div");
      hint.className = "vp-code-empty";
      hint.textContent = "Ví dụ: Gợi ý 🟢2 🟡1 = 2 số đúng chỗ, 1 số có mặt nhưng sai vị trí.";
      log.appendChild(hint);
    } else {
      for (let i = st.attempts.length - 1; i >= 0; i--) {
        const a = st.attempts[i];
        const row = document.createElement("div");
        row.className = "vp-code-row";
        const num = document.createElement("span");
        num.className = "vp-code-guess";
        num.textContent = `#${i + 1}  ${a.guess.split("").join(" ")}`;
        const res = document.createElement("span");
        res.className = "vp-code-clue";
        res.textContent = `🟢 ${a.bulls} đúng chỗ • 🟡 ${a.cows} sai chỗ`;
        row.append(num, res);
        log.appendChild(row);
      }
    }

    // Keypad
    const pad = document.createElement("div");
    pad.className = "vp-code-pad";
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];
    for (const k of keys) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `vp-code-key${k === "✓" ? " is-submit" : k === "⌫" ? " is-back" : ""}`;
      btn.textContent = k;

      if (k === "⌫") {
        btn.disabled = st.input.length === 0 || this.solveTransitionPending;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.backspaceCode4();
        });
      } else if (k === "✓") {
        btn.disabled = st.input.length !== 4 || this.solveTransitionPending;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.submitCode4();
        });
      } else {
        btn.disabled = st.input.length >= 4 || st.input.includes(k) || this.solveTransitionPending;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.appendCode4Digit(k);
        });
      }
      pad.appendChild(btn);
    }

    wrap.append(slots, log, pad);
    this.boardWrapEl.appendChild(wrap);
  }

  private appendCode4Digit(d: string): void {
    const st = this.code4;
    if (!st || this.kind !== "code4" || this.solveTransitionPending) return;
    if (st.input.length >= 4 || st.input.includes(d)) return;
    st.input += d;
    this.render();
  }

  private backspaceCode4(): void {
    const st = this.code4;
    if (!st || this.kind !== "code4" || this.solveTransitionPending) return;
    if (st.input.length === 0) return;
    st.input = st.input.slice(0, -1);
    this.render();
  }

  private submitCode4(): void {
    const st = this.code4;
    if (!st || this.kind !== "code4" || this.solveTransitionPending) return;
    if (st.input.length !== 4) return;

    let bulls = 0;
    let cows = 0;
    for (let i = 0; i < 4; i++) {
      if (st.input[i] === st.secret[i]) {
        bulls++;
      } else if (st.secret.includes(st.input[i])) {
        cows++;
      }
    }

    st.attempts.push({ guess: st.input, bulls, cows });
    st.input = "";
    if (bulls === 4) {
      st.solved = true;
      this.render();
      this.triggerSolved();
      return;
    }
    this.render();
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (!this.activeTarget) return;
    if (e.key === "Escape") {
      e.preventDefault();
      this.cancel();
      return;
    }
    if (this.arcadeCtrl?.handleKeyDown(e)) {
      return;
    }
    if (this.kind === "code4" && !this.solveTransitionPending) {
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        this.appendCode4Digit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        this.backspaceCode4();
      } else if (e.key === "Enter") {
        e.preventDefault();
        this.submitCode4();
      }
    }
  };
}
