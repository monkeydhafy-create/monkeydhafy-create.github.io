import { Container, Graphics, Sprite, Texture } from "pixi.js";
import type { EnvironmentState } from "./HanoiWeatherService.ts";
import { isBuildingProp, WORLD_HEIGHT, WORLD_WIDTH, type WorldData } from "./types.ts";

interface ColorStop {
  hour: number;
  rgb: [number, number, number];
}

const TIME_COLOR_STOPS: readonly ColorStop[] = [
  { hour: 0.0, rgb: [118, 140, 196] },  // Luminous moonlight blue (readable night)
  { hour: 4.5, rgb: [128, 148, 202] },  // Pre-dawn cool mist
  { hour: 6.0, rgb: [255, 204, 166] },  // Hanoi sunrise apricot
  { hour: 8.0, rgb: [255, 250, 240] },  // Morning crisp sunlight
  { hour: 12.0, rgb: [255, 255, 255] }, // Midday bright daylight
  { hour: 16.0, rgb: [255, 244, 224] }, // Warm afternoon sun
  { hour: 17.6, rgb: [255, 176, 136] }, // Golden sunset amber
  { hour: 18.6, rgb: [198, 152, 204] }, // Twilight purple dusk
  { hour: 19.6, rgb: [122, 144, 198] }, // Early night indigo
  { hour: 24.0, rgb: [118, 140, 196] },
];

interface StaticLight {
  sprite: Sprite;
  x: number;
  y: number;
  baseAlpha: number;
  baseScale: number;
  phase: number;
}

interface CloudShadow {
  sprite: Sprite;
  scaleFactor: number;
}

function createRadialGlowTexture(size = 128): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, "rgba(255, 255, 255, 1)");
  grad.addColorStop(0.28, "rgba(255, 255, 255, 0.68)");
  grad.addColorStop(0.65, "rgba(255, 255, 255, 0.2)");
  grad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(canvas);
}

function createSunbeamTexture(): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "rgba(255, 238, 185, 0.36)");
  grad.addColorStop(0.55, "rgba(255, 232, 170, 0.14)");
  grad.addColorStop(1, "rgba(255, 232, 170, 0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(78, 0);
  ctx.lineTo(178, 0);
  ctx.lineTo(256, 512);
  ctx.lineTo(0, 512);
  ctx.closePath();
  ctx.fill();

  return Texture.from(canvas);
}

/**
 * Manages real-time Hanoi solar color grading (keeping night clearly readable),
 * additive lantern/landmark illumination, angled daytime sunbeams, drifting cloud
 * shadows, fog tint, and storm lightning flashes.
 */
export class AtmosphereSystem {
  public readonly worldLightLayer: Container;
  public readonly cloudShadowLayer: Container;
  public readonly screenOverlayLayer: Container;

  private readonly glowTexture: Texture;
  private readonly beamTexture: Texture;

  private readonly playerLanternLight: Sprite;
  private readonly playerWispLight: Sprite;
  private staticLights: StaticLight[] = [];
  private readonly clouds: CloudShadow[] = [];
  private readonly sunbeams: Sprite[] = [];
  private readonly mistOverlay: Graphics;
  private readonly lightningFlash: Graphics;

  private elapsed = 0;
  private lightningCooldown = 5;
  private lightningAlpha = 0;
  private screenW = 1280;

