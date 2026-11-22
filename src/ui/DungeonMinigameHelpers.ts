import type { DungeonMinigameKind } from "../world/dungeon/DungeonTypes.ts";
import type { DungeonSfx } from "./DungeonSfx.ts";

export interface DungeonMinigameMountHost {
  modalEl: HTMLElement;
  boardEl: HTMLElement;
  sfx: DungeonSfx;
  setLockedIn: (locked: boolean) => void;
  setCleanup: (fn: (() => void) | null) => void;
  setKeyHandler: (fn: ((e: KeyboardEvent) => void) | null) => void;
  finish: (
    kind: DungeonMinigameKind,
    won: boolean,
    msg: string,
    hpDamage?: number,
    rewardChests?: number,
  ) => void;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function createScaledCanvas(
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

export function traceRoundedRect(
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

export function createTimerBar(initialSec: number): {
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

export function bindFastTap(btn: HTMLButtonElement, fn: () => void): void {
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!btn.disabled) {
      fn();
    }
  });
}
