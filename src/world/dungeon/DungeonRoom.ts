import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { Pathfinder } from "../Pathfinder.ts";
import type { Player } from "../Player.ts";
import type { WorldAtlas } from "../SpriteAtlas.ts";
import { PIXEL_SCALE, TILE_SIZE, type Point } from "../types.ts";
import type {
  DungeonChestNode,
  DungeonMazeScareNode,
  DungeonPortalNode,
  DungeonRoomLayout,
  DungeonStationNode,
} from "./DungeonTypes.ts";

export type DungeonInteractable =
  | { type: "portal"; portal: DungeonPortalNode }
  | { type: "station"; station: DungeonStationNode }
  | { type: "chest"; chest: DungeonChestNode };

interface PortalVisual {
  portal: DungeonPortalNode;
  node: Container;
  ring: Graphics;
  label: Text;
}

interface StationVisual {
  station: DungeonStationNode;
  node: Container;
  ring: Graphics;
  badge: Graphics;
  bangText: Text;
  subText: Text;
}

interface ChestVisual {
  chest: DungeonChestNode;
  node: Container;
  sprite: Sprite;
  aura: Graphics;
  lockTag: Text;
}

const FOG_HALF_PX = 296; // ~6.1 tiles visible forward cone radius on both PC and Mobile at 50% zoom

