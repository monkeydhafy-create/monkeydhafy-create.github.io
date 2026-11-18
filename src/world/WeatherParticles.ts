import { Container, Graphics, Particle, ParticleContainer, Texture } from "pixi.js";
import type { EnvironmentState } from "./HanoiWeatherService.ts";

export interface WorldViewBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface RainDrop {
  p: Particle;
  speedMul: number;
}

interface DustMote {
  p: Particle;
  phase: number;
  driftX: number;
  driftY: number;
  baseAlpha: number;
  isNightFireflyTint: boolean;
}

interface FallingLeaf {
  p: Particle;
  phase: number;
  fallSpeed: number;
  spin: number;
  frameOffset: number;
}

interface WindWisp {
  p: Particle;
  speed: number;
}

interface RainSplash {
  x: number;
  y: number;
  age: number;
  duration: number;
}

function createSoftDotTexture(size = 16): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, "rgba(255, 255, 255, 1)");
  grad.addColorStop(0.5, "rgba(255, 255, 255, 0.48)");
  grad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(canvas);
}

function createRainStreakTexture(): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 28;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 28);
  grad.addColorStop(0, "rgba(186, 230, 253, 0)");
  grad.addColorStop(0.55, "rgba(186, 230, 253, 0.7)");
  grad.addColorStop(1, "rgba(224, 242, 254, 0.95)");
  ctx.fillStyle = grad;
  ctx.fillRect(1, 0, 2, 28);
  return Texture.from(canvas);
}

function createWindWispTexture(): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 6;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 96, 0);
  grad.addColorStop(0, "rgba(255, 255, 255, 0)");
  grad.addColorStop(0.5, "rgba(226, 232, 240, 0.55)");
  grad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 2, 96, 2);
  return Texture.from(canvas);
}

/**
 * World-space weather particle engine using PixiJS v8 native `ParticleContainer`.
 * All particles live strictly in world coordinates (wrapped around the active
 * camera viewport) so leaves, dust, fireflies, wind & rain stay planted on the map
 * when the player walks or zooms.
 */
export class WeatherParticles {
  /** Shaded world effects (leaves, wind gusts, rain, ground splashes) — receives day/night tint */
  public readonly worldShadedLayer: Container;
  /** Luminous world effects (sunlit dust motes & glowing night fireflies) — stays bright at night */
  public readonly worldLuminousLayer: Container;

  private readonly leafFrames: Texture[];
  private readonly dustContainer: ParticleContainer;
  private readonly leafContainer: ParticleContainer;
  private readonly windContainer: ParticleContainer;
  private readonly rainContainer: ParticleContainer;
  private readonly splashGraphics: Graphics;

  private readonly dustMotes: DustMote[] = [];
  private readonly leaves: FallingLeaf[] = [];
  private readonly windWisps: WindWisp[] = [];
  private readonly rainDrops: RainDrop[] = [];
  private readonly splashes: RainSplash[] = [];

  private initialized = false;
  private elapsed = 0;

