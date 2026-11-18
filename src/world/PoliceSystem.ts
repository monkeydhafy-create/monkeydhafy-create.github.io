import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import type { WorldAtlas } from "./SpriteAtlas.ts";
import {
  BUILDING_META,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  isBuildingProp,
  type BiomeId,
  type FacingDir,
  type Point,
  type SecurityZone,
  type WorldData,
} from "./types.ts";

export interface ZoneWaypoint {
  x: number;
  y: number;
  nearLoot: boolean;
  onRoad: boolean;
  roadAxis: "h" | "v" | "cross" | "off";
}

export const POLICE_ROAD_PATROL_PREFERENCE = 0.82;

export function collectPoliceZoneWaypoints(world: WorldData): Record<"yellow" | "red", ZoneWaypoint[]> {
  const out: Record<"yellow" | "red", ZoneWaypoint[]> = { yellow: [], red: [] };
  const { cols, rows, tiles, collision, securityZones, props, chests } = world;
  const lootSpots: Point[] = [];
  for (const p of props) {
    if (!isBuildingProp(p.kind)) continue;
    const tier = BUILDING_META[p.kind].tier;
    if (tier === "standard" || tier === "landmark") {
      lootSpots.push({ x: p.x, y: p.y });
    }
  }
  for (const ch of chests) {
    if (ch.kind !== "trash") {
      lootSpots.push({ x: ch.x, y: ch.y });
    }
  }

  const isRoadTile = (c: number, r: number): boolean => {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return false;
    const t = tiles[r * cols + c];
    return t === "road" || t === "dirt" || t === "bridge";
  };

  for (let r = 5; r < rows - 5; r += 2) {
    for (let c = 5; c < cols - 5; c += 2) {
      const idx = r * cols + c;
      const sec = securityZones[idx];
      if (sec === "green") continue;
      if (collision[idx] !== 0) continue;
      const t = tiles[idx];
      if (t === "water" || t === "shallow" || t === "puddle") continue;

      const onRoad = isRoadTile(c, r);
      const hConnect = isRoadTile(c - 2, r) || isRoadTile(c + 2, r);
      const vConnect = isRoadTile(c, r - 2) || isRoadTile(c, r + 2);
      const isIntersection = onRoad && hConnect && vConnect;

      if (onRoad) {
        if (!isIntersection && (c + r) % 4 !== 0) continue;
      } else {
        if (r % 4 !== 1 || c % 4 !== 1) continue;
      }

      let openNeighbors = 0;
      if (collision[(r - 1) * cols + c] === 0) openNeighbors++;
      if (collision[(r + 1) * cols + c] === 0) openNeighbors++;
      if (collision[r * cols + (c - 1)] === 0) openNeighbors++;
      if (collision[r * cols + (c + 1)] === 0) openNeighbors++;
      if (openNeighbors < 3) continue;

      const wx = (c + 0.5) * TILE_SIZE;
      const wy = (r + 0.5) * TILE_SIZE;
      const nearLoot = lootSpots.some((sp) => Math.hypot(sp.x - wx, sp.y - wy) <= 210);
      const roadAxis: ZoneWaypoint["roadAxis"] = !onRoad
        ? "off"
        : isIntersection
          ? "cross"
          : hConnect
            ? "h"
            : "v";
      out[sec].push({ x: wx, y: wy, nearLoot, onRoad, roadAxis });
    }
  }
  return out;
}

export type PoliceAiState = "patrol" | "investigate" | "chase";

export interface PoliceOfficerMarker {
  id: string;
  name: string;
  x: number;
  y: number;
  state: PoliceAiState;
  ignored: boolean;
}

interface PoliceOfficerAgent {
  id: string;
  name: string;
  homeBiome: BiomeId;
  patrolZone: "yellow" | "red";
  sectorMinCol: number;
  sectorMaxCol: number;
  x: number;
  y: number;
  facing: FacingDir;
  state: PoliceAiState;
  target: Point;
  lastSeenPlayer: Point | null;
  chaseTimer: number;
  investigateTimer: number;
  pauseTimer: number;
  aiAccum: number;
  stuckCheckAccum: number;
  stuckOriginX: number;
  stuckOriginY: number;
  turnBias: 1 | -1;
  animElapsed: number;
  animFrame: number;
  rngState: number;
  container: Container;
  shadowSprite: Sprite;
  bodySprite: Sprite;
  feetSprite: Sprite;
  legsSprite: Sprite;
  torsoSprite: Sprite;
  headSprite: Sprite;
  hatSprite: Sprite;
  statusText: Text;
  sirenGfx: Graphics;
}

