import {
  BIOME_LABELS,
  CHARACTER_SKINS,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type TileType,
} from "../world/types.ts";
import type { WorldScene } from "../world/WorldScene.ts";

const MINIMAP_COLORS: Record<TileType, string> = {
  grass: "#2d6a4f",
  meadow: "#52b788",
  forest: "#1b4332",
  sand: "#e9c46a",
  water: "#0284c7",
  dirt: "#8d5b36",
  stone: "#64748b",
  bridge: "#9a6b3b",
};

/**
 * Lightweight HTML/CSS Retina-sharp HUD overlay for coordinates, biome telemetry,
 * interactive tap-to-travel minimap, landmark toast & zoom/audio controls.
 */
export class Hud {
  private readonly scene: WorldScene;

  private readonly biomeEl: HTMLElement;
  private readonly coordsEl: HTMLElement;
  private readonly fpsEl: HTMLElement;
  private readonly minimapCanvas: HTMLCanvasElement;
  private readonly minimapCtx: CanvasRenderingContext2D;
  private readonly terrainSnapshot: HTMLCanvasElement;
  private readonly toastEl: HTMLElement;
  private readonly toastTitleEl: HTMLElement;
  private readonly toastSubEl: HTMLElement;
  private readonly soundBtn: HTMLButtonElement;
  private readonly skinBtn: HTMLButtonElement;

  private skinIdx = 0;
  private toastTimer: number | null = null;
  private fpsAccum = 0;
  private fpsFrames = 0;
  private lastHudTick = 0;

  constructor(scene: WorldScene) {
    this.scene = scene;

    this.biomeEl = document.getElementById("hud-biome")!;
    this.coordsEl = document.getElementById("hud-coords")!;
    this.fpsEl = document.getElementById("hud-fps")!;
    this.minimapCanvas = document.getElementById("hud-minimap") as HTMLCanvasElement;
    this.minimapCtx = this.minimapCanvas.getContext("2d")!;
    this.toastEl = document.getElementById("hud-toast")!;
    this.toastTitleEl = document.getElementById("hud-toast-title")!;
    this.toastSubEl = document.getElementById("hud-toast-sub")!;
    this.soundBtn = document.getElementById("btn-sound") as HTMLButtonElement;
    this.skinBtn = document.getElementById("btn-skin") as HTMLButtonElement;

    this.terrainSnapshot = this.bakeTerrainSnapshot();
    this.bindEvents();
  }

  public showDiscoveryToast(title: string, subtitle: string): void {
    this.toastTitleEl.textContent = title;
    this.toastSubEl.textContent = subtitle;
    this.toastEl.classList.add("is-visible");

    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
    }
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.classList.remove("is-visible");
    }, 3200);
  }

  public update(dtSeconds: number): void {
    this.fpsAccum += dtSeconds;
    this.fpsFrames++;

    const now = performance.now();
    if (this.fpsAccum >= 0.35) {
      const fps = Math.round(this.fpsFrames / this.fpsAccum);
      this.fpsEl.textContent = `${fps} FPS`;
      this.fpsAccum = 0;
      this.fpsFrames = 0;
    }

    // Throttle DOM text & minimap redraws (~20Hz) for optimal battery & smoothness
    if (now - this.lastHudTick < 50) return;
    this.lastHudTick = now;

    const biome = this.scene.getCurrentBiome();
    this.biomeEl.textContent = BIOME_LABELS[biome];

    const tx = Math.floor(this.scene.player.x / TILE_SIZE);
    const ty = Math.floor(this.scene.player.y / TILE_SIZE);
    this.coordsEl.textContent = `X:${tx}  Y:${ty}`;

    this.drawMinimap();
  }

  private bakeTerrainSnapshot(): HTMLCanvasElement {
    const offscreen = document.createElement("canvas");
    const { cols, rows, tiles } = this.scene.data;
    offscreen.width = cols;
    offscreen.height = rows;

    const ctx = offscreen.getContext("2d")!;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = MINIMAP_COLORS[tiles[r * cols + c]];
        ctx.fillRect(c, r, 1, 1);
      }
    }
    return offscreen;
  }

  private drawMinimap(): void {
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const ctx = this.minimapCtx;

    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.terrainSnapshot, 0, 0, w, h);

    // Draw landmarks
    for (const lm of this.scene.data.landmarks) {
      const lx = (lm.x / WORLD_WIDTH) * w;
      const ly = (lm.y / WORLD_HEIGHT) * h;
      ctx.fillStyle = lm.discovered ? "#34d399" : "#f59e0b";
      ctx.beginPath();
      ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw destination marker
    const dest = this.scene.getDestination();
    if (dest) {
      const dx = (dest.x / WORLD_WIDTH) * w;
      const dy = (dest.y / WORLD_HEIGHT) * h;
      ctx.strokeStyle = "#6ee7b7";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(dx, dy, 3.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw player dot
    const px = (this.scene.player.x / WORLD_WIDTH) * w;
    const py = (this.scene.player.y / WORLD_HEIGHT) * h;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(px, py, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#059669";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private bindEvents(): void {
    const zoomInBtn = document.getElementById("btn-zoom-in");
    const zoomOutBtn = document.getElementById("btn-zoom-out");
    const centerBtn = document.getElementById("btn-center");

    zoomInBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.scene.adjustZoom(0.2);
    });

    zoomOutBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.scene.adjustZoom(-0.2);
    });

    centerBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.scene.centerOnPlayer();
    });

    this.soundBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const next = !this.scene.isSoundEnabled();
      this.scene.setSoundEnabled(next);
      this.soundBtn.textContent = next ? "🔊" : "🔇";
      this.soundBtn.setAttribute("aria-label", next ? "Tắt âm thanh" : "Bật âm thanh");
    });

    this.skinBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.skinIdx = (this.skinIdx + 1) % CHARACTER_SKINS.length;
      const chosen = CHARACTER_SKINS[this.skinIdx];
      this.scene.setCharacterSkin(chosen.id);
      this.skinBtn.textContent = `🥷 ${chosen.label}`;
    });

    // Interactive Minimap: click/tap anywhere on minimap to travel there!
    this.minimapCanvas.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      const rect = this.minimapCanvas.getBoundingClientRect();
      const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      this.scene.moveToWorldPoint(nx * WORLD_WIDTH, ny * WORLD_HEIGHT, true);
    });
  }
}