  constructor(worldData: WorldData) {
    this.glowTexture = createRadialGlowTexture(128);
    this.beamTexture = createSunbeamTexture();

    this.cloudShadowLayer = new Container();
    this.worldLightLayer = new Container();
    this.screenOverlayLayer = new Container();

    // Player lantern + spirit aura (bright, warm, always readable at night)
    this.playerLanternLight = new Sprite(this.glowTexture);
    this.playerLanternLight.anchor.set(0.5);
    this.playerLanternLight.blendMode = "add";
    this.playerLanternLight.tint = 0xffcf7d;
    this.playerLanternLight.scale.set(2.4);

    this.playerWispLight = new Sprite(this.glowTexture);
    this.playerWispLight.anchor.set(0.5);
    this.playerWispLight.blendMode = "add";
    this.playerWispLight.tint = 0x34d399;
    this.playerWispLight.scale.set(1.25);

    this.worldLightLayer.addChild(this.playerLanternLight, this.playerWispLight);

    this.rebuildForWorld(worldData);

    // Soft drifting cloud shadows over open world
    for (let i = 0; i < 14; i++) {
      const cloud = new Sprite(this.glowTexture);
      cloud.anchor.set(0.5);
      cloud.tint = 0x09131c;
      cloud.alpha = 0;
      const scaleFactor = 4.5 + (i % 4) * 1.6;
      cloud.scale.set(scaleFactor);
      cloud.position.set((i * 743) % WORLD_WIDTH, (i * 577) % WORLD_HEIGHT);
      this.cloudShadowLayer.addChild(cloud);
      this.clouds.push({ sprite: cloud, scaleFactor });
    }

    // Screen-space daytime angled sunbeams (God-rays)
    for (let i = 0; i < 4; i++) {
      const beam = new Sprite(this.beamTexture);
      beam.anchor.set(0.5, 0);
      beam.blendMode = "add";
      beam.rotation = -0.28;
      beam.scale.set(1.2 + i * 0.25, 2.2);
      beam.position.set(180 + i * 320, -40);
      beam.alpha = 0;
      this.screenOverlayLayer.addChild(beam);
      this.sunbeams.push(beam);
    }

    this.mistOverlay = new Graphics();
    this.lightningFlash = new Graphics();
    this.screenOverlayLayer.addChild(this.mistOverlay, this.lightningFlash);
  }

  public rebuildForWorld(worldData: WorldData): void {
    for (const old of this.staticLights) {
      old.sprite.removeFromParent();
      old.sprite.destroy();
    }
    this.staticLights = [];

    // Static lights on landmarks & cottages
    for (let i = 0; i < worldData.landmarks.length; i++) {
      const lm = worldData.landmarks[i];
      const glow = new Sprite(this.glowTexture);
      glow.anchor.set(0.5);
      glow.blendMode = "add";
      glow.tint = lm.accentColor;
      glow.position.set(lm.x, lm.y - 24);
      glow.scale.set(2.8);
      this.worldLightLayer.addChild(glow);
      this.staticLights.push({
        sprite: glow,
        x: lm.x,
        y: lm.y - 24,
        baseAlpha: 0.72,
        baseScale: 2.8,
        phase: i * 1.4,
      });
    }

    // Warm streetlamps, park lanterns & architectural porch glow
    for (const prop of worldData.props) {
      const isLamp = prop.kind === "street_lamp" || prop.kind === "park_lantern";
      const isClassic =
        prop.kind === "lodge" ||
        prop.kind === "hut" ||
        prop.kind === "watchtower" ||
        prop.kind === "shrine_ruin";
      const isCityOrRuralBuilding = isBuildingProp(prop.kind);

      if (isLamp || isClassic || isCityOrRuralBuilding) {
        const lantern = new Sprite(this.glowTexture);
        lantern.anchor.set(0.5);
        lantern.blendMode = "add";
        lantern.tint =
          prop.kind === "city_backpack_shop"
            ? 0xfde047
            : prop.kind === "shrine_ruin"
              ? 0x34d399
              : prop.kind === "street_lamp"
                ? 0xfde68a
                : 0xffb347;
        const offsetY = isLamp ? -52 : isCityOrRuralBuilding ? -58 : -38;
        const scale = isLamp ? 1.8 : isCityOrRuralBuilding ? 2.6 : 2.2;
        lantern.position.set(prop.x, prop.y + offsetY);
        lantern.scale.set(scale);
        this.worldLightLayer.addChild(lantern);
        this.staticLights.push({
          sprite: lantern,
          x: prop.x,
          y: prop.y + offsetY,
          baseAlpha: isLamp ? 0.72 : 0.62,
          baseScale: scale,
          phase: prop.id * 0.7,
        });
      }
    }
  }

