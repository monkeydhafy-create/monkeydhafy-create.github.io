import { sound } from "@pixi/sound";
import { Container, Graphics, Sprite } from "pixi.js";
import type { Application, FederatedPointerEvent, Texture } from "pixi.js";
import { Pathfinder } from "./Pathfinder.ts";
import { Player } from "./Player.ts";
import { createWorldAtlas, type WorldAtlas } from "./SpriteAtlas.ts";
import {
  CHUNK_TILES,
  PIXEL_SCALE,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type BiomeId,
  type CharacterSkinId,
  type Point,
  type TileType,
  type WorldData,
  type WorldLandmark,
  type WorldProp,
} from "./types.ts";

interface RippleEffect {
  x: number;
  y: number;
  age: number;
  duration: number;
  color: number;
}

interface LeafBreeze {
  sprite: Sprite;
  vx: number;
  vy: number;
  swayPhase: number;
  spin: number;
}

export interface WorldCallbacks {
  onLandmarkDiscovered?: (landmark: WorldLandmark) => void;
}

/**
 * Main PixiJS v8 Open-World Scene rendering CC0 pixel-art terrain chunks,
 * 2.5D Y-sorted buildings & foliage, animated lilypads & drifting leaves,
 * and unified mobile/PC Tap-to-Move pathfinding.
 */
export class WorldScene {
  public readonly worldContainer: Container;
  public readonly data: WorldData;
  public readonly atlas: WorldAtlas;
  public readonly pathfinder: Pathfinder;
  public readonly player: Player;

  private readonly app: Application;
  private readonly callbacks: WorldCallbacks;

  private readonly groundLayer: Container;
  private readonly waterAnimLayer: Container;
  private readonly pathOverlayLayer: Graphics;
  private readonly entityLayer: Container;
  private readonly atmosphereLayer: Container;

  private readonly lilypadSprites: Array<{ sprite: Sprite; phase: number }> = [];
  private readonly leafParticles: LeafBreeze[] = [];
  private readonly ripples: RippleEffect[] = [];
  private readonly terrainChunks: Array<{ node: Container; minX: number; minY: number; maxX: number; maxY: number }> = [];

  private camX: number;
  private camY: number;
  private zoom = 1;
  private targetZoom = 1;
  private soundEnabled = true;

  private isPointerDown = false;
  private lastDragPathAt = 0;
  private readonly keysDown = new Set<string>();
  private elapsed = 0;

  constructor(app: Application, data: WorldData, callbacks: WorldCallbacks = {}) {
    this.app = app;
    this.data = data;
    this.callbacks = callbacks;
    this.atlas = createWorldAtlas();

    this.pathfinder = new Pathfinder(data.cols, data.rows, data.tileSize, data.collision);
    this.player = new Player(data.spawn.x, data.spawn.y, this.atlas);

    this.camX = data.spawn.x;
    this.camY = data.spawn.y;

    this.worldContainer = new Container();
    this.groundLayer = new Container();
    this.waterAnimLayer = new Container();
    this.pathOverlayLayer = new Graphics();
    this.entityLayer = new Container();
    this.entityLayer.sortableChildren = true;
    this.atmosphereLayer = new Container();

    this.buildTerrainChunks();
    this.buildLilypads();
    this.buildPropsAndBuildings();
    this.buildDriftingLeaves();

    this.entityLayer.addChild(this.player);

    this.worldContainer.addChild(
      this.groundLayer,
      this.waterAnimLayer,
      this.pathOverlayLayer,
      this.entityLayer,
      this.atmosphereLayer,
    );

    this.updateResponsiveBaseZoom(app.screen.width, app.screen.height, true);
    this.syncCameraTransform();
    this.bindInputs();
  }

  public setCharacterSkin(skinId: CharacterSkinId): void {
    this.player.setSkin(skinId);
  }

