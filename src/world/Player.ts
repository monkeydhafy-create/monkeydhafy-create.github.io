import { Container, Sprite } from "pixi.js";
import type { Pathfinder } from "./Pathfinder.ts";
import type { WorldAtlas } from "./SpriteAtlas.ts";
import { PIXEL_SCALE, type CharacterSkinId, type FacingDir, type Point } from "./types.ts";

/**
 * Animated 4-directional pixel-art Explorer character (CC0 NinjaAdventure spritesheets)
 * supporting unified Tap-to-Move A* pathing and optional WASD/Arrow controls.
 */
export class Player extends Container {
  public readonly speed = 235; // pixels per second

  private readonly atlas: WorldAtlas;
  private readonly shadowSprite: Sprite;
  private readonly characterSprite: Sprite;

  private skinId: CharacterSkinId = "samurai_blue";
  private facing: FacingDir = "down";
  private animElapsed = 0;
  private animFrame = 0;

  private path: Point[] = [];
  private pathIndex = 0;
  private manualDir: Point = { x: 0, y: 0 };

  constructor(startX: number, startY: number, atlas: WorldAtlas) {
    super();

    this.atlas = atlas;
    this.x = startX;
    this.y = startY;
    this.zIndex = startY;

    this.shadowSprite = new Sprite(atlas.shadow);
    this.shadowSprite.anchor.set(0.5, 0.5);
    this.shadowSprite.scale.set(PIXEL_SCALE);
    this.shadowSprite.y = 2;
    this.shadowSprite.alpha = 0.6;

    this.characterSprite = new Sprite(atlas.characters[this.skinId].down[0]);
    this.characterSprite.anchor.set(0.5, 0.92);
    this.characterSprite.scale.set(PIXEL_SCALE);

    this.addChild(this.shadowSprite, this.characterSprite);
  }

  public setSkin(skinId: CharacterSkinId): void {
    this.skinId = skinId;
    this.refreshTexture();
  }

  public getSkin(): CharacterSkinId {
    return this.skinId;
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
    let movedX = 0;
    let movedY = 0;

    if (Math.hypot(this.manualDir.x, this.manualDir.y) > 0.01) {
      const stepX = this.manualDir.x * this.speed * dt;
      const stepY = this.manualDir.y * this.speed * dt;

      if (pathfinder.isWalkableWorld(this.x + stepX, this.y)) {
        this.x += stepX;
        movedX = stepX;
      }
      if (pathfinder.isWalkableWorld(this.x, this.y + stepY)) {
        this.y += stepY;
        movedY = stepY;
      }
    } else if (this.pathIndex < this.path.length) {
      let budget = this.speed * dt;

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
      const frameDuration = 0.11;
      if (this.animElapsed >= frameDuration) {
        this.animElapsed %= frameDuration;
        this.animFrame = (this.animFrame + 1) % 4;
      }
    } else {
      this.animElapsed = 0;
      this.animFrame = 0;
    }

    this.refreshTexture();
    this.zIndex = this.y;
  }

  private refreshTexture(): void {
    const nextTex = this.atlas.characters[this.skinId][this.facing][this.animFrame];
    if (this.characterSprite.texture !== nextTex) {
      this.characterSprite.texture = nextTex;
    }
  }
}