  public getGlowTexture(): Texture {
    return this.glowTexture;
  }

  public resize(width: number, height: number): void {
    this.screenW = width;

    this.mistOverlay.clear().rect(0, 0, width, height).fill(0x94a3b8);
    this.lightningFlash.clear().rect(0, 0, width, height).fill(0xe0f2fe);

    for (let i = 0; i < this.sunbeams.length; i++) {
      const beam = this.sunbeams[i];
      beam.y = -40;
      beam.height = height * 1.35;
    }
  }

  public update(
    dtSeconds: number,
    env: EnvironmentState,
    playerX: number,
    playerY: number,
    camX: number,
    targetWorldTintContainer: Container,
    viewBounds?: { minX: number; maxX: number; minY: number; maxY: number },
  ): void {
    const dt = Math.min(dtSeconds, 0.05);
    this.elapsed += dt;

    // 1. Apply Hanoi solar + weather color grading to the world
    targetWorldTintContainer.tint = this.computeWorldTint(env);

    // 2. Player & Landmark lights turn on gracefully from dusk through night or heavy storm
    // Soft ambient lantern halo: gently illuminates terrain around hero without washing out character pixels
    const glowActivity = Math.max(env.nightFactor * 0.92, env.rainIntensity * 0.32);
    const lightsActive = glowActivity > 0.005;
    this.worldLightLayer.visible = lightsActive;

    if (lightsActive) {
      this.playerLanternLight.position.set(playerX, playerY - 12);
      this.playerLanternLight.alpha = glowActivity * (0.26 + Math.sin(this.elapsed * 3.1) * 0.03);
      this.playerLanternLight.scale.set(3.2 + env.nightFactor * 0.6);

      this.playerWispLight.position.set(playerX, playerY - 24);
      this.playerWispLight.alpha = 0.08 + glowActivity * 0.14;
      this.playerWispLight.scale.set(1.7);

      const cullMinX = (viewBounds?.minX ?? -Infinity) - 320;
      const cullMaxX = (viewBounds?.maxX ?? Infinity) + 320;
      const cullMinY = (viewBounds?.minY ?? -Infinity) - 320;
      const cullMaxY = (viewBounds?.maxY ?? Infinity) + 320;

      for (const light of this.staticLights) {
        const inView =
          light.x >= cullMinX &&
          light.x <= cullMaxX &&
          light.y >= cullMinY &&
          light.y <= cullMaxY;
        light.sprite.visible = inView;
        if (!inView) continue;

        const flicker = 0.92 + Math.sin(this.elapsed * 3.4 + light.phase) * 0.08;
        light.sprite.alpha = glowActivity * (light.baseAlpha * 0.65) * flicker;
        light.sprite.scale.set(light.baseScale * (0.97 + flicker * 0.04));
      }
    }

    // 3. Drifting cloud shadows along Hanoi wind vector
    const cloudAlpha =
      Math.max(0, (env.cloudCoverPct - 20) / 100) * 0.24 * (1 - env.nightFactor * 0.6);
    this.cloudShadowLayer.visible = cloudAlpha > 0.005;
    if (this.cloudShadowLayer.visible) {
      const windRad = ((env.windDirectionDeg + 180) * Math.PI) / 180;
      const windSpeedPx = 12 + env.windSpeedKmh * 1.9;
      const windVx = Math.sin(windRad) * windSpeedPx;
      const windVy = -Math.cos(windRad) * windSpeedPx;

      for (const c of this.clouds) {
        c.sprite.alpha = cloudAlpha;
        c.sprite.x += windVx * dt;
        c.sprite.y += windVy * dt;
        if (c.sprite.x > WORLD_WIDTH + 300) c.sprite.x = -300;
        if (c.sprite.x < -300) c.sprite.x = WORLD_WIDTH + 300;
        if (c.sprite.y > WORLD_HEIGHT + 300) c.sprite.y = -300;
        if (c.sprite.y < -300) c.sprite.y = WORLD_HEIGHT + 300;
      }
    }

    // 4. Warm daytime Sunbeams (God-rays) with canopy parallax tracking camera X
    const beamStrength = env.sunIntensity * 0.34;
    const beamsActive = beamStrength > 0.005;
    const totalBand = this.screenW + 320;
    for (let i = 0; i < this.sunbeams.length; i++) {
      const beam = this.sunbeams[i];
      beam.visible = beamsActive;
      if (!beamsActive) continue;
      const basePos = ((i + 0.5) / this.sunbeams.length) * totalBand;
      const sway = Math.sin(this.elapsed * 0.35 + i * 1.7) * 28;
      const parallax = basePos - camX * 0.45 + sway;
      beam.x = ((parallax % totalBand) + totalBand) % totalBand - 160;
      beam.alpha = beamStrength * (0.72 + Math.sin(this.elapsed * 0.9 + i * 2.1) * 0.28);
    }

    // 5. Fog & Rain atmospheric haze
    const fogAlpha = env.condition === "fog" ? 0.16 : env.rainIntensity * 0.12;
    this.mistOverlay.visible = fogAlpha > 0.005;
    this.mistOverlay.alpha = fogAlpha;

    // 6. Occasional distant lightning flash during storms
    if (env.condition === "storm") {
      this.lightningCooldown -= dt;
      if (this.lightningCooldown <= 0) {
        this.lightningCooldown = 4.5 + Math.random() * 7;
        this.lightningAlpha = 0.42;
      }
    }
    this.lightningAlpha = Math.max(0, this.lightningAlpha - dt * 1.9);
    this.lightningFlash.visible = this.lightningAlpha > 0.005;
    this.lightningFlash.alpha = this.lightningAlpha;
  }