const OFFICER_SPECS: ReadonlyArray<{
  id: string;
  name: string;
  biome: BiomeId;
  patrolZone: "yellow" | "red";
  sectorMinCol: number;
  sectorMaxCol: number;
}> = [
  { id: "pol_yellow_1", name: "Cảnh Sát Phố Đông", biome: "city", patrolZone: "yellow", sectorMinCol: 32, sectorMaxCol: 56 },
  { id: "pol_yellow_2", name: "Cảnh Sát Khu Nam Phố", biome: "city", patrolZone: "yellow", sectorMinCol: 32, sectorMaxCol: 56 },
  { id: "pol_yellow_3", name: "Cảnh Sát Đại Lộ Tây", biome: "plains", patrolZone: "yellow", sectorMinCol: 52, sectorMaxCol: 82 },
  { id: "pol_yellow_4", name: "Cảnh Sát Chợ Đồng Bằng", biome: "plains", patrolZone: "yellow", sectorMinCol: 56, sectorMaxCol: 86 },
  { id: "pol_yellow_5", name: "Cảnh Sát Bờ Bắc Vàng", biome: "plains", patrolZone: "yellow", sectorMinCol: 74, sectorMaxCol: 104 },
  { id: "pol_yellow_6", name: "Cảnh Sát Biên Giới Đông", biome: "plains", patrolZone: "yellow", sectorMinCol: 82, sectorMaxCol: 104 },
  { id: "pol_red_1", name: "Đặc Nhiệm Cổng Đỏ", biome: "countryside", patrolZone: "red", sectorMinCol: 105, sectorMaxCol: 124 },
  { id: "pol_red_2", name: "Đặc Nhiệm Khu Đỏ Bắc", biome: "countryside", patrolZone: "red", sectorMinCol: 108, sectorMaxCol: 134 },
  { id: "pol_red_3", name: "Đặc Nhiệm Khu Đỏ Nam", biome: "countryside", patrolZone: "red", sectorMinCol: 112, sectorMaxCol: 138 },
  { id: "pol_red_4", name: "Đặc Nhiệm Rừng Sâu Đông", biome: "countryside", patrolZone: "red", sectorMinCol: 124, sectorMaxCol: 145 },
];

const PATROL_SPEED = 58;
const INVESTIGATE_SPEED = 77;
const CHASE_SPEED = 118;
const AI_THINK_INTERVAL = 0.16;
const CATCH_RADIUS = 38;
const LOOT_WAYPOINT_REJECT_PROB = 0.82;
const ROAD_PATROL_PREFERENCE = POLICE_ROAD_PATROL_PREFERENCE;

/**
 * Lightweight, low-CPU Police Patrol & Predictive Intercept System:
 * - Precomputes coarse 4x4 walkable biome waypoints once at startup (~0.5ms, zero per-frame allocations).
 * - Staggers AI perception/waypoint decisions every 160ms across 8 zone officers.
 * - Uses building-occluded Line-of-Sight raycasts + forward vision cone + proximity hearing +
 *   predictive target lead + angular obstacle-sliding so officers roam smartly without heavy A* calls.
 */
export class PoliceSystem {
  private readonly world: WorldData;
  private readonly atlas: WorldAtlas;
  private readonly zoneWaypoints: Record<"yellow" | "red", ZoneWaypoint[]> = {
    yellow: [],
    red: [],
  };
  private readonly officers: PoliceOfficerAgent[] = [];

  private prevPlayerX: number;
  private prevPlayerY: number;

  constructor(world: WorldData, atlas: WorldAtlas, entityLayer: Container) {
    this.world = world;
    this.atlas = atlas;
    this.prevPlayerX = world.spawn.x;
    this.prevPlayerY = world.spawn.y;

    this.precomputeWaypoints();
    this.spawnOfficers(entityLayer);
  }