  constructor(leafFrames: Texture[]) {
    this.leafFrames = leafFrames;
    this.worldShadedLayer = new Container();
    this.worldLuminousLayer = new Container();

    const dustTex = createSoftDotTexture(16);
    const rainTex = createRainStreakTexture();
    const windTex = createWindWispTexture();

    this.dustContainer = new ParticleContainer({
      dynamicProperties: { position: true, color: true },
    });

    this.leafContainer = new ParticleContainer({
      dynamicProperties: { position: true, rotation: true, uvs: true, color: true },
    });

    this.windContainer = new ParticleContainer({
      dynamicProperties: { position: true, rotation: true, color: true },
    });

    this.rainContainer = new ParticleContainer({
      dynamicProperties: { position: true, rotation: true, color: true },
    });

    this.splashGraphics = new Graphics();

    this.worldShadedLayer.addChild(
      this.splashGraphics,
      this.leafContainer,
      this.windContainer,
      this.rainContainer,
    );
    this.worldLuminousLayer.addChild(this.dustContainer);

    const mobileScale =
      typeof window !== "undefined" && Math.min(window.innerWidth, window.innerHeight) <= 640
        ? 0.6
        : 1;
    const dustCount = Math.round(120 * mobileScale);
    const leafCount = Math.round(64 * mobileScale);
    const windCount = Math.round(20 * mobileScale);
    const rainCount = Math.round(260 * mobileScale);

    // 1. Dust motes / Fireflies (world-space particles)
    for (let i = 0; i < dustCount; i++) {
      const p = new Particle({
        texture: dustTex,
        anchorX: 0.5,
        anchorY: 0.5,
        scaleX: 0.25 + (i % 4) * 0.12,
        scaleY: 0.25 + (i % 4) * 0.12,
        tint: 0xfef3c7,
        alpha: 0.4,
      });
      this.dustContainer.addParticle(p);
      this.dustMotes.push({
        p,
        phase: i * 0.65,
        driftX: (Math.random() - 0.5) * 14,
        driftY: -4 - Math.random() * 10,
        baseAlpha: 0.25 + Math.random() * 0.45,
        isNightFireflyTint: i % 2 === 0,
      });
    }

    // 2. Wind-blown leaves (world-space leaves using CC0 sprites)
    const leafTints = [0xffffff, 0x86efac, 0xfde68a, 0xa7f3d0];
    for (let i = 0; i < leafCount; i++) {
      const p = new Particle({
        texture: leafFrames[i % leafFrames.length],
        anchorX: 0.5,
        anchorY: 0.5,
        scaleX: 1.85 + (i % 3) * 0.25,
        scaleY: 1.85 + (i % 3) * 0.25,
        tint: leafTints[i % leafTints.length],
        alpha: 0.85,
      });
      this.leafContainer.addParticle(p);
      this.leaves.push({
        p,
        phase: i * 0.85,
        fallSpeed: 28 + Math.random() * 24,
        spin: (i % 2 === 0 ? 1 : -1) * (1.2 + Math.random() * 1.4),
        frameOffset: i,
      });
    }

    // 3. Wind gust wisps (world-space breeze ribbons)
    for (let i = 0; i < windCount; i++) {
      const p = new Particle({
        texture: windTex,
        anchorX: 0.5,
        anchorY: 0.5,
        scaleX: 0.9 + Math.random() * 0.8,
        scaleY: 1,
        alpha: 0,
      });
      this.windContainer.addParticle(p);
      this.windWisps.push({
        p,
        speed: 320 + Math.random() * 240,
      });
    }

    // 4. Rain streaks (world-space drops)
    for (let i = 0; i < rainCount; i++) {
      const p = new Particle({
        texture: rainTex,
        anchorX: 0.5,
        anchorY: 0.5,
        scaleX: 1,
        scaleY: 0.85 + Math.random() * 0.55,
        alpha: 0,
      });
      this.rainContainer.addParticle(p);
      this.rainDrops.push({
        p,
        speedMul: 0.85 + Math.random() * 0.35,
      });
    }
  }

  public update(dtSeconds: number, env: EnvironmentState, bounds: WorldViewBounds): void {
    const dt = Math.min(dtSeconds, 0.05);
    this.elapsed += dt;

    if (!this.initialized) {
      this.initialized = true;
      this.seedParticlesInBounds(bounds);
    }

    // Meteorological wind direction -> world velocity vector
    const towardRad = ((env.windDirectionDeg + 180) * Math.PI) / 180;
    const windSpeedPx = 18 + env.windSpeedKmh * 5.2;
    const windVx = Math.sin(towardRad) * windSpeedPx;
    const windVy = -Math.cos(towardRad) * (windSpeedPx * 0.35);

    this.updateDustAndFireflies(dt, env, windVx, windVy, bounds);
    this.updateLeaves(dt, env, windVx, windVy, bounds);
    this.updateWindWisps(dt, env, windVx, windVy, bounds);
    this.updateRainAndSplashes(dt, env, windVx, bounds);
  }

  private seedParticlesInBounds(bounds: WorldViewBounds): void {
    const w = bounds.maxX - bounds.minX;
    const h = bounds.maxY - bounds.minY;

    const scatter = (p: Particle): void => {
      p.x = bounds.minX + Math.random() * w;
      p.y = bounds.minY + Math.random() * h;
    };

    for (const d of this.dustMotes) scatter(d.p);
    for (const l of this.leaves) scatter(l.p);
    for (const wisp of this.windWisps) scatter(wisp.p);
    for (const r of this.rainDrops) scatter(r.p);
  }

