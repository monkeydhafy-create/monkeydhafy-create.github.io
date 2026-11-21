import type { DungeonMinigameKind } from "../world/dungeon/DungeonTypes.ts";
import { DungeonSfx } from "./DungeonSfx.ts";

interface ConveyorItemSpec {
  id: string;
  label: string;
  isCoin: boolean;
  isGold: boolean;
  points: number;
}

interface ConveyorBeltItem {
  spec: ConveyorItemSpec;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  rotSpeed: number;
  phase: number;
  state: "riding" | "to_chest" | "falling_chest" | "pushed_out";
}

interface CanvasParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
}

interface CanvasFloatPop {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface PlatePeanut {
  ox: number;
  oy: number;
  rot: number;
  toneIdx: number;
}

interface FlyingPeanut {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  arcH: number;
  rotStart: number;
  rotEnd: number;
  t: number;
  dur: number;
}

const CONVEYOR_COIN_POOL: readonly ConveyorItemSpec[] = [
  { id: "coin_bronze", label: "Xu Đồng Cổ", isCoin: true, isGold: false, points: 1 },
  { id: "coin_ly", label: "Xu Thời Lý", isCoin: true, isGold: false, points: 1 },
  { id: "coin_gold", label: "Xu Vàng", isCoin: true, isGold: true, points: 2 },
];

const CONVEYOR_JUNK_POOL: readonly ConveyorItemSpec[] = [
  { id: "junk_sandal", label: "Dép Tổ Ong", isCoin: false, isGold: false, points: 0 },
  { id: "junk_can", label: "Lon Móp", isCoin: false, isGold: false, points: 0 },
  { id: "junk_brick", label: "Gạch Vỡ", isCoin: false, isGold: false, points: 0 },
  { id: "junk_screw", label: "Ốc Vít Rỉ", isCoin: false, isGold: false, points: 0 },
  { id: "junk_fake", label: "Xu Nhôm Giả", isCoin: false, isGold: false, points: 0 },
  { id: "junk_bone", label: "Xương Cá", isCoin: false, isGold: false, points: 0 },
  { id: "junk_bottle", label: "Chai Vỡ", isCoin: false, isGold: false, points: 0 },
];

const PEANUT_TONES: readonly { main: string; rim: string; sheen: string }[] = [
  { main: "#d97706", rim: "#92400e", sheen: "#fde68a" },
  { main: "#e08e26", rim: "#78350f", sheen: "#fef3c7" },
  { main: "#c26d18", rim: "#7c2d12", sheen: "#fcd34d" },
];

export interface DungeonMinigameCallbacks {
  onWin: (kind: DungeonMinigameKind, summary: string, rewardChests?: number) => void;
  onLose: (kind: DungeonMinigameKind, reason: string, hpDamage: number) => void;
  onCancel?: () => void;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function createScaledCanvas(
  logicalW: number,
  logicalH: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; dpr: number } {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const canvas = document.createElement("canvas");
  canvas.className = "dm-game-canvas";
  canvas.width = Math.round(logicalW * dpr);
  canvas.height = Math.round(logicalH * dpr);
  canvas.style.aspectRatio = `${logicalW} / ${logicalH}`;
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx, dpr };
}

function traceRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function drawRoastedPeanut(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot: number,
  scale = 1,
  toneIdx = 0,
): void {
  const tone = PEANUT_TONES[toneIdx % PEANUT_TONES.length];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  // Classic two-lobed roasted peanut silhouette
  ctx.beginPath();
  ctx.moveTo(-6.2, -1.8);
  ctx.bezierCurveTo(-5.8, -5.0, -1.5, -4.6, 0, -2.5);
  ctx.bezierCurveTo(1.5, -4.6, 5.8, -5.0, 6.2, -1.8);
  ctx.bezierCurveTo(6.6, 2.0, 2.4, 4.8, 0, 2.7);
  ctx.bezierCurveTo(-2.4, 4.8, -6.6, 2.0, -6.2, -1.8);
  ctx.closePath();

  ctx.fillStyle = tone.main;
  ctx.fill();
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = tone.rim;
  ctx.stroke();

  // Warm sheen & shell ridge crease
  ctx.beginPath();
  ctx.ellipse(-2.6, -1.2, 2.1, 0.9, -0.35, 0, Math.PI * 2);
  ctx.fillStyle = tone.sheen;
  ctx.globalAlpha = 0.65;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.moveTo(-4.0, 0.3);
  ctx.quadraticCurveTo(0, -0.5, 4.0, 0.3);
  ctx.strokeStyle = tone.rim;
  ctx.lineWidth = 0.85;
  ctx.stroke();

  ctx.restore();
}

function drawConveyorItemVector(
  ctx: CanvasRenderingContext2D,
  spec: ConveyorItemSpec,
  x: number,
  y: number,
  rot: number,
  isTarget: boolean,
  elapsedSec = 0,
  isRevealed = true,
  showGuideRing = true,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  if (isTarget && isRevealed && showGuideRing) {
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, Math.PI * 2);
    ctx.fillStyle = spec.isCoin ? "rgba(250, 204, 21, 0.24)" : "rgba(239, 68, 68, 0.3)";
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = spec.isCoin ? "#fde047" : "#f87171";
    ctx.stroke();
  }

