import { Container, Graphics, Sprite, Texture } from "pixi.js";
import {
  GARMENT_BY_ID,
  HAIR_OPTIONS,
  createDefaultEquippedGear,
  getCharacterBodyScale,
  resolveGarmentLayerKey,
  type EquippedGear,
} from "./EquipmentCatalog.ts";
import type { Pathfinder } from "./Pathfinder.ts";
import type { WorldAtlas } from "./SpriteAtlas.ts";
import {
  PIXEL_SCALE,
  type CharacterGender,
  type CharacterSkinId,
  type FacingDir,
  type Point,
  type SurfaceState,
} from "./types.ts";

export interface PlayerWaterCallbacks {
  getSurfaceAt: (x: number, y: number) => SurfaceState;
  onWaterStep: (x: number, y: number, mode: "wade" | "swim") => void;
}

const LPC_DISPLAY_SCALE = 1.16;

/**
 * Multi-layer Liberated Pixel Cup (LPC) 64x64 Paper-Doll Explorer:
 * - Independently renders cape-bg, body, footwear, pants, torso/coat, head, hair,
 *   accessories (glasses/scarf/cape-fg), and hats with dynamic tint & water clipping.
 * - Renders live biological cues: sweat droplets when overheated, shiver + frost breath when cold.
 */
export class Player extends Container {
  public readonly baseSpeed = 188; // pixels per second (-20% tuning)

  private readonly atlas: WorldAtlas;
  private readonly callbacks: PlayerWaterCallbacks;
  private readonly shadowSprite: Sprite;
  private readonly swimRing: Graphics;
  private readonly dollContainer: Container;
  private readonly waterClipMask: Graphics;
  private readonly statusGfx: Graphics;

  // Ordered Z-stacked LPC sprites (back-to-front)
  private readonly capeBgSprite: Sprite;
  private readonly bodySprite: Sprite;
  private readonly feetSprite: Sprite;
  private readonly legsSprite: Sprite;
  private readonly torsoSprite: Sprite;
  private readonly headSprite: Sprite;
  private readonly hairSprite: Sprite;
  private readonly accSprite: Sprite;
  private readonly hatSprite: Sprite;

  private skinId: CharacterSkinId = "samurai_blue";
  private gender: CharacterGender = "male";
  private equipped: EquippedGear = createDefaultEquippedGear();
  private hairId = HAIR_OPTIONS[0].id;
  private facing: FacingDir = "down";
  private surfaceState: SurfaceState = "dry";
  private animElapsed = 0;
  private animFrame = 0; // 0 = idle standing, 1..8 = 8-frame LPC walk cycle
  private swimElapsed = 0;
  private waterRippleTimer = 0;

  private fatigueSpeedMul = 1.0;
  private isSweating = false;
  private isShivering = false;

  private path: Point[] = [];
  private pathIndex = 0;
  private manualDir: Point = { x: 0, y: 0 };

