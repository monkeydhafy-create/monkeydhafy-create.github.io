import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import type { ArcadeMinigameKind } from "../ui/ArcadeMinigames.ts";
import { Pathfinder } from "./Pathfinder.ts";
import type { WorldAtlas } from "./SpriteAtlas.ts";
import { PIXEL_SCALE, TILE_SIZE, type Point } from "./types.ts";

export const JAIL_COLS = 20;
export const JAIL_ROWS = 14;
export const JAIL_WIDTH = JAIL_COLS * TILE_SIZE; // 960
export const JAIL_HEIGHT = JAIL_ROWS * TILE_SIZE; // 672

export interface JailMinigameStation {
  id: string;
  slotIndex: number;
  kind: ArcadeMinigameKind;
  x: number;
  y: number;
}

interface StationVisual {
  station: JailMinigameStation;
  node: Container;
  ring: Graphics;
  badge: Graphics;
  bangText: Text;
  subText: Text;
}

const STATION_CANDIDATE_TILES: ReadonlyArray<[number, number]> = [
  [2.5, 5.0],
  [5.5, 3.2],
  [12.0, 3.8],
  [14.5, 6.2],
  [17.2, 5.2],
  [16.8, 9.2],
  [12.2, 9.5],
  [7.8, 9.5],
  [4.8, 6.8],
];

const JAIL_GAME_POOL: readonly ArcadeMinigameKind[] = [
  "memory_cards",
  "lockpick",
  "timing_bar",
];

const JAIL_GAME_SHORT: Record<ArcadeMinigameKind, string> = {
  memory_cards: "Lật Thẻ",
  lockpick: "Bẻ Khóa",
  timing_bar: "Thanh Trượt",
};

/**
 * Spacious playable 2.5D Pixel Jail Cell Interior (20x14 tiles = 960x672 px):
 * - Full WASD/Arrow + Tap-to-Move A* pathfinding around prison furniture.
 * - Spawns 3 random interactive "!" Minigame Stations (Memory Cards, Lockpick, Timing Bar);
 *   winning any minigame reduces remaining detention time by 1 minute (-60s), losses have zero penalty.
 */
export class JailRoom {
  public readonly container: Container;
  public readonly entityLayer: Container;
  public readonly pathfinder: Pathfinder;
  public readonly spawnPoint: Point;

  private readonly rippleLayer: Graphics;
  private readonly pathOverlayLayer: Graphics;
  private readonly stationLayer: Container;
  private readonly ripples: Array<{ x: number; y: number; age: number; color: number }> = [];
  private stations: StationVisual[] = [];
  private animElapsed = 0;