  private precomputeWaypoints(): void {
    const waypoints = collectPoliceZoneWaypoints(this.world);
    this.zoneWaypoints.yellow = waypoints.yellow;
    this.zoneWaypoints.red = waypoints.red;
  }

  private nextRand(agent: PoliceOfficerAgent): number {
    agent.rngState = (agent.rngState * 1664525 + 1013904223) >>> 0;
    return agent.rngState / 0x100000000;
  }

  private getSectorPool(agent: PoliceOfficerAgent): ZoneWaypoint[] {
    const fullPool = this.zoneWaypoints[agent.patrolZone];
    const minX = agent.sectorMinCol * TILE_SIZE;
    const maxX = (agent.sectorMaxCol + 1) * TILE_SIZE;
    const sector = fullPool.filter((w) => w.x >= minX && w.x <= maxX);
    return sector.length >= 6 ? sector : fullPool;
  }

  private pickZoneWaypoint(agent: PoliceOfficerAgent, preferNearby: boolean): Point {
    const fullPool = this.getSectorPool(agent);
    if (fullPool.length === 0) return { x: agent.x, y: agent.y };

    const roadPool = fullPool.filter((w) => w.onRoad);
    const offRoadPool = fullPool.filter((w) => !w.onRoad);
    const useRoads = roadPool.length > 0 && (this.nextRand(agent) < ROAD_PATROL_PREFERENCE || offRoadPool.length === 0);
    const pool = useRoads ? roadPool : offRoadPool;

    if (preferNearby) {
      for (let tries = 0; tries < 14; tries++) {
        const cand = pool[Math.floor(this.nextRand(agent) * pool.length)];
        if (cand.nearLoot && this.nextRand(agent) < LOOT_WAYPOINT_REJECT_PROB) continue;
        const dx = Math.abs(cand.x - agent.x);
        const dy = Math.abs(cand.y - agent.y);
        const d = Math.hypot(dx, dy);
        if (d < 160 || d > 760) continue;
        // Favor following road/trail axes & turning at intersections over diagonal cross-field hops
        if (useRoads && cand.roadAxis !== "cross" && dx > 110 && dy > 110 && tries < 10) {
          continue;
        }
        return { x: cand.x, y: cand.y };
      }
    }

    for (let tries = 0; tries < 10; tries++) {
      const cand = pool[Math.floor(this.nextRand(agent) * pool.length)];
      if (cand.nearLoot && this.nextRand(agent) < LOOT_WAYPOINT_REJECT_PROB) continue;
      return { x: cand.x, y: cand.y };
    }

    const fallback = pool[Math.floor(this.nextRand(agent) * pool.length)];
    return { x: fallback.x, y: fallback.y };
  }