  constructor(
    startX: number,
    startY: number,
    atlas: WorldAtlas,
    callbacks: PlayerWaterCallbacks,
  ) {
    super();

    this.atlas = atlas;
    this.callbacks = callbacks;
    this.x = startX;
    this.y = startY;
    this.zIndex = startY;

    this.shadowSprite = new Sprite(atlas.shadow);
    this.shadowSprite.anchor.set(0.5, 0.5);
    this.shadowSprite.scale.set(PIXEL_SCALE * 1.1);
    this.shadowSprite.y = 2;
    this.shadowSprite.alpha = 0.62;

    this.swimRing = new Graphics();
    this.swimRing.visible = false;

    this.dollContainer = new Container();
    this.dollContainer.scale.set(LPC_DISPLAY_SCALE);

    const makeLayer = (): Sprite => {
      const s = new Sprite(Texture.EMPTY);
      s.anchor.set(0.5, 0.94);
      return s;
    };

    this.capeBgSprite = makeLayer();
    this.bodySprite = makeLayer();
    this.feetSprite = makeLayer();
    this.legsSprite = makeLayer();
    this.torsoSprite = makeLayer();
    this.headSprite = makeLayer();
    this.hairSprite = makeLayer();
    this.accSprite = makeLayer();
    this.hatSprite = makeLayer();

    this.dollContainer.addChild(
      this.capeBgSprite,
      this.bodySprite,
      this.feetSprite,
      this.legsSprite,
      this.torsoSprite,
      this.headSprite,
      this.hairSprite,
      this.accSprite,
      this.hatSprite,
    );

    this.waterClipMask = new Graphics();
    this.waterClipMask.visible = false;

    this.statusGfx = new Graphics();

    this.addChild(
      this.shadowSprite,
      this.swimRing,
      this.dollContainer,
      this.waterClipMask,
      this.statusGfx,
    );

    this.surfaceState = this.callbacks.getSurfaceAt(startX, startY);
    this.applySurfaceVisuals(false);
    this.refreshTexture();
  }

  public setSkin(skinId: CharacterSkinId): void {
    this.skinId = skinId;
    this.refreshTexture();
  }

  public getSkin(): CharacterSkinId {
    return this.skinId;
  }

  public setAppearance(
    equipped: EquippedGear,
    hairId: string,
    gender: CharacterGender = this.gender,
  ): void {
    this.equipped = { ...equipped };
    this.hairId = hairId;
    this.gender = gender;
    this.refreshTexture();
  }

  public setGender(gender: CharacterGender): void {
    this.gender = gender;
    this.refreshTexture();
  }

  public getGender(): CharacterGender {
    return this.gender;
  }

  public setSurvivalVisuals(opts: {
    speedMultiplier: number;
    isSweating: boolean;
    isShivering: boolean;
  }): void {
    this.fatigueSpeedMul = opts.speedMultiplier;
    this.isSweating = opts.isSweating;
    this.isShivering = opts.isShivering;
  }

  public setFacing(dir: FacingDir): void {
    this.facing = dir;
    this.refreshTexture();
  }

  public getFacing(): FacingDir {
    return this.facing;
  }

  public getSurfaceState(): SurfaceState {
    return this.surfaceState;
  }

  public setPath(newPath: Point[]): void {
    this.path = newPath;
    this.pathIndex = 0;
  }

  public clearPath(): void {
    this.path = [];
    this.pathIndex = 0;
  }

  public setManualDirection(dx: number, dy: number): void {
    const len = Math.hypot(dx, dy);
    if (len > 0.01) {
      this.manualDir.x = dx / len;
      this.manualDir.y = dy / len;
      this.clearPath();
    } else {
      this.manualDir.x = 0;
      this.manualDir.y = 0;
    }
  }

  public isMoving(): boolean {
    return (
      Math.hypot(this.manualDir.x, this.manualDir.y) > 0.01 ||
      this.pathIndex < this.path.length
    );
  }

  private updateSurfaceFromPosition(): void {
    const nextSurface = this.callbacks.getSurfaceAt(this.x, this.y);
    if (nextSurface !== this.surfaceState) {
      this.surfaceState = nextSurface;
      if (nextSurface === "wade" || nextSurface === "swim") {
        this.callbacks.onWaterStep(this.x, this.y, nextSurface);
        this.waterRippleTimer = 0;
      }
    }
  }

  private stepWaterRipples(dt: number, movingNow: boolean): void {
    if (movingNow) {
      if (this.surfaceState === "wade" || this.surfaceState === "swim") {
        this.waterRippleTimer += dt;
        const interval = this.surfaceState === "swim" ? 0.22 : 0.18;
        if (this.waterRippleTimer >= interval) {
          this.waterRippleTimer = 0;
          this.callbacks.onWaterStep(this.x, this.y, this.surfaceState);
        }
      }
    } else if (this.surfaceState === "swim") {
      this.waterRippleTimer += dt;
      if (this.waterRippleTimer >= 0.75) {
        this.waterRippleTimer = 0;
        this.callbacks.onWaterStep(this.x, this.y, "swim");
      }
    }
  }

