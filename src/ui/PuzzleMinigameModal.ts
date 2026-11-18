import {
  ARCADE_MINIGAME_META,
  ArcadeMinigameController,
  type ArcadeDifficulty,
  type ArcadeMinigameKind,
} from "./ArcadeMinigames.ts";
import type { SecurityZone } from "../world/types.ts";

export type VaultPuzzleKind = "wires" | "pipes" | "signal" | "code4" | ArcadeMinigameKind;

export interface VaultPuzzleTarget {
  containerId: string;
  title: string;
  sourceType: "chest_royal" | "house_vault" | "jail_station";
  kind?: VaultPuzzleKind;
  seed?: number;
  zone?: SecurityZone;
  difficulty?: ArcadeDifficulty;
  extraMisses?: number;
}

export function getCode4MaxAttempts(zone?: SecurityZone): number {
  if (zone === "red") return 4;
  if (zone === "yellow") return 5;
  return 6;
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
    badge: "⚡ MẠCH ĐIỆN 6×6",
    title: "Nối Dây Điện Đồng Màu",
    guide: "Kéo hoặc chạm nối từng cặp chân màu giống nhau trên bảng 6×6 mà không cắt ngang dây khác.",
  },
  pipes: {
    badge: "🔧 HỆ THỐNG ỐNG 6×6",
    title: "Xoay Ống Dẫn Nước",
    guide: "Chạm vào từng đoạn ống để xoay 90°, dẫn dòng nước từ 💧 Nguồn tới 🔋 Van Đích.",
  },
  signal: {
    badge: "📡 MA TRẬN GƯƠNG",
    title: "Đường Dẫn Tín Hiệu",
    guide: "Chạm gương xoay 3 chế độ (/ → \\ → ◇ xuyên thẳng). Dẫn tia qua đủ trạm ⚡ rồi tới 🎯 Bộ Thu! (Gương viền vàng 🔒 là cố định)",
  },
  code4: {
    badge: "🔢 KHÓA MẬT MÃ 4 SỐ",
    title: "Đoán Mã Két An Toàn (Tối đa 6 lượt)",
    guide: "Nhập 4 chữ số khác nhau (0–9). Sai quá 6 lượt mật mã sẽ tự đổi mới! 🟢 Đúng số & đúng vị trí • 🟡 Đúng số nhưng sai vị trí • ⬛ Không có.",
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

export function createPuzzleRng(seed?: number): () => number {
  if (typeof seed !== "number" || !Number.isFinite(seed)) {
    return () => Math.random();
  }
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ===================== WIRES (FLOW 6x6) =====================

interface WireTemplate {
  walls: Array<[number, number]>;
  pairs: Array<[[number, number], [number, number]]>;
}

export const WIRE_TEMPLATES: readonly WireTemplate[] = [
  {
    walls: [
      [2, 2],
      [3, 3],
    ],
    pairs: [
      [[0, 0], [1, 4]],
      [[1, 0], [2, 4]],
      [[2, 0], [4, 2]],
      [[3, 0], [5, 5]],
      [[2, 5], [4, 3]],
    ],
  },
  {
    walls: [],
    pairs: [
      [[0, 1], [3, 0]],
      [[0, 2], [2, 4]],
      [[1, 1], [1, 4]],
      [[2, 1], [3, 5]],
      [[4, 0], [4, 3]],
      [[4, 4], [5, 0]],
    ],
  },
  {
    walls: [
      [1, 4],
      [4, 1],
    ],
    pairs: [
      [[0, 0], [2, 5]],
      [[1, 1], [3, 4]],
      [[1, 0], [3, 3]],
      [[3, 0], [5, 3]],
      [[3, 5], [4, 2]],
    ],
  },
  {
    walls: [
      [2, 1],
      [3, 4],
    ],
    pairs: [
      [[0, 1], [2, 4]],
      [[0, 4], [3, 5]],
      [[0, 0], [2, 3]],
      [[2, 0], [4, 4]],
      [[4, 5], [5, 0]],
    ],
  },
  {
    walls: [],
    pairs: [
      [[0, 2], [2, 2]],
      [[0, 1], [3, 0]],
      [[1, 1], [3, 3]],
      [[2, 3], [4, 4]],
      [[4, 0], [4, 3]],
      [[4, 5], [5, 0]],
    ],
  },
];

const WIRE_COLORS = ["#ef4444", "#38bdf8", "#facc15", "#22c55e", "#c084fc", "#fb923c"];

interface WiresState {
  size: 6;
  walls: Set<string>;
  terminals: Map<string, number>; // key "r,c" -> wireId
  pairEnds: Array<[string, string]>;
  colors: string[];
  paths: string[][]; // wireId -> ordered "r,c"
  activeWire: number | null;
  solved: boolean;
}

// ===================== PIPES (6x6 ROTATION) =====================

type PipeShape = "straight" | "elbow" | "tee" | "block";

interface PipeCell {
  shape: PipeShape;
  rot: Dir;
}

interface PipesState {
  size: 6;
  srcRow: number;
  dstRow: number;
  grid: PipeCell[][];
  powered: boolean[][];
  solved: boolean;
}

// ===================== SIGNAL (LASER MIRRORS 7x7 / 8x8) =====================

type SignalCellKind =
  | "empty"
  | "wall"
  | "slash"
  | "backslash"
  | "open"
  | "fixed_slash"
  | "fixed_backslash"
  | "relay"
  | "target";

interface SignalState {
  size: 7 | 8;
  emitter: { r: number; c: number; dir: Dir }; // sits on border pointing inward
  grid: SignalCellKind[][];
  beamPoints: Array<{ x: number; y: number }>; // normalized 0..size SVG coords
  beamLitCells: Set<string>;
  relaysTotal: number;
  relaysLit: number;
  reachedTarget: boolean;
  solved: boolean;
}

// ===================== CODE4 (BULLS & COWS) =====================

type CodeDigitStatus = "exact" | "misplaced" | "miss";

interface CodeAttempt {
  guess: string;
  bulls: number;
  cows: number;
  statuses?: CodeDigitStatus[];
}

interface Code4State {
  secret: string;
  input: string;
  attempts: CodeAttempt[];
  maxAttempts: number;
  resetCount: number;
  justReset: boolean;
  solved: boolean;
}

interface CachedPuzzleSession {
  kind: VaultPuzzleKind;
  seed: number;
  wires?: WiresState;
  pipes?: PipesState;
  signal?: SignalState;
  code4?: Code4State;
}

function keyRC(r: number, c: number): string {
  return `${r},${c}`;
}

function parseRC(k: string): [number, number] {
  const [rs, cs] = k.split(",");
  return [Number(rs), Number(cs)];
}

function randInt(rng: () => number, n: number): number {
  return Math.floor(rng() * n);
}

function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function transformRC(r: number, c: number, rot: number, flipX: boolean, size = 6): [number, number] {
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

export function createWiresState(rng: () => number = Math.random): WiresState {
  const tpl = WIRE_TEMPLATES[randInt(rng, WIRE_TEMPLATES.length)];
  const rot = randInt(rng, 4);
  const flip = rng() < 0.5;
  const colors = shuffleInPlace([...WIRE_COLORS], rng).slice(0, tpl.pairs.length);

  const walls = new Set<string>();
  for (const [wr, wc] of tpl.walls) {
    const [tr, tc] = transformRC(wr, wc, rot, flip, 6);
    walls.add(keyRC(tr, tc));
  }

  const terminals = new Map<string, number>();
  const pairEnds: Array<[string, string]> = [];
  const shuffledPairs = shuffleInPlace([...tpl.pairs], rng);
  shuffledPairs.forEach(([[r1, c1], [r2, c2]], idx) => {
    const [aR, aC] = transformRC(r1, c1, rot, flip, 6);
    const [bR, bC] = transformRC(r2, c2, rot, flip, 6);
    const kA = keyRC(aR, aC);
    const kB = keyRC(bR, bC);
    terminals.set(kA, idx);
    terminals.set(kB, idx);
    pairEnds.push([kA, kB]);
  });

  return {
    size: 6,
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

function buildPipesBoardFromPath(
  size: 6,
  srcRow: number,
  dstRow: number,
  path: Array<[number, number]>,
  rng: () => number,
): PipesState {
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

    if (rng() < 0.08) {
      const rots = shuffleInPlace<Dir>([0, 1, 2, 3], rng);
      const validRot =
        rots.find((rt) => {
          const p = getPipePorts("tee", rt);
          return p.has(inDir) && p.has(outDir);
        }) ?? 0;
      grid[r][c] = { shape: "tee", rot: validRot };
    } else if ((inDir + 2) % 4 === outDir) {
      grid[r][c] = { shape: "straight", rot: (inDir % 2 === 0 ? 0 : 1) as Dir };
    } else {
      const validRot =
        ([0, 1, 2, 3] as Dir[]).find((rt) => {
          const p = getPipePorts("elbow", rt);
          return p.has(inDir) && p.has(outDir);
        }) ?? 0;
      grid[r][c] = { shape: "elbow", rot: validRot };
    }
  }

  let blocks = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (onPath.has(keyRC(r, c))) continue;
      if (blocks < 4 && rng() < 0.18) {
        grid[r][c] = { shape: "block", rot: 0 };
        blocks++;
      } else {
        const shapes: PipeShape[] = ["straight", "elbow", "elbow", "tee"];
        grid[r][c] = { shape: shapes[randInt(rng, shapes.length)], rot: randInt(rng, 4) as Dir };
      }
    }
  }

  for (let sTry = 0; sTry < 12; sTry++) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c].shape === "block") continue;
        const delta = onPath.has(keyRC(r, c)) ? 1 + randInt(rng, 3) : randInt(rng, 4);
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

  grid[srcRow][0].rot = ((grid[srcRow][0].rot + 1) % 4) as Dir;
  const forced: PipesState = { size, srcRow, dstRow, grid, powered: [], solved: false };
  evaluatePipes(forced);
  return forced;
}