  constructor(atlas: WorldAtlas) {
    this.container = new Container();
    this.container.visible = false;

    const collision = new Uint8Array(JAIL_COLS * JAIL_ROWS);

    // Outer walls: top (0..1), sides (0, 19), iron gate + hallway (11..13)
    for (let r = 0; r < JAIL_ROWS; r++) {
      for (let c = 0; c < JAIL_COLS; c++) {
        if (r <= 1 || r >= 11 || c === 0 || c === JAIL_COLS - 1) {
          collision[r * JAIL_COLS + c] = 1;
        }
      }
    }

    // Blocking furniture footprints inside spacious cols 1..18, rows 2..10:
    // 1. Prison bunks (top-left & bottom-left)
    collision[2 * JAIL_COLS + 2] = 1;
    collision[2 * JAIL_COLS + 3] = 1;
    collision[9 * JAIL_COLS + 2] = 1;
    collision[9 * JAIL_COLS + 3] = 1;
    // 2. Central dining table & benches (col 8..10, row 5..6)
    for (let r = 5; r <= 6; r++) {
      for (let c = 8; c <= 10; c++) {
        collision[r * JAIL_COLS + c] = 1;
      }
    }
    // 3. Top bench (col 12, row 2) & lockers (col 16..17, row 2)
    collision[2 * JAIL_COLS + 12] = 1;
    collision[2 * JAIL_COLS + 16] = 1;
    collision[2 * JAIL_COLS + 17] = 1;
    // 4. Side reading desk (col 15..16, row 3)
    collision[3 * JAIL_COLS + 15] = 1;
    collision[3 * JAIL_COLS + 16] = 1;
    // 5. Washbasin corner (col 1, row 10)
    collision[10 * JAIL_COLS + 1] = 1;

    this.pathfinder = new Pathfinder(JAIL_COLS, JAIL_ROWS, TILE_SIZE, collision);
    this.spawnPoint = { x: 5.5 * TILE_SIZE, y: 8.2 * TILE_SIZE };

    const floorLayer = new Container();
    for (let r = 0; r < JAIL_ROWS; r++) {
      for (let c = 0; c < JAIL_COLS; c++) {
        const isHallway = r >= 12;
        const texPool = isHallway ? atlas.tiles.road : atlas.tiles.stone;
        const tex = texPool[(r * 7 + c * 3) % texPool.length];
        const spr = new Sprite(tex);
        spr.roundPixels = false;
        spr.position.set(c * TILE_SIZE - 0.5, r * TILE_SIZE - 0.5);
        spr.width = TILE_SIZE + 1;
        spr.height = TILE_SIZE + 1;
        spr.tint = isHallway ? 0x64748b : 0x94a3b8;
        floorLayer.addChild(spr);
      }
    }

    const decorGfx = new Graphics();

    // Top stone wall + brick lines
    decorGfx
      .rect(0, 0, JAIL_WIDTH, 2 * TILE_SIZE)
      .fill(0x1e293b)
      .rect(0, 2 * TILE_SIZE - 8, JAIL_WIDTH, 8)
      .fill(0x0f172a);
    for (let by = 6; by < 2 * TILE_SIZE - 10; by += 18) {
      decorGfx.rect(TILE_SIZE, by, JAIL_WIDTH - 2 * TILE_SIZE, 2).fill({ color: 0x334155, alpha: 0.65 });
      const offset = by % 36 === 6 ? 0 : 24;
      for (let bx = TILE_SIZE + offset; bx < JAIL_WIDTH - TILE_SIZE; bx += 48) {
        decorGfx.rect(bx, by, 2, 16).fill({ color: 0x334155, alpha: 0.55 });
      }
    }

    // Side walls
    decorGfx
      .rect(0, 0, TILE_SIZE, JAIL_HEIGHT)
      .fill(0x0f172a)
      .rect(JAIL_WIDTH - TILE_SIZE, 0, TILE_SIZE, JAIL_HEIGHT)
      .fill(0x0f172a);

    // 3 barred cell windows + moonlight shafts
    for (const wc of [4, 9.5, 15]) {
      const wx = wc * TILE_SIZE + 6;
      const wy = 18;
      decorGfx
        .rect(wx - 4, wy - 4, 44, 34)
        .fill(0x020617)
        .rect(wx, wy, 36, 26)
        .fill(0x38bdf8, 0.35);
      for (let gx = wx + 8; gx < wx + 34; gx += 9) {
        decorGfx.rect(gx, wy, 3, 26).fill(0x1e293b);
      }
      decorGfx
        .poly([wx, 2 * TILE_SIZE, wx + 36, 2 * TILE_SIZE, wx + 56, 4.6 * TILE_SIZE, wx - 14, 4.6 * TILE_SIZE])
        .fill({ color: 0x7dd3fc, alpha: 0.08 });
    }

    // Spacious center woven rug beneath main table
    decorGfx
      .roundRect(7 * TILE_SIZE + 6, 4.3 * TILE_SIZE, 5 * TILE_SIZE - 12, 3.6 * TILE_SIZE, 12)
      .fill({ color: 0x1e3a5f, alpha: 0.68 })
      .stroke({ width: 3, color: 0x475569, alpha: 0.85 });

    const signText = new Text({
      text: "PHÒNG TẠM GIAM — CÔNG AN PHƯỜNG (CHƠI MINIGAME TẠI ĐIỂM ❗ ĐỂ GIẢM ÁN)",
      style: {
        fontSize: 12,
        fontWeight: "800",
        fill: "#cbd5e1",
        letterSpacing: 0.6,
      },
    });
    signText.anchor.set(0.5, 0.5);
    signText.position.set(JAIL_WIDTH / 2, 12);

    this.pathOverlayLayer = new Graphics();
    this.rippleLayer = new Graphics();
    this.stationLayer = new Container();

    this.entityLayer = new Container();
    this.entityLayer.sortableChildren = true;

    // Furniture inside spacious room
    this.addPrisonBed(3 * TILE_SIZE, 2.75 * TILE_SIZE);
    this.addPrisonBed(3 * TILE_SIZE, 9.75 * TILE_SIZE);
    this.addTableAndChairs(9.5 * TILE_SIZE, 6.6 * TILE_SIZE);
    this.addStudyDesk(16 * TILE_SIZE, 3.8 * TILE_SIZE);

    const bench = new Sprite(atlas.props.bench);
    bench.anchor.set(0.5, 0.9);
    bench.scale.set(PIXEL_SCALE);
    bench.position.set(12.5 * TILE_SIZE, 2.8 * TILE_SIZE);
    bench.zIndex = bench.y;
    this.entityLayer.addChild(bench);

    this.addLockerCabinet(16.6 * TILE_SIZE, 2.82 * TILE_SIZE);
    this.addLockerCabinet(17.4 * TILE_SIZE, 2.82 * TILE_SIZE);
    this.addWashbasin(1.5 * TILE_SIZE, 10.8 * TILE_SIZE);
    this.addIronBarsRow(11 * TILE_SIZE + 28);
    this.addGuardOfficer(atlas, 6.5 * TILE_SIZE, 12.85 * TILE_SIZE, "👮 Trực Giam 1");
    this.addGuardOfficer(atlas, 13.5 * TILE_SIZE, 12.85 * TILE_SIZE, "👮 Trực Giam 2");

    this.container.addChild(
      floorLayer,
      decorGfx,
      signText,
      this.pathOverlayLayer,
      this.rippleLayer,
      this.stationLayer,
      this.entityLayer,
    );

    this.randomizeStations();
  }