  private updateDustAndFireflies(
    dt: number,
    env: EnvironmentState,
    windVx: number,
    windVy: number,
    bounds: WorldViewBounds,
  ): void {
    const activeCount = Math.floor(this.dustMotes.length * env.dustIntensity);
    this.dustContainer.visible = activeCount > 0;
    if (activeCount === 0) return;

    const isNight = env.nightFactor > 0.45;

    for (let i = 0; i < this.dustMotes.length; i++) {
      const d = this.dustMotes[i];
      if (i >= activeCount) {
        d.p.alpha = 0;
        continue;
      }

      d.p.x += (d.driftX + windVx * 0.25 + Math.sin(this.elapsed * 0.9 + d.phase) * 8) * dt;
      d.p.y += (d.driftY + windVy * 0.2 + Math.cos(this.elapsed * 0.7 + d.phase) * 6) * dt;
      this.wrapInWorldWindow(d.p, bounds, 60);

      if (isNight) {
        d.p.tint = d.isNightFireflyTint ? 0x6ee7b7 : 0x67e8f9;
        const pulse = 0.35 + (Math.sin(this.elapsed * 3.1 + d.phase) * 0.5 + 0.5) * 0.65;
        d.p.alpha = Math.min(0.92, d.baseAlpha * 1.5 * pulse * Math.max(0.4, env.nightFactor));
      } else {
        d.p.tint = 0xfef08a;
        const shimmer = 0.6 + Math.sin(this.elapsed * 1.8 + d.phase) * 0.4;
        d.p.alpha = d.baseAlpha * (0.55 + env.sunIntensity * 0.45) * shimmer;
      }
    }
  }

  private updateLeaves(
    dt: number,
    env: EnvironmentState,
    windVx: number,
    windVy: number,
    bounds: WorldViewBounds,
  ): void {
    const leafRatio = Math.min(1, 0.28 + env.windIntensity * 0.72);
    const activeCount = Math.floor(this.leaves.length * leafRatio * (env.leafIntensity > 0 ? 1 : 0));
    this.leafContainer.visible = activeCount > 0;
    if (activeCount === 0) return;

    const frameTick = Math.floor(this.elapsed * 6);

    const isJapaneseMap = env.mapId === "japan";
    const vnTints = [0xffffff, 0x86efac, 0xfde68a, 0xa7f3d0];
    const jpTints = [0xffb7d5, 0xfbcfe8, 0xfb7185, 0xfef08a];

    for (let i = 0; i < this.leaves.length; i++) {
      const leaf = this.leaves[i];
      if (i >= activeCount) {
        leaf.p.alpha = 0;
        continue;
      }

      const flutterX = Math.sin(this.elapsed * 2.1 + leaf.phase) * (20 + env.windIntensity * 25);
      leaf.p.x += (windVx * 0.85 + flutterX) * dt;
      leaf.p.y += (leaf.fallSpeed + Math.max(0, windVy * 0.45)) * dt;
      leaf.p.rotation += leaf.spin * (0.7 + env.windIntensity) * dt;
      leaf.p.texture = this.leafFrames[(frameTick + leaf.frameOffset) % this.leafFrames.length];
      leaf.p.tint = isJapaneseMap ? jpTints[i % jpTints.length] : vnTints[i % vnTints.length];
      leaf.p.alpha = 0.86;

      this.wrapInWorldWindow(leaf.p, bounds, 80);
    }
  }

  private updateWindWisps(
    dt: number,
    env: EnvironmentState,
    windVx: number,
    windVy: number,
    bounds: WorldViewBounds,
  ): void {
    const showThreshold = env.windSpeedKmh >= 12 ? (env.windSpeedKmh - 10) / 22 : 0;
    const strength = Math.max(0, Math.min(1, showThreshold));
    const activeCount = Math.floor(this.windWisps.length * strength);
    this.windContainer.visible = activeCount > 0;
    if (activeCount === 0) return;

    const angle = Math.atan2(windVy, windVx);

    for (let i = 0; i < this.windWisps.length; i++) {
      const w = this.windWisps[i];
      if (i >= activeCount) {
        w.p.alpha = 0;
        continue;
      }

      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      const speed = w.speed * (0.6 + env.windIntensity * 0.9);
      w.p.x += dirX * speed * dt;
      w.p.y += dirY * speed * dt;
      w.p.rotation = angle;
      w.p.alpha = 0.16 + strength * 0.22;

      this.wrapInWorldWindow(w.p, bounds, 120);
    }
  }