  public getCharacterSkin(): CharacterSkinId {
    return this.player.getSkin();
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    sound.muteAll();
    if (enabled) {
      sound.unmuteAll();
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public adjustZoom(delta: number): void {
    this.targetZoom = Math.max(0.6, Math.min(2.0, this.targetZoom + delta));
  }

  public centerOnPlayer(): void {
    this.camX = this.player.x;
    this.camY = this.player.y;
  }

  public moveToWorldPoint(worldX: number, worldY: number, playSfx = true): void {
    const clampedX = Math.max(TILE_SIZE * 2, Math.min(WORLD_WIDTH - TILE_SIZE * 2, worldX));
    const clampedY = Math.max(TILE_SIZE * 2, Math.min(WORLD_HEIGHT - TILE_SIZE * 2, worldY));

    const path = this.pathfinder.findPath(
      { x: this.player.x, y: this.player.y },
      { x: clampedX, y: clampedY },
    );

    if (path.length > 0) {
      this.player.setPath(path);
      const end = path[path.length - 1];
      this.spawnRipple(end.x, end.y, 0x34d399);
    } else {
      this.spawnRipple(clampedX, clampedY, 0xf43f5e);
    }

    if (playSfx && this.soundEnabled) {
      try {
        sound.play("sfx-press", { volume: 0.22 });
      } catch {
        // AudioContext unlocks automatically on first user gesture
      }
    }
  }

  public getCurrentBiome(): BiomeId {
    const col = Math.max(0, Math.min(this.data.cols - 1, Math.floor(this.player.x / TILE_SIZE)));
    const row = Math.max(0, Math.min(this.data.rows - 1, Math.floor(this.player.y / TILE_SIZE)));
    return this.data.biomes[row * this.data.cols + col];
  }

  public getDestination(): Point | null {
    return this.player.getDestination();
  }

  public update(dtSeconds: number): void {
    const dt = Math.min(dtSeconds, 0.05);
    this.elapsed += dt;

    let kx = 0;
    let ky = 0;
    if (this.keysDown.has("KeyW") || this.keysDown.has("ArrowUp")) ky -= 1;
    if (this.keysDown.has("KeyS") || this.keysDown.has("ArrowDown")) ky += 1;
    if (this.keysDown.has("KeyA") || this.keysDown.has("ArrowLeft")) kx -= 1;
    if (this.keysDown.has("KeyD") || this.keysDown.has("ArrowRight")) kx += 1;

    if (kx !== 0 || ky !== 0) {
      this.player.setManualDirection(kx, ky);
    } else {
      this.player.setManualDirection(0, 0);
    }

    this.player.update(dt, this.pathfinder);

    const camLerp = 1 - Math.exp(-8.5 * dt);
    this.camX += (this.player.x - this.camX) * camLerp;
    this.camY += (this.player.y - this.camY) * camLerp;
    this.zoom += (this.targetZoom - this.zoom) * (1 - Math.exp(-10 * dt));

    this.syncCameraTransform();
    this.checkLandmarks();
    this.renderPathAndRipples(dt);
    this.updateAmbientEffects(dt);
  }

  public destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.app.canvas.removeEventListener("wheel", this.onWheel);
  }

  private buildTerrainChunks(): void {
    const { cols, rows, tiles } = this.data;

    for (let cy = 0; cy < rows; cy += CHUNK_TILES) {
      for (let cx = 0; cx < cols; cx += CHUNK_TILES) {
        const chunk = new Container();
        const decorGfx = new Graphics();
        const maxRow = Math.min(rows, cy + CHUNK_TILES);
        const maxCol = Math.min(cols, cx + CHUNK_TILES);

        for (let row = cy; row < maxRow; row++) {
          for (let col = cx; col < maxCol; col++) {
            const tile = tiles[row * cols + col];
            const px = col * TILE_SIZE;
            const py = row * TILE_SIZE;

            if (tile === "bridge") {
              // Draw water underneath, then rustic wooden planks on top
              const waterTex = this.pickTileVariant(this.atlas.tiles.water, col, row);
              const wSprite = new Sprite(waterTex);
              wSprite.position.set(px, py);
              wSprite.scale.set(PIXEL_SCALE);
              wSprite.tint = 0x38bdf8;
              chunk.addChild(wSprite);

              decorGfx
                .rect(px + 2, py, TILE_SIZE - 4, TILE_SIZE)
                .fill(0x8b5a2b)
                .rect(px + 2, py + 6, TILE_SIZE - 4, 2)
                .fill(0x5c3a1b)
                .rect(px + 2, py + 22, TILE_SIZE - 4, 2)
                .fill(0x5c3a1b)
                .rect(px + 2, py + 38, TILE_SIZE - 4, 2)
                .fill(0x5c3a1b)
                .rect(px, py, 5, TILE_SIZE)
                .fill(0x4a2c11)
                .rect(px + TILE_SIZE - 5, py, 5, TILE_SIZE)
                .fill(0x4a2c11);
              continue;
            }

            const tex = this.resolveTileTexture(tile, col, row);
            const sprite = new Sprite(tex);
            sprite.position.set(px, py);
            sprite.scale.set(PIXEL_SCALE);

            if (tile === "water") {
              // Rich cerulean lake tint over ice/water tile
              sprite.tint = 0x38bdf8;
              this.drawWaterEdgeFoam(decorGfx, tiles, cols, rows, col, row, px, py);
            } else if (tile === "forest") {
              // Slightly deeper woodland tone
              sprite.tint = 0xdbeafe;
            } else if (tile === "stone") {
              this.drawStoneEdgeTrim(decorGfx, tiles, cols, rows, col, row, px, py);
            }

            chunk.addChild(sprite);
          }
        }

        chunk.addChild(decorGfx);
        this.groundLayer.addChild(chunk);
        this.terrainChunks.push({
          node: chunk,
          minX: cx * TILE_SIZE,
          minY: cy * TILE_SIZE,
          maxX: maxCol * TILE_SIZE,
          maxY: maxRow * TILE_SIZE,
        });
      }
    }
  }

  private resolveTileTexture(tile: TileType, col: number, row: number): Texture {
    const hash = Math.abs(col * 73856093 ^ row * 19349663);

    switch (tile) {
      case "grass":
        return this.atlas.tiles.grass[hash % this.atlas.tiles.grass.length];
      case "meadow":
        return this.atlas.tiles.meadow[hash % this.atlas.tiles.meadow.length];
      case "forest":
        return this.atlas.tiles.forest[hash % this.atlas.tiles.forest.length];
      case "sand":
        return this.atlas.tiles.sand[hash % this.atlas.tiles.sand.length];
      case "dirt":
        return this.resolveDirtAutoTile(col, row, hash);
      case "stone":
        return this.atlas.tiles.stone[hash % this.atlas.tiles.stone.length];
      case "water":
      case "bridge":
        return this.atlas.tiles.water[hash % this.atlas.tiles.water.length];
    }
  }

  private resolveDirtAutoTile(col: number, row: number, hash: number): Texture {
    const { tiles, cols, rows } = this.data;
    const isPath = (c: number, r: number): boolean => {
      if (c < 0 || r < 0 || c >= cols || r >= rows) return false;
      const t = tiles[r * cols + c];
      return t === "dirt" || t === "stone" || t === "bridge" || t === "sand";
    };

    const n = isPath(col, row - 1);
    const s = isPath(col, row + 1);
    const w = isPath(col - 1, row);
    const e = isPath(col + 1, row);
    const edges = this.atlas.tiles.dirtEdges;

    if (!n && !w) return edges.tl;
    if (!n && !e) return edges.tr;
    if (!s && !w) return edges.bl;
    if (!s && !e) return edges.br;
    if (!n) return edges.t;
    if (!s) return edges.b;
    if (!w) return edges.l;
    if (!e) return edges.r;

    return this.atlas.tiles.dirt[hash % this.atlas.tiles.dirt.length];
  }

  private drawStoneEdgeTrim(
    g: Graphics,
    tiles: TileType[],
    cols: number,
    rows: number,
    col: number,
    row: number,
    px: number,
    py: number,
  ): void {
    const isStone = (c: number, r: number): boolean => {
      if (c < 0 || r < 0 || c >= cols || r >= rows) return false;
      return tiles[r * cols + c] === "stone";
    };

    if (!isStone(col, row - 1)) g.rect(px, py, TILE_SIZE, 3).fill({ color: 0x334155, alpha: 0.55 });
    if (!isStone(col, row + 1)) g.rect(px, py + TILE_SIZE - 3, TILE_SIZE, 3).fill({ color: 0x1e293b, alpha: 0.65 });
    if (!isStone(col - 1, row)) g.rect(px, py, 3, TILE_SIZE).fill({ color: 0x334155, alpha: 0.55 });
    if (!isStone(col + 1, row)) g.rect(px + TILE_SIZE - 3, py, 3, TILE_SIZE).fill({ color: 0x1e293b, alpha: 0.65 });
  }

  private pickTileVariant(list: Texture[], col: number, row: number): Texture {
    const idx = Math.abs(col * 31 + row * 17) % list.length;
    return list[idx];
  }

  private drawWaterEdgeFoam(
    g: Graphics,
    tiles: TileType[],
    cols: number,
    rows: number,
    col: number,
    row: number,
    px: number,
    py: number,
  ): void {
    const isWater = (c: number, r: number): boolean => {
      if (c < 0 || r < 0 || c >= cols || r >= rows) return true;
      return tiles[r * cols + c] === "water";
    };

    if (!isWater(col, row - 1)) g.rect(px, py, TILE_SIZE, 4).fill({ color: 0xbae6fd, alpha: 0.45 });
    if (!isWater(col, row + 1)) g.rect(px, py + TILE_SIZE - 4, TILE_SIZE, 4).fill({ color: 0xbae6fd, alpha: 0.35 });
    if (!isWater(col - 1, row)) g.rect(px, py, 4, TILE_SIZE).fill({ color: 0xbae6fd, alpha: 0.45 });
    if (!isWater(col + 1, row)) g.rect(px + TILE_SIZE - 4, py, 4, TILE_SIZE).fill({ color: 0xbae6fd, alpha: 0.35 });
  }

  private buildLilypads(): void {
    for (let i = 0; i < this.data.lilypads.length; i++) {
      const pos = this.data.lilypads[i];
      const sprite = new Sprite(this.atlas.lilypads[i % 4]);
      sprite.anchor.set(0.5);
      sprite.scale.set(PIXEL_SCALE * 0.85);
      sprite.position.set(pos.x, pos.y);
      this.waterAnimLayer.addChild(sprite);
      this.lilypadSprites.push({ sprite, phase: i * 0.8 });
    }
  }

  private buildPropsAndBuildings(): void {
    for (const prop of this.data.props) {
      const node = this.createPropSprite(prop);
      if (prop.kind === "bush_a" || prop.kind === "bush_b" || prop.kind === "stone_small") {
        // Low ground foliage still depth-sorted or ground-layered nicely
        this.entityLayer.addChild(node);
      } else {
        this.entityLayer.addChild(node);
      }
    }
  }

  private createPropSprite(prop: WorldProp): Container {
    const container = new Container();
    container.x = prop.x;
    container.y = prop.y;
    container.zIndex = prop.y;

    const tex = this.atlas.props[prop.kind];
    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5, 0.94);
    sprite.scale.set(PIXEL_SCALE);

    // Subtle soft elliptical shadow under trees, statues & structures
    const shadowWidth = Math.max(18, sprite.width * 0.42);
    const shadow = new Graphics()
      .ellipse(0, -2, shadowWidth, Math.max(7, shadowWidth * 0.25))
      .fill({ color: 0x000000, alpha: 0.28 });

    container.addChild(shadow, sprite);
    return container;
  }