  public randomizeStations(): void {
    this.stationLayer.removeChildren();
    this.stations = [];

    const slotIndices = STATION_CANDIDATE_TILES.map((_, idx) => idx);
    for (let i = slotIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slotIndices[i], slotIndices[j]] = [slotIndices[j], slotIndices[i]];
    }
    const chosenSlots = slotIndices.slice(0, 3);
    const games = [...JAIL_GAME_POOL];
    for (let i = games.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [games[i], games[j]] = [games[j], games[i]];
    }

    chosenSlots.forEach((slotIdx, i) => {
      const [col, row] = STATION_CANDIDATE_TILES[slotIdx];
      const st: JailMinigameStation = {
        id: `jail-st-${i}`,
        slotIndex: slotIdx,
        kind: games[i],
        x: col * TILE_SIZE,
        y: row * TILE_SIZE,
      };
      this.stations.push(this.createStationVisual(st));
    });
  }

  public relocateStation(stationId: string): void {
    const entry = this.stations.find((s) => s.station.id === stationId);
    if (!entry) return;

    const usedSlots = new Set(this.stations.map((s) => s.station.slotIndex));
    const freeSlots = STATION_CANDIDATE_TILES.map((_, idx) => idx).filter(
      (idx) => !usedSlots.has(idx),
    );
    const nextSlot =
      freeSlots.length > 0
        ? freeSlots[Math.floor(Math.random() * freeSlots.length)]
        : entry.station.slotIndex;
    const [col, row] = STATION_CANDIDATE_TILES[nextSlot];
    const nextKind = JAIL_GAME_POOL[Math.floor(Math.random() * JAIL_GAME_POOL.length)];

    entry.station.slotIndex = nextSlot;
    entry.station.kind = nextKind;
    entry.station.x = col * TILE_SIZE;
    entry.station.y = row * TILE_SIZE;
    entry.node.position.set(entry.station.x, entry.station.y);
    entry.subText.text = `${JAIL_GAME_SHORT[nextKind]} (-1p)`;
  }

  public getNearbyStation(px: number, py: number, maxDist = 76): JailMinigameStation | null {
    let best: JailMinigameStation | null = null;
    let bestD = maxDist;
    for (const entry of this.stations) {
      const d = Math.hypot(px - entry.station.x, py - entry.station.y);
      if (d < bestD) {
        bestD = d;
        best = entry.station;
      }
    }
    return best;
  }

  public getStationAtPoint(wx: number, wy: number, radius = 38): JailMinigameStation | null {
    return this.getNearbyStation(wx, wy, radius);
  }

  private createStationVisual(st: JailMinigameStation): StationVisual {
    const node = new Container();
    node.position.set(st.x, st.y);

    const ring = new Graphics()
      .ellipse(0, 4, 22, 11)
      .fill({ color: 0xf59e0b, alpha: 0.24 })
      .stroke({ width: 2.5, color: 0xfacc15, alpha: 0.9 });

    const badge = new Graphics()
      .circle(0, -24, 15)
      .fill(0xb91c1c)
      .stroke({ width: 2.5, color: 0xfef08a });

    const bangText = new Text({
      text: "!",
      style: {
        fontSize: 19,
        fontWeight: "900",
        fill: "#fef08a",
      },
    });
    bangText.anchor.set(0.5, 0.5);
    bangText.position.set(0, -24);

    const subText = new Text({
      text: `${JAIL_GAME_SHORT[st.kind]} (-1p)`,
      style: {
        fontSize: 10,
        fontWeight: "800",
        fill: "#fde047",
        stroke: { color: "#020617", width: 3 },
      },
    });
    subText.anchor.set(0.5, 1);
    subText.position.set(0, -43);

    node.addChild(ring, badge, bangText, subText);
    this.stationLayer.addChild(node);

    return { station: st, node, ring, badge, bangText, subText };
  }

  private addPrisonBed(cx: number, bottomY: number): void {
    const c = new Container();
    c.position.set(cx, bottomY);
    c.zIndex = bottomY;
    const g = new Graphics();
    g.roundRect(-42, -32, 84, 30, 4).fill(0x78350f).stroke({ width: 2, color: 0x451a03 });
    g.rect(-40, -6, 6, 8).fill(0x451a03);
    g.rect(34, -6, 6, 8).fill(0x451a03);
    g.roundRect(-38, -29, 76, 22, 3).fill(0xe2e8f0);
    g.roundRect(-34, -26, 20, 14, 3).fill(0xffffff).stroke({ width: 1.5, color: 0xcbd5e1 });
    g.roundRect(-8, -28, 44, 21, 3).fill(0x2563eb).stroke({ width: 1.5, color: 0x1e40af });
    c.addChild(g);
    this.entityLayer.addChild(c);
  }

  private addTableAndChairs(cx: number, bottomY: number): void {
    const c = new Container();
    c.position.set(cx, bottomY);
    c.zIndex = bottomY;
    const g = new Graphics();
    for (const sx of [-62, 46]) {
      g.roundRect(sx, -26, 16, 20, 3).fill(0x92400e).stroke({ width: 2, color: 0x451a03 });
    }
    g.ellipse(0, -2, 60, 14).fill({ color: 0x000000, alpha: 0.28 });
    g.rect(-48, -18, 6, 18).fill(0x451a03);
    g.rect(42, -18, 6, 18).fill(0x451a03);
    g.roundRect(-52, -46, 104, 32, 5).fill(0xb45309).stroke({ width: 2, color: 0x78350f });
    g.roundRect(-47, -42, 94, 22, 3).fill(0xd97706);
    g.rect(-24, -38, 16, 11).fill(0xf8fafc).stroke({ width: 1, color: 0x94a3b8 });
    g.circle(18, -32, 5).fill(0x38bdf8).stroke({ width: 1.5, color: 0x0f172a });
    c.addChild(g);
    this.entityLayer.addChild(c);
  }

  private addStudyDesk(cx: number, bottomY: number): void {
    const c = new Container();
    c.position.set(cx, bottomY);
    c.zIndex = bottomY;
    const g = new Graphics();
    g.roundRect(-36, -30, 72, 24, 4).fill(0x78350f).stroke({ width: 2, color: 0x451a03 });
    g.roundRect(-32, -27, 64, 16, 2).fill(0xb45309);
    g.rect(-14, -24, 18, 10).fill(0xfef08a);
    g.roundRect(-10, -4, 20, 10, 3).fill(0x92400e);
    c.addChild(g);
    this.entityLayer.addChild(c);
  }

  private addLockerCabinet(cx: number, bottomY: number): void {
    const c = new Container();
    c.position.set(cx, bottomY);
    c.zIndex = bottomY;
    const g = new Graphics();
    g.roundRect(-16, -46, 32, 46, 3).fill(0x475569).stroke({ width: 2, color: 0x1e293b });
    g.rect(-12, -41, 24, 16).fill(0x64748b);
    g.rect(-12, -21, 24, 17).fill(0x64748b);
    g.rect(6, -34, 3, 5).fill(0xe2e8f0);
    g.rect(6, -15, 3, 5).fill(0xe2e8f0);
    c.addChild(g);
    this.entityLayer.addChild(c);
  }

  private addWashbasin(cx: number, bottomY: number): void {
    const c = new Container();
    c.position.set(cx, bottomY);
    c.zIndex = bottomY;
    const g = new Graphics();
    g.roundRect(-18, -30, 36, 30, 4).fill(0x334155).stroke({ width: 2, color: 0x0f172a });
    g.roundRect(-13, -26, 26, 14, 4).fill(0xe2e8f0);
    g.roundRect(-9, -23, 18, 9, 3).fill(0x38bdf8, 0.72);
    g.rect(-2, -31, 4, 6).fill(0x94a3b8);
    c.addChild(g);
    this.entityLayer.addChild(c);
  }

  private addIronBarsRow(rowY: number): void {
    const c = new Container();
    c.position.set(0, rowY);
    c.zIndex = rowY;
    const g = new Graphics();
    const startX = TILE_SIZE;
    const endX = JAIL_WIDTH - TILE_SIZE;
    g.rect(startX, -8, endX - startX, 10).fill(0x334155);
    for (let bx = startX + 8; bx < endX; bx += 18) {
      g.rect(bx, -58, 5, 58).fill(0x94a3b8);
      g.rect(bx + 1, -58, 2, 58).fill(0xe2e8f0);
    }
    g.rect(startX, -58, endX - startX, 6).fill(0x475569);
    g.rect(startX, -28, endX - startX, 4).fill(0x475569);
    g.roundRect(JAIL_WIDTH / 2 - 8, -33, 16, 14, 3).fill(0xfbbf24).stroke({ width: 2, color: 0x78350f });
    c.addChild(g);
    this.entityLayer.addChild(c);
  }

  private addGuardOfficer(atlas: WorldAtlas, gx: number, gy: number, title: string): void {
    const c = new Container();
    c.position.set(gx, gy);
    c.zIndex = gy;

    const shadow = new Sprite(atlas.shadow);
    shadow.anchor.set(0.5, 0.5);
    shadow.scale.set(3.2);
    shadow.y = 2;
    shadow.alpha = 0.55;
    c.addChild(shadow);

    const layers: Array<[string, number]> = [
      ["body_male", 0xffffff],
      ["feet_boots", 0x334155],
      ["legs_formal", 0x1e293b],
      ["torso_jacket_navy", 0xdbeafe],
      ["head_male", 0xffffff],
      ["hat_cap", 0x1d4ed8],
    ];
    const spritesByKey: Array<{ key: string; spr: Sprite }> = [];
    for (const [key, tint] of layers) {
      const frames = atlas.lpcLayers[key];
      const spr = new Sprite(frames ? frames.up[0] : Texture.EMPTY);
      spr.anchor.set(0.5, 0.94);
      spr.scale.set(1.16);
      spr.tint = tint;
      c.addChild(spr);
      if (!frames) spritesByKey.push({ key, spr });
    }
    if (spritesByKey.length > 0) {
      void atlas.ensureLpcLayers(spritesByKey.map((item) => item.key)).then(() => {
        if (c.destroyed) return;
        for (const item of spritesByKey) {
          const loaded = atlas.lpcLayers[item.key];
          if (loaded) item.spr.texture = loaded.up[0];
        }
      });
    }

    const label = new Text({
      text: title,
      style: {
        fontSize: 11,
        fontWeight: "800",
        fill: "#93c5fd",
        stroke: { color: "#020617", width: 3 },
      },
    });
    label.anchor.set(0.5, 1);
    label.y = -66;
    c.addChild(label);

    this.entityLayer.addChild(c);
  }

  public addRipple(x: number, y: number, color: number): void {
    this.ripples.push({ x, y, age: 0, color });
  }

  public renderOverlay(dt: number, remainingPath: Point[]): void {
    this.animElapsed += dt;
    this.stations.forEach((entry, idx) => {
      const bob = Math.sin(this.animElapsed * 4.5 + idx * 1.4) * 3.5;
      entry.badge.y = bob;
      entry.bangText.y = -24 + bob;
      entry.subText.y = -43 + bob;
      entry.ring.scale.set(0.95 + Math.sin(this.animElapsed * 3.5 + idx) * 0.08);
    });

    const p = this.pathOverlayLayer;
    p.clear();
    if (remainingPath.length > 0) {
      for (let i = 0; i < remainingPath.length; i++) {
        const pt = remainingPath[i];
        p.circle(pt.x, pt.y, i === remainingPath.length - 1 ? 5 : 2.5).fill({
          color: 0x38bdf8,
          alpha: i === remainingPath.length - 1 ? 0.85 : 0.4,
        });
      }
    }

    const r = this.rippleLayer;
    r.clear();
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rp = this.ripples[i];
      rp.age += dt;
      if (rp.age >= 0.45) {
        this.ripples.splice(i, 1);
        continue;
      }
      const prog = rp.age / 0.45;
      r.circle(rp.x, rp.y, 4 + prog * 18).stroke({
        width: 2,
        color: rp.color,
        alpha: (1 - prog) * 0.85,
      });
    }
  }

  public syncCameraTransform(
    viewW: number,
    viewH: number,
    playerX: number,
    playerY: number,
    resolution = 1,
  ): void {
    const res = Math.max(1, resolution);
    const fitScale = Math.min(viewW / (JAIL_WIDTH + 20), viewH / (JAIL_HEIGHT + 44));
    const rawScale = Math.max(0.65, Math.min(1.25, fitScale));
    const tilePhysPx = Math.max(16, Math.round(rawScale * TILE_SIZE * res));
    const scale = tilePhysPx / (TILE_SIZE * res);
    this.container.scale.set(scale);

    const renderedW = JAIL_WIDTH * scale;
    const renderedH = JAIL_HEIGHT * scale;

    const rawPosX =
      renderedW <= viewW
        ? (viewW - renderedW) / 2
        : Math.max(viewW - renderedW, Math.min(0, viewW / 2 - playerX * scale));
    const rawPosY =
      renderedH <= viewH
        ? (viewH - renderedH) / 2
        : Math.max(viewH - renderedH, Math.min(0, viewH / 2 - playerY * scale));

    const posX = Math.round(rawPosX * res) / res;
    const posY = Math.round(rawPosY * res) / res;
    this.container.position.set(posX, posY);
  }
}