  private computeWorldTint(env: EnvironmentState): number {
    const h = ((env.fractionalHour % 24) + 24) % 24;

    let r = 255;
    let g = 255;
    let b = 255;

    for (let i = 0; i < TIME_COLOR_STOPS.length - 1; i++) {
      const curr = TIME_COLOR_STOPS[i];
      const next = TIME_COLOR_STOPS[i + 1];
      if (h >= curr.hour && h <= next.hour) {
        const span = Math.max(0.001, next.hour - curr.hour);
        const t = (h - curr.hour) / span;
        r = curr.rgb[0] + (next.rgb[0] - curr.rgb[0]) * t;
        g = curr.rgb[1] + (next.rgb[1] - curr.rgb[1]) * t;
        b = curr.rgb[2] + (next.rgb[2] - curr.rgb[2]) * t;
        break;
      }
    }

    // Slightly desaturate & cool daylight when cloudy/rainy (still vivid & readable)
    const stormDamp = Math.min(0.32, env.rainIntensity * 0.28 + (env.cloudCoverPct / 100) * 0.12);
    if (stormDamp > 0.01) {
      const coolR = 165;
      const coolG = 185;
      const coolB = 205;
      r = r * (1 - stormDamp) + coolR * stormDamp;
      g = g * (1 - stormDamp) + coolG * stormDamp;
      b = b * (1 - stormDamp) + coolB * stormDamp;
    }

    // Soft daylight boost during midday lightning flash
    if (this.lightningAlpha > 0.05) {
      const boost = this.lightningAlpha * 0.8;
      r = Math.min(255, r + (255 - r) * boost);
      g = Math.min(255, g + (255 - g) * boost);
      b = Math.min(255, b + (255 - b) * boost);
    }

    return ((Math.round(r) & 0xff) << 16) | ((Math.round(g) & 0xff) << 8) | (Math.round(b) & 0xff);
  }
}