export function createPipesState(rng: () => number = Math.random): PipesState {
  const size = 6;
  for (let attempt = 0; attempt < 55; attempt++) {
    const srcRow = randInt(rng, size);
    const dstRow = randInt(rng, size);
    const visited = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
    const path: Array<[number, number]> = [];

    const walk = (r: number, c: number): boolean => {
      visited[r][c] = true;
      path.push([r, c]);
      if (r === dstRow && c === size - 1 && path.length >= 15) {
        return true;
      }
      const nextDirs = shuffleInPlace<Dir>([0, 1, 2, 3], rng);
      for (const d of nextDirs) {
        const nr = r + DIRS[d].dr;
        const nc = c + DIRS[d].dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size || visited[nr][nc]) continue;
        if (nr === dstRow && nc === size - 1 && path.length < 14) continue;
        if (walk(nr, nc)) return true;
      }
      path.pop();
      visited[r][c] = false;
      return false;
    };

    if (!walk(srcRow, 0)) continue;
    return buildPipesBoardFromPath(size, srcRow, dstRow, path, rng);
  }

  // Deterministic 19-cell solvable 6x6 fallback
  const fallbackPath: Array<[number, number]> = [
    [2, 0],
    [2, 1],
    [1, 1],
    [1, 2],
    [0, 2],
    [0, 3],
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [3, 3],
    [3, 2],
    [4, 2],
    [4, 3],
    [4, 4],
    [4, 5],
    [3, 5],
    [2, 5],
    [1, 5],
  ];
  return buildPipesBoardFromPath(6, 2, 1, fallbackPath, rng);
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
  const litRelays = new Set<string>();

  let relaysTotal = 0;
  for (let rr = 0; rr < size; rr++) {
    for (let cc = 0; cc < size; cc++) {
      if (grid[rr][cc] === "relay") relaysTotal++;
    }
  }

  const startX = emitter.c + 0.5 - DIRS[emitter.dir].dc * 0.5;
  const startY = emitter.r + 0.5 - DIRS[emitter.dir].dr * 0.5;
  beamPoints.push({ x: startX, y: startY });

  let r = emitter.r;
  let c = emitter.c;
  let dir = emitter.dir;
  let reachedTarget = false;
  let solved = false;

  const maxSteps = size * size * 2;
  for (let step = 0; step < maxSteps; step++) {
    if (r < 0 || r >= size || c < 0 || c >= size) {
      break;
    }
    const stateKey = `${r},${c},${dir}`;
    if (seenStates.has(stateKey)) break;
    seenStates.add(stateKey);

    const cell = grid[r][c];
    if (cell === "wall") {
      beamPoints.push({
        x: c + 0.5 - DIRS[dir].dc * 0.42,
        y: r + 0.5 - DIRS[dir].dr * 0.42,
      });
      break;
    }

    const cellKey = keyRC(r, c);
    beamLitCells.add(cellKey);
    beamPoints.push({ x: c + 0.5, y: r + 0.5 });

    if (cell === "relay") {
      litRelays.add(cellKey);
    }

    if (cell === "target") {
      reachedTarget = true;
      solved = litRelays.size === relaysTotal;
      break;
    }

    if (cell === "slash" || cell === "fixed_slash") {
      dir = reflectDir("slash", dir);
    } else if (cell === "backslash" || cell === "fixed_backslash") {
      dir = reflectDir("backslash", dir);
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
  state.relaysTotal = relaysTotal;
  state.relaysLit = litRelays.size;
  state.reachedTarget = reachedTarget;
  state.solved = solved;
}

interface SignalDifficultyConfig {
  size: 7 | 8;
  minBounces: number;
  maxBounces: number;
  relays: number;
  fixedMirrors: number;
  inlineDecoys: number;
  offPathDecoys: number;
  walls: number;
}

export function getSignalDifficultyConfig(zone?: SecurityZone): SignalDifficultyConfig {
  if (zone === "red") {
    return {
      size: 8,
      minBounces: 9,
      maxBounces: 11,
      relays: 3,
      fixedMirrors: 2,
      inlineDecoys: 4,
      offPathDecoys: 12,
      walls: 8,
    };
  }
  if (zone === "yellow") {
    return {
      size: 7,
      minBounces: 7,
      maxBounces: 9,
      relays: 2,
      fixedMirrors: 2,
      inlineDecoys: 3,
      offPathDecoys: 9,
      walls: 6,
    };
  }
  return {
    size: 7,
    minBounces: 6,
    maxBounces: 7,
    relays: 2,
    fixedMirrors: 1,
    inlineDecoys: 2,
    offPathDecoys: 7,
    walls: 5,
  };
}

function nextSignalMirrorKind(kind: "slash" | "backslash" | "open"): "slash" | "backslash" | "open" {
  if (kind === "slash") return "backslash";
  if (kind === "backslash") return "open";
  return "slash";
}

function pickDifferentMirrorKind(
  solution: "slash" | "backslash" | "open",
  rng: () => number,
): "slash" | "backslash" | "open" {
  const opts = (["slash", "backslash", "open"] as const).filter((k) => k !== solution);
  return opts[randInt(rng, opts.length)];
}

export function createSignalState(
  rng: () => number = Math.random,
  zone?: SecurityZone,
): SignalState {
  const cfg = getSignalDifficultyConfig(zone);
  const { size } = cfg;

  for (let attempt = 0; attempt < 180; attempt++) {
    const edge = randInt(rng, 4);
    const startPos = randInt(rng, size);
    const emitter: { r: number; c: number; dir: Dir } =
      edge === 0
        ? { r: startPos, c: 0, dir: 1 }
        : edge === 1
          ? { r: startPos, c: size - 1, dir: 3 }
          : edge === 2
            ? { r: 0, c: startPos, dir: 2 }
            : { r: size - 1, c: startPos, dir: 0 };

    const grid: SignalCellKind[][] = Array.from({ length: size }, () =>
      Array<SignalCellKind>(size).fill("empty"),
    );
    const solutionMirrors: Array<{ r: number; c: number; kind: "slash" | "backslash" }> = [];
    const straightCells: Array<[number, number]> = [];
    const passedAir = new Set<string>();

    let r = emitter.r;
    let c = emitter.c;
    let dir: Dir = emitter.dir;
    passedAir.add(keyRC(r, c));

    const targetBounces = cfg.minBounces + randInt(rng, cfg.maxBounces - cfg.minBounces + 1);
    let ok = true;

    for (let b = 0; b < targetBounces; b++) {
      const candidates: Array<{ mr: number; mc: number; newDir: Dir; dist: number }> = [];
      for (let dist = 1; dist <= size - 2; dist++) {
        const mr = r + DIRS[dir].dr * dist;
        const mc = c + DIRS[dir].dc * dist;
        if (mr < 0 || mr >= size || mc < 0 || mc >= size) break;
        if (passedAir.has(keyRC(mr, mc))) break;
        const turnOpts: Dir[] = [((dir + 1) % 4) as Dir, ((dir + 3) % 4) as Dir];
        for (const nd of turnOpts) {
          const ar = mr + DIRS[nd].dr;
          const ac = mc + DIRS[nd].dc;
          if (ar >= 0 && ar < size && ac >= 0 && ac < size && !passedAir.has(keyRC(ar, ac))) {
            candidates.push({ mr, mc, newDir: nd, dist });
          }
        }
      }
      if (candidates.length === 0) {
        ok = false;
        break;
      }
      const pick = candidates[randInt(rng, candidates.length)];
      let sr = r;
      let sc = c;
      while (sr !== pick.mr || sc !== pick.mc) {
        passedAir.add(keyRC(sr, sc));
        if (!(sr === emitter.r && sc === emitter.c)) {
          straightCells.push([sr, sc]);
        }
        sr += DIRS[dir].dr;
        sc += DIRS[dir].dc;
      }
      passedAir.add(keyRC(pick.mr, pick.mc));

      const slashRes = reflectDir("slash", dir);
      const mirrorKind: "slash" | "backslash" = slashRes === pick.newDir ? "slash" : "backslash";
      grid[pick.mr][pick.mc] = mirrorKind;
      solutionMirrors.push({ r: pick.mr, c: pick.mc, kind: mirrorKind });

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

    let tr = r;
    let tc = c;
    const extraSteps = 1 + randInt(rng, 3);
    for (let s = 0; s < extraSteps; s++) {
      const nr = tr + DIRS[dir].dr;
      const nc = tc + DIRS[dir].dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size || passedAir.has(keyRC(nr, nc))) break;
      straightCells.push([tr, tc]);
      tr = nr;
      tc = nc;
      passedAir.add(keyRC(tr, tc));
    }
    grid[tr][tc] = "target";

    if (straightCells.length < cfg.relays + cfg.inlineDecoys) continue;

    // Place mandatory relays spread evenly along the solution path
    const relaySet = new Set<string>();
    for (let i = 0; i < cfg.relays; i++) {
      const segStart = Math.floor((i * straightCells.length) / cfg.relays);
      const segEnd = Math.max(segStart + 1, Math.floor(((i + 1) * straightCells.length) / cfg.relays));
      const chosen = straightCells[segStart + randInt(rng, segEnd - segStart)];
      const k = keyRC(chosen[0], chosen[1]);
      if (!relaySet.has(k)) {
        relaySet.add(k);
        grid[chosen[0]][chosen[1]] = "relay";
      }
    }
    if (relaySet.size < cfg.relays) continue;

    // Convert some interior solution mirrors into fixed anchors
    const fixPool = solutionMirrors.slice(1);
    shuffleInPlace(fixPool, rng);
    const fixedSet = new Set<string>();
    for (let i = 0; i < Math.min(cfg.fixedMirrors, fixPool.length); i++) {
      const fm = fixPool[i];
      grid[fm.r][fm.c] = fm.kind === "slash" ? "fixed_slash" : "fixed_backslash";
      fixedSet.add(keyRC(fm.r, fm.c));
    }

    // Place inline pass-through traps (solution = "open", scrambled to slash/backslash)
    const remainingStraight = straightCells.filter(([sr, sc]) => !relaySet.has(keyRC(sr, sc)));
    shuffleInPlace(remainingStraight, rng);
    const inlineDecoys = remainingStraight.slice(0, cfg.inlineDecoys);
    for (const [dr, dc] of inlineDecoys) {
      grid[dr][dc] = "open";
    }

    // Place walls and off-path decoy mirrors on untouched cells
    const untouched: Array<[number, number]> = [];
    for (let rr = 0; rr < size; rr++) {
      for (let cc = 0; cc < size; cc++) {
        if (!passedAir.has(keyRC(rr, cc))) untouched.push([rr, cc]);
      }
    }
    shuffleInPlace(untouched, rng);
    const wallCount = Math.min(cfg.walls, untouched.length);
    for (let i = 0; i < wallCount; i++) {
      const [wr, wc] = untouched[i];
      grid[wr][wc] = "wall";
    }
    const offPathDecoys = untouched.slice(wallCount, wallCount + cfg.offPathDecoys);
    for (const [mr, mc] of offPathDecoys) {
      const roll = rng();
      grid[mr][mc] = roll < 0.44 ? "slash" : roll < 0.88 ? "backslash" : "open";
    }

    // Verify unscrambled solution is 100% solvable
    const verifyState: SignalState = {
      size,
      emitter,
      grid,
      beamPoints: [],
      beamLitCells: new Set(),
      relaysTotal: 0,
      relaysLit: 0,
      reachedTarget: false,
      solved: false,
    };
    evaluateSignal(verifyState);
    if (!verifyState.solved) continue;

    // Scramble rotatable mirrors
    const rotatableSolution = solutionMirrors.filter((m) => !fixedSet.has(keyRC(m.r, m.c)));
    const minWrong = Math.max(4, Math.ceil(rotatableSolution.length * 0.72));

    for (let sTry = 0; sTry < 12; sTry++) {
      const scrambledGrid = grid.map((row) => row.slice());
      // Always close inline pass-through traps into angled deflectors at start
      for (const [dr, dc] of inlineDecoys) {
        scrambledGrid[dr][dc] = rng() < 0.5 ? "slash" : "backslash";
      }
      // Scramble rotatable mirrors along solution path
      const solOrder = rotatableSolution.slice();
      shuffleInPlace(solOrder, rng);
      for (let i = 0; i < solOrder.length; i++) {
        const m = solOrder[i];
        if (i < minWrong || rng() < 0.65) {
          scrambledGrid[m.r][m.c] = pickDifferentMirrorKind(m.kind, rng);
        } else {
          scrambledGrid[m.r][m.c] = m.kind;
        }
      }
      // Reshuffle off-path decoys
      for (const [mr, mc] of offPathDecoys) {
        const roll = rng();
        scrambledGrid[mr][mc] = roll < 0.44 ? "slash" : roll < 0.88 ? "backslash" : "open";
      }

      const st: SignalState = {
        size,
        emitter,
        grid: scrambledGrid,
        beamPoints: [],
        beamLitCells: new Set(),
        relaysTotal: 0,
        relaysLit: 0,
        reachedTarget: false,
        solved: false,
      };
      evaluateSignal(st);
      if (!st.solved) return st;
    }
  }

  // Deterministic guaranteed-solvable 7x7 / 8x8 fallback
  const fbGrid: SignalCellKind[][] = Array.from({ length: size }, () =>
    Array<SignalCellKind>(size).fill("empty"),
  );
  // Path: (0,0)E -> (0,1)[relay] -> (0,2)[open trap] -> (0,4)[\] -> (2,4)[/] -> (2,3)[open trap] ->
  // (2,1)[/] -> (4,1)[\] -> (4,3)[relay] -> (4,5)[fixed /] -> (1,5)[/] -> (1,6)[\] ->
  // (3,6)[relay on 8x8] -> (5,6)[/] -> (5,3)[target on 7x7, / -> (7,3) target on 8x8]
  fbGrid[0][1] = "relay";
  fbGrid[0][2] = "slash"; // solution: "open"
  fbGrid[0][4] = "slash"; // solution: "backslash"
  fbGrid[2][4] = "backslash"; // solution: "slash"
  fbGrid[2][3] = "backslash"; // solution: "open"
  fbGrid[2][1] = "open"; // solution: "slash"
  fbGrid[4][1] = "slash"; // solution: "backslash"
  fbGrid[4][3] = "relay";
  fbGrid[4][5] = "fixed_slash";
  fbGrid[1][5] = "backslash"; // solution: "slash"
  fbGrid[1][6] = "open"; // solution: "backslash"
  fbGrid[5][6] = "backslash"; // solution: "slash"
  if (size === 8) {
    fbGrid[3][6] = "relay";
    fbGrid[5][3] = "backslash"; // solution: "slash" -> South to (7,3)
    fbGrid[7][3] = "target";
    fbGrid[6][5] = "wall";
    fbGrid[6][1] = "slash";
    fbGrid[7][6] = "backslash";
  } else {
    fbGrid[5][3] = "target";
  }
  fbGrid[1][2] = "wall";
  fbGrid[3][2] = "wall";
  fbGrid[3][4] = "wall";
  fbGrid[5][1] = "wall";
  fbGrid[6][4] = "wall";
  fbGrid[1][0] = "slash";
  fbGrid[3][0] = "backslash";
  fbGrid[5][0] = "slash";
  fbGrid[6][2] = "backslash";
  fbGrid[0][6] = "slash";
  const fb: SignalState = {
    size,
    emitter: { r: 0, c: 0, dir: 1 },
    grid: fbGrid,
    beamPoints: [],
    beamLitCells: new Set(),
    relaysTotal: 0,
    relaysLit: 0,
    reachedTarget: false,
    solved: false,
  };
  evaluateSignal(fb);
  return fb;
}

export function createCode4State(
  rng: () => number = Math.random,
  resetCount = 0,
  justReset = false,
  maxAttempts = 6,
): Code4State {
  const digits = shuffleInPlace(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"], rng);
  return {
    secret: digits.slice(0, 4).join(""),
    input: "",
    attempts: [],
    maxAttempts,
    resetCount,
    justReset,
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
  private activeSeed = 0;
  private activeDifficulty: ArcadeDifficulty = "hard";
  private activeRng: () => number = Math.random;
  private onSolvedCb: (() => void) | null = null;
  private onCancelCb: (() => void) | null = null;

  private wires: WiresState | null = null;
  private pipes: PipesState | null = null;
  private signal: SignalState | null = null;
  private code4: Code4State | null = null;
  private arcadeCtrl: ArcadeMinigameController | null = null;
  private solveTransitionPending = false;
  private readonly sessionCache = new Map<string, CachedPuzzleSession>();

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

  public getActiveContainerId(): string | null {
    return this.activeTarget?.containerId ?? null;
  }

  public clearSession(containerId: string): void {
    this.sessionCache.delete(containerId);
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
    const pickedKind = target.kind ?? pool[Math.floor(Math.random() * pool.length)];
    const seed =
      typeof target.seed === "number" && Number.isFinite(target.seed)
        ? target.seed
        : 1 + Math.floor(Math.random() * 0x7ffffff0);
    const isJail = target.sourceType === "jail_station";

    this.arcadeCtrl?.destroy();
    this.arcadeCtrl = null;
    this.activeTarget = target;
    this.kind = pickedKind;
    this.activeSeed = seed;
    this.activeDifficulty = isJail ? "normal" : (target.difficulty ?? "hard");
    this.activeRng = createPuzzleRng(seed);
    this.onSolvedCb = onSolved;
    this.onCancelCb = onCancel;
    this.solveTransitionPending = false;

    const meta = PUZZLE_TITLES[pickedKind];
    const code4MaxAttempts = getCode4MaxAttempts(target.zone);
    const signalCfg = getSignalDifficultyConfig(target.zone);
    const badgeBase =
      pickedKind === "signal"
        ? `${meta.badge} ${signalCfg.size}×${signalCfg.size}`
        : meta.badge;
    this.badgeEl.textContent = isJail
      ? `❗ MINIGAME GIẢM ÁN • ${badgeBase}`
      : `${badgeBase} • ${target.zone === "red" || this.activeDifficulty === "nightmare" ? "CẤP ĐỘ ĐỎ" : "KHÓ"}`;
    this.titleEl.textContent =
      pickedKind === "code4"
        ? `Đoán Mã Két An Toàn (Tối đa ${code4MaxAttempts} lượt)`
        : meta.title;
    this.subtitleEl.textContent = isJail ? "⏳ Giảm 1 phút tạm giam" : `🔐 ${target.title}`;
    this.guideEl.textContent =
      pickedKind === "code4"
        ? `Nhập 4 chữ số khác nhau (0–9). Sai quá ${code4MaxAttempts} lượt mật mã sẽ tự đổi mới! 🟢 Đúng số & đúng vị trí • 🟡 Đúng số nhưng sai vị trí • ⬛ Không có.`
        : meta.guide;
    this.guideEl.style.display = "block";
    this.resetBtn.style.display =
      pickedKind === "code4" || pickedKind === "lockpick" || pickedKind === "timing_bar" || pickedKind === "memory_cards"
        ? "none"
        : "inline-flex";

    const cached = !isJail ? this.sessionCache.get(target.containerId) : undefined;
    if (cached && cached.kind === pickedKind && cached.seed === seed) {
      this.wires = cached.wires ?? null;
      this.pipes = cached.pipes ?? null;
      this.signal = cached.signal ?? null;
      this.code4 = cached.code4 ?? null;
      if (this.code4 && this.code4.maxAttempts !== code4MaxAttempts) {
        this.code4.maxAttempts = code4MaxAttempts;
        if (!this.code4.solved && this.code4.attempts.length >= code4MaxAttempts) {
          this.code4 = createCode4State(this.activeRng, this.code4.resetCount + 1, true, code4MaxAttempts);
        }
      }
    } else {
      this.initPuzzleState();
      if (!isJail) {
        this.saveSessionToCache();
      }
    }

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

  private saveSessionToCache(): void {
    if (!this.activeTarget || this.activeTarget.sourceType === "jail_station") return;
    this.sessionCache.set(this.activeTarget.containerId, {
      kind: this.kind,
      seed: this.activeSeed,
      wires: this.wires ?? undefined,
      pipes: this.pipes ?? undefined,
      signal: this.signal ?? undefined,
      code4: this.code4 ?? undefined,
    });
  }

  private cancel(): void {
    this.saveSessionToCache();
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
    this.activeRng = createPuzzleRng(this.activeSeed);
    if (this.kind === "wires") this.wires = createWiresState(this.activeRng);
    else if (this.kind === "pipes") this.pipes = createPipesState(this.activeRng);
    else if (this.kind === "signal") this.signal = createSignalState(this.activeRng, this.activeTarget?.zone);
    else if (this.kind === "code4") {
      this.code4 = createCode4State(this.activeRng, 0, false, getCode4MaxAttempts(this.activeTarget?.zone));
    }
  }

  private resetCurrentPuzzle(): void {
    if (this.kind === "wires" && this.wires) {
      this.wires.paths = this.wires.pairEnds.map(() => []);
      this.wires.activeWire = null;
      this.wires.solved = false;
      this.saveSessionToCache();
      this.render();
      return;
    }
    this.initPuzzleState();
    this.saveSessionToCache();
    this.render();
  }

  private triggerSolved(): void {
    if (this.solveTransitionPending) return;
    this.solveTransitionPending = true;
    const solvedContainerId = this.activeTarget?.containerId;
    if (solvedContainerId) {
      this.sessionCache.delete(solvedContainerId);
    }
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
        difficulty: this.activeDifficulty,
        extraMisses: this.activeTarget?.extraMisses,
        seed: this.activeSeed,
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

    const selfIdx = path.indexOf(k);
    if (selfIdx !== -1) {
      st.paths[wIdx] = path.slice(0, selfIdx + 1);
      this.render();
      return;
    }

    const [endA, endB] = st.pairEnds[wIdx];
    if (
      path.length >= 2 &&
      ((path[0] === endA && last === endB) || (path[0] === endB && last === endA))
    ) {
      return;
    }

    const [lr, lc] = parseRC(last);
    if (Math.abs(lr - r) + Math.abs(lc - c) !== 1) return;

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
    this.saveSessionToCache();
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
    grid.className = "vp-grid vp-grid-6";

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
            this.saveSessionToCache();
            this.render();
            return;
          }
          const owner = cellWireOwner.get(k);
          if (owner !== undefined) {
            const pIdx = st.paths[owner].indexOf(k);
            st.activeWire = owner;
            st.paths[owner] = st.paths[owner].slice(0, pIdx + 1);
            this.saveSessionToCache();
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
    grid.className = "vp-grid vp-grid-6";

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
            this.saveSessionToCache();
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
      ? `📡 Đã kích hoạt đủ ${st.relaysTotal}/${st.relaysTotal} trạm ⚡ và truyền tới 🎯 Bộ Thu!`
      : st.reachedTarget
        ? `⚠️ Đã chạm 🎯 nhưng mới qua ${st.relaysLit}/${st.relaysTotal} trạm ⚡ — Cần kích hoạt đủ tất cả trạm!`
        : `📡 Trạm ⚡: ${st.relaysLit}/${st.relaysTotal} • Tia qua ${st.beamLitCells.size} ô • Chạm gương xoay / → \\ → ◇`;

    const wrap = document.createElement("div");
    wrap.className = "vp-signal-wrap";

    const grid = document.createElement("div");
    grid.className = `vp-grid vp-grid-${st.size}`;

    const emitterArrow =
      st.emitter.dir === 0 ? "↑" : st.emitter.dir === 1 ? "→" : st.emitter.dir === 2 ? "↓" : "←";

    for (let r = 0; r < st.size; r++) {
      for (let c = 0; c < st.size; c++) {
        const cellType = st.grid[r][c];
        const isLit = st.beamLitCells.has(keyRC(r, c));
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `vp-cell vp-signal-cell${isLit ? " is-lit" : ""}`;

        if (r === st.emitter.r && c === st.emitter.c) {
          const badge = document.createElement("span");
          badge.className = "vp-edge-badge is-src vp-signal-emitter";
          badge.textContent = `📡${emitterArrow}`;
          btn.appendChild(badge);
        }

        if (cellType === "wall") {
          btn.classList.add("is-wall");
          btn.disabled = true;
          btn.textContent = "🧱";
        } else if (cellType === "target") {
          btn.classList.add("is-target");
          if (st.reachedTarget && !st.solved) {
            btn.classList.add("is-target-incomplete");
          }
          btn.disabled = true;
          btn.textContent = "🎯";
        } else if (cellType === "relay") {
          btn.classList.add("is-relay");
          if (isLit) btn.classList.add("is-relay-lit");
          btn.disabled = true;
          btn.textContent = "⚡";
        } else if (cellType === "fixed_slash" || cellType === "fixed_backslash") {
          btn.classList.add("is-fixed-mirror");
          btn.disabled = true;
          const bar = document.createElement("span");
          bar.className = `vp-mirror-bar is-fixed ${cellType === "fixed_slash" ? "is-slash" : "is-backslash"}`;
          btn.appendChild(bar);
          const lock = document.createElement("span");
          lock.className = "vp-mirror-lock";
          lock.textContent = "🔒";
          btn.appendChild(lock);
        } else if (cellType === "slash" || cellType === "backslash" || cellType === "open") {
          btn.classList.add("is-mirror");
          if (cellType === "open") {
            btn.classList.add("is-open-mirror");
            const ring = document.createElement("span");
            ring.className = "vp-mirror-open";
            btn.appendChild(ring);
          } else {
            const bar = document.createElement("span");
            bar.className = `vp-mirror-bar ${cellType === "slash" ? "is-slash" : "is-backslash"}`;
            btn.appendChild(bar);
          }
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.solveTransitionPending) return;
            const cur = st.grid[r][c];
            if (cur === "slash" || cur === "backslash" || cur === "open") {
              st.grid[r][c] = nextSignalMirrorKind(cur);
            }
            evaluateSignal(st);
            this.saveSessionToCache();
            this.render();
            if (st.solved) this.triggerSolved();
          });
        } else {
          btn.disabled = true;
        }

        grid.appendChild(btn);
      }
    }

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${st.size} ${st.size}`);
    svg.setAttribute("class", "vp-signal-svg");

    const beamColor = st.solved ? "#22c55e" : st.reachedTarget ? "#f97316" : "#facc15";
    const tipColor = st.solved ? "#4ade80" : st.reachedTarget ? "#fb923c" : "#fde047";

    if (st.beamPoints.length >= 2) {
      const polyline = document.createElementNS(svgNS, "polyline");
      polyline.setAttribute(
        "points",
        st.beamPoints.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(" "),
      );
      polyline.setAttribute("fill", "none");
      polyline.setAttribute("stroke", beamColor);
      polyline.setAttribute("stroke-width", "0.14");
      polyline.setAttribute("stroke-linecap", "round");
      polyline.setAttribute("stroke-linejoin", "round");
      svg.appendChild(polyline);

      const tip = st.beamPoints[st.beamPoints.length - 1];
      const dot = document.createElementNS(svgNS, "circle");
      dot.setAttribute("cx", tip.x.toFixed(3));
      dot.setAttribute("cy", tip.y.toFixed(3));
      dot.setAttribute("r", "0.16");
      dot.setAttribute("fill", tipColor);
      svg.appendChild(dot);
    }

    wrap.append(grid, svg);
    this.boardWrapEl.appendChild(wrap);
  }

  // -------------------- RENDER: CODE4 (BULLS & COWS, MAX 6 ATTEMPTS) --------------------

  private renderCode4(st: Code4State): void {
    this.statusEl.textContent = st.justReset
      ? `🔒 Hết ${st.maxAttempts} lượt sai — Mật mã đã tự đổi mới (Lần đổi #${st.resetCount})!`
      : `🔢 Lượt đoán: ${st.attempts.length}/${st.maxAttempts} • Nhập 4 chữ số khác nhau`;

    const wrap = document.createElement("div");
    wrap.className = "vp-code-wrap";

    const slots = document.createElement("div");
    slots.className = "vp-code-slots";
    for (let i = 0; i < 4; i++) {
      const box = document.createElement("div");
      box.className = `vp-code-slot${i < st.input.length ? " is-filled" : ""}`;
      box.textContent = st.input[i] ?? "•";
      slots.appendChild(box);
    }

    const log = document.createElement("div");
    log.className = "vp-code-history";
    if (st.attempts.length === 0) {
      const hint = document.createElement("div");
      hint.className = "vp-code-empty";
      hint.textContent = `Đoán quá ${st.maxAttempts} lượt chưa trúng sẽ tự đổi mã mới! (🟢 Đúng vị trí • 🟡 Đúng số, sai vị trí)`;
      log.appendChild(hint);
    } else {
      for (let i = st.attempts.length - 1; i >= 0; i--) {
        const a = st.attempts[i];
        const row = document.createElement("div");
        row.className = "vp-code-row";

        const left = document.createElement("div");
        left.className = "vp-code-guess-cells";
        const idxLbl = document.createElement("span");
        idxLbl.className = "vp-code-idx";
        idxLbl.textContent = `#${i + 1}`;
        left.appendChild(idxLbl);

        for (let dIdx = 0; dIdx < a.guess.length; dIdx++) {
          const ch = a.guess[dIdx];
          const status: CodeDigitStatus =
            a.statuses?.[dIdx] ??
            (ch === st.secret[dIdx] ? "exact" : st.secret.includes(ch) ? "misplaced" : "miss");
          const cell = document.createElement("span");
          cell.className = `vp-code-digit is-${status}`;
          cell.textContent = ch;
          left.appendChild(cell);
        }

        row.append(left);
        log.appendChild(row);
      }
    }

    const pad = document.createElement("div");
    pad.className = "vp-code-pad";
    const digitHint = new Map<string, CodeDigitStatus>();
    for (const a of st.attempts) {
      for (let dIdx = 0; dIdx < a.guess.length; dIdx++) {
        const ch = a.guess[dIdx];
        const status: CodeDigitStatus =
          a.statuses?.[dIdx] ??
          (ch === st.secret[dIdx] ? "exact" : st.secret.includes(ch) ? "misplaced" : "miss");
        const prev = digitHint.get(ch);
        if (prev === "exact") continue;
        if (status === "exact" || !prev || (prev === "miss" && status === "misplaced")) {
          digitHint.set(ch, status);
        }
      }
    }
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];
    for (const k of keys) {
      const btn = document.createElement("button");
      btn.type = "button";
      const hintCls = digitHint.get(k) ? ` is-hint-${digitHint.get(k)}` : "";
      btn.className = `vp-code-key${k === "✓" ? " is-submit" : k === "⌫" ? " is-back" : hintCls}`;
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
    st.justReset = false;
    st.input += d;
    this.saveSessionToCache();
    this.render();
  }

  private backspaceCode4(): void {
    const st = this.code4;
    if (!st || this.kind !== "code4" || this.solveTransitionPending) return;
    if (st.input.length === 0) return;
    st.input = st.input.slice(0, -1);
    this.saveSessionToCache();
    this.render();
  }

  private submitCode4(): void {
    const st = this.code4;
    if (!st || this.kind !== "code4" || this.solveTransitionPending) return;
    if (st.input.length !== 4) return;

    let bulls = 0;
    let cows = 0;
    const statuses: CodeDigitStatus[] = [];
    for (let i = 0; i < 4; i++) {
      if (st.input[i] === st.secret[i]) {
        bulls++;
        statuses.push("exact");
      } else if (st.secret.includes(st.input[i])) {
        cows++;
        statuses.push("misplaced");
      } else {
        statuses.push("miss");
      }
    }

    st.attempts.push({ guess: st.input, bulls, cows, statuses });
    st.input = "";
    st.justReset = false;
    if (bulls === 4) {
      st.solved = true;
      this.render();
      this.triggerSolved();
      return;
    }

    if (st.attempts.length >= st.maxAttempts) {
      this.code4 = createCode4State(this.activeRng, st.resetCount + 1, true, st.maxAttempts);
    }

    this.saveSessionToCache();
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