  private spawnOfficers(entityLayer: Container): void {
    OFFICER_SPECS.forEach((spec, idx) => {
      const minX = spec.sectorMinCol * TILE_SIZE;
      const maxX = (spec.sectorMaxCol + 1) * TILE_SIZE;
      const pool = this.zoneWaypoints[spec.patrolZone];
      const sectorPool = pool.filter((w) => w.x >= minX && w.x <= maxX);
      const basePool = sectorPool.length > 0 ? sectorPool : pool;
      const roadNonLoot = basePool.filter((w) => w.onRoad && !w.nearLoot);
      const nonLootPool = basePool.filter((w) => !w.nearLoot);
      const startPool = roadNonLoot.length > 0 ? roadNonLoot : nonLootPool.length > 0 ? nonLootPool : basePool;
      let start: Point = { x: WORLD_WIDTH * 0.55, y: WORLD_HEIGHT * 0.5 };
      if (startPool.length > 0) {
        const picked = startPool[(idx * 37 + 13) % startPool.length];
        start = { x: picked.x, y: picked.y };
      }

      const container = new Container();
      container.x = start.x;
      container.y = start.y;
      container.zIndex = start.y;

      const shadowSprite = new Sprite(this.atlas.shadow);
      shadowSprite.anchor.set(0.5, 0.5);
      shadowSprite.scale.set(3.2);
      shadowSprite.y = 2;
      shadowSprite.alpha = 0.55;

      const makeLayer = (): Sprite => {
        const s = new Sprite(Texture.EMPTY);
        s.anchor.set(0.5, 0.94);
        s.scale.set(1.16);
        return s;
      };

      const bodySprite = makeLayer();
      const feetSprite = makeLayer();
      const legsSprite = makeLayer();
      const torsoSprite = makeLayer();
      const headSprite = makeLayer();
      const hatSprite = makeLayer();

      legsSprite.tint = 0x1e293b;
      torsoSprite.tint = 0xdbeafe;
      hatSprite.tint = 0x1d4ed8;
      feetSprite.tint = 0x334155;

      const sirenGfx = new Graphics();
      const statusText = new Text({
        text: "🚓",
        style: {
          fontSize: 13,
          fontWeight: "800",
          fill: "#93c5fd",
          stroke: { color: "#020617", width: 3 },
        },
      });
      statusText.anchor.set(0.5, 1);
      statusText.y = -66;

      container.addChild(
        shadowSprite,
        sirenGfx,
        bodySprite,
        feetSprite,
        legsSprite,
        torsoSprite,
        headSprite,
        hatSprite,
        statusText,
      );
      entityLayer.addChild(container);

      const agent: PoliceOfficerAgent = {
        id: spec.id,
        name: spec.name,
        homeBiome: spec.biome,
        patrolZone: spec.patrolZone,
        sectorMinCol: spec.sectorMinCol,
        sectorMaxCol: spec.sectorMaxCol,
        x: start.x,
        y: start.y,
        facing: "down",
        state: "patrol",
        target: start,
        lastSeenPlayer: null,
        chaseTimer: 0,
        investigateTimer: 0,
        pauseTimer: 0,
        aiAccum: idx * 0.02, // Stagger AI ticks evenly across frames
        stuckCheckAccum: 0,
        stuckOriginX: start.x,
        stuckOriginY: start.y,
        turnBias: idx % 2 === 0 ? 1 : -1,
        animElapsed: idx * 0.17,
        animFrame: 0,
        rngState: (idx + 1) * 7919 + 4242,
        container,
        shadowSprite,
        bodySprite,
        feetSprite,
        legsSprite,
        torsoSprite,
        headSprite,
        hatSprite,
        statusText,
        sirenGfx,
      };
      agent.target = this.pickZoneWaypoint(agent, true);
      this.syncOfficerSprite(agent, 0, false);
      this.officers.push(agent);
    });
  }

  private isWalkablePixel(wx: number, wy: number): boolean {
    if (wx < TILE_SIZE * 2 || wy < TILE_SIZE * 2 || wx > WORLD_WIDTH - TILE_SIZE * 2 || wy > WORLD_HEIGHT - TILE_SIZE * 2) {
      return false;
    }
    const c = Math.floor(wx / TILE_SIZE);
    const r = Math.floor(wy / TILE_SIZE);
    const idx = r * this.world.cols + c;
    if (this.world.securityZones[idx] === "green") return false;
    if (this.world.collision[idx] !== 0) return false;
    const t = this.world.tiles[idx];
    return t !== "water" && t !== "shallow";
  }