  public syncRemotePose(
    targetX: number,
    targetY: number,
    facing: FacingDir,
    isMoving: boolean,
    dtSeconds: number,
  ): void {
    const dt = Math.min(Math.max(dtSeconds, 0), 0.05);
    this.swimElapsed += dt;
    const dist = Math.hypot(targetX - this.x, targetY - this.y);
    if (dist > 220) {
      this.x = targetX;
      this.y = targetY;
    } else {
      const alpha = Math.min(1, dt * 12);
      this.x += (targetX - this.x) * alpha;
      this.y += (targetY - this.y) * alpha;
    }
    this.zIndex = this.y;
    this.facing = facing;
    const movingNow = isMoving || dist > 2.5;
    this.updateSurfaceFromPosition();
    if (movingNow) {
      this.animElapsed += dt;
      const cycleDur = this.surfaceState === "swim" ? 0.85 : 0.64;
      const step = Math.floor((this.animElapsed % cycleDur) / (cycleDur / 8));
      this.animFrame = 1 + step;
    } else {
      this.animElapsed = 0;
      this.animFrame = 0;
    }
    this.stepWaterRipples(dt, movingNow);
    this.applySurfaceVisuals(movingNow);
    this.refreshTexture();
  }

  public getRemainingPath(): Point[] {
    if (this.pathIndex >= this.path.length) return [];
    return this.path.slice(this.pathIndex);
  }

  public getDestination(): Point | null {
    if (this.path.length === 0 || this.pathIndex >= this.path.length) return null;
    return this.path[this.path.length - 1];
  }

  public update(dtSeconds: number, pathfinder: Pathfinder): void {
    const dt = Math.min(dtSeconds, 0.05);
    this.swimElapsed += dt;

    this.updateSurfaceFromPosition();

    const surfaceMultiplier =
      this.surfaceState === "swim" ? 0.38 : this.surfaceState === "wade" ? 0.86 : 1.0;
    const activeSpeed = this.baseSpeed * surfaceMultiplier * this.fatigueSpeedMul;

    let movedX = 0;
    let movedY = 0;

    if (Math.hypot(this.manualDir.x, this.manualDir.y) > 0.01) {
      const stepX = this.manualDir.x * activeSpeed * dt;
      const stepY = this.manualDir.y * activeSpeed * dt;

      if (pathfinder.isWalkableWorld(this.x + stepX, this.y)) {
        this.x += stepX;
        movedX = stepX;
      }
      if (pathfinder.isWalkableWorld(this.x, this.y + stepY)) {
        this.y += stepY;
        movedY = stepY;
      }
    } else if (this.pathIndex < this.path.length) {
      let budget = activeSpeed * dt;

      while (budget > 0 && this.pathIndex < this.path.length) {
        const target = this.path[this.pathIndex];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= budget) {
          this.x = target.x;
          this.y = target.y;
          movedX += dx;
          movedY += dy;
          budget -= dist;
          this.pathIndex++;
        } else {
          const ratio = budget / dist;
          const stepX = dx * ratio;
          const stepY = dy * ratio;
          this.x += stepX;
          this.y += stepY;
          movedX += stepX;
          movedY += stepY;
          budget = 0;
        }
      }

      if (this.pathIndex >= this.path.length) {
        this.clearPath();
      }
    }