  if (spec.isCoin) {
    const outerColor = !isRevealed ? "#64748b" : spec.isGold ? "#facc15" : "#d97706";
    const innerColor = !isRevealed ? "#94a3b8" : spec.isGold ? "#fef08a" : "#fbbf24";
    const rimColor = !isRevealed ? "#334155" : spec.isGold ? "#a16207" : "#78350f";

    if (isRevealed && spec.isGold) {
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(250, 204, 21, 0.2)";
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fillStyle = outerColor;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = rimColor;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fillStyle = innerColor;
    ctx.fill();

    if (isRevealed) {
      // Animated diagonal metallic sheen across revealed coin
      const sheenShift = ((elapsedSec * 40) % 56) - 28;
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, 18.5, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
      ctx.beginPath();
      ctx.moveTo(sheenShift - 8, -22);
      ctx.lineTo(sheenShift, -22);
      ctx.lineTo(sheenShift - 16, 22);
      ctx.lineTo(sheenShift - 24, 22);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Square ancient hole
    ctx.fillStyle = isRevealed ? "#0f172a" : "#1e293b";
    ctx.fillRect(-4.8, -4.8, 9.6, 9.6);
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(-4.8, -4.8, 9.6, 9.6);

    if (isRevealed && spec.isGold) {
      ctx.beginPath();
      ctx.moveTo(-14, -15);
      ctx.lineTo(-10, -19);
      ctx.lineTo(-6, -15);
      ctx.lineTo(-10, -11);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
  } else {
    // Monochrome dark-slate disk before scanner zone; red rim during tutorial 4 items, neutral after
    ctx.beginPath();
    ctx.arc(0, 0, 21, 0, Math.PI * 2);
    ctx.fillStyle = isRevealed ? "#18181b" : "#1e293b";
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = !isRevealed ? "#475569" : showGuideRing ? "#ef4444" : "#64748b";
    ctx.stroke();

    if (spec.id === "junk_fake") {
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fillStyle = isRevealed ? "#64748b" : "#475569";
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = isRevealed ? "#cbd5e1" : "#64748b";
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-8, -8);
      ctx.lineTo(8, 8);
      ctx.moveTo(8, -8);
      ctx.lineTo(-8, 8);
      ctx.strokeStyle = isRevealed ? "#ef4444" : "#94a3b8";
      ctx.lineWidth = 3.2;
      ctx.lineCap = "round";
      ctx.stroke();
    } else if (spec.id === "junk_brick") {
      traceRoundedRect(ctx, -12, -8, 24, 16, 2.5);
      ctx.fillStyle = isRevealed ? "#ea580c" : "#64748b";
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = isRevealed ? "#fed7aa" : "#94a3b8";
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-10, -1);
      ctx.lineTo(0, -1);
      ctx.lineTo(3, 7);
      ctx.moveTo(-4, -7);
      ctx.lineTo(-2, -1);
      ctx.strokeStyle = isRevealed ? "#431407" : "#334155";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (spec.id === "junk_can") {
      // Crushed tin can
      ctx.beginPath();
      ctx.moveTo(-8, -12);
      ctx.lineTo(8, -12);
      ctx.quadraticCurveTo(5, 0, 9, 12);
      ctx.lineTo(-9, 12);
      ctx.quadraticCurveTo(-4, 0, -8, -12);
      ctx.closePath();
      ctx.fillStyle = isRevealed ? "#38bdf8" : "#64748b";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isRevealed ? "#e2e8f0" : "#94a3b8";
      ctx.stroke();
      ctx.fillStyle = isRevealed ? "#ef4444" : "#475569";
      ctx.fillRect(-5.5, -4, 11, 6);
    } else if (spec.id === "junk_sandal") {
      // Criss-cross Vietnamese honeycomb slipper
      ctx.save();
      ctx.rotate(-0.4);
      ctx.beginPath();
      ctx.ellipse(0, 0, 7.5, 13.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = isRevealed ? "#fef3c7" : "#94a3b8";
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = isRevealed ? "#d97706" : "#475569";
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-6, -3);
      ctx.quadraticCurveTo(0, -7, 6, -3);
      ctx.lineWidth = 3;
      ctx.strokeStyle = isRevealed ? "#92400e" : "#334155";
      ctx.stroke();
      ctx.fillStyle = isRevealed ? "#78350f" : "#334155";
      ctx.beginPath();
      ctx.arc(-2, 4, 1.3, 0, Math.PI * 2);
      ctx.arc(2.5, 4, 1.3, 0, Math.PI * 2);
      ctx.arc(0, 8, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (spec.id === "junk_screw") {
      ctx.save();
      ctx.rotate(-0.65);
      traceRoundedRect(ctx, -4, -12, 8, 6, 2);
      ctx.fillStyle = isRevealed ? "#d97706" : "#64748b";
      ctx.fill();
      ctx.fillStyle = isRevealed ? "#9ca3af" : "#94a3b8";
      ctx.fillRect(-2.4, -6, 4.8, 17);
      ctx.strokeStyle = isRevealed ? "#4b5563" : "#475569";
      ctx.lineWidth = 1.4;
      for (let ty = -3; ty <= 9; ty += 3.5) {
        ctx.beginPath();
        ctx.moveTo(-3.2, ty);
        ctx.lineTo(3.2, ty + 1.5);
        ctx.stroke();
      }
      ctx.restore();
    } else if (spec.id === "junk_bone") {
      // Bright fishbone
      ctx.strokeStyle = isRevealed ? "#f8fafc" : "#cbd5e1";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(9, 0);
      ctx.moveTo(-6, -7);
      ctx.lineTo(-4, 7);
      ctx.moveTo(-1, -8);
      ctx.lineTo(1, 8);
      ctx.moveTo(4, -6);
      ctx.lineTo(5, 6);
      ctx.moveTo(-12, 0);
      ctx.lineTo(-15, -5);
      ctx.moveTo(-12, 0);
      ctx.lineTo(-15, 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(10.5, 0, 3.8, 0, Math.PI * 2);
      ctx.fillStyle = isRevealed ? "#f8fafc" : "#cbd5e1";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(11.5, -1, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = isRevealed ? "#0f172a" : "#334155";
      ctx.fill();
    } else {
      // junk_bottle (broken bottle)
      ctx.save();
      ctx.rotate(0.28);
      ctx.beginPath();
      ctx.moveTo(-3.5, -13);
      ctx.lineTo(2, -13);
      ctx.lineTo(3, -5);
      ctx.lineTo(7, -1);
      ctx.lineTo(7, 11);
      ctx.lineTo(-7, 11);
      ctx.lineTo(-7, -1);
      ctx.lineTo(-3, -5);
      ctx.closePath();
      ctx.fillStyle = isRevealed ? "#22c55e" : "#64748b";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isRevealed ? "#bbf7d0" : "#94a3b8";
      ctx.stroke();
      ctx.fillStyle = isRevealed ? "#ffffff" : "#cbd5e1";
      ctx.fillRect(-4, 2, 2.2, 6);
      ctx.restore();
    }
  }

  ctx.restore();

  // Unrotated crisp point tag directly below revealed Coins (+1 / +2) — tutorial items only
  if (spec.isCoin && isRevealed && showGuideRing) {
    ctx.save();
    ctx.translate(x, y + 19);
    traceRoundedRect(ctx, -13, -7, 26, 14, 7);
    ctx.fillStyle = spec.isGold ? "#facc15" : "#10b981";
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "#020617";
    ctx.stroke();
    ctx.font = "900 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#020617";
    ctx.fillText(`+${spec.points}`, 0, 0.5);
    ctx.restore();
  }
}

function createTimerBar(initialSec: number): {
  wrap: HTMLDivElement;
  fill: HTMLDivElement;
  label: HTMLSpanElement;
} {
  const wrap = document.createElement("div");
  wrap.className = "dm-timer-bar-wrap";
  const fill = document.createElement("div");
  fill.className = "dm-timer-bar-fill";
  const label = document.createElement("span");
  label.className = "dm-timer-bar-text";
  label.textContent = `⏱️ ${initialSec.toFixed(1)}s`;
  wrap.append(fill, label);
  return { wrap, fill, label };
}

function bindFastTap(btn: HTMLButtonElement, fn: () => void): void {
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!btn.disabled) {
      fn();
    }
  });
}

export class DungeonMinigameModal {
  private readonly modalEl: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly guideEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly boardEl: HTMLElement;
  private readonly closeBtn: HTMLButtonElement;
  private readonly sfx: DungeonSfx;

  private activeKind: DungeonMinigameKind | null = null;
  private callbacks: DungeonMinigameCallbacks | null = null;
  private cleanupFn: (() => void) | null = null;
  private keyHandlerFn: ((e: KeyboardEvent) => void) | null = null;
  private pendingForcedLose: { kind: DungeonMinigameKind; msg: string; hpDamage: number } | null = null;
  private lockedIn = false;

  constructor(isSoundEnabled: () => boolean = () => true) {
    this.sfx = new DungeonSfx(isSoundEnabled);
    this.modalEl = document.getElementById("dungeon-minigame-modal")!;
    this.titleEl = document.getElementById("dung-mini-title")!;
    this.guideEl = document.getElementById("dung-mini-guide")!;
    this.statusEl = document.getElementById("dung-mini-status")!;
    this.boardEl = document.getElementById("dung-mini-board")!;
    this.closeBtn = document.getElementById("btn-dung-mini-close") as HTMLButtonElement;

    this.closeBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeAndDispatchCancelOrPendingLose();
    });

    this.modalEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.target === this.modalEl) {
        this.closeAndDispatchCancelOrPendingLose();
      }
    });

    window.addEventListener("keydown", (e) => {
      if (!this.isOpen()) return;
      if (e.key === "Escape") {
        e.preventDefault();
        this.closeAndDispatchCancelOrPendingLose();
        return;
      }
      this.keyHandlerFn?.(e);
    });
  }

  private setLockedIn(locked: boolean): void {
    this.lockedIn = locked;
    this.closeBtn.style.display = locked ? "none" : "";
    this.modalEl.classList.toggle("is-locked", locked);
  }

  public isLockedIn(): boolean {
    return this.lockedIn;
  }

  private closeAndDispatchCancelOrPendingLose(): void {
    if (this.lockedIn) return;
    const cb = this.callbacks;
    const forced = this.pendingForcedLose;
    this.pendingForcedLose = null;
    this.close();
    if (forced) {
      cb?.onLose(forced.kind, forced.msg, forced.hpDamage);
    } else {
      cb?.onCancel?.();
    }
  }

  public isOpen(): boolean {
    return this.activeKind !== null;
  }

  public playTicketPurchaseSfx(): void {
    this.sfx.playTicketPurchase();
  }

  public playMazeJumpscareSfx(): void {
    this.sfx.playMazeJumpscare();
  }

  public open(kind: DungeonMinigameKind, callbacks: DungeonMinigameCallbacks): void {
    this.destroySession();
    this.pendingForcedLose = null;
    this.activeKind = kind;
    this.callbacks = callbacks;
    this.boardEl.replaceChildren();
    this.guideEl.textContent = "";
    this.guideEl.style.display = "none";
    this.statusEl.textContent = "";
    this.statusEl.style.display = "none";

    if (kind === "coin_sort") {
      this.titleEl.textContent = "🪙 Sàng Lọc Xu Cổ Thăng Long";
      this.mountCoinSort();
    } else {
      this.titleEl.textContent = "🥜";
      this.mountPeanutSteal();
    }

    this.modalEl.classList.add("is-open");
  }

  public close(): void {
    this.destroySession();
    this.pendingForcedLose = null;
    this.activeKind = null;
    this.callbacks = null;
    this.guideEl.textContent = "";
    this.guideEl.style.display = "none";
    this.statusEl.textContent = "";
    this.statusEl.style.display = "none";
    this.setLockedIn(false);
    this.modalEl.classList.remove("is-open", "is-low-time", "is-critical-time", "is-locked");
  }

  private destroySession(): void {
    if (this.cleanupFn) {
      this.cleanupFn();
      this.cleanupFn = null;
    }
    this.keyHandlerFn = null;
    this.setLockedIn(false);
    this.modalEl.classList.remove("is-low-time", "is-critical-time", "is-locked");
    this.boardEl.replaceChildren();
  }

  // ===================== GAME 1: BĂNG CHUYỀN ĐẨY RÁC HỨNG XU (60s, 60fps) =====================

  private mountCoinSort(): void {
    const DURATION_SEC = 60.0;
    const POINTS_PER_CHEST = 19;
    const MAX_CHESTS = 6;
    const MAX_SCORE = POINTS_PER_CHEST * MAX_CHESTS;
    const LOGICAL_W = 520;
    const LOGICAL_H = 235;
    const BELT_LEFT_X = 22;
    const BELT_END_X = 394;
    const BELT_SURFACE_Y = 148;
    const BELT_ITEM_Y = 122;
    const PUSH_ZONE_MIN_X = 246;
    const PUSH_ZONE_MAX_X = 358;
    const INSPECT_X = 302;
    const SLOT_STEP = 86;
    const SLIDE_SPEED = 640;
    const CHEST_MOUTH_X = 460;
    const CHEST_MOUTH_Y = 152;

    let started = false;
    let timeLeft = DURATION_SEC;
    let lastTickSec = Math.ceil(DURATION_SEC);
    let score = 0;
    let wrongStreak = 0;
    let decisionsCount = 0;
    let finished = false;
    let elapsed = 0;
    let beltOffset = 0;
    let lastSpawnKind: "coin" | "junk" | null = null;
    let sameKindStreak = 0;
    let pistonOutAnim = 0;
    let pistonHitX = INSPECT_X;
    let boostPistonAnim = 0;
    let boostOriginX = PUSH_ZONE_MIN_X;
    let chestBounce = 0;
    let chestGlow = 0;
    let lastTs = performance.now();
    let rafId: number | null = null;

    this.setLockedIn(false);

    const shuffleSpecs = <T>(items: readonly T[]): T[] => {
      const arr = [...items];
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    };

    // First 10 items are guaranteed to cover all 10 unique specs once; first 4 include +1, +2, and 2 distinct junk types.
    const shuffledJunk = shuffleSpecs(CONVEYOR_JUNK_POOL);
    const firstFour = shuffleSpecs([
      CONVEYOR_COIN_POOL[0],
      CONVEYOR_COIN_POOL[2],
      shuffledJunk[0],
      shuffledJunk[1],
    ]);
    const nextSix = shuffleSpecs([CONVEYOR_COIN_POOL[1], ...shuffledJunk.slice(2)]);
    const introDeck: ConveyorItemSpec[] = [...firstFour, ...nextSix];

    const rollItemSpec = (): ConveyorItemSpec => {
      if (introDeck.length > 0) {
        const nextSpec = introDeck.shift()!;
        const nextKind: "coin" | "junk" = nextSpec.isCoin ? "coin" : "junk";
        if (nextKind === lastSpawnKind) {
          sameKindStreak += 1;
        } else {
          lastSpawnKind = nextKind;
          sameKindStreak = 1;
        }
        return nextSpec;
      }
      let pickJunk = Math.random() < 0.62;
      if (lastSpawnKind === "junk" && sameKindStreak >= 3) {
        pickJunk = false;
      } else if (lastSpawnKind === "coin" && sameKindStreak >= 2) {
        pickJunk = true;
      }
      const nextKind = pickJunk ? "junk" : "coin";
      if (nextKind === lastSpawnKind) {
        sameKindStreak += 1;
      } else {
        lastSpawnKind = nextKind;
        sameKindStreak = 1;
      }
      if (!pickJunk) {
        return Math.random() < 0.35 ? CONVEYOR_COIN_POOL[2] : CONVEYOR_COIN_POOL[Math.floor(Math.random() * 2)];
      }
      return CONVEYOR_JUNK_POOL[Math.floor(Math.random() * CONVEYOR_JUNK_POOL.length)];
    };

    const createRidingItem = (x: number): ConveyorBeltItem => ({
      spec: rollItemSpec(),
      x,
      y: BELT_ITEM_Y,
      vx: 0,
      vy: 0,
      rot: 0,
      rotSpeed: 0,
      phase: Math.random() * Math.PI * 2,
      state: "riding",
    });

    const queue: ConveyorBeltItem[] = Array.from({ length: 5 }, (_, idx) =>
      createRidingItem(INSPECT_X - (idx + 1) * SLOT_STEP),
    );
    const flyingItems: ConveyorBeltItem[] = [];
    const particles: CanvasParticle[] = [];
    const floatPops: CanvasFloatPop[] = [];

    const wrap = document.createElement("div");
    wrap.className = "dm-sort-wrap";

    const timerBar = createTimerBar(DURATION_SEC);

    const topStats = document.createElement("div");
    topStats.className = "dm-top-metrics";
    const scorePill = document.createElement("span");
    scorePill.className = "dm-metric-pill is-score";
    const streakPill = document.createElement("span");
    streakPill.className = "dm-metric-pill is-streak";
    topStats.append(scorePill, streakPill);

    const stage = document.createElement("div");
    stage.className = "dm-canvas-stage";
    const { canvas, ctx, dpr } = createScaledCanvas(LOGICAL_W, LOGICAL_H);

    const startOverlay = document.createElement("div");
    startOverlay.className = "dm-start-overlay";
    const startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.className = "dm-start-btn";
    startBtn.textContent = "▶️ CHO BĂNG CHUYỀN CHẠY";
    startOverlay.appendChild(startBtn);

    stage.append(canvas, startOverlay);

    const btnRow = document.createElement("div");
    btnRow.className = "dm-btn-row";

    const pushOutBtn = document.createElement("button");
    pushOutBtn.type = "button";
    pushOutBtn.className = "dm-big-btn is-discard";
    pushOutBtn.innerHTML = `<span class="dm-btn-ico">💨</span><span>ĐẨY RÁC RA</span><small>[A / ← / Space]</small>`;
    pushOutBtn.disabled = true;

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "dm-big-btn is-accept";
    nextBtn.innerHTML = `<span class="dm-btn-ico">➡️</span><span>TIẾP THEO</span><small>[D / →]</small>`;
    nextBtn.disabled = true;

    btnRow.append(pushOutBtn, nextBtn);
    wrap.append(timerBar.wrap, topStats, stage, btnRow);
    this.boardEl.appendChild(wrap);

    const spawnParticles = (x: number, y: number, color: string, count: number, speedScale = 1): void => {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = (45 + Math.random() * 135) * speedScale;
        particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 45,
          radius: 2 + Math.random() * 3,
          color,
          life: 0.48 + Math.random() * 0.25,
          maxLife: 0.72,
          gravity: 340,
        });
      }
    };

    const spawnPop = (x: number, y: number, text: string, color: string): void => {
      floatPops.push({ x, y, vy: -48, text, color, life: 0.85, maxLife: 0.85 });
    };

    const getInspectTarget = (): ConveyorBeltItem | null => {
      if (!started || queue.length === 0) return null;
      const head = queue[0];
      return head.x >= PUSH_ZONE_MIN_X && head.x <= PUSH_ZONE_MAX_X ? head : null;
    };

    const enqueueTail = (): void => {
      const last = queue[queue.length - 1];
      const spawnX = Math.min(
        INSPECT_X - queue.length * SLOT_STEP - SLOT_STEP,
        (last ? last.x : INSPECT_X - SLOT_STEP * 3) - SLOT_STEP,
      );
      queue.push(createRidingItem(spawnX));
    };

    const syncHud = (): void => {
      const pct = clamp((timeLeft / DURATION_SEC) * 100, 0, 100);
      const isLowTime = started && !finished && timeLeft <= 10;
      const isCriticalTime = started && !finished && timeLeft <= 4;
      timerBar.fill.style.width = `${pct.toFixed(2)}%`;
      timerBar.label.textContent = `⏱️ ${Math.max(0, timeLeft).toFixed(1)}s`;
      timerBar.wrap.classList.toggle("is-low-time", isLowTime);
      timerBar.wrap.classList.toggle("is-critical-time", isCriticalTime);
      this.modalEl.classList.toggle("is-low-time", isLowTime);
      this.modalEl.classList.toggle("is-critical-time", isCriticalTime);

      const chestEarned = Math.min(MAX_CHESTS, Math.max(0, Math.floor(score / POINTS_PER_CHEST)));
      scorePill.textContent = `🎯 ${score}đ • 🧰 ${chestEarned}/${MAX_CHESTS} rương`;
      scorePill.classList.toggle("is-danger", score < 0);
      const nextPenalty = wrongStreak === 0 ? 1 : wrongStreak === 1 ? 3 : 5;
      streakPill.textContent =
        wrongStreak > 0 ? `🔥 Chuỗi sai ×${wrongStreak} (-${nextPenalty}đ)` : "🛡️ Chuỗi sai: 0";
      streakPill.classList.toggle("is-danger", wrongStreak > 0);
    };

    const finish = (won: boolean, msg: string, hpDamage = 0, rewardChests = 0): void => {
      if (finished) return;
      finished = true;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      pushOutBtn.disabled = true;
      nextBtn.disabled = true;
      this.setLockedIn(false);
      if (won) this.sfx.playMinigameWin();
      else this.sfx.playMinigameLose();
      const cb = this.callbacks;
      this.close();
      if (won) cb?.onWin("coin_sort", msg, rewardChests);
      else cb?.onLose("coin_sort", msg, hpDamage);
    };

    const handleChestDrop = (it: ConveyorBeltItem): void => {
      if (it.spec.isCoin) {
        wrongStreak = 0;
        score += it.spec.points;
        chestBounce = 1;
        chestGlow = 1;
        this.sfx.playCoinAccept(it.spec.isGold);
        spawnParticles(CHEST_MOUTH_X, CHEST_MOUTH_Y, it.spec.isGold ? "#fde047" : "#34d399", 14, 1.1);
        spawnPop(CHEST_MOUTH_X, CHEST_MOUTH_Y - 22, `+${it.spec.points}đ`, "#6ee7b7");
      } else {
        wrongStreak += 1;
        const penalty = wrongStreak === 1 ? 1 : wrongStreak === 2 ? 3 : 5;
        score -= penalty;
        chestBounce = 0.85;
        this.sfx.playJunkWrongStreak(wrongStreak);
        stage.classList.remove("is-shake");
        void stage.offsetWidth;
        stage.classList.add("is-shake");
        spawnParticles(CHEST_MOUTH_X, CHEST_MOUTH_Y, "#94a3b8", 12, 0.8);
        spawnPop(CHEST_MOUTH_X - 18, CHEST_MOUTH_Y - 26, `-${penalty}đ ${it.spec.label}`, "#fca5a5");
      }
      syncHud();
      if (score >= MAX_SCORE) {
        finish(
          true,
          `Xuất sắc! Đạt ${score}đ → mở tối đa ${MAX_CHESTS} rương trong ${(DURATION_SEC - timeLeft).toFixed(1)}s!`,
          0,
          MAX_CHESTS,
        );
      }
    };

    const triggerPushOut = (): void => {
      if (!started || finished) return;
      const target = getInspectTarget();
      if (!target) return;

      queue.shift();
      enqueueTail();
      decisionsCount += 1;
      pistonHitX = clamp(target.x, PUSH_ZONE_MIN_X + 12, PUSH_ZONE_MAX_X - 12);
      pistonOutAnim = 1;

      target.state = "pushed_out";
      target.vx = -65 + (Math.random() - 0.5) * 30;
      target.vy = -335;
      target.rotSpeed = -10.5;
      flyingItems.push(target);

      if (!target.spec.isCoin) {
        wrongStreak = 0;
        this.sfx.playJunkDiscard();
        spawnParticles(target.x, target.y, "#cbd5e1", 10, 0.9);
        spawnPop(target.x, target.y - 28, `Gạt ${target.spec.label}!`, "#a7f3d0");
      } else {
        score -= 1;
        this.sfx.playCoinDiscardWrong();
        spawnParticles(target.x, target.y, "#fbbf24", 8, 0.8);
        spawnPop(target.x, target.y - 28, "-1đ (Gạt nhầm Xu)", "#fde047");
      }
      syncHud();
    };

    const triggerNext = (): void => {
      if (!started || finished) return;
      const target = getInspectTarget();
      if (!target) return;

      queue.shift();
      enqueueTail();
      decisionsCount += 1;
      boostOriginX = target.x;
      boostPistonAnim = 1;

      target.state = "to_chest";
      target.vx = 520;
      flyingItems.push(target);
      spawnParticles(target.x, target.y, "#38bdf8", 8, 0.9);
    };

    const startBelt = (): void => {
      if (started || finished) return;
      started = true;
      lastTs = performance.now();
      this.setLockedIn(true);
      startOverlay.style.display = "none";
      pushOutBtn.disabled = false;
      nextBtn.disabled = false;
      this.sfx.playBeltStart();
      syncHud();
    };

    startBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      startBelt();
    });
    startBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      startBelt();
    });

    bindFastTap(pushOutBtn, triggerPushOut);
    bindFastTap(nextBtn, triggerNext);

    this.keyHandlerFn = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (!started) {
        if (e.code === "Enter") {
          e.preventDefault();
          startBelt();
        }
        return;
      }
      if (e.code === "KeyA" || e.code === "ArrowLeft" || e.code === "Space") {
        e.preventDefault();
        triggerPushOut();
      } else if (e.code === "KeyD" || e.code === "ArrowRight") {
        e.preventDefault();
        triggerNext();
      }
    };

    const render = (): void => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);

      // Background workshop wall
      const bgGrad = ctx.createLinearGradient(0, 0, 0, LOGICAL_H);
      bgGrad.addColorStop(0, "#0b1220");
      bgGrad.addColorStop(1, "#1e293b");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

      // Subtle brickwork lines
      ctx.strokeStyle = "rgba(148, 163, 184, 0.1)";
      ctx.lineWidth = 1;
      for (let gy = 28; gy < LOGICAL_H; gy += 36) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(LOGICAL_W, gy);
        ctx.stroke();
      }

      const targetItem = getInspectTarget();
      const showGuideRing = decisionsCount < 4;

      // Overhead Scanner Light Beam above inspection zone (guide colors shown for first 4 items only)
      ctx.fillStyle = "#334155";
      traceRoundedRect(ctx, INSPECT_X - 38, 6, 76, 15, 5);
      ctx.fill();
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      const lensColor = !started
        ? "#475569"
        : !targetItem || !showGuideRing
          ? "#38bdf8"
          : targetItem.spec.isCoin
            ? "#facc15"
            : "#f87171";
      ctx.fillStyle = lensColor;
      traceRoundedRect(ctx, INSPECT_X - 24, 17, 48, 5, 2.5);
      ctx.fill();

      if (started) {
        const beamGrad = ctx.createLinearGradient(INSPECT_X, 22, INSPECT_X, BELT_SURFACE_Y);
        const beamRgb = !targetItem || !showGuideRing
          ? "56, 189, 248"
          : targetItem.spec.isCoin
            ? "250, 204, 21"
            : "248, 113, 113";
        beamGrad.addColorStop(0, `rgba(${beamRgb}, 0.28)`);
        beamGrad.addColorStop(1, `rgba(${beamRgb}, 0.04)`);
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(INSPECT_X - 26, 22);
        ctx.lineTo(INSPECT_X + 26, 22);
        ctx.lineTo(PUSH_ZONE_MAX_X, BELT_SURFACE_Y);
        ctx.lineTo(PUSH_ZONE_MIN_X, BELT_SURFACE_Y);
        ctx.closePath();
        ctx.fill();
      }

      // Exact Hitbox Sensor Bracket matching getInspectTarget() [PUSH_ZONE_MIN_X..PUSH_ZONE_MAX_X]
      const zoneBorderColor = !targetItem
        ? "rgba(148, 163, 184, 0.4)"
        : !showGuideRing
          ? "rgba(56, 189, 248, 0.72)"
          : targetItem.spec.isCoin
            ? "rgba(250, 204, 21, 0.88)"
            : "rgba(248, 113, 113, 0.92)";
      const zoneFillColor = !targetItem
        ? "rgba(30, 41, 59, 0.24)"
        : !showGuideRing
          ? "rgba(56, 189, 248, 0.08)"
          : targetItem.spec.isCoin
            ? "rgba(250, 204, 21, 0.1)"
            : "rgba(239, 68, 68, 0.14)";
      traceRoundedRect(
        ctx,
        PUSH_ZONE_MIN_X,
        74,
        PUSH_ZONE_MAX_X - PUSH_ZONE_MIN_X,
        BELT_SURFACE_Y - 74,
        10,
      );
      ctx.fillStyle = zoneFillColor;
      ctx.fill();
      ctx.strokeStyle = zoneBorderColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Upward eject arrow hint shown only during first 4 tutorial items
      if (targetItem && !targetItem.spec.isCoin && showGuideRing) {
        const pulseY = Math.sin(elapsed * 12) * 3;
        ctx.strokeStyle = "rgba(248, 113, 113, 0.82)";
        ctx.lineWidth = 2.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(targetItem.x, 70 + pulseY);
        ctx.lineTo(targetItem.x, 52 + pulseY);
        ctx.moveTo(targetItem.x - 7, 59 + pulseY);
        ctx.lineTo(targetItem.x, 52 + pulseY);
        ctx.lineTo(targetItem.x + 7, 59 + pulseY);
        ctx.stroke();
      }

      // Horizontal next/to-chest plunger trail aligned with boostOriginX
      if (boostPistonAnim > 0.04) {
        const bx = boostOriginX + (1 - boostPistonAnim) * 95;
        ctx.strokeStyle = `rgba(56, 189, 248, ${boostPistonAnim.toFixed(2)})`;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(bx - 38, BELT_ITEM_Y);
        ctx.lineTo(bx + 18, BELT_ITEM_Y);
        ctx.lineTo(bx + 8, BELT_ITEM_Y - 8);
        ctx.moveTo(bx + 18, BELT_ITEM_Y);
        ctx.lineTo(bx + 8, BELT_ITEM_Y + 8);
        ctx.stroke();
      }

      // Supporting steel legs under conveyor (extending down to bottom of 235px canvas)
      ctx.fillStyle = "#334155";
      ctx.fillRect(58, BELT_SURFACE_Y + 34, 14, LOGICAL_H - (BELT_SURFACE_Y + 34));
      ctx.fillRect(352, BELT_SURFACE_Y + 34, 14, LOGICAL_H - (BELT_SURFACE_Y + 34));

      // Conveyor frame
      traceRoundedRect(ctx, BELT_LEFT_X - 10, BELT_SURFACE_Y, BELT_END_X - BELT_LEFT_X + 20, 38, 19);
      ctx.fillStyle = "#1e293b";
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#f59e0b";
      ctx.stroke();

      // Top rubber track & step-synchronized chevron ribs (moves only when stepping!)
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(BELT_LEFT_X, BELT_SURFACE_Y + 3, BELT_END_X - BELT_LEFT_X, 9);
      ctx.save();
      ctx.beginPath();
      ctx.rect(BELT_LEFT_X, BELT_SURFACE_Y + 3, BELT_END_X - BELT_LEFT_X, 9);
      ctx.clip();
      const step = 28;
      const shift = beltOffset % step;
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.2;
      for (let rx = BELT_LEFT_X - step + shift; rx < BELT_END_X + step; rx += step) {
        ctx.beginPath();
        ctx.moveTo(rx, BELT_SURFACE_Y + 4);
        ctx.lineTo(rx + 6, BELT_SURFACE_Y + 7.5);
        ctx.lineTo(rx, BELT_SURFACE_Y + 11);
        ctx.stroke();
      }
      ctx.restore();

      // Rotating steel rollers
      const rollerXs = [26, 96, 170, 244, 318, BELT_END_X - 4];
      for (let i = 0; i < rollerXs.length; i++) {
        const cx = rollerXs[i];
        const cy = BELT_SURFACE_Y + 22;
        const r = i === 0 || i === rollerXs.length - 1 ? 12 : 9;
        const angle = beltOffset / r;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = "#475569";
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = "#cbd5e1";
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-r + 2, 0);
        ctx.lineTo(r - 2, 0);
        ctx.moveTo(0, -r + 2);
        ctx.lineTo(0, r - 2);
        ctx.stroke();
        ctx.restore();
      }

      // Bottom-Up Hydraulic Ejector Piston beneath Hitbox (tracks pistonHitX & launches upward!)
      const pistonThrust = Math.sin(pistonOutAnim * Math.PI) * 58;
      const bumperY = BELT_SURFACE_Y + 42 - pistonThrust;
      ctx.fillStyle = "#334155";
      traceRoundedRect(ctx, pistonHitX - 24, BELT_SURFACE_Y + 48, 48, 28, 5);
      ctx.fill();
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(pistonHitX - 5, bumperY + 8, 10, BELT_SURFACE_Y + 48 - bumperY);
      ctx.fillStyle = pistonOutAnim > 0.05 ? "#ef4444" : "#f59e0b";
      traceRoundedRect(ctx, pistonHitX - 24, bumperY, 48, 10, 4);
      ctx.fill();
      if (pistonOutAnim > 0.15) {
        ctx.strokeStyle = `rgba(248, 113, 113, ${pistonOutAnim.toFixed(2)})`;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(pistonHitX - 18, bumperY - 4);
        ctx.lineTo(pistonHitX - 18, bumperY - 28);
        ctx.moveTo(pistonHitX + 18, bumperY - 4);
        ctx.lineTo(pistonHitX + 18, bumperY - 28);
        ctx.stroke();
      }

      // Treasure chest / bin at end of belt (Right side)
      const bounceY = Math.sin(chestBounce * Math.PI) * 7;
      const scaleX = 1 + Math.sin(chestBounce * Math.PI) * 0.08;
      const scaleY = 1 - Math.sin(chestBounce * Math.PI) * 0.08;
      ctx.save();
      ctx.translate(CHEST_MOUTH_X + 4, 178 + bounceY * 0.35);
      ctx.scale(scaleX, scaleY);

      if (chestGlow > 0.02) {
        ctx.beginPath();
        ctx.arc(0, -20, 48, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(250, 204, 21, ${(chestGlow * 0.38).toFixed(2)})`;
        ctx.fill();
      }

      // Chest interior shadow (mouth)
      traceRoundedRect(ctx, -40, -34, 80, 18, 6);
      ctx.fillStyle = "#090d16";
      ctx.fill();

      // Open hinged chest lid tilted left/back toward belt
      ctx.save();
      ctx.translate(32, -32);
      ctx.rotate(0.46 - chestBounce * 0.14);
      traceRoundedRect(ctx, -74, -14, 74, 14, 5);
      ctx.fillStyle = "#92400e";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#fbbf24";
      ctx.stroke();
      ctx.restore();

      // Chest wooden front box
      traceRoundedRect(ctx, -42, -26, 84, 56, 7);
      ctx.fillStyle = "#78350f";
      ctx.fill();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = "#f59e0b";
      ctx.stroke();
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(-30, -24, 7, 52);
      ctx.fillRect(23, -24, 7, 52);
      traceRoundedRect(ctx, -8, -14, 16, 14, 3);
      ctx.fill();
      ctx.restore();

      // Queued items on the belt (monochrome until crossing PUSH_ZONE_MIN_X!)
      for (const it of queue) {
        if (it.x < -30) continue;
        ctx.beginPath();
        ctx.ellipse(it.x, BELT_SURFACE_Y + 3, 15, 3.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(2, 6, 23, 0.55)";
        ctx.fill();
        const isRevealed = started && it.x >= PUSH_ZONE_MIN_X;
        drawConveyorItemVector(
          ctx,
          it.spec,
          it.x,
          it.y,
          it.rot,
          it === targetItem,
          elapsed,
          isRevealed,
          showGuideRing,
        );
      }

      // Items currently gliding to chest or ejected upward
      for (const it of flyingItems) {
        if (it.state === "to_chest") {
          ctx.beginPath();
          ctx.ellipse(it.x, BELT_SURFACE_Y + 3, 15, 3.8, 0, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(2, 6, 23, 0.55)";
          ctx.fill();
          ctx.strokeStyle = "rgba(56, 189, 248, 0.72)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(it.x - 24, it.y - 6);
          ctx.lineTo(it.x - 48, it.y - 6);
          ctx.moveTo(it.x - 26, it.y + 4);
          ctx.lineTo(it.x - 56, it.y + 4);
          ctx.stroke();
        }
        drawConveyorItemVector(ctx, it.spec, it.x, it.y, it.rot, false, elapsed, true, showGuideRing);
      }

      // Particles
      for (const p of particles) {
        const a = clamp(p.life / p.maxLife, 0, 1);
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Floating pops
      ctx.font = "900 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const pop of floatPops) {
        const a = clamp(pop.life / pop.maxLife, 0, 1);
        ctx.globalAlpha = a;
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = "rgba(2, 6, 23, 0.9)";
        ctx.strokeText(pop.text, pop.x, pop.y);
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, pop.x, pop.y);
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number): void => {
      if (finished) return;
      const dt = clamp((now - lastTs) / 1000, 0.001, 0.06);
      lastTs = now;
      elapsed += dt;

      if (started) {
        timeLeft -= dt;
        if (timeLeft <= 10 && timeLeft > 0) {
          const curSec = Math.ceil(timeLeft);
          if (curSec < lastTickSec) {
            lastTickSec = curSec;
            this.sfx.playTimerTick(timeLeft <= 4);
          }
        }
        if (timeLeft <= 0) {
          timeLeft = 0;
          syncHud();
          render();
          const rewardChests = Math.min(MAX_CHESTS, Math.max(0, Math.floor(score / POINTS_PER_CHEST)));
          if (rewardChests >= 1) {
            finish(
              true,
              `Hết 60s — Đạt ${score}đ, nhận ${rewardChests}/${MAX_CHESTS} rương báu!`,
              0,
              rewardChests,
            );
          } else {
            const hpDamage = score < 0 ? Math.abs(score) * 3 : 0;
            const loseMsg =
              hpDamage > 0
                ? `Hết 60s — Âm ${Math.abs(score)}đ! Bị trừ ${hpDamage} HP (${Math.abs(score)}×3).`
                : `Hết 60s — Chỉ đạt ${score}đ (Chưa đủ ${POINTS_PER_CHEST}đ/rương, không mất máu).`;
            finish(false, loseMsg, hpDamage, 0);
          }
          return;
        }

        // Step-based sliding: items & belt rotate ONLY while shifting to slot targets
        let maxDelta = 0;
        for (let idx = 0; idx < queue.length; idx++) {
          const it = queue[idx];
          const targetX = INSPECT_X - idx * SLOT_STEP;
          const diff = targetX - it.x;
          if (Math.abs(diff) > 0.25) {
            const stepPx = Math.min(Math.abs(diff), SLIDE_SPEED * dt);
            it.x += Math.sign(diff) * stepPx;
            maxDelta = Math.max(maxDelta, stepPx);
          } else {
            it.x = targetX;
          }
        }
        if (maxDelta > 0) {
          beltOffset += maxDelta;
        }

        for (let i = flyingItems.length - 1; i >= 0; i--) {
          const it = flyingItems[i];
          if (it.state === "to_chest") {
            it.x += it.vx * dt;
            if (it.x >= BELT_END_X) {
              it.state = "falling_chest";
              it.vx = 215;
              it.vy = -45;
              it.rotSpeed = 6.5;
            }
          } else if (it.state === "falling_chest") {
            it.x += it.vx * dt;
            it.vy += 760 * dt;
            it.y += it.vy * dt;
            it.rot += it.rotSpeed * dt;
            if (it.y >= CHEST_MOUTH_Y) {
              flyingItems.splice(i, 1);
              handleChestDrop(it);
              if (finished) return;
            }
          } else {
            it.x += it.vx * dt;
            it.vy += 680 * dt;
            it.y += it.vy * dt;
            it.rot += it.rotSpeed * dt;
            if (it.y > LOGICAL_H + 30 || it.y < -60) {
              flyingItems.splice(i, 1);
            }
          }
        }
      }

      if (pistonOutAnim > 0) pistonOutAnim = Math.max(0, pistonOutAnim - dt * 4.4);
      if (boostPistonAnim > 0) boostPistonAnim = Math.max(0, boostPistonAnim - dt * 5.2);
      if (chestBounce > 0) chestBounce = Math.max(0, chestBounce - dt * 3.8);
      if (chestGlow > 0) chestGlow = Math.max(0, chestGlow - dt * 2.2);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.vy += p.gravity * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }

      for (let i = floatPops.length - 1; i >= 0; i--) {
        const pop = floatPops[i];
        pop.y += pop.vy * dt;
        pop.life -= dt;
        if (pop.life <= 0) floatPops.splice(i, 1);
      }

      syncHud();
      render();
      rafId = window.requestAnimationFrame(tick);
    };

    syncHud();
    render();
    rafId = window.requestAnimationFrame(tick);

    this.cleanupFn = () => {
      finished = true;
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }

  // ===================== GAME 2: ĂN VỤNG LẠC RANG (45s, CANVAS 60FPS THUẦN HÌNH ẢNH) =====================

  private mountPeanutSteal(): void {
    const DURATION_SEC = 45.0;
    const MAX_HAND = 10;
    const LOGICAL_W = 520;
    const LOGICAL_H = 340;
    const PLATE_CX = 128;
    const PLATE_CY = 286;
    const RACK_X = 256;
    const RACK_Y = 266;
    const THIEF_X = 434;
    const THIEF_Y = 278;

    const totalPeanuts = 80 + Math.floor(Math.random() * 21); // 80..100
    let timeLeft = DURATION_SEC;
    let lastTickSec = Math.ceil(DURATION_SEC);
    let plateRemaining = totalPeanuts;
    let handCount = 0;
    let eaten = 0;

    type BossState = "reading" | "warning" | "peeking" | "caught";
    let bossState: BossState = "reading";
    let bossTimer = 2.8 + Math.random() * 1.2;
    let peekingGrace = 0;
    let isFakeoutWarning = false;

    // Continuous 60fps boss & thief animation scalars
    let paperDrop = 0;
    let paperFling = 0;
    let headZoom = 0;
    let beamAlpha = 0;
    let eyeSquint = 0;
    let caneAnim = 0;
    let gulpAnim = 0;
    let elapsed = 0;

    let pickAnimRemaining = 0;
    let chewRemaining = 0;
    let chewTotal = 0;
    let chewingBatch = 0;
    let crunchCooldown = 0;
    let finished = false;
    let lastTs = performance.now();
    let rafId: number | null = null;
    let caughtTimer: number | null = null;

    this.setLockedIn(true);

    // Pre-generate visual mound for all 80..100 peanuts on the plate
    const platePeanuts: PlatePeanut[] = [];
    for (let i = 0; i < totalPeanuts; i++) {
      const layerRatio = i / Math.max(1, totalPeanuts - 1); // 0 bottom -> 1 peak
      const maxRx = lerp(52, 16, layerRatio);
      const maxRy = lerp(17, 6, layerRatio);
      const goldenAngle = i * 2.3999632;
      const radial = Math.sqrt(((i % 13) + 0.5) / 13.5);
      const ox = Math.cos(goldenAngle) * maxRx * radial;
      const oy = Math.sin(goldenAngle) * maxRy * radial - layerRatio * 18;
      platePeanuts.push({
        ox,
        oy,
        rot: ((i * 73) % 100) * 0.0628 - 3.14,
        toneIdx: i % PEANUT_TONES.length,
      });
    }

    const flyingPeanuts: FlyingPeanut[] = [];
    const particles: CanvasParticle[] = [];

    const wrap = document.createElement("div");
    wrap.className = "dm-peanut-wrap";

    const timerBar = createTimerBar(DURATION_SEC);

    const stage = document.createElement("div");
    stage.className = "dm-canvas-stage";
    const { canvas, ctx, dpr } = createScaledCanvas(LOGICAL_W, LOGICAL_H);
    stage.appendChild(canvas);

    const btnRow = document.createElement("div");
    btnRow.className = "dm-btn-row";

    const pickBtn = document.createElement("button");
    pickBtn.type = "button";
    pickBtn.className = "dm-big-btn is-pick";
    pickBtn.innerHTML = `<span class="dm-btn-ico">🥢</span><small>[A / ←]</small>`;

    const eatBtn = document.createElement("button");
    eatBtn.type = "button";
    eatBtn.className = "dm-big-btn is-eat";
    eatBtn.innerHTML = `<span class="dm-btn-ico">😋</span><small>[D / → / Space]</small>`;

    btnRow.append(pickBtn, eatBtn);
    wrap.append(timerBar.wrap, stage, btnRow);
    this.boardEl.appendChild(wrap);

    const syncButtonsAndTimer = (): void => {
      const pct = clamp((timeLeft / DURATION_SEC) * 100, 0, 100);
      const isLowTime = !finished && bossState !== "caught" && timeLeft <= 10;
      const isCriticalTime = !finished && bossState !== "caught" && timeLeft <= 4;
      timerBar.fill.style.width = `${pct.toFixed(2)}%`;
      timerBar.label.textContent = `⏱️ ${Math.max(0, timeLeft).toFixed(1)}s`;
      timerBar.wrap.classList.toggle("is-low-time", isLowTime);
      timerBar.wrap.classList.toggle("is-critical-time", isCriticalTime);
      this.modalEl.classList.toggle("is-low-time", isLowTime);
      this.modalEl.classList.toggle("is-critical-time", isCriticalTime);

      const lockActions = finished || bossState === "caught";
      eatBtn.disabled = lockActions || handCount <= 0 || chewRemaining > 0;
      pickBtn.disabled = lockActions || handCount >= MAX_HAND || plateRemaining <= 0 || chewRemaining > 0;
    };

    const finish = (won: boolean, msg: string, hpDamage = 0, rewardChests = 0): void => {
      if (finished) return;
      finished = true;
      this.pendingForcedLose = null;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (caughtTimer !== null) {
        window.clearTimeout(caughtTimer);
        caughtTimer = null;
      }
      pickBtn.disabled = true;
      eatBtn.disabled = true;
      this.setLockedIn(false);
      const cb = this.callbacks;
      this.close();
      if (won) cb?.onWin("peanut_steal", msg, rewardChests);
      else cb?.onLose("peanut_steal", msg, hpDamage);
    };

    const triggerCaught = (reason: string, hpDamage = 60): void => {
      if (finished || bossState === "caught") return;
      bossState = "caught";
      this.pendingForcedLose = { kind: "peanut_steal", msg: reason, hpDamage };
      stage.classList.remove("is-shake");
      void stage.offsetWidth;
      stage.classList.add("is-shake");
      this.sfx.playBossCaughtSlam();
      syncButtonsAndTimer();
      // Keep rAF running during caught animation so cane whack, flying paper & stars stay 60fps!
      caughtTimer = window.setTimeout(() => {
        caughtTimer = null;
        finish(false, reason, hpDamage);
      }, 1150);
    };

    const getRackSlotPos = (idx: number): { x: number; y: number } => {
      const col = idx % 5;
      const row = Math.floor(idx / 5);
      return { x: RACK_X + col * 22, y: RACK_Y + row * 22 };
    };

    const tryPick = (): void => {
      if (finished || bossState === "caught") return;
      if (bossState === "peeking") {
        triggerCaught("Bị Quan Lớn phát hiện đang gắp lạc! (-60 HP)", 60);
        return;
      }
      if (chewRemaining > 0 || handCount >= MAX_HAND || plateRemaining <= 0) return;

      const popped = platePeanuts[plateRemaining - 1];
      const slotPos = getRackSlotPos(handCount);
      flyingPeanuts.push({
        sx: PLATE_CX + popped.ox,
        sy: PLATE_CY + popped.oy,
        tx: slotPos.x,
        ty: slotPos.y,
        arcH: 64,
        rotStart: popped.rot,
        rotEnd: 0.25,
        t: 0,
        dur: 0.14,
      });

      plateRemaining -= 1;
      handCount += 1;
      pickAnimRemaining = 0.12;
      this.sfx.playChopstickPick(handCount);
      syncButtonsAndTimer();
    };

    const tryEat = (): void => {
      if (finished || bossState === "caught") return;
      if (bossState === "peeking") {
        triggerCaught("Bị Quan Lớn phát hiện đang bỏ lạc vào mồm! (-60 HP)", 60);
        return;
      }
      if (chewRemaining > 0 || handCount <= 0) return;

      const batch = handCount;
      for (let i = 0; i < batch; i++) {
        const sp = getRackSlotPos(i);
        flyingPeanuts.push({
          sx: sp.x,
          sy: sp.y,
          tx: THIEF_X - 8,
          ty: THIEF_Y - 12,
          arcH: 48 + (i % 3) * 10,
          rotStart: 0.2,
          rotEnd: 3.1,
          t: -i * 0.012,
          dur: 0.15,
        });
      }

      chewingBatch = batch;
      handCount = 0;
      pickAnimRemaining = 0;
      chewTotal = 0.14 + chewingBatch * 0.048;
      chewRemaining = chewTotal;
      crunchCooldown = 0.2;
      this.sfx.playPeanutCrunch();
      syncButtonsAndTimer();
    };

    bindFastTap(pickBtn, tryPick);
    bindFastTap(eatBtn, tryEat);

    this.keyHandlerFn = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "KeyA" || e.code === "ArrowLeft") {
        e.preventDefault();
        tryPick();
      } else if (e.code === "KeyD" || e.code === "ArrowRight" || e.code === "Space") {
        e.preventDefault();
        tryEat();
      }
    };

    const drawBossHalf = (): void => {
      const scanAngle = bossState === "peeking" ? Math.sin(elapsed * 5.6) : 0;

      // Ambient desk mood tint behind Quan Lớn
      if (bossState === "warning") {
        ctx.fillStyle = `rgba(245, 158, 11, ${(0.14 + 0.08 * Math.sin(elapsed * 18)).toFixed(2)})`;
        ctx.fillRect(0, 0, LOGICAL_W, 200);
      } else if (bossState === "peeking" || bossState === "caught") {
        ctx.fillStyle = "rgba(185, 28, 28, 0.28)";
        ctx.fillRect(0, 0, LOGICAL_W, 200);
      }

      // Sweeping red spotlight cone from Quan Lớn eyes down across table
      if (beamAlpha > 0.02) {
        ctx.save();
        const beamGrad = ctx.createLinearGradient(260, 84, 260, LOGICAL_H);
        beamGrad.addColorStop(0, `rgba(239, 68, 68, ${(beamAlpha * 0.52).toFixed(2)})`);
        beamGrad.addColorStop(1, "rgba(239, 68, 68, 0)");
        ctx.fillStyle = beamGrad;
        const shiftX = scanAngle * 62;
        ctx.beginPath();
        ctx.moveTo(232, 86);
        ctx.lineTo(288, 86);
        ctx.lineTo(445 + shiftX, LOGICAL_H);
        ctx.lineTo(75 + shiftX, LOGICAL_H);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Quan Lớn Shoulders & Crimson Mandarin Robe (scaled large!)
      const breath = Math.sin(elapsed * 2.6) * 1.8;
      const bossCX = 260;
      const bossBaseY = 200 + breath * 0.5;
      ctx.save();
      ctx.translate(bossCX, bossBaseY);
      const torsoScale = 1 + headZoom * 0.08;
      ctx.scale(torsoScale, torsoScale);

      // Wide crimson robe body
      ctx.beginPath();
      ctx.moveTo(-104, 0);
      ctx.quadraticCurveTo(-94, -74, 0, -74);
      ctx.quadraticCurveTo(94, -74, 104, 0);
      ctx.closePath();
      ctx.fillStyle = "#991b1b";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#450a0a";
      ctx.stroke();

      // Gold brocade shoulder trim & inner white collar
      ctx.beginPath();
      ctx.moveTo(-88, -6);
      ctx.quadraticCurveTo(-78, -64, 0, -64);
      ctx.quadraticCurveTo(78, -64, 88, -6);
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = "#facc15";
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-26, -70);
      ctx.lineTo(0, -40);
      ctx.lineTo(26, -70);
      ctx.closePath();
      ctx.fillStyle = "#fef3c7";
      ctx.fill();

      // Imperial chest rank badge (Bổ Tử)
      traceRoundedRect(ctx, -20, -42, 40, 28, 4);
      ctx.fillStyle = "#1e3a8a";
      ctx.fill();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = "#facc15";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -28, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#fbbf24";
      ctx.fill();
      ctx.restore();

      // Quan Lớn Enlarged Head + Mũ Cánh Chuồn
      const headScale = 1 + headZoom * 0.16;
      const headY = 92 - headZoom * 12 + breath * 0.7;
      ctx.save();
      ctx.translate(bossCX, headY);
      ctx.scale(headScale, headScale);

      // Mũ Cánh Chuồn — Gauze Wings extending left & right behind head
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * 42, -24);
        ctx.rotate(side * (-0.16 + Math.sin(elapsed * 2.2) * 0.02));
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.quadraticCurveTo(side * 34, -14, side * 46, -2);
        ctx.quadraticCurveTo(side * 44, 14, side * 4, 8);
        ctx.closePath();
        ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
        ctx.fill();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = "#facc15";
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(side * 6, 1);
        ctx.lineTo(side * 36, 0);
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = "rgba(250, 204, 21, 0.6)";
        ctx.stroke();
        ctx.restore();
      }

      // Large expressive head oval
      ctx.beginPath();
      ctx.ellipse(0, 0, 44, 46, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#fed7aa";
      ctx.fill();
      ctx.lineWidth = 2.8;
      ctx.strokeStyle = "#78350f";
      ctx.stroke();

      // Mandarin Hat Crown + Jade/Gold Medallion
      ctx.beginPath();
      ctx.moveTo(-45, -20);
      ctx.quadraticCurveTo(-40, -60, 0, -64);
      ctx.quadraticCurveTo(40, -60, 45, -20);
      ctx.closePath();
      ctx.fillStyle = "#0f172a";
      ctx.fill();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = "#facc15";
      ctx.stroke();

      // Rear tiered cap crest
      traceRoundedRect(ctx, -22, -74, 44, 14, 6);
      ctx.fillStyle = "#1e293b";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#facc15";
      ctx.stroke();

      // Gold forehead band & crimson jewel
      traceRoundedRect(ctx, -47, -26, 94, 9, 4);
      ctx.fillStyle = "#1e293b";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#facc15";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -35, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = "#dc2626";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#fde047";
      ctx.stroke();

      // Eyes + gold spectacles + scanning pupils
      const eyeOpenH = lerp(8.5, 3.2, eyeSquint) * (bossState === "caught" ? 1.22 : 1);
      const pupilOffset = bossState === "peeking" ? scanAngle * 4.8 : 0;
      for (const side of [-1, 1]) {
        const ex = side * 18;
        ctx.beginPath();
        ctx.ellipse(ex, -1, 10.5, eyeOpenH, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = "#1e293b";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(ex + pupilOffset, -1, bossState === "caught" ? 3.2 : 4.2, 0, Math.PI * 2);
        ctx.fillStyle = bossState === "caught" ? "#dc2626" : "#0f172a";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(ex, -1, 14, 0, Math.PI * 2);
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = "#d97706";
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-4, -1);
      ctx.lineTo(4, -1);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = "#d97706";
      ctx.stroke();

      // Expressive thick eyebrows
      const browTilt = bossState === "reading" ? 0.06 : bossState === "warning" ? 0.28 : 0.45;
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * 18, -17);
        ctx.rotate(side * -browTilt);
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(12, 0);
        ctx.lineWidth = 4.2;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#1e293b";
        ctx.stroke();
        ctx.restore();
      }

      // Flowing Mandarin Mustache & Mouth
      ctx.beginPath();
      ctx.moveTo(-19, 23);
      ctx.quadraticCurveTo(-11, 12, 0, 17);
      ctx.quadraticCurveTo(11, 12, 19, 23);
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#334155";
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(0, 29, bossState === "caught" ? 11 : 7, bossState === "caught" ? 8.5 : 3.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#991b1b";
      ctx.fill();

      // Pulsing geometric anger vein on forehead (pure visual, zero letters)
      if (bossState === "peeking" || bossState === "caught") {
        const pulse = 0.9 + 0.25 * Math.sin(elapsed * 16);
        ctx.save();
        ctx.translate(28, -28);
        ctx.scale(pulse, pulse);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(-4, -4);
        ctx.lineTo(-1, -1);
        ctx.lineTo(-5, 3);
        ctx.moveTo(4, -4);
        ctx.lineTo(1, -1);
        ctx.lineTo(5, 3);
        ctx.stroke();
        ctx.restore();
      }

      // Geometric rustle ripple arcs during warning (no '!' text)
      if (bossState === "warning") {
        const wave = (elapsed * 3.2) % 1;
        for (let k = 0; k < 2; k++) {
          const r = 56 + ((wave + k * 0.5) % 1) * 32;
          const a = 1 - ((wave + k * 0.5) % 1);
          ctx.beginPath();
          ctx.arc(0, -14, r, -Math.PI * 0.82, -Math.PI * 0.18);
          ctx.strokeStyle = `rgba(251, 191, 36, ${(a * 0.85).toFixed(2)})`;
          ctx.lineWidth = 2.6;
          ctx.stroke();
        }
      }
      ctx.restore();

      // Large Newspaper held in front of Quan Lớn (multi-frame sway, rustle, drop & fling)
      const sway = bossState === "reading" ? Math.sin(elapsed * 2.4) * 0.025 : 0;
      const rustleX = bossState === "warning" ? Math.sin(elapsed * 48) * 5.0 : 0;
      const flingX = -paperFling * 165;
      const flingY = paperFling * 56;
      const flingRot = -paperFling * 0.85;
      const paperAlpha = clamp(1 - paperFling * 1.15, 0, 1);

      if (paperAlpha > 0.02) {
        const pCenterY = lerp(126, 188, paperDrop) + flingY;
        const pScaleY = clamp(lerp(1, 0.36, paperDrop), 0.3, 1);
        ctx.save();
        ctx.globalAlpha = paperAlpha;
        ctx.translate(bossCX + rustleX + flingX, pCenterY);
        ctx.rotate(sway + flingRot);
        ctx.scale(1, pScaleY);

        traceRoundedRect(ctx, -104, -56, 208, 112, 6);
        ctx.fillStyle = "#fef3c7";
        ctx.fill();
        ctx.lineWidth = 2.6;
        ctx.strokeStyle = "#92400e";
        ctx.stroke();

        // Spine & decorative ink blocks (no readable words!)
        ctx.beginPath();
        ctx.moveTo(0, -54);
        ctx.lineTo(0, 54);
        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = "#991b1b";
        ctx.fillRect(-94, -44, 80, 10);
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(14, -44, 80, 10);

        ctx.fillStyle = "#64748b";
        for (let row = 0; row < 4; row++) {
          ctx.fillRect(-94, -22 + row * 16, 74 - (row % 2) * 14, 5.5);
          ctx.fillRect(14, -22 + row * 16, 78 - ((row + 1) % 2) * 16, 5.5);
        }

        // Knuckles gripping newspaper edges
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(side * 102, 6, 9.5, 0, Math.PI * 2);
          ctx.fillStyle = "#fed7aa";
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#78350f";
          ctx.stroke();
        }
        ctx.restore();
      }

      // Cane / Stick whack animation when Caught (multi-frame overshoot + impact rings)
      if (bossState === "caught") {
        const swingProg = Math.min(1, caneAnim / 0.28);
        const eased = 1 - Math.pow(1 - swingProg, 3);
        const overshoot = swingProg > 0.75 ? Math.sin((swingProg - 0.75) * Math.PI * 4) * 0.14 : 0;
        const stickAngle = lerp(-2.1, 0.32, eased) + overshoot;

        ctx.save();
        ctx.translate(362, 92);
        ctx.rotate(stickAngle);
        traceRoundedRect(ctx, -5, 0, 10, 124, 5);
        ctx.fillStyle = "#d97706";
        ctx.fill();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = "#fef08a";
        ctx.stroke();
        ctx.restore();

        if (swingProg >= 0.72) {
          const shock = clamp((caneAnim - 0.2) * 2.4, 0, 1);
          ctx.beginPath();
          ctx.arc(394, 200, 14 + shock * 60, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(254, 240, 138, ${((1 - shock) * 0.85).toFixed(2)})`;
          ctx.lineWidth = 3.5;
          ctx.stroke();
        }
      }

      // Wooden Desk across midsection + Teacup with animated rising steam
      const deskGrad = ctx.createLinearGradient(0, 195, 0, 228);
      deskGrad.addColorStop(0, "#78350f");
      deskGrad.addColorStop(1, "#451a03");
      ctx.fillStyle = deskGrad;
      ctx.fillRect(0, 195, LOGICAL_W, 32);
      ctx.fillStyle = "#b45309";
      ctx.fillRect(0, 195, LOGICAL_W, 4);

      // Porcelain teacup on right edge of desk
      traceRoundedRect(ctx, 440, 174, 24, 22, 5);
      ctx.fillStyle = "#0f766e";
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = "#99f6e4";
      ctx.stroke();
      for (let s = 0; s < 2; s++) {
        const sx = 447 + s * 10;
        const wave = Math.sin(elapsed * 3.2 + s * 1.8) * 3.8;
        ctx.beginPath();
        ctx.moveTo(sx, 169);
        ctx.quadraticCurveTo(sx + wave, 158, sx - wave * 0.6, 147);
        ctx.strokeStyle = "rgba(226, 232, 240, 0.55)";
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    };

    const drawTaperedChopstick = (
      hx: number,
      hy: number,
      tx: number,
      ty: number,
      isFront: boolean,
    ): void => {
      const ang = Math.atan2(ty - hy, tx - hx);
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      const nx = -sin;
      const ny = cos;

      const buttX = hx - cos * 22;
      const buttY = hy - sin * 22;
      const collarX = hx + cos * 6;
      const collarY = hy + sin * 6;
      const wButt = 3.4;
      const wCollar = 2.9;
      const wTip = 1.0;

      // Table shadow underneath chopstick
      ctx.beginPath();
      ctx.moveTo(buttX, buttY + 6);
      ctx.lineTo(tx, ty + 5);
      ctx.strokeStyle = "rgba(2, 6, 23, 0.36)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.stroke();

      // Tapered bamboo body
      ctx.beginPath();
      ctx.moveTo(buttX + nx * wButt, buttY + ny * wButt);
      ctx.lineTo(tx + nx * wTip, ty + ny * wTip);
      ctx.lineTo(tx - nx * wTip, ty - ny * wTip);
      ctx.lineTo(buttX - nx * wButt, buttY - ny * wButt);
      ctx.closePath();
      ctx.fillStyle = isFront ? "#f59e0b" : "#d97706";
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "#78350f";
      ctx.stroke();

      // Crimson lacquered handle end + gold trim ring
      ctx.beginPath();
      ctx.moveTo(buttX + nx * wButt, buttY + ny * wButt);
      ctx.lineTo(collarX + nx * wCollar, collarY + ny * wCollar);
      ctx.lineTo(collarX - nx * wCollar, collarY - ny * wCollar);
      ctx.lineTo(buttX - nx * wButt, buttY - ny * wButt);
      ctx.closePath();
      ctx.fillStyle = isFront ? "#b91c1c" : "#991b1b";
      ctx.fill();
      ctx.strokeStyle = "#450a0a";
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(collarX + nx * wCollar, collarY + ny * wCollar);
      ctx.lineTo(collarX - nx * wCollar, collarY - ny * wCollar);
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = "#facc15";
      ctx.stroke();

      // Wood specular sheen strip
      ctx.beginPath();
      ctx.moveTo(collarX + cos * 6, collarY + sin * 6);
      ctx.lineTo(tx - cos * 8, ty - sin * 8);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(254, 243, 199, 0.55)";
      ctx.stroke();
    };

    const drawTableAndPlayers = (): void => {
      // Lower table surface
      const tableGrad = ctx.createLinearGradient(0, 226, 0, LOGICAL_H);
      tableGrad.addColorStop(0, "#1e293b");
      tableGrad.addColorStop(1, "#0f172a");
      ctx.fillStyle = tableGrad;
      ctx.fillRect(0, 226, LOGICAL_W, LOGICAL_H - 226);

      // Subtle rim glow depending on Quan Lớn phase
      if (bossState === "peeking") {
        ctx.fillStyle = "rgba(239, 68, 68, 0.14)";
        ctx.fillRect(0, 226, LOGICAL_W, LOGICAL_H - 226);
      }

      // Ceramic Peanut Plate (bottom-left)
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(PLATE_CX, PLATE_CY + 6, 86, 34, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(2, 6, 23, 0.65)";
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(PLATE_CX, PLATE_CY, 82, 31, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#e2e8f0";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#94a3b8";
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(PLATE_CX, PLATE_CY + 1, 66, 22, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#cbd5e1";
      ctx.fill();
      ctx.restore();

      // Render exact remaining peanuts on plate!
      for (let i = 0; i < plateRemaining; i++) {
        const pn = platePeanuts[i];
        drawRoastedPeanut(ctx, PLATE_CX + pn.ox, PLATE_CY + pn.oy, pn.rot, 1.0, pn.toneIdx);
      }

      // Visual 10-slot hand rack (bottom center) — ZERO numbers, pure visual slots!
      traceRoundedRect(ctx, RACK_X - 18, RACK_Y - 17, 124, 56, 12);
      ctx.fillStyle = handCount >= MAX_HAND ? "rgba(245, 158, 11, 0.24)" : "rgba(15, 23, 42, 0.82)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = handCount >= MAX_HAND ? "#fbbf24" : "rgba(148, 163, 184, 0.35)";
      ctx.stroke();

      for (let slot = 0; slot < MAX_HAND; slot++) {
        const pos = getRackSlotPos(slot);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 8.5, 0, Math.PI * 2);
        ctx.fillStyle = slot < handCount ? "rgba(251, 191, 36, 0.22)" : "rgba(30, 41, 59, 0.85)";
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = slot < handCount ? "#fbbf24" : "rgba(148, 163, 184, 0.28)";
        ctx.stroke();

        if (slot < handCount) {
          drawRoastedPeanut(ctx, pos.x, pos.y, -0.35, 0.88, slot);
        }
      }

      // Tapered Lacquered Chopsticks + Hand gripping naturally
      const pickPhase = pickAnimRemaining > 0 ? Math.sin((pickAnimRemaining / 0.12) * Math.PI) : 0;
      const gripX = lerp(THIEF_X - 42, THIEF_X - 78, pickPhase * 0.45);
      const gripY = lerp(THIEF_Y - 16, THIEF_Y - 8, pickPhase * 0.35);
      const stickTipX = lerp(RACK_X - 24, PLATE_CX + 14, pickPhase);
      const stickTipY = lerp(RACK_Y + 4, PLATE_CY - 12, pickPhase) - Math.sin(pickPhase * Math.PI) * 10;
      const pinchGap = lerp(11, 2.2, pickPhase);

      drawTaperedChopstick(gripX, gripY - 4, stickTipX, stickTipY - pinchGap * 0.5, false);
      if (pickPhase > 0.35) {
        drawRoastedPeanut(ctx, stickTipX, stickTipY, 0.2, 0.9, 0);
      }
      drawTaperedChopstick(gripX + 2, gripY + 4, stickTipX + 2, stickTipY + pinchGap * 0.5, true);

      // Curled fingers gripping chopsticks
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(gripX + 4, gripY, 9.5, 8.2, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = "#fed7aa";
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = "#92400e";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(gripX - 1, gripY - 3, 3.6, 0, Math.PI * 2);
      ctx.arc(gripX + 2, gripY + 3, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#fde68a";
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Flying Peanuts (Plate -> Rack OR Rack -> Mouth)
      for (const fp of flyingPeanuts) {
        if (fp.t < 0) continue;
        const u = clamp(fp.t / fp.dur, 0, 1);
        const fx = lerp(fp.sx, fp.tx, u);
        const fy = lerp(fp.sy, fp.ty, u) - Math.sin(u * Math.PI) * fp.arcH;
        const frot = lerp(fp.rotStart, fp.rotEnd, u);
        drawRoastedPeanut(ctx, fx, fy, frot, 1.05, 1);
      }

      // Thief Character (bottom-right, multi-frame facial expressions & cheek chew cycles)
      const isChewing = chewRemaining > 0 && bossState !== "caught";
      const chewCycle = isChewing ? Math.abs(Math.sin(elapsed * 24)) : 0;
      const gulpBoost = gulpAnim > 0 ? Math.sin(gulpAnim * Math.PI) * 5 : 0;
      const idleBob = bossState === "caught" ? 0 : Math.sin(elapsed * 4.2) * 2.2;
      const caughtRecoilX = bossState === "caught" ? 12 + Math.sin(elapsed * 38) * 4 : 0;
      const leanPick = -pickPhase * 12;

      ctx.save();
      ctx.translate(THIEF_X + leanPick + caughtRecoilX, THIEF_Y + idleBob + gulpBoost);

      // Shoulders
      ctx.beginPath();
      ctx.ellipse(0, 32, 34, 20, 0, Math.PI, Math.PI * 2);
      ctx.fillStyle = "#0f766e";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#134e4a";
      ctx.stroke();

      // Head + puffy cheeks when chewing
      const cheekExpand = isChewing ? 4.5 + chewCycle * 5.2 : 0;
      ctx.beginPath();
      ctx.ellipse(0, 0, 26 + cheekExpand * 0.55, 25 - chewCycle * 1.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#fde68a";
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = "#92400e";
      ctx.stroke();

      // Cheek puffs
      if (isChewing) {
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(side * (16 + cheekExpand * 0.2), 6, 7.5 + chewCycle * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = "#fca5a5";
          ctx.globalAlpha = 0.65;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Hair tuft
      ctx.beginPath();
      ctx.moveTo(-24, -8);
      ctx.quadraticCurveTo(0, -34, 24, -8);
      ctx.quadraticCurveTo(8, -19, -24, -8);
      ctx.fillStyle = "#1e293b";
      ctx.fill();

      // Eyes (nervous upward glance during peeking, dizzy spirals when caught, happy closed crescents eating)
      for (const side of [-1, 1]) {
        const ex = side * 10;
        if (bossState === "caught") {
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(ex - 4, -8);
          ctx.lineTo(ex + 4, -2);
          ctx.moveTo(ex + 4, -8);
          ctx.lineTo(ex - 4, -2);
          ctx.stroke();
        } else if (isChewing) {
          ctx.beginPath();
          ctx.arc(ex, -4, 4.5, Math.PI * 1.1, Math.PI * 1.9);
          ctx.lineWidth = 2.4;
          ctx.strokeStyle = "#0f172a";
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(ex, -5, 4.2, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.beginPath();
          const lookY = bossState === "peeking" || bossState === "warning" ? -7.2 : -5;
          const lookX = pickPhase > 0.1 ? -1.8 : 0;
          ctx.arc(ex + lookX, lookY, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = "#0f172a";
          ctx.fill();
        }
      }

      // Mouth
      ctx.beginPath();
      if (bossState === "caught") {
        ctx.ellipse(0, 9, 7, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#7f1d1d";
        ctx.fill();
      } else if (isChewing) {
        ctx.ellipse(0, 8, 6, 2 + chewCycle * 3.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#991b1b";
        ctx.fill();
      } else {
        ctx.arc(0, 6, 6, 0.15, Math.PI - 0.15);
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = "#78350f";
        ctx.stroke();
      }

      // Sweat drop when hiding still under Boss glare
      if (bossState === "peeking") {
        const dropY = -12 + ((elapsed * 22) % 16);
        ctx.beginPath();
        ctx.moveTo(21, dropY);
        ctx.quadraticCurveTo(25, dropY + 7, 21, dropY + 9);
        ctx.quadraticCurveTo(17, dropY + 7, 21, dropY);
        ctx.fillStyle = "#38bdf8";
        ctx.fill();
      }

      // Caught bump & orbiting dizzy stars (zero text!)
      if (bossState === "caught") {
        ctx.beginPath();
        ctx.arc(-6, -27, 7, Math.PI, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();

        for (let st = 0; st < 3; st++) {
          const ang = elapsed * 6 + (st * Math.PI * 2) / 3;
          const sx = Math.cos(ang) * 26;
          const sy = -34 + Math.sin(ang) * 6;
          ctx.beginPath();
          ctx.arc(sx, sy, 3.8, 0, Math.PI * 2);
          ctx.fillStyle = "#fde047";
          ctx.fill();
        }
      }

      ctx.restore();

      // Pure visual chewing progress strip beneath thief (no words/numbers!)
      traceRoundedRect(ctx, THIEF_X - 42, LOGICAL_H - 16, 84, 7, 4);
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.fill();
      if (isChewing) {
        const pct = clamp((chewTotal - chewRemaining) / Math.max(0.01, chewTotal), 0, 1);
        traceRoundedRect(ctx, THIEF_X - 42, LOGICAL_H - 16, Math.max(6, 84 * pct), 7, 4);
        ctx.fillStyle = "#34d399";
        ctx.fill();
      }

      // Peanut crumbs / win sparkles
      for (const p of particles) {
        const a = clamp(p.life / p.maxLife, 0, 1);
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const render = (): void => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);

      const wallGrad = ctx.createLinearGradient(0, 0, 0, 200);
      wallGrad.addColorStop(0, "#090d16");
      wallGrad.addColorStop(1, "#1e293b");
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, LOGICAL_W, 200);

      drawTableAndPlayers();
      drawBossHalf();
    };

    const tick = (now: number): void => {
      if (finished) return;
      const dt = clamp((now - lastTs) / 1000, 0.001, 0.06);
      lastTs = now;
      elapsed += dt;

      // Smooth 60fps boss state transitions (works even during caught sequence!)
      const dropTarget =
        bossState === "reading" ? 0 : bossState === "warning" ? 0.42 : 1;
      paperDrop = lerp(paperDrop, dropTarget, 1 - Math.exp(-(bossState === "peeking" ? 22 : 12) * dt));
      const zoomTarget =
        bossState === "reading" ? 0 : bossState === "warning" ? 0.35 : bossState === "peeking" ? 1 : 1.3;
      headZoom = lerp(headZoom, zoomTarget, 1 - Math.exp(-14 * dt));
      const squintTarget = bossState === "warning" ? 1 : 0;
      eyeSquint = lerp(eyeSquint, squintTarget, 1 - Math.exp(-14 * dt));
      const beamTarget = bossState === "peeking" || bossState === "caught" ? 1 : 0;
      beamAlpha = lerp(beamAlpha, beamTarget, 1 - Math.exp(-18 * dt));

      if (bossState === "caught") {
        paperFling = Math.min(1, paperFling + dt / 0.35);
        caneAnim += dt;
      }

      if (gulpAnim > 0) gulpAnim = Math.max(0, gulpAnim - dt * 5);

      // Update flying peanuts & crumb particles
      for (let i = flyingPeanuts.length - 1; i >= 0; i--) {
        const fp = flyingPeanuts[i];
        fp.t += dt;
        if (fp.t >= fp.dur) {
          flyingPeanuts.splice(i, 1);
        }
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.vy += p.gravity * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }

      if (bossState === "caught") {
        render();
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      timeLeft -= dt;
      if (timeLeft <= 10 && timeLeft > 0) {
        const curSec = Math.ceil(timeLeft);
        if (curSec < lastTickSec) {
          lastTickSec = curSec;
          this.sfx.playTimerTick(timeLeft <= 4);
        }
      }
      if (timeLeft <= 0) {
        timeLeft = 0;
        syncButtonsAndTimer();
        render();
        this.sfx.playMinigameLose();
        finish(
          false,
          `Hết 45s — Mới ăn được ${eaten}/${totalPeanuts} hạt lạc (Không mất máu).`,
          0,
        );
        return;
      }

      if (pickAnimRemaining > 0) {
        pickAnimRemaining = Math.max(0, pickAnimRemaining - dt);
      }

      if (chewRemaining > 0) {
        chewRemaining -= dt;
        crunchCooldown -= dt;
        if (Math.random() < dt * 16) {
          particles.push({
            x: THIEF_X + (Math.random() - 0.5) * 14,
            y: THIEF_Y + 8,
            vx: (Math.random() - 0.5) * 90,
            vy: -40 - Math.random() * 55,
            radius: 1.8 + Math.random() * 1.8,
            color: "#fbbf24",
            life: 0.32,
            maxLife: 0.32,
            gravity: 300,
          });
        }
        if (chewRemaining > 0.1 && crunchCooldown <= 0) {
          crunchCooldown = 0.24;
          this.sfx.playPeanutCrunch();
        }
        if (chewRemaining <= 0) {
          chewRemaining = 0;
          eaten += chewingBatch;
          chewingBatch = 0;
          gulpAnim = 1;
          if (eaten >= totalPeanuts) {
            const elapsedSec = DURATION_SEC - timeLeft;
            const SIX_CHEST_MAX_SEC = 31.2;
            const rewardChests =
              elapsedSec <= SIX_CHEST_MAX_SEC
                ? 6
                : Math.max(
                    1,
                    6 - Math.ceil(((elapsedSec - SIX_CHEST_MAX_SEC) / (DURATION_SEC - SIX_CHEST_MAX_SEC)) * 5),
                  );
            this.sfx.playMinigameWin();
            finish(
              true,
              `Đã ăn sạch ${totalPeanuts} hạt lạc trong ${elapsedSec.toFixed(1)}s → Mở ${rewardChests} rương! (+25 Đói, +20 Thể lực)`,
              0,
              rewardChests,
            );
            return;
          }
          this.sfx.playSwallowOk();
        }
      }

      if (peekingGrace > 0) {
        peekingGrace = Math.max(0, peekingGrace - dt);
      }

      bossTimer -= dt;
      if (bossTimer <= 0) {
        if (bossState === "reading") {
          bossState = "warning";
          isFakeoutWarning = Math.random() < 0.15;
          bossTimer = 1.25;
          this.sfx.playPaperRustleWarning();
        } else if (bossState === "warning") {
          if (isFakeoutWarning) {
            bossState = "reading";
            isFakeoutWarning = false;
            bossTimer = 2.4 + Math.random() * 1.0;
            this.sfx.playBossSafeRelax();
          } else {
            bossState = "peeking";
            peekingGrace = 0.22;
            bossTimer = 0.85 + Math.random() * 0.35;
            this.sfx.playBossPeekSnap();
          }
        } else {
          bossState = "reading";
          bossTimer = 2.8 + Math.random() * 1.2;
          this.sfx.playBossSafeRelax();
        }
      }

      if (bossState === "peeking" && peekingGrace <= 0 && (chewRemaining > 0 || pickAnimRemaining > 0)) {
        triggerCaught(
          chewRemaining > 0
            ? "Bị Quan Lớn phát hiện đang nhai lạc! (-60 HP)"
            : "Bị Quan Lớn tóm ngay lúc tay chưa kịp rụt đũa! (-60 HP)",
          60,
        );
        render();
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      syncButtonsAndTimer();
      render();
      rafId = window.requestAnimationFrame(tick);
    };

    syncButtonsAndTimer();
    render();
    rafId = window.requestAnimationFrame(tick);

    this.cleanupFn = () => {
      finished = true;
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (caughtTimer !== null) window.clearTimeout(caughtTimer);
    };
  }
}
