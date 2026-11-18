import type { Application } from "pixi.js";

function getLoaderElements(): {
  overlay: HTMLElement | null;
  badge: HTMLElement | null;
  title: HTMLElement | null;
  sub: HTMLElement | null;
  fill: HTMLElement | null;
  pct: HTMLElement | null;
  tip: HTMLElement | null;
} {
  return {
    overlay: document.getElementById("map-loader-overlay"),
    badge: document.getElementById("map-loader-badge"),
    title: document.getElementById("map-loader-title"),
    sub: document.getElementById("map-loader-sub"),
    fill: document.getElementById("map-loader-fill"),
    pct: document.getElementById("map-loader-pct"),
    tip: document.getElementById("map-loader-tip"),
  };
}

/** Runs first, before PixiJS starts */
export async function initPlatform() {}

/** Called while assets load, with progress from 0 to 1 */
export function setLoadingProgress(progress: number, subtitle?: string): void {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const pctText = `${Math.round(clamped * 100)}%`;
  const els = getLoaderElements();
  if (els.fill) els.fill.style.width = pctText;
  if (els.pct) els.pct.textContent = pctText;
  if (subtitle && els.sub) els.sub.textContent = subtitle;
}

/** Shows fullscreen flight/map transition overlay smoothly before world rebuild */
export function showMapTransitionOverlay(opts: {
  badge: string;
  title: string;
  subtitle: string;
  tip: string;
  progressPct?: number;
}): void {
  const els = getLoaderElements();
  if (!els.overlay) return;
  if (els.badge) els.badge.textContent = opts.badge;
  if (els.title) els.title.textContent = opts.title;
  if (els.sub) els.sub.textContent = opts.subtitle;
  if (els.tip) els.tip.textContent = opts.tip;
  const pct = Math.max(0, Math.min(100, Math.round(opts.progressPct ?? 35)));
  if (els.fill) els.fill.style.width = `${pct}%`;
  if (els.pct) els.pct.textContent = `${pct}%`;
  els.overlay.classList.add("is-visible");
}

/** Hides the boot/transition overlay smoothly */
export function hideMapTransitionOverlay(): void {
  const overlay = document.getElementById("map-loader-overlay");
  overlay?.classList.remove("is-visible");
}

/**
 * Runs once the scene is on screen and the game can be played. A platform
 * that pauses the game can stop `app.ticker` here.
 */
export function gameReady(_app: Application): void {
  setLoadingProgress(1, "Sẵn sàng khám phá!");
  window.requestAnimationFrame(() => {
    hideMapTransitionOverlay();
  });
}