    const movingNow = Math.hypot(movedX, movedY) > 0.01;
    if (movingNow) {
      if (Math.abs(movedX) >= Math.abs(movedY)) {
        this.facing = movedX > 0 ? "right" : "left";
      } else {
        this.facing = movedY > 0 ? "down" : "up";
      }

      this.animElapsed += dt;
      const frameDuration = (this.surfaceState === "swim" ? 0.13 : 0.085) / Math.max(0.65, this.fatigueSpeedMul);
      if (this.animElapsed >= frameDuration) {
        this.animElapsed %= frameDuration;
        // Columns 1..8 are the 8 LPC walk stride frames
        this.animFrame = this.animFrame === 0 ? 1 : (this.animFrame % 8) + 1;
      }
    } else {
      this.animElapsed = 0;
      this.animFrame = 0;
    }

    this.stepWaterRipples(dt, movingNow);
    this.applySurfaceVisuals(movingNow);
    this.renderThermalCues();
    this.refreshTexture();
    this.zIndex = this.y;
  }

  private applySurfaceVisuals(movingNow: boolean): void {
    const shiverOffsetX = this.isShivering ? Math.sin(this.swimElapsed * 36) * 1.15 : 0;

    if (this.surfaceState === "dry") {
      this.dollContainer.mask = null;
      this.waterClipMask.visible = false;
      this.dollContainer.x = shiverOffsetX;
      this.dollContainer.y = 0;
      this.dollContainer.rotation = 0;
      this.shadowSprite.visible = true;
      this.shadowSprite.alpha = 0.62;
      this.swimRing.visible = false;
      return;
    }

    if (this.surfaceState === "wade") {
      this.waterClipMask.visible = true;
      this.waterClipMask.clear().rect(-38, -80, 76, 75).fill(0xffffff);
      this.dollContainer.mask = this.waterClipMask;
      this.dollContainer.x = shiverOffsetX;
      this.dollContainer.y = 3;
      this.dollContainer.rotation = 0;
      this.shadowSprite.visible = true;
      this.shadowSprite.alpha = 0.22;

      const rx = 15 + Math.sin(this.swimElapsed * 5) * 2;
      this.swimRing.visible = true;
      this.swimRing
        .clear()
        .ellipse(0, 0, rx, 5.5)
        .stroke({ width: 1.8, color: 0xbae6fd, alpha: 0.75 });
      return;
    }

    const waveBob = Math.sin(this.swimElapsed * (movingNow ? 7 : 3.5)) * 2.2;
    this.waterClipMask.visible = true;
    this.waterClipMask.clear().rect(-38, -80, 76, 56).fill(0xffffff);
    this.dollContainer.mask = this.waterClipMask;
    this.dollContainer.x = shiverOffsetX;
    this.dollContainer.y = 6 + waveBob;
    this.dollContainer.rotation = movingNow
      ? Math.sin(this.swimElapsed * 6) * 0.08
      : Math.sin(this.swimElapsed * 2.5) * 0.03;

    this.shadowSprite.visible = false;

    const ringRadiusX = 18 + Math.sin(this.swimElapsed * 4.5) * 2.5;
    const ringRadiusY = 6.8 + Math.sin(this.swimElapsed * 4.5) * 0.8;
    this.swimRing.visible = true;
    this.swimRing
      .clear()
      .ellipse(0, -14, ringRadiusX, ringRadiusY)
      .stroke({ width: 2.2, color: 0xe0f2fe, alpha: 0.88 })
      .ellipse(0, -14, ringRadiusX - 4, ringRadiusY - 1.5)
      .fill({ color: 0x38bdf8, alpha: 0.22 });
  }

  private renderThermalCues(): void {
    this.statusGfx.clear();
    const bodyScale = getCharacterBodyScale(this.gender);
    if (this.isSweating) {
      // Animated sweat drops falling near temple + warm rim
      const dropPhase = (this.swimElapsed * 1.8) % 1;
      const dropY = -58 * bodyScale.y + dropPhase * 15;
      const alpha = Math.sin(dropPhase * Math.PI);
      this.statusGfx
        .circle(13 * bodyScale.x, dropY, 2.3)
        .fill({ color: 0x38bdf8, alpha: alpha * 0.95 })
        .circle(-12 * bodyScale.x, -56 * bodyScale.y + ((dropPhase + 0.5) % 1) * 14, 1.9)
        .fill({ color: 0x7dd3fc, alpha: 0.85 });
    }
    if (this.isShivering) {
      // Cold frosty breath puffs floating upward near mouth
      const puffPhase = (this.swimElapsed * 1.1) % 1;
      const puffAlpha = (1 - puffPhase) * 0.65;
      this.statusGfx
        .circle(puffPhase * 6 + 3 * bodyScale.x, -50 * bodyScale.y - puffPhase * 9, 2.2 + puffPhase * 2.8)
        .fill({ color: 0xe0f2fe, alpha: puffAlpha });
    }
  }

  private setLayerTexture(sprite: Sprite, layerKey: string | null, tint = 0xffffff): void {
    if (!layerKey) {
      sprite.visible = false;
      return;
    }
    const frames = this.atlas.lpcLayers[layerKey];
    if (!frames) {
      sprite.visible = false;
      void this.atlas.ensureLpcLayer(layerKey).then((loaded) => {
        if (loaded && !this.destroyed) {
          this.refreshTexture();
        }
      });
      return;
    }
    const tex = frames[this.facing][this.animFrame] ?? frames[this.facing][0];
    if (sprite.texture !== tex) {
      sprite.texture = tex;
    }
    sprite.tint = tint;
    sprite.visible = true;
  }

  private refreshTexture(): void {
    const bodyScale = getCharacterBodyScale(this.gender);
    this.dollContainer.scale.set(
      LPC_DISPLAY_SCALE * bodyScale.x,
      LPC_DISPLAY_SCALE * bodyScale.y,
    );
    this.shadowSprite.scale.set(PIXEL_SCALE * (this.gender === "female" ? 0.94 : 1.1));

    this.setLayerTexture(this.bodySprite, this.gender === "female" ? "body_female" : "body_male");
    this.setLayerTexture(this.headSprite, this.gender === "female" ? "head_female" : "head_male");

    const feetDef = this.equipped.feet ? GARMENT_BY_ID[this.equipped.feet] : null;
    this.setLayerTexture(
      this.feetSprite,
      feetDef ? resolveGarmentLayerKey(feetDef, this.gender) : null,
      feetDef?.tint ?? 0xffffff,
    );

    const legsDef = this.equipped.legs ? GARMENT_BY_ID[this.equipped.legs] : null;
    this.setLayerTexture(
      this.legsSprite,
      legsDef ? resolveGarmentLayerKey(legsDef, this.gender) : null,
      legsDef?.tint ?? 0xffffff,
    );

    const torsoDef = this.equipped.torso ? GARMENT_BY_ID[this.equipped.torso] : null;
    this.setLayerTexture(
      this.torsoSprite,
      torsoDef ? resolveGarmentLayerKey(torsoDef, this.gender) : null,
      torsoDef?.tint ?? 0xffffff,
    );

    const hatDef = this.equipped.hat ? GARMENT_BY_ID[this.equipped.hat] : null;
    this.setLayerTexture(
      this.hatSprite,
      hatDef ? resolveGarmentLayerKey(hatDef, this.gender) : null,
      hatDef?.tint ?? 0xffffff,
    );

    const hairDef = HAIR_OPTIONS.find((h) => h.id === this.hairId) ?? HAIR_OPTIONS[0];
    if (hatDef?.hidesHair) {
      this.hairSprite.visible = false;
    } else {
      this.setLayerTexture(this.hairSprite, hairDef.layerKey, hairDef.tint);
    }

    const accDef = this.equipped.accessory ? GARMENT_BY_ID[this.equipped.accessory] : null;
    this.setLayerTexture(this.accSprite, accDef?.layerKey ?? null, accDef?.tint ?? 0xffffff);
    this.setLayerTexture(this.capeBgSprite, accDef?.bgLayerKey ?? null, accDef?.tint ?? 0xffffff);
  }
}