  private updateRainAndSplashes(
    dt: number,
    env: EnvironmentState,
    windVx: number,
    bounds: WorldViewBounds,
  ): void {
    const snowIntensity = env.snowIntensity ?? 0;
    const isSnow = snowIntensity > 0;
    const intensity = isSnow ? snowIntensity : env.rainIntensity;
    const activeCount = Math.floor(this.rainDrops.length * intensity);
    this.rainContainer.visible = activeCount > 0;
    if (activeCount === 0 && this.splashes.length === 0) {
      this.splashGraphics.visible = false;
      return;
    }

    const fallVy = isSnow ? 95 + snowIntensity * 125 : 620 + env.rainIntensity * 280;
    const slantVx = isSnow ? windVx * 0.9 : windVx * 1.45;
    const angle = isSnow ? 0 : Math.atan2(-slantVx, fallVy);
    const winW = bounds.maxX - bounds.minX;
    const winH = bounds.maxY - bounds.minY;

    for (let i = 0; i < (activeCount > 0 ? this.rainDrops.length : 0); i++) {
      const drop = this.rainDrops[i];
      if (i >= activeCount) {
        drop.p.alpha = 0;
        continue;
      }

      const snowSwayX = isSnow ? Math.sin(this.elapsed * 2.4 + i * 0.65) * 32 : 0;
      drop.p.x += (slantVx * drop.speedMul + snowSwayX) * dt;
      drop.p.y += fallVy * drop.speedMul * dt;
      drop.p.rotation = angle;
      if (isSnow) {
        drop.p.scaleX = 2.0 + (i % 3) * 0.45;
        drop.p.scaleY = 0.2 + (i % 2) * 0.08;
        drop.p.tint = i % 3 === 0 ? 0xe0f2fe : 0xffffff;
        drop.p.alpha = 0.62 + snowIntensity * 0.34;
      } else {
        drop.p.scaleX = 1;
        drop.p.scaleY = 0.85 + (i % 4) * 0.14;
        drop.p.tint = 0xffffff;
        drop.p.alpha = 0.35 + env.rainIntensity * 0.45;
      }

      if (drop.p.y > bounds.maxY + 30) {
        if (this.splashes.length < 48 && Math.random() < (isSnow ? 0.16 : 0.32)) {
          this.splashes.push({
            x: bounds.minX + Math.random() * winW,
            y: bounds.minY + Math.random() * winH,
            age: 0,
            duration: isSnow ? 0.45 : 0.24,
          });
        }
        drop.p.y = bounds.minY - 24 - Math.random() * 40;
        drop.p.x = bounds.minX + Math.random() * winW;
      } else if (drop.p.y < bounds.minY - 80) {
        drop.p.y = bounds.maxY + Math.random() * 20;
      }

      if (drop.p.x > bounds.maxX + 60) drop.p.x -= winW + 120;
      else if (drop.p.x < bounds.minX - 60) drop.p.x += winW + 120;
    }

    const sg = this.splashGraphics;
    sg.visible = this.splashes.length > 0;
    sg.clear();
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      s.age += dt;
      if (s.age >= s.duration) {
        this.splashes.splice(i, 1);
        continue;
      }
      const p = s.age / s.duration;
      if (isSnow) {
        sg.circle(s.x, s.y, 2.5 - p * 1.4).fill({
          color: 0xe0f2fe,
          alpha: (1 - p) * 0.55,
        });
      } else {
        sg.ellipse(s.x, s.y, 2 + p * 8, 1 + p * 3.5).stroke({
          width: 1.2,
          color: 0xbae6fd,
          alpha: (1 - p) * 0.58,
        });
      }
    }
  }

  private wrapInWorldWindow(p: Particle, bounds: WorldViewBounds, margin: number): void {
    const minX = bounds.minX - margin;
    const maxX = bounds.maxX + margin;
    const minY = bounds.minY - margin;
    const maxY = bounds.maxY + margin;
    const spanX = maxX - minX;
    const spanY = maxY - minY;

    if (p.x > maxX) {
      p.x = minX + ((p.x - maxX) % spanX);
      if (p.y < minY || p.y > maxY) p.y = minY + Math.random() * spanY;
    } else if (p.x < minX) {
      p.x = maxX - ((minX - p.x) % spanX);
      if (p.y < minY || p.y > maxY) p.y = minY + Math.random() * spanY;
    }

    if (p.y > maxY) {
      p.y = minY + ((p.y - maxY) % spanY);
      if (p.x < minX || p.x > maxX) p.x = minX + Math.random() * spanX;
    } else if (p.y < minY) {
      p.y = maxY - ((minY - p.y) % spanY);
      if (p.x < minX || p.x > maxX) p.x = minX + Math.random() * spanX;
    }
  }
}