function createMazeFogCutoutTexture(): Texture {
  const size = FOG_HALF_PX * 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const half = size / 2;

  ctx.fillStyle = "rgba(2, 6, 23, 0.99)";
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = "destination-out";

  // 210-degree forward vision sector centered on +X (rotation = lookAngle)
  const mainHalfRad = (98 * Math.PI) / 180;
  const featherOuterRad = (105 * Math.PI) / 180;

  const grad = ctx.createRadialGradient(half, half, TILE_SIZE * 2.7, half, half, FOG_HALF_PX - 4);
  grad.addColorStop(0, "rgba(255, 255, 255, 1)");
  grad.addColorStop(0.55, "rgba(255, 255, 255, 0.72)");
  grad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(half, half);
  ctx.arc(half, half, FOG_HALF_PX - 4, -mainHalfRad, mainHalfRad);
  ctx.closePath();
  ctx.fill();

  // Soft penumbra wings completing full 210 deg (-105..+105 deg)
  const edgeGrad = ctx.createRadialGradient(half, half, TILE_SIZE * 2.0, half, half, FOG_HALF_PX - 12);
  edgeGrad.addColorStop(0, "rgba(255, 255, 255, 0.5)");
  edgeGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = edgeGrad;
  for (const [a0, a1] of [
    [-featherOuterRad, -mainHalfRad],
    [mainHalfRad, featherOuterRad],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(half, half);
    ctx.arc(half, half, FOG_HALF_PX - 12, a0, a1);
    ctx.closePath();
    ctx.fill();
  }

  // Tight personal circle around player feet/head so sprite stays visible while turning
  const selfGrad = ctx.createRadialGradient(half, half, 14, half, half, 34);
  selfGrad.addColorStop(0, "rgba(255, 255, 255, 0.96)");
  selfGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = selfGrad;
  ctx.beginPath();
  ctx.arc(half, half, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = "source-over";
  return Texture.from(canvas);
}

function createTorchGlowTexture(): Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, "rgba(255, 224, 150, 0.85)");
  grad.addColorStop(0.45, "rgba(245, 158, 11, 0.28)");
  grad.addColorStop(1, "rgba(245, 158, 11, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(canvas);
}

/**
 * Instanced 2.5D Hanoi Dungeon Interior Scene (`hub` + 4 rooms):
 * - Mirrors `JailRoom` architecture cleanly with full WASD + Tap-to-Move A* pathfinding.
 * - Dynamically mounts room geometry, Lão Cai Hầm NPC, Conveyor machine, locked/unlocked chests,
 *   and enforces identical close-up zoom + circular lantern fog-of-war on both PC and Mobile inside `room_maze`.
 */
export class DungeonRoom {
  public readonly container: Container;
  public readonly entityLayer: Container;
  public pathfinder!: Pathfinder;

  private readonly atlas: WorldAtlas;
  private readonly roomContent: Container;
  private readonly pathOverlayLayer: Graphics;
  private readonly rippleLayer: Graphics;
  private readonly torchLightLayer: Container;
  private readonly mazeFogNode: Container;

  private readonly torchGlowTex: Texture;
  private readonly fogCutoutTex: Texture;

  private currentRoom: DungeonRoomLayout | null = null;
  private portalVisuals: PortalVisual[] = [];
  private stationVisual: StationVisual | null = null;
  private chestVisuals: ChestVisual[] = [];
  private scareVisuals: Array<{ scare: DungeonMazeScareNode; node: Graphics }> = [];
  private torchGlows: Array<{ sprite: Sprite; baseScale: number; phase: number }> = [];
  private readonly ripples: Array<{ x: number; y: number; age: number; color: number }> = [];
  private currentLookAngle = 0;
  private animElapsed = 0;

  constructor(atlas: WorldAtlas) {
    this.atlas = atlas;
    this.container = new Container();
    this.container.visible = false;

    this.torchGlowTex = createTorchGlowTexture();
    this.fogCutoutTex = createMazeFogCutoutTexture();

    this.roomContent = new Container();
    this.pathOverlayLayer = new Graphics();
    this.rippleLayer = new Graphics();
    this.entityLayer = new Container();
    this.entityLayer.sortableChildren = true;
    this.torchLightLayer = new Container();

    this.mazeFogNode = new Container();
    this.mazeFogNode.visible = false;
    const fogHole = new Sprite(this.fogCutoutTex);
    fogHole.anchor.set(0.5);
    const fogWalls = new Graphics();
    const span = 3200;
    const side = span - FOG_HALF_PX;
    fogWalls
      .rect(-span, -span, span * 2, side)
      .fill({ color: 0x020617, alpha: 0.99 })
      .rect(-span, FOG_HALF_PX, span * 2, side)
      .fill({ color: 0x020617, alpha: 0.99 })
      .rect(-span, -FOG_HALF_PX, side, FOG_HALF_PX * 2)
      .fill({ color: 0x020617, alpha: 0.99 })
      .rect(FOG_HALF_PX, -FOG_HALF_PX, side, FOG_HALF_PX * 2)
      .fill({ color: 0x020617, alpha: 0.99 });
    this.mazeFogNode.addChild(fogWalls, fogHole);

    this.container.addChild(
      this.roomContent,
      this.pathOverlayLayer,
      this.rippleLayer,
      this.entityLayer,
      this.torchLightLayer,
      this.mazeFogNode,
    );
  }

  public getCurrentRoom(): DungeonRoomLayout | null {
    return this.currentRoom;
  }

  public loadRoom(room: DungeonRoomLayout, player: Player): void {
    this.disposeCurrentRoom(player);
    this.currentRoom = room;
    this.pathfinder = new Pathfinder(room.cols, room.rows, TILE_SIZE, room.collision);
    this.ripples.length = 0;

    const { cols, rows, collision } = room;
    const roomW = cols * TILE_SIZE;
    const roomH = rows * TILE_SIZE;

    // 1. Floor underlay + tiled sprites (overlapped by 0.5px with roundPixels disabled to prevent 1px seams)
    const floorUnderlay = new Graphics().rect(0, 0, roomW, roomH).fill(0x52616b);
    floorUnderlay.tint = room.floorTint;
    floorUnderlay.roundPixels = false;

    const floorLayer = new Container();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isWall = collision[r * cols + c] === 1;
        if (isWall && room.isMaze) {
          continue;
        }
        const texPool = this.atlas.tiles.stone;
        const tex = texPool[(r * 7 + c * 5) % texPool.length];
        const spr = new Sprite(tex);
        spr.roundPixels = false;
        spr.position.set(c * TILE_SIZE - 0.5, r * TILE_SIZE - 0.5);
        spr.width = TILE_SIZE + 1;
        spr.height = TILE_SIZE + 1;
        spr.tint = room.floorTint;
        floorLayer.addChild(spr);
      }
    }
    this.roomContent.addChild(floorUnderlay, floorLayer);

    // 2. Walls & room architectural accents
    const decorGfx = new Graphics();
    decorGfx.roundPixels = false;
    decorGfx.rect(0, 0, roomW, roomH).stroke({ width: 4, color: 0x020617 });

    if (room.isMaze) {
      // Draw crisp 2.5D stone maze wall blocks
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (collision[r * cols + c] !== 1) continue;
          const x = c * TILE_SIZE;
          const y = r * TILE_SIZE;
          decorGfx.rect(x, y, TILE_SIZE, TILE_SIZE).fill(0x0f172a);
          decorGfx.rect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 10).fill(0x1e293b);
          decorGfx.rect(x + 2, y + TILE_SIZE - 8, TILE_SIZE - 4, 6).fill(0x020617);
        }
      }
    } else {
      // Top imperial stone brick wall + side walls
      decorGfx
        .rect(0, 0, roomW, 2 * TILE_SIZE)
        .fill(room.wallColor)
        .rect(0, 2 * TILE_SIZE - 8, roomW, 8)
        .fill(0x090d16);
      for (let by = 8; by < 2 * TILE_SIZE - 10; by += 18) {
        decorGfx.rect(TILE_SIZE, by, roomW - 2 * TILE_SIZE, 2).fill({ color: 0x475569, alpha: 0.48 });
      }
      decorGfx
        .rect(0, 0, TILE_SIZE, roomH)
        .fill(0x0f172a)
        .rect(roomW - TILE_SIZE, 0, TILE_SIZE, roomH)
        .fill(0x0f172a)
        .rect(0, roomH - TILE_SIZE, roomW, TILE_SIZE)
        .fill(0x0f172a);

      // Decorative stone obstacle blocks inside non-maze rooms
      for (let r = 2; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
          if (collision[r * cols + c] !== 1) continue;
          if (room.id === "room_beans" && (c === 9 || c === 10) && r === 5) continue;
          if (room.id === "room_sort" && r === 4 && c >= 8 && c <= 11) continue;
          const px = (c + 0.5) * TILE_SIZE;
          const py = (r + 0.85) * TILE_SIZE;
          const pillar = new Sprite(this.atlas.props.ruin_pillar);
          pillar.anchor.set(0.5, 0.9);
          pillar.scale.set(PIXEL_SCALE * 0.9);
          pillar.position.set(px, py);
          pillar.zIndex = py;
          this.entityLayer.addChild(pillar);
        }
      }
    }

    // Room-specific thematic dressings
    if (room.id === "hub") {
      decorGfx
        .roundRect(8 * TILE_SIZE, 5.2 * TILE_SIZE, 6 * TILE_SIZE, 5 * TILE_SIZE, 14)
        .fill({ color: 0x7f1d1d, alpha: 0.45 })
        .stroke({ width: 3, color: 0xf59e0b, alpha: 0.65 });
    } else if (room.id === "room_sort") {
      // Conveyor belt visual prop at rows 4..5
      decorGfx
        .roundRect(7.8 * TILE_SIZE, 4.1 * TILE_SIZE, 4.4 * TILE_SIZE, 0.9 * TILE_SIZE, 8)
        .fill(0x334155)
        .stroke({ width: 2.5, color: 0xf59e0b });
      for (let gx = 8.2 * TILE_SIZE; gx < 11.8 * TILE_SIZE; gx += 22) {
        decorGfx.circle(gx, 4.55 * TILE_SIZE, 4).fill(0xfbbf24);
      }
    } else if (room.id === "room_beans") {
      this.addBossTeaTableAndNpc(10 * TILE_SIZE, 5.8 * TILE_SIZE);
    }

    const titleText = new Text({
      text: room.title.toUpperCase(),
      style: {
        fontSize: 12,
        fontWeight: "800",
        fill: "#fde68a",
        stroke: { color: "#020617", width: 3 },
        letterSpacing: 0.5,
      },
    });
    titleText.anchor.set(0.5, 0.5);
    titleText.position.set(roomW / 2, 16);

    this.roomContent.addChild(decorGfx, titleText);

    // 3. Portals
    for (const portal of room.portals) {
      const pv = this.createPortalVisual(portal);
      this.portalVisuals.push(pv);
      this.roomContent.addChild(pv.node);
    }

    // 4. Station (if any)
    if (room.station) {
      this.stationVisual = this.createStationVisual(room.station);
      this.roomContent.addChild(this.stationVisual.node);
    }

    // 5. Chests
    for (const ch of room.chests) {
      const cv = this.createChestVisual(ch);
      this.chestVisuals.push(cv);
      this.entityLayer.addChild(cv.node);
    }

    // 6. Warm flickering torches
    room.torches.forEach((pt, idx) => {
      const glow = new Sprite(this.torchGlowTex);
      glow.anchor.set(0.5);
      glow.blendMode = "add";
      glow.position.set(pt.x, pt.y);
      const baseScale = room.isMaze ? 1.45 : 2.1;
      glow.scale.set(baseScale);
      glow.alpha = 0.72;
      this.torchLightLayer.addChild(glow);
      this.torchGlows.push({ sprite: glow, baseScale, phase: idx * 1.3 });
    });

    // 7. Ambient mist markers for untriggered maze scares & 210° fog-of-war strictly in maze
    for (const sc of room.scares ?? []) {
      if (sc.triggered) continue;
      const mist = new Graphics()
        .circle(0, 0, 20)
        .fill({ color: 0x4c1d95, alpha: 0.18 })
        .circle(0, 0, 8)
        .fill({ color: 0xef4444, alpha: 0.22 });
      mist.position.set(sc.x, sc.y);
      this.roomContent.addChild(mist);
      this.scareVisuals.push({ scare: sc, node: mist });
    }
    this.mazeFogNode.visible = room.isMaze;

    // 8. Place player inside entityLayer
    this.entityLayer.addChild(player);
    player.clearPath();
    player.setManualDirection(0, 0);
    player.position.set(room.spawn.x, room.spawn.y);
    player.zIndex = room.spawn.y;
    if (room.isMaze && room.portals.length > 0) {
      const dx = room.spawn.x - room.portals[0].x;
      const dy = room.spawn.y - room.portals[0].y;
      if (Math.abs(dx) >= Math.abs(dy)) {
        player.setFacing(dx >= 0 ? "right" : "left");
        this.currentLookAngle = dx >= 0 ? 0 : Math.PI;
      } else {
        player.setFacing(dy >= 0 ? "down" : "up");
        this.currentLookAngle = dy >= 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    } else {
      player.setFacing("up");
      this.currentLookAngle = -Math.PI / 2;
    }
    this.mazeFogNode.rotation = this.currentLookAngle;

    this.refreshRoomObjects(room);
  }

  public disposeCurrentRoom(player?: Player): void {
    if (player && player.parent === this.entityLayer) {
      this.entityLayer.removeChild(player);
    }
    for (const child of this.roomContent.removeChildren()) {
      child.destroy({ children: true });
    }
    for (const child of this.entityLayer.removeChildren()) {
      child.destroy({ children: true });
    }
    for (const child of this.torchLightLayer.removeChildren()) {
      child.destroy({ children: true });
    }
    this.portalVisuals = [];
    this.stationVisual = null;
    this.chestVisuals = [];
    this.scareVisuals = [];
    this.torchGlows = [];
    this.currentRoom = null;
  }

  public refreshRoomObjects(room: DungeonRoomLayout): void {
    if (this.stationVisual && room.station) {
      this.stationVisual.node.visible = !room.station.cleared && !room.station.attempted;
    }
    for (const pv of this.portalVisuals) {
      const sealed = Boolean(
        pv.portal.requiresStationClear && room.station && !room.station.cleared && !room.station.attempted,
      );
      pv.node.visible = !sealed;
    }
    for (const cv of this.chestVisuals) {
      cv.node.visible = cv.chest.revealedInRoom;
      cv.sprite.texture = cv.chest.opened ? this.atlas.chestOpen : this.atlas.chestClosed;
      cv.aura.visible = cv.chest.revealedInRoom && !cv.chest.opened;
      cv.lockTag.visible = cv.chest.revealedInRoom && cv.chest.locked && !cv.chest.opened;
    }
  }

  private addBossTeaTableAndNpc(cx: number, bottomY: number): void {
    // Tea Table
    const table = new Container();
    table.position.set(cx, bottomY);
    table.zIndex = bottomY;
    const g = new Graphics();
    g.ellipse(0, 0, 52, 14).fill({ color: 0x000000, alpha: 0.35 });
    g.roundRect(-48, -36, 96, 30, 5).fill(0x78350f).stroke({ width: 2, color: 0x451a03 });
    g.roundRect(-43, -32, 86, 20, 3).fill(0xb45309);
    // Plate of roasted peanuts & iced tea glass
    g.ellipse(-10, -23, 14, 7).fill(0xfef3c7).stroke({ width: 1.5, color: 0x92400e });
    g.circle(-13, -24, 3).fill(0xd97706);
    g.circle(-8, -22, 3).fill(0xb45309);
    g.circle(-6, -25, 2.5).fill(0xf59e0b);
    g.roundRect(18, -29, 10, 12, 2).fill(0x38bdf8, 0.85).stroke({ width: 1.5, color: 0xe0f2fe });
    table.addChild(g);
    this.entityLayer.addChild(table);

    // Quan Lớn NPC behind table reading newspaper
    const boss = new Container();
    boss.position.set(cx, bottomY - 24);
    boss.zIndex = bottomY - 24;
    const layers: Array<[string, number]> = [
      ["body_male", 0xffffff],
      ["legs_formal", 0x1e293b],
      ["torso_trench", 0x78350f],
      ["head_male", 0xffffff],
      ["hat_bowler", 0x334155],
    ];
    for (const [key, tint] of layers) {
      const frames = this.atlas.lpcLayers[key];
      if (!frames) continue;
      const spr = new Sprite(frames.down[0]);
      spr.anchor.set(0.5, 0.94);
      spr.scale.set(1.16);
      spr.tint = tint;
      boss.addChild(spr);
    }
    const paper = new Graphics();
    paper
      .roundRect(-17, -44, 34, 22, 3)
      .fill(0xfef3c7)
      .stroke({ width: 1.5, color: 0x78350f });
    paper.rect(-12, -38, 24, 2).fill(0x475569).rect(-12, -33, 18, 2).fill(0x475569);
    boss.addChild(paper);

    const lbl = new Text({
      text: "👑 Quan Lớn",
      style: {
        fontSize: 11,
        fontWeight: "800",
        fill: "#fde047",
        stroke: { color: "#020617", width: 3 },
      },
    });
    lbl.anchor.set(0.5, 1);
    lbl.y = -68;
    boss.addChild(lbl);
    this.entityLayer.addChild(boss);
  }

  private createPortalVisual(portal: DungeonPortalNode): PortalVisual {
    const node = new Container();
    node.position.set(portal.x, portal.y);

    const arch = new Graphics()
      .roundRect(-13, -29, 26, 32, 3)
      .fill({ color: portal.color, alpha: 0.34 })
      .rect(-20, -32, 7, 35)
      .fill(0x334155)
      .stroke({ width: 1.5, color: 0x0f172a })
      .rect(13, -32, 7, 35)
      .fill(0x334155)
      .stroke({ width: 1.5, color: 0x0f172a })
      .roundRect(-23, -39, 46, 9, 3)
      .fill(0x475569)
      .stroke({ width: 1.8, color: portal.color, alpha: 0.95 });

    const ring = new Graphics()
      .ellipse(0, 4, 26, 13)
      .fill({ color: portal.color, alpha: 0.28 })
      .stroke({ width: 2.5, color: portal.color, alpha: 0.95 });

    const label = new Text({
      text: portal.shortTag,
      style: {
        fontSize: 11,
        fontWeight: "800",
        fill: "#f8fafc",
        stroke: { color: "#020617", width: 3.5 },
      },
    });
    label.anchor.set(0.5, 0.5);
    label.position.set(0, -50);

    const badgeW = Math.max(58, label.width + 14);
    const badge = new Graphics()
      .roundRect(-badgeW / 2, -60, badgeW, 20, 6)
      .fill({ color: 0x020617, alpha: 0.88 })
      .stroke({ width: 1.5, color: portal.color, alpha: 0.95 });

    node.addChild(arch, ring, badge, label);
    return { portal, node, ring, label };
  }

  private createStationVisual(station: DungeonStationNode): StationVisual {
    const node = new Container();
    node.position.set(station.x, station.y);

    const ring = new Graphics()
      .ellipse(0, 4, 24, 12)
      .fill({ color: 0xf59e0b, alpha: 0.25 })
      .stroke({ width: 2.5, color: 0xfacc15, alpha: 0.95 });

    const badge = new Graphics()
      .circle(0, -24, 15)
      .fill(0xb91c1c)
      .stroke({ width: 2.5, color: 0xfef08a });

    const bangText = new Text({
      text: "!",
      style: { fontSize: 19, fontWeight: "900", fill: "#fef08a" },
    });
    bangText.anchor.set(0.5, 0.5);
    bangText.position.set(0, -24);

    const subText = new Text({
      text: station.kind === "coin_sort" ? "🪙 SÀNG LỌC XU" : "🥜 ĂN TRỘM LẠC",
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
    return { station, node, ring, badge, bangText, subText };
  }

  private createChestVisual(chest: DungeonChestNode): ChestVisual {
    const node = new Container();
    node.position.set(chest.x, chest.y);
    node.zIndex = chest.y;

    const aura = new Graphics()
      .ellipse(0, -4, 24, 11)
      .fill({ color: chest.royal ? 0xef4444 : 0xf59e0b, alpha: 0.28 })
      .stroke({ width: 2, color: chest.royal ? 0xfbbf24 : 0x38bdf8, alpha: 0.85 });

    const spr = new Sprite(chest.opened ? this.atlas.chestOpen : this.atlas.chestClosed);
    spr.anchor.set(0.5, 0.88);
    spr.scale.set(PIXEL_SCALE * 0.92);
    if (chest.royal) {
      spr.tint = 0xfef08a;
    }

    const lockTag = new Text({
      text: "🔒",
      style: { fontSize: 15, stroke: { color: "#020617", width: 3 } },
    });
    lockTag.anchor.set(0.5, 1);
    lockTag.position.set(0, -34);

    node.addChild(aura, spr, lockTag);
    return { chest, node, sprite: spr, aura, lockTag };
  }

  public getNearbyInteractable(px: number, py: number): DungeonInteractable | null {
    const room = this.currentRoom;
    if (!room) return null;

    if (room.station && !room.station.cleared && !room.station.attempted) {
      if (Math.hypot(px - room.station.x, py - room.station.y) <= 78) {
        return { type: "station", station: room.station };
      }
    }

    let bestChest: DungeonChestNode | null = null;
    let bestChestD = 72;
    for (const ch of room.chests) {
      if (!ch.revealedInRoom) continue;
      const d = Math.hypot(px - ch.x, py - ch.y);
      if (d < bestChestD) {
        bestChestD = d;
        bestChest = ch;
      }
    }
    if (bestChest) {
      return { type: "chest", chest: bestChest };
    }

    let bestPortal: DungeonPortalNode | null = null;
    let bestPortalD = 72;
    for (const portal of room.portals) {
      if (portal.requiresStationClear && room.station && !room.station.cleared && !room.station.attempted) continue;
      const d = Math.hypot(px - portal.x, py - portal.y);
      if (d < bestPortalD) {
        bestPortalD = d;
        bestPortal = portal;
      }
    }
    if (bestPortal) {
      return { type: "portal", portal: bestPortal };
    }

    return null;
  }

  public getInteractableAtPoint(wx: number, wy: number): DungeonInteractable | null {
    const room = this.currentRoom;
    if (!room) return null;

    if (room.station && !room.station.cleared && !room.station.attempted && Math.hypot(wx - room.station.x, wy - room.station.y) <= 44) {
      return { type: "station", station: room.station };
    }
    for (const ch of room.chests) {
      if (!ch.revealedInRoom) continue;
      if (Math.hypot(wx - ch.x, wy - (ch.y - 12)) <= 36) {
        return { type: "chest", chest: ch };
      }
    }
    for (const portal of room.portals) {
      if (portal.requiresStationClear && room.station && !room.station.cleared && !room.station.attempted) continue;
      if (Math.hypot(wx - portal.x, wy - portal.y) <= 42) {
        return { type: "portal", portal };
      }
    }
    return null;
  }

  private hasLineOfSight(room: DungeonRoomLayout, x0: number, y0: number, x1: number, y1: number): boolean {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(4, Math.ceil(dist / 20));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const sx = x0 + (x1 - x0) * t;
      const sy = y0 + (y1 - y0) * t;
      const c = Math.floor(sx / TILE_SIZE);
      const r = Math.floor(sy / TILE_SIZE);
      if (c < 0 || r < 0 || c >= room.cols || r >= room.rows) return false;
      if (room.collision[r * room.cols + c] === 1) return false;
    }
    return true;
  }

  public checkAndTriggerMazeScare(px: number, py: number): DungeonMazeScareNode | null {
    const room = this.currentRoom;
    if (!room || !room.isMaze || !room.scares) return null;
    for (const scare of room.scares) {
      if (scare.triggered) continue;
      const dist = Math.hypot(px - scare.x, py - scare.y);
      if (dist <= 132 && this.hasLineOfSight(room, px, py, scare.x, scare.y)) {
        scare.triggered = true;
        const visIdx = this.scareVisuals.findIndex((sv) => sv.scare.id === scare.id);
        if (visIdx >= 0) {
          const [vis] = this.scareVisuals.splice(visIdx, 1);
          vis.node.destroy();
        }
        this.addRipple(scare.x, scare.y, 0xef4444);
        this.addRipple(scare.x, scare.y, 0xf97316);
        return scare;
      }
    }
    return null;
  }

  public addRipple(x: number, y: number, color: number): void {
    this.ripples.push({ x, y, age: 0, color });
  }

  public renderOverlay(
    dt: number,
    remainingPath: Point[],
    playerX: number,
    playerY: number,
    lookAngle?: number,
  ): void {
    this.animElapsed += dt;

    if (this.currentRoom?.isMaze) {
      if (lookAngle !== undefined) {
        const diff = Math.atan2(
          Math.sin(lookAngle - this.currentLookAngle),
          Math.cos(lookAngle - this.currentLookAngle),
        );
        this.currentLookAngle += diff * Math.min(1, dt * 14);
      }
      this.mazeFogNode.position.set(playerX, playerY);
      this.mazeFogNode.rotation = this.currentLookAngle;
    }

    if (this.stationVisual && this.stationVisual.node.visible) {
      const bob = Math.sin(this.animElapsed * 4.5) * 3.5;
      this.stationVisual.badge.y = bob;
      this.stationVisual.bangText.y = -24 + bob;
      this.stationVisual.subText.y = -43 + bob;
      this.stationVisual.ring.scale.set(0.95 + Math.sin(this.animElapsed * 3.5) * 0.08);
    }

    this.portalVisuals.forEach((pv, idx) => {
      pv.ring.scale.set(0.96 + Math.sin(this.animElapsed * 3.2 + idx) * 0.07);
    });

    for (const cv of this.chestVisuals) {
      if (!cv.aura.visible) continue;
      cv.aura.alpha = 0.55 + Math.sin(this.animElapsed * 4) * 0.28;
    }

    for (const tg of this.torchGlows) {
      const s = tg.baseScale * (0.94 + Math.sin(this.animElapsed * 7.2 + tg.phase) * 0.07);
      tg.sprite.scale.set(s);
    }

    const p = this.pathOverlayLayer;
    p.clear();
    if (!this.currentRoom?.isMaze && remainingPath.length > 0) {
      for (let i = 0; i < remainingPath.length; i++) {
        const pt = remainingPath[i];
        p.circle(pt.x, pt.y, i === remainingPath.length - 1 ? 5 : 2.5).fill({
          color: 0xfbbf24,
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
    const room = this.currentRoom;
    if (!room) return;
    const roomW = room.cols * TILE_SIZE;
    const roomH = room.rows * TILE_SIZE;
    const res = Math.max(1, resolution);

    const rawScale = room.isMaze
      ? Math.max(0.775, Math.max(viewW, viewH) / (19 * TILE_SIZE))
      : Math.max(0.62, Math.min(1.25, Math.min(viewW / (roomW + 20), viewH / (roomH + 44))));

    // Quantize scale so each 48px tile spans an exact integer number of physical pixels (eliminates seams/jitter)
    const tilePhysPx = Math.max(16, Math.round(rawScale * TILE_SIZE * res));
    const scale = tilePhysPx / (TILE_SIZE * res);
    this.container.scale.set(scale);

    const renderedW = roomW * scale;
    const renderedH = roomH * scale;
    const isCompactViewport = viewW < 640;
    const topPad = room.isMaze ? (isCompactViewport ? 164 : 86) : 0;
    const bottomPad = room.isMaze ? (isCompactViewport ? 140 : 84) : 0;
    const sidePad = room.isMaze ? (isCompactViewport ? 20 : 32) : 0;
    const playableW = Math.max(120, viewW - sidePad * 2);
    const playableH = Math.max(120, viewH - topPad - bottomPad);
    const safeCenterY = topPad + playableH / 2;

    const rawPosX =
      renderedW <= playableW
        ? (viewW - renderedW) / 2
        : Math.max(viewW - sidePad - renderedW, Math.min(sidePad, viewW / 2 - playerX * scale));
    const rawPosY =
      renderedH <= playableH
        ? topPad + (playableH - renderedH) / 2
        : Math.max(viewH - bottomPad - renderedH, Math.min(topPad, safeCenterY - playerY * scale));

    const posX = Math.round(rawPosX * res) / res;
    const posY = Math.round(rawPosY * res) / res;
    this.container.position.set(posX, posY);
  }
}