  private buildDriftingLeaves(): void {
    for (let i = 0; i < 28; i++) {
      const sprite = new Sprite(this.atlas.leafFrames[i % this.atlas.leafFrames.length]);
      sprite.anchor.set(0.5);
      sprite.scale.set(PIXEL_SCALE * 0.85);
      sprite.alpha = 0.85;
      sprite.x = (i * 499) % WORLD_WIDTH;
      sprite.y = (i * 313) % WORLD_HEIGHT;

      this.atmosphereLayer.addChild(sprite);
      this.leafParticles.push({
        sprite,
        vx: 18 + (i % 4) * 6,
        vy: 14 + (i % 3) * 5,
        swayPhase: i * 0.9,
        spin: (i % 2 === 0 ? 1 : -1) * 1.4,
      });
    }
  }

  private spawnRipple(x: number, y: number, color: number): void {
    this.ripples.push({
      x,
      y,
      age: 0,
      duration: 0.42,
      color,
    });
  }

  private renderPathAndRipples(dt: number): void {
    const g = this.pathOverlayLayer;
    g.clear();

    const remaining = this.player.getRemainingPath();
    if (remaining.length > 0) {
      const end = remaining[remaining.length - 1];

      let prev: Point = { x: this.player.x, y: this.player.y };
      for (const wp of remaining) {
        const dist = Math.hypot(wp.x - prev.x, wp.y - prev.y);
        const steps = Math.max(1, Math.floor(dist / 28));
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const bx = prev.x + (wp.x - prev.x) * t;
          const by = prev.y + (wp.y - prev.y) * t;
          g.circle(bx, by, 2.5).fill({ color: 0x6ee7b7, alpha: 0.45 });
        }
        prev = wp;
      }

      const pulse = 9 + Math.sin(this.elapsed * 6.5) * 2.5;
      g.circle(end.x, end.y, pulse)
        .stroke({ width: 2.2, color: 0x34d399, alpha: 0.85 })
        .circle(end.x, end.y, 4)
        .fill(0xa7f3d0);
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.age += dt;
      if (r.age >= r.duration) {
        this.ripples.splice(i, 1);
        continue;
      }
      const p = r.age / r.duration;
      const radius = 6 + p * 26;
      const alpha = (1 - p) * 0.9;
      g.circle(r.x, r.y, radius).stroke({ width: 2.2, color: r.color, alpha });
    }
  }

  private updateAmbientEffects(dt: number): void {
    // Animate water lilypads gently through the 4 frames
    const frameBase = Math.floor(this.elapsed * 3);
    for (const lp of this.lilypadSprites) {
      const frame = (frameBase + Math.floor(lp.phase)) % 4;
      lp.sprite.texture = this.atlas.lilypads[frame];
    }

    // Drift blossom leaves across the breeze with flutter animation
    const leafFrameBase = Math.floor(this.elapsed * 6);
    for (let i = 0; i < this.leafParticles.length; i++) {
      const leaf = this.leafParticles[i];
      leaf.sprite.texture = this.atlas.leafFrames[(leafFrameBase + i) % this.atlas.leafFrames.length];
      leaf.sprite.x += (leaf.vx + Math.sin(this.elapsed * 1.5 + leaf.swayPhase) * 10) * dt;
      leaf.sprite.y += leaf.vy * dt;
      leaf.sprite.rotation += leaf.spin * dt;

      if (leaf.sprite.x > WORLD_WIDTH) leaf.sprite.x -= WORLD_WIDTH;
      if (leaf.sprite.y > WORLD_HEIGHT) leaf.sprite.y -= WORLD_HEIGHT;
    }
  }

  private checkLandmarks(): void {
    for (const lm of this.data.landmarks) {
      if (lm.discovered) continue;
      if (Math.hypot(this.player.x - lm.x, this.player.y - lm.y) <= lm.radius) {
        lm.discovered = true;
        this.callbacks.onLandmarkDiscovered?.(lm);
      }
    }
  }

  private syncCameraTransform(): void {
    const viewW = this.app.screen.width;
    const viewH = this.app.screen.height;

    const halfViewWorldW = viewW / (2 * this.zoom);
    const halfViewWorldH = viewH / (2 * this.zoom);

    let clampedCamX = this.camX;
    let clampedCamY = this.camY;

    if (WORLD_WIDTH > halfViewWorldW * 2) {
      clampedCamX = Math.max(halfViewWorldW, Math.min(WORLD_WIDTH - halfViewWorldW, this.camX));
    } else {
      clampedCamX = WORLD_WIDTH / 2;
    }

    if (WORLD_HEIGHT > halfViewWorldH * 2) {
      clampedCamY = Math.max(halfViewWorldH, Math.min(WORLD_HEIGHT - halfViewWorldH, this.camY));
    } else {
      clampedCamY = WORLD_HEIGHT / 2;
    }

    this.camX = clampedCamX;
    this.camY = clampedCamY;

    this.worldContainer.scale.set(this.zoom);
    this.worldContainer.position.set(
      viewW / 2 - this.camX * this.zoom,
      viewH / 2 - this.camY * this.zoom,
    );

    // Viewport culling per chunk keeps draw calls ultra minimal with 0 texture seam
    const minVisibleX = this.camX - halfViewWorldW - TILE_SIZE;
    const maxVisibleX = this.camX + halfViewWorldW + TILE_SIZE;
    const minVisibleY = this.camY - halfViewWorldH - TILE_SIZE;
    const maxVisibleY = this.camY + halfViewWorldH + TILE_SIZE;

    for (const ch of this.terrainChunks) {
      ch.node.visible =
        ch.maxX >= minVisibleX &&
        ch.minX <= maxVisibleX &&
        ch.maxY >= minVisibleY &&
        ch.minY <= maxVisibleY;
    }
  }

  private updateResponsiveBaseZoom(width: number, height: number, immediate = false): void {
    const minDim = Math.min(width, height);
    const defaultZoom = minDim < 500 ? 0.9 : minDim < 900 ? 1.0 : 1.08;
    this.targetZoom = defaultZoom;
    if (immediate) {
      this.zoom = defaultZoom;
    }
  }

  private bindInputs(): void {
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = this.app.screen;

    this.app.stage.on("pointerdown", this.onPointerDown);
    this.app.stage.on("pointermove", this.onPointerMove);
    this.app.stage.on("pointerup", this.onPointerUp);
    this.app.stage.on("pointerupoutside", this.onPointerUp);
    this.app.stage.on("pointercancel", this.onPointerUp);

    this.app.renderer.on("resize", (width: number, height: number) => {
      this.app.stage.hitArea = this.app.screen;
      this.updateResponsiveBaseZoom(width, height, false);
    });

    this.app.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  private readonly onPointerDown = (e: FederatedPointerEvent): void => {
    this.isPointerDown = true;
    const worldPos = this.worldContainer.toLocal(e.global);
    this.lastDragPathAt = performance.now();
    this.moveToWorldPoint(worldPos.x, worldPos.y, true);
  };

  private readonly onPointerMove = (e: FederatedPointerEvent): void => {
    if (!this.isPointerDown) return;
    const now = performance.now();
    if (now - this.lastDragPathAt < 85) return;
    this.lastDragPathAt = now;

    const worldPos = this.worldContainer.toLocal(e.global);
    this.moveToWorldPoint(worldPos.x, worldPos.y, false);
  };

  private readonly onPointerUp = (): void => {
    this.isPointerDown = false;
  };

  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const step = e.deltaY > 0 ? -0.1 : 0.1;
    this.adjustZoom(step);
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    this.keysDown.add(e.code);
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
  };
}