  private hasLineOfSight(ax: number, ay: number, bx: number, by: number): boolean {
    const steps = 7;
    const { cols, collision } = this.world;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const sx = ax + (bx - ax) * t;
      const sy = ay + (by - ay) * t;
      const c = Math.floor(sx / TILE_SIZE);
      const r = Math.floor(sy / TILE_SIZE);
      if (collision[r * cols + c] !== 0) {
        return false;
      }
    }
    return true;
  }

  private facingVector(dir: FacingDir): Point {
    switch (dir) {
      case "up":
        return { x: 0, y: -1 };
      case "down":
        return { x: 0, y: 1 };
      case "left":
        return { x: -1, y: 0 };
      case "right":
        return { x: 1, y: 0 };
    }
  }

  private canDetectPlayer(
    agent: PoliceOfficerAgent,
    px: number,
    py: number,
    nightFactor: number,
    isLooting: boolean,
  ): boolean {
    const dx = px - agent.x;
    const dy = py - agent.y;
    const dist = Math.hypot(dx, dy);
    const lootSightBonus = isLooting ? 45 : 0;
    const sightRange = (agent.patrolZone === "red" ? 295 : 255) - nightFactor * 42 + lootSightBonus;
    const hearRange = 104 + (isLooting ? 28 : 0);

    if (dist > sightRange) return false;
    if (dist <= hearRange) {
      return this.hasLineOfSight(agent.x, agent.y, px, py);
    }

    const f = this.facingVector(agent.facing);
    const dot = (dx * f.x + dy * f.y) / Math.max(1, dist);
    if (dot < (isLooting ? 0.24 : 0.34)) return false;
    return this.hasLineOfSight(agent.x, agent.y, px, py);
  }

  private updateOfficerDecision(
    agent: PoliceOfficerAgent,
    px: number,
    py: number,
    pvx: number,
    pvy: number,
    nightFactor: number,
    isIgnored: boolean,
    canArrest: boolean,
    isLooting: boolean,
  ): void {
    const spotted = !isIgnored && canArrest && this.canDetectPlayer(agent, px, py, nightFactor, isLooting);

    if (spotted) {
      agent.state = "chase";
      agent.pauseTimer = 0;
      agent.chaseTimer = 9.0;
      agent.investigateTimer = 11.0;
      agent.lastSeenPlayer = { x: px, y: py };
      // Predictive lead target cuts corners smoothly during chase
      const leadX = Math.max(TILE_SIZE * 3, Math.min(WORLD_WIDTH - TILE_SIZE * 3, px + pvx * 0.32));
      const leadY = Math.max(TILE_SIZE * 3, Math.min(WORLD_HEIGHT - TILE_SIZE * 3, py + pvy * 0.32));
      agent.target = this.isWalkablePixel(leadX, leadY) ? { x: leadX, y: leadY } : { x: px, y: py };
      return;
    }

    if (agent.state === "chase") {
      if (agent.chaseTimer > 0 && agent.lastSeenPlayer && !isIgnored && canArrest) {
        agent.target = agent.lastSeenPlayer;
        const distLast = Math.hypot(agent.target.x - agent.x, agent.target.y - agent.y);
        if (distLast > 26) return;
      }
      agent.state = "investigate";
      if (agent.lastSeenPlayer) {
        agent.target = agent.lastSeenPlayer;
      }
    }

    if (agent.state === "investigate") {
      const dist = Math.hypot(agent.target.x - agent.x, agent.target.y - agent.y);
      if ((dist <= 30 && agent.investigateTimer <= 6.5) || agent.investigateTimer <= 0 || isIgnored || !canArrest) {
        agent.state = "patrol";
        agent.chaseTimer = 0;
        agent.lastSeenPlayer = null;
        agent.pauseTimer = 0.6 + this.nextRand(agent) * 0.7;
        agent.target = this.pickZoneWaypoint(agent, true);
      }
      return;
    }

    // Patrol state
    const dist = Math.hypot(agent.target.x - agent.x, agent.target.y - agent.y);
    if (dist <= 28 && agent.pauseTimer <= 0) {
      agent.pauseTimer = 0.45 + this.nextRand(agent) * 0.95;
      agent.target = this.pickZoneWaypoint(agent, this.nextRand(agent) < 0.62);
    }
  }

  private steerOfficer(agent: PoliceOfficerAgent, dt: number): boolean {
    if (agent.pauseTimer > 0) {
      agent.pauseTimer = Math.max(0, agent.pauseTimer - dt);
      return false;
    }

    const dx = agent.target.x - agent.x;
    const dy = agent.target.y - agent.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return false;

    const speed =
      agent.state === "chase"
        ? CHASE_SPEED
        : agent.state === "investigate"
          ? INVESTIGATE_SPEED
          : PATROL_SPEED;

    const baseAngle = Math.atan2(dy, dx);
    const b = agent.turnBias;
    const probeAngles = [0, 0.65 * b, -0.65 * b, 1.25 * b, -1.25 * b, 1.75 * b];

    let movedX = 0;
    let movedY = 0;
    for (const offset of probeAngles) {
      const ang = baseAngle + offset;
      const stepX = Math.cos(ang) * speed * dt;
      const stepY = Math.sin(ang) * speed * dt;
      // Gentle separation from nearby officers to avoid stacking
      let sepX = 0;
      let sepY = 0;
      for (const other of this.officers) {
        if (other === agent) continue;
        const odx = agent.x - other.x;
        const ody = agent.y - other.y;
        const od = Math.hypot(odx, ody);
        if (od > 0.1 && od < 44) {
          sepX += (odx / od) * 32 * dt;
          sepY += (ody / od) * 32 * dt;
        }
      }

      const nx = agent.x + stepX + sepX;
      const ny = agent.y + stepY + sepY;
      if (this.isWalkablePixel(nx, ny)) {
        agent.x = nx;
        agent.y = ny;
        movedX = stepX;
        movedY = stepY;
        break;
      }
    }

    if (Math.hypot(movedX, movedY) < 0.05) {
      return false;
    }

    if (Math.abs(movedX) > Math.abs(movedY)) {
      agent.facing = movedX > 0 ? "right" : "left";
    } else {
      agent.facing = movedY > 0 ? "down" : "up";
    }
    return true;
  }

  private setOfficerSpriteLayer(sprite: Sprite, key: string, facing: FacingDir, frame: number): void {
    const frames = this.atlas.lpcLayers[key];
    if (!frames) return;
    const tex = frames[facing][frame] ?? frames[facing][0];
    if (sprite.texture !== tex) sprite.texture = tex;
  }

  private syncOfficerSprite(agent: PoliceOfficerAgent, nowMs: number, ignored: boolean): void {
    agent.container.x = agent.x;
    agent.container.y = agent.y;
    agent.container.zIndex = agent.y;

    this.setOfficerSpriteLayer(agent.bodySprite, "body_male", agent.facing, agent.animFrame);
    this.setOfficerSpriteLayer(agent.feetSprite, "feet_boots", agent.facing, agent.animFrame);
    this.setOfficerSpriteLayer(agent.legsSprite, "legs_formal", agent.facing, agent.animFrame);
    this.setOfficerSpriteLayer(agent.torsoSprite, "torso_jacket_navy", agent.facing, agent.animFrame);
    this.setOfficerSpriteLayer(agent.headSprite, "head_male", agent.facing, agent.animFrame);
    this.setOfficerSpriteLayer(agent.hatSprite, "hat_cap", agent.facing, agent.animFrame);

    agent.sirenGfx.clear();
    if (ignored) {
      agent.statusText.text = "✓";
      agent.statusText.style.fill = "#6ee7b7";
    } else if (agent.state === "chase") {
      agent.statusText.text = "❗";
      agent.statusText.style.fill = "#f87171";
      const flashRed = Math.floor(nowMs / 180) % 2 === 0;
      agent.sirenGfx
        .circle(0, -30, 18)
        .fill({ color: flashRed ? 0xef4444 : 0x3b82f6, alpha: 0.22 });
    } else if (agent.state === "investigate") {
      agent.statusText.text = "?";
      agent.statusText.style.fill = "#fbbf24";
    } else {
      agent.statusText.text = "🚓";
      agent.statusText.style.fill = "#93c5fd";
    }
  }

  public step(
    dtSeconds: number,
    options: {
      playerX: number;
      playerY: number;
      playerZone: SecurityZone;
      nightFactor: number;
      canArrest: boolean;
      isLooting: boolean;
      ignoreUntilById: Record<string, number>;
      globalIgnoreUntil: number;
      nowMs?: number;
    },
  ): { id: string; name: string; biome: BiomeId; zone: SecurityZone } | null {
    const dt = Math.min(Math.max(dtSeconds, 0), 0.05);
    const nowMs = options.nowMs ?? Date.now();
    const {
      playerX,
      playerY,
      playerZone,
      nightFactor,
      canArrest,
      isLooting,
      ignoreUntilById,
      globalIgnoreUntil,
    } = options;

    const pvx = dt > 0.001 ? (playerX - this.prevPlayerX) / dt : 0;
    const pvy = dt > 0.001 ? (playerY - this.prevPlayerY) / dt : 0;
    this.prevPlayerX = playerX;
    this.prevPlayerY = playerY;

    const safeGreenZone = playerZone === "green";
    const effectiveCanArrest = canArrest && !safeGreenZone;
    let caughtOfficer: { id: string; name: string; biome: BiomeId; zone: SecurityZone } | null = null;

    for (const agent of this.officers) {
      const isIgnored =
        safeGreenZone ||
        globalIgnoreUntil > nowMs ||
        (ignoreUntilById[agent.id] ?? 0) > nowMs;
      if (isIgnored && agent.state !== "patrol") {
        agent.state = "patrol";
        agent.lastSeenPlayer = null;
      }

      if (agent.state === "chase") {
        agent.chaseTimer = Math.max(0, agent.chaseTimer - dt);
      } else if (agent.state === "investigate") {
        agent.investigateTimer = Math.max(0, agent.investigateTimer - dt);
      }

      agent.aiAccum += dt;
      if (agent.aiAccum >= AI_THINK_INTERVAL) {
        agent.aiAccum = 0;
        this.updateOfficerDecision(
          agent,
          playerX,
          playerY,
          pvx,
          pvy,
          nightFactor,
          isIgnored,
          effectiveCanArrest,
          isLooting,
        );
      }

      const moved = this.steerOfficer(agent, dt);
      if (moved) {
        agent.animElapsed += dt;
        const cycleDur = agent.state === "chase" ? 0.52 : 0.78;
        const step = Math.floor((agent.animElapsed % cycleDur) / (cycleDur / 8));
        agent.animFrame = 1 + step;
      } else {
        agent.animFrame = 0;
      }

      // Anti-stuck detector: swap waypoint if officer couldn't make 12px progress over 0.9s
      agent.stuckCheckAccum += dt;
      if (agent.stuckCheckAccum >= 0.9) {
        const progress = Math.hypot(agent.x - agent.stuckOriginX, agent.y - agent.stuckOriginY);
        agent.stuckOriginX = agent.x;
        agent.stuckOriginY = agent.y;
        agent.stuckCheckAccum = 0;
        if (progress < 12 && agent.pauseTimer <= 0) {
          agent.turnBias = agent.turnBias === 1 ? -1 : 1;
          agent.target = this.pickZoneWaypoint(agent, false);
        }
      }

      this.syncOfficerSprite(agent, nowMs, globalIgnoreUntil > nowMs || (ignoreUntilById[agent.id] ?? 0) > nowMs);

      if (!caughtOfficer && effectiveCanArrest && !isIgnored) {
        const d = Math.hypot(playerX - agent.x, playerY - agent.y);
        if (d <= CATCH_RADIUS) {
          caughtOfficer = { id: agent.id, name: agent.name, biome: agent.homeBiome, zone: playerZone };
        }
      }
    }

    return caughtOfficer;
  }

  public findNearestOfficer(
    px: number,
    py: number,
    ignoreUntilById: Record<string, number>,
    globalIgnoreUntil: number,
    nowMs = Date.now(),
  ): { id: string; name: string; biome: BiomeId; distance: number } | null {
    if (globalIgnoreUntil > nowMs) return null;
    let best: { id: string; name: string; biome: BiomeId; distance: number } | null = null;
    for (const agent of this.officers) {
      if ((ignoreUntilById[agent.id] ?? 0) > nowMs) continue;
      const d = Math.hypot(px - agent.x, py - agent.y);
      if (!best || d < best.distance) {
        best = { id: agent.id, name: agent.name, biome: agent.homeBiome, distance: d };
      }
    }
    return best;
  }

  public getMarkers(
    nowMs = Date.now(),
    ignoreUntilById: Record<string, number> = {},
    globalIgnoreUntil = 0,
  ): PoliceOfficerMarker[] {
    return this.officers.map((o) => ({
      id: o.id,
      name: o.name,
      x: o.x,
      y: o.y,
      state: o.state,
      ignored: globalIgnoreUntil > nowMs || (ignoreUntilById[o.id] ?? 0) > nowMs,
    }));
  }
}
