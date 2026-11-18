import { sound } from "@pixi/sound";
import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";
import type { Application, FederatedPointerEvent } from "pixi.js";
import { withAssetHash } from "../assetUrl.ts";
import type {
  LiveStatePayload,
  RemotePlayerAppearance,
  RemotePlayerMovePacket,
} from "../cloud/SupabaseSync.ts";
import type { PlayerGameSaveV3 } from "../security/SaveVault.ts";
import type { ArcadeMinigameKind } from "../ui/ArcadeMinigames.ts";
import { AtmosphereSystem } from "./AtmosphereSystem.ts";
import {
  AIRPORT_GENDER_CHANGE_COST,
  AIRPORT_JAPAN_FLIGHT_COST,
  CONSUMABLE_BY_ID,
  DEFAULT_OWNED_HAIR_IDS,
  GARMENT_BY_ID,
  HAIR_BY_ID,
  HAIR_OPTIONS,
  MAX_BLEND_CHANCE,
  MAX_SAVED_OUTFIT_PRESETS,
  computeEquipmentStats,
  createDefaultEquippedGear,
  createPrisonerEquippedGear,
  getConsumableSingleUsePrice,
  type ConsumableDef,
  type EquipmentSlot,
  type EquipmentStats,
  type EquippedGear,
  type GarmentDef,
  type SavedOutfitPreset,
} from "./EquipmentCatalog.ts";
import {
  SURVIVAL_IDEAL_TEMP_C,
  createDefaultSurvivalState,
  evaluateThermalState,
  getActiveStaminaMax,
  stepSurvivalState,
  type SurvivalState,
  type SurvivalTickResult,
} from "./SurvivalSystem.ts";
import {
  HanoiWeatherService,
  type EnvironmentPreset,
  type EnvironmentState,
} from "./HanoiWeatherService.ts";
import {
  InventoryManager,
  ITEM_BY_ID,
  findFirstFitOnGrid,
  getItemRemainingUses,
  type CollectibleItemDef,
  type ContainerLootState,
  type GridItemInstance,
  type GridZone,
  type LockedPuzzleKind,
  type LootSourceType,
  type UpgradeKind,
} from "./LootSystem.ts";
import { Pathfinder } from "./Pathfinder.ts";
import { Player } from "./Player.ts";
import { createWorldAtlas, type WorldAtlas } from "./SpriteAtlas.ts";
import {
  BUILDING_META,
  BUILDING_PIXEL_SCALE,
  CHUNK_TILES,
  GREEN_END_COL,
  JAPAN_SNOW_START_COL,
  MAP_LABELS,
  isBuildingProp,
  PIXEL_SCALE,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  YELLOW_END_COL,
  type BiomeId,
  type BuildingKind,
  type CharacterGender,
  type CharacterSkinId,
  type FacingDir,
  type MapId,
  type Point,
  type PropKind,
  type SecurityZone,
  type SurfaceState,
  type TileType,
  type WorldChest,
  type WorldData,
  type WorldLandmark,
  type WorldProp,
} from "./types.ts";
import { generateOpenWorld } from "./WorldGenerator.ts";
import { JAIL_HEIGHT, JAIL_WIDTH, JailRoom } from "./JailRoom.ts";
import { PoliceSystem, type PoliceOfficerMarker } from "./PoliceSystem.ts";
import {
  QUEST_MANUAL_REROLL_COST_GOLD,
  generateDailyQuestBoard,
  rerollPendingQuests,
  type DailyQuestBoardState,
  type ExploreTargetKind,
} from "./QuestSystem.ts";
import {
  REPUTATION_MILESTONE_BY_ID,
  REPUTATION_SHOP_BY_ID,
  buildReputationSummary,
  createDefaultReputationState,
  pickReputationBonusItemId,
  type ReputationState,
  type ReputationSummaryView,
} from "./ReputationSystem.ts";
import {
  PET_BY_ID,
  PET_DUPLICATE_REFUND_GOLD,
  PET_GACHA_COST_GOLD,
  rollPetGachaOutcome,
  type GachaRollOutcome,
  type PetDef,
} from "./PetSystem.ts";
import { WeatherParticles } from "./WeatherParticles.ts";

interface RippleEffect {
  x: number;
  y: number;
  age: number;
  duration: number;
  color: number;
}

interface WaterWake {
  x: number;
  y: number;
  age: number;
  duration: number;
  maxRadiusX: number;
  maxRadiusY: number;
}

interface WaterDroplet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  duration: number;
}

interface OccludableProp {
  container: Container;
  prop: WorldProp;
  x: number;
  bottomY: number;
  topY: number;
  depthY: number;
  halfW: number;
}

interface ChestVisual {
  chest: WorldChest;
  container: Container;
  sprite: Sprite;
  aura: Graphics;
}

export type ShopKind = "backpack" | "clothing" | "food" | "hair" | "pharmacy";

export interface PendingVaultTarget {
  containerId: string;
  title: string;
  sourceType: "chest_royal" | "house_vault";
  biome: BiomeId;
  zone: SecurityZone;
  kind: LockedPuzzleKind;
  seed: number;
  chestId?: string;
}

export type NearbyInteraction =
  | {
      type: "chest";
      chest: WorldChest;
      label: string;
      searched: boolean;
      remainingMs: number | null;
      locked?: boolean;
    }
  | {
      type: "shop";
      name: string;
      shopKind: ShopKind;
    }
  | {
      type: "home";
      name: string;
    }
  | {
      type: "collection";
      name: string;
    }
  | {
      type: "auction";
      name: string;
    }
  | {
      type: "airport";
      name: string;
    }
  | {
      type: "quest";
      name: string;
    }
  | {
      type: "reputation";
      name: string;
    }
  | {
      type: "gacha";
      name: string;
    }
  | {
      type: "jail_minigame";
      stationId: string;
      kind: ArcadeMinigameKind;
      label: string;
    }
  | {
      type: "building";
      propId: number;
      kind: BuildingKind;
      name: string;
      tier: "standard" | "landmark";
      isVault: boolean;
      biome: BiomeId;
      searched: boolean;
      remainingCount: number;
      remainingMs: number | null;
      x: number;
      y: number;
    };

export interface WorldCallbacks {
  onLandmarkDiscovered?: (landmark: WorldLandmark) => void;
  onOpenContainer?: (container: ContainerLootState) => void;
  onOpenVaultPuzzle?: (target: PendingVaultTarget) => void;
  onOpenJailMinigame?: (station: { stationId: string; kind: ArcadeMinigameKind }) => void;
  onOpenShop?: (shopKind: ShopKind) => void;
  onOpenHomeStorage?: () => void;
  onOpenCollectionHall?: () => void;
  onOpenAuctionHouse?: () => void;
  onOpenAirport?: () => void;
  onOpenQuestBoard?: () => void;
  onOpenReputationShop?: () => void;
  onOpenPetGacha?: () => void;
  onMapChanged?: (activeMapId: MapId) => void;
  onConsumeCompleted?: (title: string, message: string) => void;
  onPoliceChallenge?: (officer: { id: string; name: string; biome: BiomeId; zone: SecurityZone }) => void;
  onPoliceBlendIgnored?: (officerName: string, chancePct: number) => void;
  onPoliceDetained?: (lostItemCount: number, durationMs: number, lostBackpack?: boolean) => void;
  onDetentionEnded?: () => void;
  onContainersRefreshed?: (containerIds: string[]) => void;
  onFaintedToHospital?: (reason: string, hospitalFeeGold: number) => void;
  onRequestSave?: (immediate: boolean) => void;
  onPlayerMoveSample?: (sample: {
    mapId: MapId;
    x: number;
    y: number;
    vx: number;
    vy: number;
    facing: FacingDir;
    isMoving: boolean;
    hp: number;
    hunger: number;
    stamina: number;
    bodyTempC: number;
    skinId: CharacterSkinId;
    gender: CharacterGender;
    hairId: string;
    equipped: EquippedGear;
    equippedPetId: string | null;
  }) => void;
  onPoliceChaseStarted?: (officerId: string, x: number, y: number) => void;
  onVaultUnlocked?: (info: {
    mapId: MapId;
    containerId: string;
    chestId?: string;
    container: ContainerLootState;
  }) => void;
}

/**
 * Main PixiJS v8 Open-World Scene integrating:
 * - CC0 pixel-art chunked terrain + 2.5D Y-sorted structures & flora
 * - Unified Mobile/PC Tap-to-Move A* pathfinding
 * - Live Hanoi time & Open-Meteo weather (sunbeams, clouds, readable night + lanterns,
 *   wind-driven rain + splashes, falling leaves, dust motes & night fireflies)
 */
export class WorldScene {
  public readonly stageLayer: Container;
  public readonly worldContainer: Container;
  public readonly worldLightsContainer: Container;
  public data: WorldData;
  public readonly atlas: WorldAtlas;
  public pathfinder: Pathfinder;
  public readonly player: Player;
  public readonly weatherService: HanoiWeatherService;
  public readonly inventory: InventoryManager;

  private readonly app: Application;
  private readonly callbacks: WorldCallbacks;

  private readonly groundLayer: Container;
  private readonly waterAnimLayer: Container;
  private readonly waterWakeLayer: Graphics;
  private waterLayerDirty = false;
  private pathLayerDirty = false;
  private readonly pathOverlayLayer: Graphics;
  private readonly entityLayer: Container;
  private readonly atmosphere: AtmosphereSystem;
  private readonly weatherParticles: WeatherParticles;
  private police: PoliceSystem;
  private readonly jailRoom: JailRoom;

  private activeMapId: MapId;
  private readonly discoveredLandmarkIds = new Set<string>();

  private readonly lilypadSprites: Array<{ sprite: Sprite; x: number; y: number; phase: number }> = [];
  private readonly propNodes: Array<{ node: Container; x: number; y: number }> = [];
  private pendingProps: WorldProp[] = [];
  private readonly foodCartProps: WorldProp[] = [];
  private readonly occludableProps: OccludableProp[] = [];
  private readonly buildingOccludables: OccludableProp[] = [];
  private readonly chestVisuals: ChestVisual[] = [];
  private readonly ripples: RippleEffect[] = [];
  private readonly waterWakes: WaterWake[] = [];
  private readonly waterDroplets: WaterDroplet[] = [];
  private collectionOrbitHost: { x: number; y: number; height: number; depthY: number } | null = null;
  private readonly remotePlayers = new Map<
    string,
    {
      actor: Player;
      label: Text;
      equippedPetId: string | null;
      petNode: Container | null;
      petSprite: Sprite | null;
      petIdleFrames: Texture[];
      petRunFrames: Texture[];
      petBaseScale: number;
      petFacingSign: number;
      petPosX: number;
      petPosY: number;
      targetX: number;
      targetY: number;
      vx: number;
      vy: number;
      facing: FacingDir;
      isMoving: boolean;
      lastPacketAt: number;
    }
  >();
  private prevStepX = 0;
  private prevStepY = 0;
  private lastChaseOfficerId: string | null = null;
  private readonly collectionOrbitItems: Array<{
    node: Container;
    glow: Graphics;
    lightLevel: 0 | 1 | 2;
    phaseOffset: number;
    radiusX: number;
    radiusY: number;
    speed: number;
  }> = [];
  private readonly orbitTextureCache = new Map<string, Promise<Texture>>();
  private readonly terrainChunks: Array<{
    node: Container;
    cx: number;
    cy: number;
    maxCol: number;
    maxRow: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    built: boolean;
  }> = [];
  private readonly worldCache = new Map<MapId, { data: WorldData; pathfinder: Pathfinder }>();
  private prewarmTimerId: number | null = null;

  private camX: number;
  private camY: number;
  private lastCullCamX = Number.NaN;
  private lastCullCamY = Number.NaN;
  private lastCullZoom = Number.NaN;
  private forceCullUpdate = true;
  private zoom = 1;
  private targetZoom = 1;
  private soundEnabled = true;

  private isPointerDown = false;
  private lastDragPathAt = 0;
  private readonly keysDown = new Set<string>();
  private elapsed = 0;
  private refreshCheckAccumulator = 0;
  private positionSaveAccumulator = 0;
  private survivalSaveAccumulator = 0;
  private faintRespawnCooldown = 0;
  private lastSavedPlayerX: number;
  private lastSavedPlayerY: number;
  private isSceneReady = false;

  private survival: SurvivalState;
  private questBoard: DailyQuestBoardState;
  private reputation: ReputationState;
  private readonly ownedPetIds = new Set<string>();
  private equippedPetId: string | null = null;
  private petNode: Container | null = null;
  private petSprite: Sprite | null = null;
  private petAura: Graphics | null = null;
  private petBubble: Text | null = null;
  private petIdleFrames: Texture[] = [];
  private petRunFrames: Texture[] = [];
  private petPlayFrames: Texture[] = [];
  private petDustAccum = 0;
  private petStarAccum = 0;
  private petIdleTime = 0;
  private petBaseScale = 1;
  private petPosX = 0;
  private petPosY = 0;
  private petFacingSign = 1;
  private equipment: EquippedGear;
  private savedOutfits: SavedOutfitPreset[];
  private hairId: string;
  private ownedHairIds: Set<string>;
  private gender: CharacterGender;
  private onboardingDone: boolean;
  private cachedEquipStats: EquipmentStats;
  private lastSurvivalTick: SurvivalTickResult;
  private detainedUntil = 0;
  private isInJail = false;
  private ignoreUntilByOfficer: Record<string, number> = {};
  private globalPoliceIgnoreUntil = 0;
  private activePoliceChallengeOfficerId: string | null = null;
  private activeVaultPuzzle: PendingVaultTarget | null = null;
  private activeJailStationId: string | null = null;
  private isLootingContainerOpen = false;
  private lootingCheckAccum = 0;
  private pendingConsume: {
    consumable: ConsumableDef;
    backpackUid: string | null;
    priceGold: number;
    elapsedMs: number;
    durationMs: number;
  } | null = null;

  constructor(
    app: Application,
    data: WorldData,
    callbacks: WorldCallbacks = {},
    initialSave?: PlayerGameSaveV3,
  ) {
    this.app = app;
    this.data = data;
    this.activeMapId = data.mapId;
    this.callbacks = callbacks;
    this.inventory = new InventoryManager(initialSave?.inventory, () => {
      if (this.isSceneReady) {
        this.callbacks.onRequestSave?.(true);
      }
    });
    this.inventory.onItemLooted = (def) => {
      if (def.rarity === "A" || def.rarity === "S") {
        this.reputation.rareItemsLooted += 1;
        if (def.rarity === "S") {
          this.reputation.redItemsLooted += 1;
        }
        this.callbacks.onRequestSave?.(false);
      }
    };
    this.atlas = createWorldAtlas();

    this.survival = initialSave?.survival
      ? { ...initialSave.survival }
      : createDefaultSurvivalState();
    this.reputation = initialSave?.reputation
      ? {
          ...initialSave.reputation,
          peakGold: Math.max(initialSave.reputation.peakGold, this.inventory.getGold()),
          claimedIds: [...initialSave.reputation.claimedIds],
        }
      : {
          ...createDefaultReputationState(),
          peakGold: this.inventory.getGold(),
        };
    this.questBoard =
      initialSave?.questBoard && Date.now() < initialSave.questBoard.nextRefreshAt
        ? {
            ...initialSave.questBoard,
            quests: initialSave.questBoard.quests.map((q) => ({ ...q, reward: { ...q.reward } })),
          }
        : generateDailyQuestBoard(this.activeMapId);
    this.equipment = initialSave?.equipment
      ? { ...initialSave.equipment }
      : createDefaultEquippedGear();
    this.savedOutfits = initialSave?.savedOutfits
      ? initialSave.savedOutfits.map((p) => ({ ...p, gear: { ...p.gear } }))
      : [];
    this.ownedHairIds = new Set<string>(
      initialSave?.ownedHairIds?.length ? initialSave.ownedHairIds : DEFAULT_OWNED_HAIR_IDS,
    );
    if (initialSave?.ownedPetIds) {
      for (const id of initialSave.ownedPetIds) {
        if (PET_BY_ID[id]) this.ownedPetIds.add(id);
      }
    }
    this.equippedPetId =
      initialSave?.equippedPetId && this.ownedPetIds.has(initialSave.equippedPetId)
        ? initialSave.equippedPetId
        : null;
    this.hairId =
      initialSave?.hairId && this.ownedHairIds.has(initialSave.hairId)
        ? initialSave.hairId
        : HAIR_OPTIONS[0].id;
    this.gender = initialSave?.profile?.gender === "female" ? "female" : "male";
    this.onboardingDone = initialSave?.profile?.onboardingDone ?? true;
    this.cachedEquipStats = computeEquipmentStats(this.equipment);
    this.inventory.setEquippedGear(this.equipment);

    this.pathfinder = new Pathfinder(data.cols, data.rows, data.tileSize, data.collision);
    this.worldCache.set(this.activeMapId, { data, pathfinder: this.pathfinder });
    const savedProfile = initialSave?.profile;
    const startX =
      savedProfile && this.pathfinder.isWalkableWorld(savedProfile.x, savedProfile.y)
        ? savedProfile.x
        : data.spawn.x;
    const startY =
      savedProfile && this.pathfinder.isWalkableWorld(savedProfile.x, savedProfile.y)
        ? savedProfile.y
        : data.spawn.y;

    this.player = new Player(startX, startY, this.atlas, {
      getSurfaceAt: (x, y) => this.getSurfaceAt(x, y),
      onWaterStep: (x, y, mode) => this.spawnWaterStepEffect(x, y, mode),
    });

    if (savedProfile) {
      this.player.setSkin(savedProfile.skinId);
      this.player.setFacing(savedProfile.facing);
      this.soundEnabled = savedProfile.soundEnabled;
      if (!savedProfile.soundEnabled) {
        sound.muteAll();
      }
      for (const id of savedProfile.discoveredLandmarkIds) {
        this.discoveredLandmarkIds.add(id);
      }
      for (const lm of this.data.landmarks) {
        if (this.discoveredLandmarkIds.has(lm.id)) {
          lm.discovered = true;
        }
      }
    }

    this.player.setAppearance(this.equipment, this.hairId, this.gender);
    this.lastSavedPlayerX = startX;
    this.lastSavedPlayerY = startY;

    this.weatherService = new HanoiWeatherService();
    this.weatherService.setActiveMap(this.activeMapId);
    this.weatherService.start();
    const initialEnv = this.weatherService.getEnvironmentState();
    this.lastSurvivalTick = {
      thermal: evaluateThermalState(
        initialEnv,
        this.getSurfaceAt(startX, startY),
        this.cachedEquipStats,
        this.survival.bodyTempC,
        {
          inSnowZone: this.isInSnowZoneAt(startX),
          securityZone: this.getSecurityZoneAt(startX, startY),
          mapId: this.activeMapId,
          biome: this.getCurrentBiome(),
        },
      ),
      blurIntensity: 0,
      speedMultiplier: 1,
      fainted: false,
      faintReason: null,
    };

    this.camX = startX;
    this.camY = startY;

    this.stageLayer = new Container();
    this.worldContainer = new Container();
    this.worldLightsContainer = new Container();

    this.groundLayer = new Container();
    this.waterAnimLayer = new Container();
    this.waterWakeLayer = new Graphics();
    this.pathOverlayLayer = new Graphics();
    this.entityLayer = new Container();
    this.entityLayer.sortableChildren = true;

    this.atmosphere = new AtmosphereSystem(data);
    this.weatherParticles = new WeatherParticles(this.atlas.leafFrames);

    this.buildTerrainChunks();
    this.buildZoneBoundaryMarkers();
    this.buildLilypads();
    this.buildPropsAndBuildings();
    this.buildChests();
    this.refreshPetFollower();

    this.police = new PoliceSystem(data, this.atlas, this.entityLayer);
    this.jailRoom = new JailRoom(this.atlas);

    const savedPolice = initialSave?.policeState;
    if (savedPolice) {
      this.detainedUntil = savedPolice.detainedUntil;
      this.ignoreUntilByOfficer = { ...savedPolice.ignoreUntilByOfficer };
      this.globalPoliceIgnoreUntil = savedPolice.globalIgnoreUntil ?? 0;
      // If player refreshed mid-police-challenge to evade, enforce arrest & 5-minute detention
      if (savedPolice.pendingArrestOfficerId) {
        this.inventory.confiscateOnArrest();
        this.equipment = createPrisonerEquippedGear();
        this.cachedEquipStats = computeEquipmentStats(this.equipment);
    this.inventory.setEquippedGear(this.equipment);
        this.player.setAppearance(this.equipment, this.hairId, this.gender);
        this.player.position.set(data.policeDetainRespawn.x, data.policeDetainRespawn.y);
        this.player.setFacing("down");
        this.camX = data.policeDetainRespawn.x;
        this.camY = data.policeDetainRespawn.y;
        this.detainedUntil = Date.now() + 300_000;
        this.ignoreUntilByOfficer[savedPolice.pendingArrestOfficerId] = Date.now() + 315_000;
      }
    }

    this.entityLayer.addChild(this.player);

    this.worldContainer.addChild(
      this.groundLayer,
      this.waterAnimLayer,
      this.waterWakeLayer,
      this.pathOverlayLayer,
      this.entityLayer,
      this.atmosphere.cloudShadowLayer,
      this.weatherParticles.worldShadedLayer,
    );

    // Keep additive lantern lights + night fireflies outside tinted worldContainer
    // while maintaining exact world camera transform
    this.worldLightsContainer.addChild(
      this.atmosphere.worldLightLayer,
      this.weatherParticles.worldLuminousLayer,
    );

    this.stageLayer.addChild(
      this.worldContainer,
      this.worldLightsContainer,
      this.atmosphere.screenOverlayLayer,
      this.jailRoom.container,
    );

    this.atmosphere.resize(app.screen.width, app.screen.height);

    this.updateResponsiveBaseZoom(app.screen.width, app.screen.height, true);
    this.syncCameraTransform();
    this.ensureVisibleTerrainChunksBuilt();
    if (this.isDetained()) {
      this.enterJailRoom();
    }
    this.bindInputs();
    this.isSceneReady = true;

    if (typeof window !== "undefined") {
      const otherMapId: MapId = this.activeMapId === "vietnam" ? "japan" : "vietnam";
      this.prewarmTimerId = window.setTimeout(() => {
        this.prewarmTimerId = null;
        this.getOrCreateWorld(otherMapId);
      }, 1200);
    }
  }

  public getSaveSnapshot(): PlayerGameSaveV3 {
    const saveX = this.isInJail ? this.data.policeDetainRespawn.x : this.player.x;
    const saveY = this.isInJail ? this.data.policeDetainRespawn.y : this.player.y;
    return {
      schemaVersion: 3,
      inventory: this.inventory.getPersistedState(),
      profile: {
        x: Math.round(saveX * 10) / 10,
        y: Math.round(saveY * 10) / 10,
        facing: this.player.getFacing(),
        skinId: this.player.getSkin(),
        gender: this.gender,
        activeMapId: this.activeMapId,
        onboardingDone: this.onboardingDone,
        discoveredLandmarkIds: Array.from(this.discoveredLandmarkIds),
        soundEnabled: this.soundEnabled,
      },
      survival: {
        hp: Math.round(this.survival.hp * 10) / 10,
        hunger: Math.round(this.survival.hunger * 10) / 10,
        stamina: Math.round(this.survival.stamina * 10) / 10,
        bodyTempC: Math.round(this.survival.bodyTempC * 100) / 100,
        staminaBuff: this.survival.staminaBuff ? { ...this.survival.staminaBuff } : null,
      },
      equipment: { ...this.equipment },
      savedOutfits: this.savedOutfits.map((p) => ({ ...p, gear: { ...p.gear } })),
      hairId: this.hairId,
      ownedHairIds: Array.from(this.ownedHairIds),
      policeState: {
        detainedUntil: this.detainedUntil,
        ignoreUntilByOfficer: { ...this.ignoreUntilByOfficer },
        globalIgnoreUntil: this.globalPoliceIgnoreUntil,
        pendingArrestOfficerId: this.activePoliceChallengeOfficerId,
      },
      questBoard: this.questBoard,
      reputation: {
        ...this.reputation,
        peakGold: Math.max(this.reputation.peakGold, this.inventory.getGold()),
        claimedIds: [...this.reputation.claimedIds],
      },
      ownedPetIds: Array.from(this.ownedPetIds),
      equippedPetId: this.equippedPetId,
    };
  }

  public getSurvivalSnapshot(): {
    state: SurvivalState;
    result: SurvivalTickResult;
    equipStats: EquipmentStats;
    totalWeightKg: number;
  } {
    return {
      state: { ...this.survival },
      result: this.lastSurvivalTick,
      equipStats: this.cachedEquipStats,
      totalWeightKg: this.inventory.getCarriedWeightKg(this.cachedEquipStats.weightKg),
    };
  }

  public getEquippedGear(): EquippedGear {
    return { ...this.equipment };
  }

  public getGender(): CharacterGender {
    return this.gender;
  }

  public needsOnboarding(): boolean {
    return !this.onboardingDone;
  }

  public completeOnboarding(chosenGender: CharacterGender): void {
    this.gender = chosenGender;
    this.equipment = createDefaultEquippedGear();
    this.cachedEquipStats = computeEquipmentStats(this.equipment);
    this.inventory.setEquippedGear(this.equipment);
    this.onboardingDone = true;
    this.player.setAppearance(this.equipment, this.hairId, this.gender);
    this.callbacks.onRequestSave?.(true);
  }

  public getOwnedHairIds(): string[] {
    return Array.from(this.ownedHairIds);
  }

  public getHairId(): string {
    return this.hairId;
  }

  public setHairId(hairId: string): { ok: boolean; message: string } {
    const def = HAIR_BY_ID[hairId];
    if (!def) return { ok: false, message: "Kiểu tóc không tồn tại." };
    if (!this.ownedHairIds.has(hairId)) {
      return { ok: false, message: "Hãy đến 💇 Tiệm Tóc để mua kiểu tóc này trước!" };
    }
    this.hairId = hairId;
    this.player.setAppearance(this.equipment, this.hairId, this.gender);
    this.callbacks.onRequestSave?.(true);
    return { ok: true, message: `Đã đổi sang ${def.name}!` };
  }

  public buyOrEquipHair(hairId: string): { ok: boolean; message: string } {
    const def = HAIR_BY_ID[hairId];
    if (!def) return { ok: false, message: "Kiểu tóc không tồn tại." };
    if (this.ownedHairIds.has(hairId)) {
      this.hairId = hairId;
      this.player.setAppearance(this.equipment, this.hairId, this.gender);
      this.callbacks.onRequestSave?.(true);
      return { ok: true, message: `Đã tạo kiểu ${def.name}!` };
    }
    if (!this.inventory.trySpendGold(def.priceGold)) {
      return {
        ok: false,
        message: `Cần ${def.priceGold.toLocaleString("vi-VN")} Vàng để cắt/nhuộm ${def.name}.`,
      };
    }
    this.ownedHairIds.add(hairId);
    this.hairId = hairId;
    this.player.setAppearance(this.equipment, this.hairId, this.gender);
    this.callbacks.onRequestSave?.(true);
    return { ok: true, message: `Đã mua & đổi sang ${def.name}!` };
  }

  public flyToThailandChangeGender(): { ok: boolean; nextGender: CharacterGender; message: string } {
    const nextGender: CharacterGender = this.gender === "male" ? "female" : "male";
    if (!this.inventory.trySpendGold(AIRPORT_GENDER_CHANGE_COST)) {
      return {
        ok: false,
        nextGender,
        message: `Cần ${AIRPORT_GENDER_CHANGE_COST.toLocaleString("vi-VN")} Vàng cho vé máy bay & thủ tục tại Thái Lan!`,
      };
    }
    this.gender = nextGender;
    this.player.setAppearance(this.equipment, this.hairId, this.gender);
    this.callbacks.onRequestSave?.(true);
    return {
      ok: true,
      nextGender,
      message:
        nextGender === "female"
          ? "✈️ Đã bay sang Thái Lan (Bangkok) & chuyển sang Nhân Vật Nữ thành công!"
          : "✈️ Đã bay sang Thái Lan (Bangkok) & chuyển sang Nhân Vật Nam thành công!",
    };
  }

  public getActiveMapId(): MapId {
    return this.activeMapId;
  }

  private getOrCreateWorld(mapId: MapId): { data: WorldData; pathfinder: Pathfinder } {
    const cached = this.worldCache.get(mapId);
    if (cached) {
      return cached;
    }
    const data = generateOpenWorld(202611, mapId);
    const pathfinder = new Pathfinder(data.cols, data.rows, data.tileSize, data.collision);
    const entry = { data, pathfinder };
    this.worldCache.set(mapId, entry);
    return entry;
  }

  public flyToMap(targetMapId: MapId): { ok: boolean; activeMapId: MapId; message: string } {
    if (this.activeMapId === targetMapId) {
      return {
        ok: false,
        activeMapId: this.activeMapId,
        message: `Bạn đang ở ${MAP_LABELS[targetMapId]} rồi.`,
      };
    }
    if (this.isMovementLocked()) {
      return {
        ok: false,
        activeMapId: this.activeMapId,
        message: "Không thể khởi hành chuyến bay lúc này.",
      };
    }
    if (!this.inventory.trySpendGold(AIRPORT_JAPAN_FLIGHT_COST)) {
      return {
        ok: false,
        activeMapId: this.activeMapId,
        message: `Cần ${AIRPORT_JAPAN_FLIGHT_COST.toLocaleString("vi-VN")} Vàng để mua vé máy bay đến ${MAP_LABELS[targetMapId]}.`,
      };
    }

    const { data: nextWorld, pathfinder: nextPathfinder } = this.getOrCreateWorld(targetMapId);
    for (const lm of nextWorld.landmarks) {
      if (this.discoveredLandmarkIds.has(lm.id)) {
        lm.discovered = true;
      }
    }

    this.activeMapId = targetMapId;
    this.data = nextWorld;
    this.pathfinder = nextPathfinder;
    this.forceCullUpdate = true;

    const oldGround = this.groundLayer.removeChildren();
    for (const child of oldGround) {
      child.destroy({ children: true });
    }
    this.terrainChunks.length = 0;

    const oldWaterAnim = this.waterAnimLayer.removeChildren();
    for (const child of oldWaterAnim) {
      child.destroy({ children: true });
    }
    this.lilypadSprites.length = 0;

    this.police.destroy();
    this.entityLayer.removeChild(this.player);
    const oldEntities = this.entityLayer.removeChildren();
    for (const child of oldEntities) {
      child.destroy({ children: true });
    }
    this.propNodes.length = 0;
    this.pendingProps.length = 0;
    this.foodCartProps.length = 0;
    this.occludableProps.length = 0;
    this.buildingOccludables.length = 0;
    this.chestVisuals.length = 0;
    this.ripples.length = 0;
    this.waterWakes.length = 0;
    this.waterDroplets.length = 0;
    this.collectionOrbitHost = null;
    this.collectionOrbitItems.length = 0;

    this.buildTerrainChunks();
    this.buildZoneBoundaryMarkers();
    this.buildLilypads();
    this.buildPropsAndBuildings();
    this.buildChests();
    this.refreshPetFollower();
    this.entityLayer.addChild(this.player);
    this.refreshPetFollower();
    this.police = new PoliceSystem(nextWorld, this.atlas, this.entityLayer);
    this.atmosphere.rebuildForWorld(nextWorld);

    const landingCandidates: Array<[number, number]> = [
      [19.5 * TILE_SIZE, 53.2 * TILE_SIZE],
      [19.5 * TILE_SIZE, 54.0 * TILE_SIZE],
      [19.5 * TILE_SIZE, 55.2 * TILE_SIZE],
      [nextWorld.spawn.x, nextWorld.spawn.y],
    ];
    let landX = nextWorld.spawn.x;
    let landY = nextWorld.spawn.y;
    for (const [cx, cy] of landingCandidates) {
      if (this.pathfinder.isWalkableWorld(cx, cy)) {
        landX = cx;
        landY = cy;
        break;
      }
    }

    this.player.clearPath();
    this.player.setManualDirection(0, 0);
    this.player.position.set(landX, landY);
    this.player.zIndex = landY;
    this.player.setFacing("down");
    this.camX = landX;
    this.camY = landY;
    this.lastSavedPlayerX = landX;
    this.lastSavedPlayerY = landY;
    this.syncCameraTransform();
    this.ensureVisibleTerrainChunksBuilt();
    this.reattachRemotePlayersToEntityLayer();

    this.weatherService.setActiveMap(targetMapId);
    this.playPressSfx();
    this.callbacks.onMapChanged?.(targetMapId);
    this.callbacks.onRequestSave?.(true);

    return {
      ok: true,
      activeMapId: targetMapId,
      message: `✈️ Đã hạ cánh xuống ${MAP_LABELS[targetMapId]} thành công!`,
    };
  }

  private reattachRemotePlayersToEntityLayer(): void {
    for (const rp of this.remotePlayers.values()) {
      this.entityLayer.addChild(rp.actor);
      this.entityLayer.addChild(rp.label);
    }
  }

  public setServerClockOffsetMs(offsetMs: number): void {
    this.police.setServerClockOffsetMs(offsetMs);
  }

  public applyRemotePoliceChase(officerId: string, x: number, y: number, untilMs: number): void {
    this.police.applyRemoteChase(officerId, x, y, untilMs);
  }

  public syncRemotePlayers(
    appearances: Map<string, RemotePlayerAppearance>,
    moves: Map<string, RemotePlayerMovePacket>,
  ): void {
    for (const [uid, rp] of this.remotePlayers.entries()) {
      if (!appearances.has(uid)) {
        rp.actor.removeFromParent();
        rp.actor.destroy({ children: true });
        rp.label.removeFromParent();
        rp.label.destroy();
        if (rp.petNode) {
          rp.petNode.removeFromParent();
          rp.petNode.destroy({ children: true });
        }
        this.remotePlayers.delete(uid);
      }
    }

    for (const [uid, appData] of appearances.entries()) {
      const move = moves.get(uid);
      let entry = this.remotePlayers.get(uid);
      if (!entry) {
        const initX = move?.x ?? appData.x ?? this.player.x;
        const initY = move?.y ?? appData.y ?? this.player.y;
        const actor = new Player(initX, initY, this.atlas, {
          getSurfaceAt: (wx, wy) => this.getSurfaceAt(wx, wy),
          onWaterStep: () => {},
        });
        actor.alpha = 0.92;
        const label = new Text({
          text: appData.name,
          style: {
            fontSize: 11,
            fontWeight: "800",
            fill: "#fde047",
            stroke: { color: "#020617", width: 3 },
          },
        });
        label.anchor.set(0.5, 1);
        label.position.set(initX, initY - 72);
        label.zIndex = initY + 1;
        this.entityLayer.addChild(actor);
        this.entityLayer.addChild(label);
        entry = {
          actor,
          label,
          equippedPetId: null,
          petNode: null,
          petSprite: null,
          petIdleFrames: [],
          petRunFrames: [],
          petBaseScale: 0.4,
          petFacingSign: 1,
          petPosX: initX - 28,
          petPosY: initY + 4,
          targetX: initX,
          targetY: initY,
          vx: move?.vx ?? 0,
          vy: move?.vy ?? 0,
          facing: move?.f ?? appData.facing ?? "down",
          isMoving: move?.m ?? false,
          lastPacketAt: performance.now(),
        };
        this.remotePlayers.set(uid, entry);
      }
      entry.actor.setSkin(appData.skinId);
      entry.actor.setAppearance(appData.equipped, appData.hairId, appData.gender);
      if (entry.label.text !== appData.name) {
        entry.label.text = appData.name;
      }

      const nextPetId = appData.equippedPetId ?? null;
      if (entry.equippedPetId !== nextPetId) {
        entry.equippedPetId = nextPetId;
        if (entry.petNode) {
          entry.petNode.removeFromParent();
          entry.petNode.destroy({ children: true });
          entry.petNode = null;
          entry.petSprite = null;
          entry.petIdleFrames = [];
          entry.petRunFrames = [];
        }
        const petDef = nextPetId ? PET_BY_ID[nextPetId] : null;
        if (petDef) {
          const pNode = new Container();
          const shadow = new Sprite(this.atlas.shadow);
          shadow.anchor.set(0.5, 0.5);
          shadow.position.set(0, 6);
          shadow.width = 24;
          shadow.height = 10;
          shadow.alpha = 0.25;

          const pSprite = new Sprite();
          pSprite.anchor.set(0.5, 0.85);
          pNode.addChild(shadow, pSprite);
          entry.petPosX = entry.actor.x - 28;
          entry.petPosY = entry.actor.y + 4;
          pNode.position.set(entry.petPosX, entry.petPosY);
          pNode.zIndex = entry.petPosY;
          this.entityLayer.addChild(pNode);

          entry.petNode = pNode;
          entry.petSprite = pSprite;
          const sheet = petDef.spriteSheet;
          const targetPx = petDef.rarity === "S" ? 36 : petDef.rarity === "A" ? 33 : 30;
          entry.petBaseScale = targetPx / Math.max(1, sheet.iw);

          const sliceStrip = (tex: Texture, w: number, h: number, count: number): Texture[] => {
            const out: Texture[] = [];
            for (let i = 0; i < count; i++) {
              if ((i + 1) * w > tex.source.width + 1) break;
              out.push(
                new Texture({
                  source: tex.source,
                  frame: new Rectangle(i * w, 0, w, h),
                }),
              );
            }
            return out.length > 0 ? out : [tex];
          };
          const targetEntry = entry;
          void Promise.all([
            this.getOrbitTexture(sheet.idleSrc),
            this.getOrbitTexture(sheet.runSrc),
          ]).then(([idleTex, runTex]) => {
            if (pSprite.destroyed || targetEntry.equippedPetId !== nextPetId) return;
            targetEntry.petIdleFrames = sliceStrip(idleTex, sheet.iw, sheet.ih, sheet.ic);
            targetEntry.petRunFrames = sliceStrip(runTex, sheet.rw, sheet.rh, sheet.rc);
            pSprite.texture = targetEntry.petIdleFrames[0];
            pSprite.scale.set(targetEntry.petBaseScale * targetEntry.petFacingSign, targetEntry.petBaseScale);
          });
        }
      }
      if (move) {
        entry.targetX = move.x;
        entry.targetY = move.y;
        entry.vx = move.vx;
        entry.vy = move.vy;
        entry.facing = move.f;
        entry.isMoving = move.m;
        entry.lastPacketAt = performance.now();
      }
    }
  }

  private stepRemotePlayers(dt: number): void {
    const now = performance.now();
    for (const rp of this.remotePlayers.values()) {
      if (rp.isMoving && now - rp.lastPacketAt <= 450) {
        rp.targetX += rp.vx * dt;
        rp.targetY += rp.vy * dt;
      }
      rp.actor.syncRemotePose(rp.targetX, rp.targetY, rp.facing, rp.isMoving, dt);
      rp.label.position.set(rp.actor.x, rp.actor.y - 72);
      rp.label.zIndex = rp.actor.y + 1;

      if (rp.petNode && rp.petSprite) {
        const tx = rp.actor.x - 28;
        const ty = rp.actor.y + 6;
        const dx = tx - rp.petPosX;
        const dy = ty - rp.petPosY;
        const dist = Math.hypot(dx, dy);
        if (dist > 280) {
          rp.petPosX = tx;
          rp.petPosY = ty;
        } else {
          const followRate = 1 - Math.exp(-7.5 * dt);
          rp.petPosX += dx * followRate;
          rp.petPosY += dy * followRate;
        }
        if (Math.abs(dx) > 2) {
          rp.petFacingSign = dx >= 0 ? 1 : -1;
        }
        rp.petNode.position.set(rp.petPosX, rp.petPosY);
        rp.petNode.zIndex = rp.petPosY;
        const frames = dist > 10 && rp.petRunFrames.length > 0 ? rp.petRunFrames : rp.petIdleFrames;
        if (frames.length > 0) {
          const idx = Math.floor(this.elapsed * (dist > 10 ? 10 : 5)) % frames.length;
          if (rp.petSprite.texture !== frames[idx]) {
            rp.petSprite.texture = frames[idx];
          }
          rp.petSprite.scale.set(rp.petBaseScale * rp.petFacingSign, rp.petBaseScale);
        }
      }
    }
  }

  public applyRemoteLiveState(live: LiveStatePayload): void {
    if (live.map_id !== this.activeMapId) {
      this.switchMapWithoutFee(live.map_id, live.x, live.y);
    } else {
      const dist = Math.hypot(live.x - this.player.x, live.y - this.player.y);
      if (dist > 6) {
        this.player.clearPath();
        this.player.setManualDirection(0, 0);
        this.player.position.set(live.x, live.y);
        this.player.zIndex = live.y;
        this.camX = live.x;
        this.camY = live.y;
        this.syncCameraTransform();
      }
    }
    this.player.setFacing(live.facing);
    this.survival.hp = live.hp;
    this.survival.hunger = live.hunger;
    this.survival.stamina = live.stamina;
    this.survival.bodyTempC = live.body_temp_c;
  }

  public applyRemoteSaveState(save: PlayerGameSaveV3): void {
    const wasReady = this.isSceneReady;
    this.isSceneReady = false;
    try {
      this.inventory.replacePersistedState(save.inventory);
      this.gender = save.profile.gender ?? "male";
      this.hairId = HAIR_BY_ID[save.hairId] ? save.hairId : HAIR_OPTIONS[0].id;
      this.ownedHairIds.clear();
      for (const hid of save.ownedHairIds ?? DEFAULT_OWNED_HAIR_IDS) {
        this.ownedHairIds.add(hid);
      }
      this.equipment = { ...save.equipment };
      this.cachedEquipStats = computeEquipmentStats(this.equipment);
      this.inventory.setEquippedGear(this.equipment);
    this.inventory.setEquippedGear(this.equipment);
      this.savedOutfits = (save.savedOutfits ?? []).map((p) => ({ ...p, gear: { ...p.gear } }));
      this.survival = {
        ...save.survival,
        staminaBuff: save.survival.staminaBuff ? { ...save.survival.staminaBuff } : null,
      };
      this.onboardingDone = save.profile.onboardingDone ?? true;
      this.soundEnabled = save.profile.soundEnabled;
      this.discoveredLandmarkIds.clear();
      for (const id of save.profile.discoveredLandmarkIds ?? []) {
        this.discoveredLandmarkIds.add(id);
      }
      if (save.policeState) {
        this.detainedUntil = save.policeState.detainedUntil;
        this.ignoreUntilByOfficer = { ...save.policeState.ignoreUntilByOfficer };
        this.globalPoliceIgnoreUntil = save.policeState.globalIgnoreUntil ?? 0;
      }
      if (save.questBoard) {
        this.questBoard = save.questBoard;
      }
      if (save.reputation) {
        this.reputation = { ...save.reputation, claimedIds: [...save.reputation.claimedIds] };
      }
      this.ownedPetIds.clear();
      for (const pid of save.ownedPetIds ?? []) {
        this.ownedPetIds.add(pid);
      }
      this.equippedPetId = save.equippedPetId ?? null;

      const targetMap: MapId = save.profile.activeMapId === "japan" ? "japan" : "vietnam";
      if (targetMap !== this.activeMapId) {
        this.switchMapWithoutFee(targetMap, save.profile.x, save.profile.y);
      } else {
        this.player.clearPath();
        this.player.setManualDirection(0, 0);
        this.player.position.set(save.profile.x, save.profile.y);
        this.player.zIndex = save.profile.y;
        this.camX = save.profile.x;
        this.camY = save.profile.y;
        this.syncCameraTransform();
      }
      this.player.setSkin(save.profile.skinId);
      this.player.setAppearance(this.equipment, this.hairId, this.gender);
      this.player.setFacing(save.profile.facing);
      this.refreshPetFollower();
      this.syncChestVisualsAfterRefresh(this.chestVisuals.map((c) => c.chest.id));
      for (const cv of this.chestVisuals) {
        const opened = this.inventory.isContainerSearched(cv.chest.id);
        cv.chest.opened = opened;
        if (cv.chest.kind !== "trash") {
          cv.sprite.texture = opened ? this.atlas.chestOpen : this.atlas.chestClosed;
        }
        cv.aura.visible = !opened;
      }
    } finally {
      this.isSceneReady = wasReady;
    }
  }

  private switchMapWithoutFee(targetMapId: MapId, landX: number, landY: number): void {
    const { data: nextWorld, pathfinder: nextPathfinder } = this.getOrCreateWorld(targetMapId);
    for (const lm of nextWorld.landmarks) {
      if (this.discoveredLandmarkIds.has(lm.id)) lm.discovered = true;
    }
    this.activeMapId = targetMapId;
    this.data = nextWorld;
    this.pathfinder = nextPathfinder;
    this.forceCullUpdate = true;

    for (const child of this.groundLayer.removeChildren()) child.destroy({ children: true });
    this.terrainChunks.length = 0;
    for (const child of this.waterAnimLayer.removeChildren()) child.destroy({ children: true });
    this.lilypadSprites.length = 0;

    this.police.destroy();
    this.entityLayer.removeChild(this.player);
    for (const rp of this.remotePlayers.values()) {
      this.entityLayer.removeChild(rp.actor);
      this.entityLayer.removeChild(rp.label);
    }
    for (const child of this.entityLayer.removeChildren()) child.destroy({ children: true });

    this.propNodes.length = 0;
    this.pendingProps.length = 0;
    this.foodCartProps.length = 0;
    this.occludableProps.length = 0;
    this.buildingOccludables.length = 0;
    this.chestVisuals.length = 0;
    this.ripples.length = 0;
    this.waterWakes.length = 0;
    this.waterDroplets.length = 0;
    this.collectionOrbitHost = null;
    this.collectionOrbitItems.length = 0;

    this.buildTerrainChunks();
    this.buildZoneBoundaryMarkers();
    this.buildLilypads();
    this.buildPropsAndBuildings();
    this.buildChests();
    this.entityLayer.addChild(this.player);
    this.reattachRemotePlayersToEntityLayer();
    this.refreshPetFollower();
    this.police = new PoliceSystem(nextWorld, this.atlas, this.entityLayer);
    this.atmosphere.rebuildForWorld(nextWorld);

    this.player.clearPath();
    this.player.setManualDirection(0, 0);
    this.player.position.set(landX, landY);
    this.player.zIndex = landY;
    this.camX = landX;
    this.camY = landY;
    this.lastSavedPlayerX = landX;
    this.lastSavedPlayerY = landY;
    this.syncCameraTransform();
    this.ensureVisibleTerrainChunksBuilt();
    this.weatherService.setActiveMap(targetMapId);
    this.callbacks.onMapChanged?.(targetMapId);
  }

  public buyOrEquipGarment(
    garmentId: string,
    mode: "equip" | "pack" = "equip",
  ): { ok: boolean; message: string } {
    const def = GARMENT_BY_ID[garmentId];
    if (!def || def.excludeFromShop) return { ok: false, message: "Trang bị không tồn tại." };

    if (this.inventory.getGold() < def.priceGold) {
      return {
        ok: false,
        message: `Cần ${def.priceGold.toLocaleString("vi-VN")} Vàng để mua ${def.name}.`,
      };
    }

    if (mode === "pack") {
      const addRes = this.inventory.addItemToZone("backpack", def.inventoryItemId, "city");
      if (!addRes.ok) return addRes;
      this.inventory.trySpendGold(def.priceGold);
      this.callbacks.onRequestSave?.(true);
      return { ok: true, message: `Đã mua & cất ${def.name} vào Balo!` };
    }

    if ((def.slot === "torso" || def.slot === "legs") && this.inventory.hasPocketItems(def.slot)) {
      return {
        ok: false,
        message: `Hãy lấy hết đồ trong túi ${def.slot === "torso" ? "Áo" : "Quần"} ra trước khi đổi trang bị!`,
      };
    }

    // Physical equipment rule: replacing an already-worn garment must fit the old one into Balo
    // (0-value prisoner uniform is automatically replaced if Balo is missing or full).
    const prevId = this.equipment[def.slot];
    const prevDef = prevId ? GARMENT_BY_ID[prevId] : null;
    if (prevDef && !prevDef.excludeFromShop) {
      const fit = this.inventory.canFitItemInZone("backpack", prevDef.inventoryItemId);
      if (!fit) {
        return {
          ok: false,
          message: `Balo không đủ chỗ (${prevDef.gridW}×${prevDef.gridH} ô) để cất ${prevDef.name} cũ! Hãy dọn Balo hoặc gửi đồ về Nhà.`,
        };
      }
    }

    if (!this.inventory.trySpendGold(def.priceGold)) {
      return { ok: false, message: "Không đủ Vàng." };
    }

    if (prevDef) {
      if (!prevDef.excludeFromShop || this.inventory.canFitItemInZone("backpack", prevDef.inventoryItemId)) {
        this.inventory.addItemToZone("backpack", prevDef.inventoryItemId, "city");
      }
    }

    this.equipment[def.slot] = def.id;
    this.cachedEquipStats = computeEquipmentStats(this.equipment);
    this.inventory.setEquippedGear(this.equipment);
    this.player.setAppearance(this.equipment, this.hairId, this.gender);
    this.callbacks.onRequestSave?.(true);

    return {
      ok: true,
      message: prevDef
        ? `Đã mua & mặc ${def.name}${prevDef.excludeFromShop ? "" : " (đồ cũ cất vào Balo)"}!`
        : `Mua & mặc ${def.name} thành công!`,
    };
  }

  public unequipSlotTo(
    slot: EquipmentSlot,
    destZone: "backpack" | "home" | "safebox",
  ): { ok: boolean; message: string } {
    const curId = this.equipment[slot];
    if (!curId) return { ok: false, message: "Ô trang bị đang trống." };
    const def = GARMENT_BY_ID[curId];
    if (!def) return { ok: false, message: "Trang bị không hợp lệ." };
    if ((slot === "torso" || slot === "legs") && this.inventory.hasPocketItems(slot)) {
      return {
        ok: false,
        message: `Hãy lấy hết đồ trong túi ${slot === "torso" ? "Áo" : "Quần"} ra trước khi tháo!`,
      };
    }

    const addRes = this.inventory.addItemToZone(destZone, def.inventoryItemId, "city");
    if (!addRes.ok) return addRes;

    this.equipment[slot] = null;
    this.cachedEquipStats = computeEquipmentStats(this.equipment);
    this.inventory.setEquippedGear(this.equipment);
    this.player.setAppearance(this.equipment, this.hairId, this.gender);
    this.callbacks.onRequestSave?.(true);
    const label = destZone === "home" ? "Kho Nhà" : destZone === "safebox" ? "Safebox" : "Balo";
    return {
      ok: true,
      message: `Đã tháo ${def.name} cất vào ${label}.`,
    };
  }

  public equipGarmentFromInventory(
    zone: "backpack" | "home" | "safebox",
    uid: string,
  ): { ok: boolean; message: string } {
    const sourceItems =
      zone === "home"
        ? this.inventory.getHomeItems()
        : zone === "safebox"
          ? this.inventory.getSafeboxItems()
          : this.inventory.getBackpackItems();
    const inst = sourceItems.find((i) => i.uid === uid);
    if (!inst) return { ok: false, message: "Không tìm thấy trang bị." };
    const itemDef = ITEM_BY_ID[inst.itemId];
    const garmentDef = itemDef?.garmentId ? GARMENT_BY_ID[itemDef.garmentId] : null;
    if (!garmentDef) return { ok: false, message: "Vật phẩm này không phải quần áo/trang bị." };
    if (
      (garmentDef.slot === "torso" || garmentDef.slot === "legs") &&
      this.inventory.hasPocketItems(garmentDef.slot)
    ) {
      return {
        ok: false,
        message: `Hãy lấy hết đồ trong túi ${garmentDef.slot === "torso" ? "Áo" : "Quần"} ra trước khi đổi trang bị!`,
      };
    }

    const zoneLabel = zone === "home" ? "Kho Nhà" : zone === "safebox" ? "Safebox" : "Balo";
    const prevId = this.equipment[garmentDef.slot];
    if (prevId) {
      const prevDef = GARMENT_BY_ID[prevId];
      if (prevDef) {
        const fit = this.inventory.canFitItemInZone(zone, prevDef.inventoryItemId, uid);
        if (!fit) {
          return {
            ok: false,
            message: `${zoneLabel} không đủ ô (${prevDef.gridW}×${prevDef.gridH}) để hoán đổi với ${prevDef.name}!`,
          };
        }
      }
    }

    this.inventory.removeItemFromZone(zone, uid);
    if (prevId) {
      const prevDef = GARMENT_BY_ID[prevId];
      if (prevDef) {
        this.inventory.addItemToZone(zone, prevDef.inventoryItemId, inst.originBiome);
      }
    }

    this.equipment[garmentDef.slot] = garmentDef.id;
    this.cachedEquipStats = computeEquipmentStats(this.equipment);
    this.inventory.setEquippedGear(this.equipment);
    this.player.setAppearance(this.equipment, this.hairId, this.gender);
    this.callbacks.onRequestSave?.(true);

    return {
      ok: true,
      message: prevId
        ? `Đã mặc ${garmentDef.name} (cất đồ cũ vào ${zoneLabel}).`
        : `Đã mặc ${garmentDef.name} lên người!`,
    };
  }

  public buyBackpack(
    tierId: string,
    mode: "equip" | "pack" = "equip",
    packZone: "backpack" | "safebox" = "backpack",
  ): { ok: boolean; message: string } {
    const res = this.inventory.buyBackpack(tierId, mode, packZone);
    if (res.ok) this.callbacks.onRequestSave?.(true);
    return res;
  }

  public equipBackpackFromInventory(
    zone: GridZone,
    uid: string,
    containerId: string | null = null,
  ): { ok: boolean; message: string } {
    const res = this.inventory.equipBackpackFromInventory(zone, uid, containerId);
    if (res.ok) this.callbacks.onRequestSave?.(true);
    return res;
  }

  public unequipEquippedBackpackTo(destZone: "home" | "safebox"): { ok: boolean; message: string } {
    const res = this.inventory.unequipBackpackTo(destZone);
    if (res.ok) this.callbacks.onRequestSave?.(true);
    return res;
  }

  public sellEquippedBackpack(): { ok: boolean; earnedGold: number; message: string } {
    const res = this.inventory.sellEquippedBackpack();
    if (res.ok) this.callbacks.onRequestSave?.(true);
    return res;
  }

  public isAtHome(): boolean {
    if (this.isInJail) return false;
    return this.getNearbyInteraction()?.type === "home";
  }

  public isAtCollectionHall(): boolean {
    if (this.isInJail) return false;
    return this.getNearbyInteraction()?.type === "collection";
  }

  public isAtAuctionHouse(): boolean {
    if (this.isInJail) return false;
    return this.getNearbyInteraction()?.type === "auction";
  }

  public isAtQuestBoard(): boolean {
    if (this.isInJail) return false;
    return this.getNearbyInteraction()?.type === "quest";
  }

  public isAtReputationHall(): boolean {
    if (this.isInJail) return false;
    return this.getNearbyInteraction()?.type === "reputation";
  }

  public isAtPetGacha(): boolean {
    if (this.isInJail) return false;
    return this.getNearbyInteraction()?.type === "gacha";
  }

  public getOwnedPetIds(): string[] {
    return Array.from(this.ownedPetIds);
  }

  public getEquippedPet(): PetDef | null {
    return this.equippedPetId ? (PET_BY_ID[this.equippedPetId] ?? null) : null;
  }

  public equipPet(petId: string | null): { ok: boolean; message: string } {
    if (petId !== null && !this.ownedPetIds.has(petId)) {
      return { ok: false, message: "Bạn chưa sở hữu thú cưng này." };
    }
    this.equippedPetId = petId;
    this.refreshPetFollower();
    this.playPressSfx();
    this.callbacks.onRequestSave?.(true);
    const pet = petId ? PET_BY_ID[petId] : null;
    return {
      ok: true,
      message: pet ? `🐾 Đã chọn ${pet.emoji} ${pet.name} đồng hành!` : "Đã cho thú cưng nghỉ ngơi.",
    };
  }

  public rollPetGacha(times: 1 | 5): {
    ok: boolean;
    results: GachaRollOutcome[];
    message: string;
  } {
    if (!this.isAtPetGacha()) {
      return {
        ok: false,
        results: [],
        message: "🐾 Hãy đến Nhà Nhận Nuôi Thú Cưng để nhận nuôi!",
      };
    }
    const cost = times * PET_GACHA_COST_GOLD;
    if (!this.inventory.trySpendGold(cost)) {
      return {
        ok: false,
        results: [],
        message: `Cần ${cost.toLocaleString("vi-VN")} Vàng để quay ${times} lần!`,
      };
    }

    const results: GachaRollOutcome[] = [];
    for (let i = 0; i < times; i++) {
      const rolled = rollPetGachaOutcome(this.activeMapId);
      if (rolled.kind === "pet") {
        const isDuplicate = this.ownedPetIds.has(rolled.pet.id);
        const refundGold = isDuplicate ? PET_DUPLICATE_REFUND_GOLD[rolled.rarity] : 0;
        if (isDuplicate) {
          this.inventory.addGold(refundGold);
        } else {
          this.ownedPetIds.add(rolled.pet.id);
          if (!this.equippedPetId) {
            this.equippedPetId = rolled.pet.id;
            this.refreshPetFollower();
          }
        }
        results.push({
          kind: "pet",
          rarity: rolled.rarity,
          pet: rolled.pet,
          isDuplicate,
          refundGold,
        });
      } else {
        const bagRes = this.inventory.addItemToZone("backpack", rolled.item.id, "city");
        let storedWhere: "backpack" | "home" | "sold_overflow" = "backpack";
        let overflowGold = 0;
        if (!bagRes.ok) {
          const homeRes = this.inventory.addItemToZone("home", rolled.item.id, "city");
          if (homeRes.ok) {
            storedWhere = "home";
          } else {
            storedWhere = "sold_overflow";
            overflowGold = rolled.item.valueGold;
            this.inventory.addGold(overflowGold);
          }
        }
        if (rolled.rarity === "A" || rolled.rarity === "S") {
          this.reputation.rareItemsLooted += 1;
          if (rolled.rarity === "S") this.reputation.redItemsLooted += 1;
        }
        results.push({
          kind: "item",
          rarity: rolled.rarity,
          item: rolled.item,
          storedWhere,
          overflowGold,
        });
      }
    }

    this.playPressSfx();
    this.callbacks.onRequestSave?.(true);
    const petHits = results.filter((r) => r.kind === "pet").length;
    return {
      ok: true,
      results,
      message:
        petHits > 0
          ? `🎉 Trúng ${petHits} thú cưng trong ${times} lượt quay!`
          : `🎰 Đã quay ${times} lần — nhận ${results.length} vật phẩm!`,
    };
  }

  public depositCollectionItem(itemId: string) {
    const res = this.inventory.depositCollectionDisplayItem(itemId);
    if (res.ok) {
      this.refreshCollectionOrbitSprites();
      this.callbacks.onRequestSave?.(true);
    }
    return res;
  }

  public withdrawCollectionItem(itemId: string) {
    const res = this.inventory.withdrawCollectionDisplayItem(itemId);
    if (res.ok) {
      this.refreshCollectionOrbitSprites();
      this.callbacks.onRequestSave?.(true);
    }
    return res;
  }

  public upgradeCollectionLight(itemId: string) {
    const res = this.inventory.upgradeCollectionLight(itemId);
    if (res.ok) {
      this.refreshCollectionOrbitSprites();
      this.callbacks.onRequestSave?.(true);
    }
    return res;
  }

  public deliverUpgradeItem(
    kind: UpgradeKind,
    itemId: string,
    openedFromHome = false,
  ) {
    const res = this.inventory.deliverUpgradeItem(kind, itemId, openedFromHome || this.isAtHome());
    if (res.upgraded) this.reputation.homeUpgradesCompleted += 1;
    if (res.ok) this.callbacks.onRequestSave?.(true);
    return res;
  }

  public deliverAllUpgradeItems(kind: UpgradeKind, openedFromHome = false) {
    const res = this.inventory.deliverAllUpgradeItems(kind, openedFromHome || this.isAtHome());
    if (res.upgraded) this.reputation.homeUpgradesCompleted += 1;
    if (res.deliveredTotal > 0 || res.upgraded) this.callbacks.onRequestSave?.(true);
    return res;
  }

  public deliverSafeboxItem(itemId: string, openedFromHome = false) {
    return this.deliverUpgradeItem("safebox", itemId, openedFromHome);
  }

  public deliverAllSafeboxItems(openedFromHome = false) {
    return this.deliverAllUpgradeItems("safebox", openedFromHome);
  }

  public requestSaveNow(immediate = true): void {
    this.callbacks.onRequestSave?.(immediate);
  }

  public getSavedOutfits(): readonly SavedOutfitPreset[] {
    return this.savedOutfits.map((p) => ({ ...p, gear: { ...p.gear } }));
  }

  public saveCurrentOutfitPreset(
    sourceGear?: EquippedGear | null,
    customName?: string,
  ): { ok: boolean; preset?: SavedOutfitPreset; message: string } {
    const raw = sourceGear ?? this.equipment;
    const slots: readonly EquipmentSlot[] = ["hat", "torso", "legs", "feet", "accessory"];
    const cleanGear: EquippedGear = {
      hat: null,
      torso: null,
      legs: null,
      feet: null,
      accessory: null,
    };

    for (const slot of slots) {
      const id = raw[slot];
      if (!id) continue;
      const def = GARMENT_BY_ID[id];
      if (!def || def.slot !== slot || def.excludeFromShop) continue;
      cleanGear[slot] = def.id;
    }

    if (!Object.values(cleanGear).some(Boolean)) {
      return {
        ok: false,
        message: "Chưa có trang bị hợp lệ (không tính đồ tù nhân) để lưu bộ!",
      };
    }

    const dup = this.savedOutfits.find((p) =>
      slots.every((s) => (p.gear[s] ?? null) === (cleanGear[s] ?? null)),
    );
    if (dup) {
      return {
        ok: false,
        message: `Bộ trang phục này đã được lưu sẵn (${dup.name})!`,
      };
    }

    if (this.savedOutfits.length >= MAX_SAVED_OUTFIT_PRESETS) {
      return {
        ok: false,
        message: `Chỉ lưu tối đa ${MAX_SAVED_OUTFIT_PRESETS} bộ — hãy xóa bớt bộ cũ trước!`,
      };
    }

    const mainId = cleanGear.torso ?? cleanGear.legs ?? cleanGear.hat ?? cleanGear.feet ?? cleanGear.accessory;
    const mainName = mainId && GARMENT_BY_ID[mainId] ? GARMENT_BY_ID[mainId].name : "Phong cách";
    const preset: SavedOutfitPreset = {
      id: `outfit_${Date.now().toString(36)}_${Math.floor(Math.random() * 999)}`,
      name:
        customName && customName.trim().length > 0
          ? customName.trim().slice(0, 38)
          : `Bộ #${this.savedOutfits.length + 1} • ${mainName.slice(0, 18)}`,
      gear: cleanGear,
      savedAt: Date.now(),
    };
    this.savedOutfits.push(preset);
    this.callbacks.onRequestSave?.(true);
    return {
      ok: true,
      preset,
      message: `💾 Đã lưu "${preset.name}" để mua nhanh sau này!`,
    };
  }

  public deleteSavedOutfitPreset(presetId: string): boolean {
    const idx = this.savedOutfits.findIndex((p) => p.id === presetId);
    if (idx === -1) return false;
    this.savedOutfits.splice(idx, 1);
    this.callbacks.onRequestSave?.(true);
    return true;
  }

  public previewOutfitPresetPurchase(presetId: string): {
    ok: boolean;
    preset?: SavedOutfitPreset;
    alreadyWorn: GarmentDef[];
    equipFromOwned: Array<{ slot: EquipmentSlot; def: GarmentDef; zone: "backpack" | "safebox"; uid: string }>;
    missingBuy: Array<{ slot: EquipmentSlot; def: GarmentDef }>;
    unavailableStarter: GarmentDef[];
    displacedSlots: Array<{ slot: EquipmentSlot; prevDef: GarmentDef; destZone: "backpack" | "safebox" }>;
    totalCost: number;
    blockedReason?: string;
  } {
    const preset = this.savedOutfits.find((p) => p.id === presetId);
    if (!preset) {
      return {
        ok: false,
        alreadyWorn: [],
        equipFromOwned: [],
        missingBuy: [],
        unavailableStarter: [],
        displacedSlots: [],
        totalCost: 0,
        blockedReason: "Không tìm thấy bộ trang phục đã lưu.",
      };
    }

    const slots: readonly EquipmentSlot[] = ["hat", "torso", "legs", "feet", "accessory"];
    const alreadyWorn: GarmentDef[] = [];
    const equipFromOwned: Array<{ slot: EquipmentSlot; def: GarmentDef; zone: "backpack" | "safebox"; uid: string }> = [];
    const missingBuy: Array<{ slot: EquipmentSlot; def: GarmentDef }> = [];
    const unavailableStarter: GarmentDef[] = [];
    const claimedOwnedUids = new Set<string>();
    const activeSlotsToChange: Array<{ slot: EquipmentSlot; targetDef: GarmentDef }> = [];

    const bpItems = this.inventory.getBackpackItems();
    const sbItems = this.inventory.getSafeboxItems();

    for (const slot of slots) {
      const targetId = preset.gear[slot];
      if (!targetId) continue;
      const def = GARMENT_BY_ID[targetId];
      if (!def) continue;

      if (this.equipment[slot] === def.id) {
        alreadyWorn.push(def);
        continue;
      }

      const ownedBp = bpItems.find((i) => i.itemId === def.inventoryItemId && !claimedOwnedUids.has(i.uid));
      if (ownedBp) {
        claimedOwnedUids.add(ownedBp.uid);
        equipFromOwned.push({ slot, def, zone: "backpack", uid: ownedBp.uid });
        activeSlotsToChange.push({ slot, targetDef: def });
        continue;
      }
      const ownedSb = sbItems.find((i) => i.itemId === def.inventoryItemId && !claimedOwnedUids.has(i.uid));
      if (ownedSb) {
        claimedOwnedUids.add(ownedSb.uid);
        equipFromOwned.push({ slot, def, zone: "safebox", uid: ownedSb.uid });
        activeSlotsToChange.push({ slot, targetDef: def });
        continue;
      }

      if (def.priceGold <= 0) {
        unavailableStarter.push(def);
        continue;
      }

      missingBuy.push({ slot, def });
      activeSlotsToChange.push({ slot, targetDef: def });
    }

    const totalCost = missingBuy.reduce((acc, m) => acc + m.def.priceGold, 0);

    // Simulate placing replaced worn non-prison garments into freed Backpack / Safebox grids
    const bpTier = this.inventory.getBackpackTier();
    const sbTier = this.inventory.getSafeboxTier();
    const simBp: GridItemInstance[] = bpItems.filter((i) => !claimedOwnedUids.has(i.uid)).map((i) => ({ ...i }));
    const simSb: GridItemInstance[] = sbItems.filter((i) => !claimedOwnedUids.has(i.uid)).map((i) => ({ ...i }));

    const displacedSlots: Array<{ slot: EquipmentSlot; prevDef: GarmentDef; destZone: "backpack" | "safebox" }> = [];
    for (const { slot } of activeSlotsToChange) {
      if ((slot === "torso" || slot === "legs") && this.inventory.hasPocketItems(slot)) {
        return {
          ok: false,
          preset,
          alreadyWorn,
          equipFromOwned,
          missingBuy,
          unavailableStarter,
          displacedSlots,
          totalCost,
          blockedReason: `Hãy lấy hết đồ trong túi ${slot === "torso" ? "Áo" : "Quần"} ra trước khi đổi bộ đồ!`,
        };
      }
      const prevId = this.equipment[slot];
      if (!prevId) continue;
      const prevDef = GARMENT_BY_ID[prevId];
      if (!prevDef || prevDef.excludeFromShop) continue;

      const prevItemDef = ITEM_BY_ID[prevDef.inventoryItemId];
      if (!prevItemDef) continue;

      const fitBp = bpTier
        ? findFirstFitOnGrid(bpTier.cols, bpTier.rows, simBp, prevItemDef, false)
        : null;
      if (fitBp) {
        simBp.push({
          uid: `sim_${displacedSlots.length}`,
          itemId: prevItemDef.id,
          x: fitBp.x,
          y: fitBp.y,
          rotated: fitBp.rotated,
          originBiome: "city",
          revealed: true,
        });
        displacedSlots.push({ slot, prevDef, destZone: "backpack" });
        continue;
      }

      const fitSb = findFirstFitOnGrid(sbTier.cols, sbTier.rows, simSb, prevItemDef, false);
      if (fitSb) {
        simSb.push({
          uid: `sim_${displacedSlots.length}`,
          itemId: prevItemDef.id,
          x: fitSb.x,
          y: fitSb.y,
          rotated: fitSb.rotated,
          originBiome: "city",
          revealed: true,
        });
        displacedSlots.push({ slot, prevDef, destZone: "safebox" });
        continue;
      }

      return {
        ok: false,
        preset,
        alreadyWorn,
        equipFromOwned,
        missingBuy,
        unavailableStarter,
        displacedSlots,
        totalCost,
        blockedReason: `Balo & Safebox không đủ chỗ (${prevDef.gridW}×${prevDef.gridH} ô) để cất lại ${prevDef.name} đang mặc!`,
      };
    }

    return {
      ok: true,
      preset,
      alreadyWorn,
      equipFromOwned,
      missingBuy,
      unavailableStarter,
      displacedSlots,
      totalCost,
    };
  }

  public buyAndEquipOutfitPreset(presetId: string): {
    ok: boolean;
    message: string;
    spentGold: number;
  } {
    const plan = this.previewOutfitPresetPurchase(presetId);
    if (!plan.ok || !plan.preset) {
      return {
        ok: false,
        message: plan.blockedReason ?? "Không thể mặc bộ trang phục.",
        spentGold: 0,
      };
    }

    if (plan.equipFromOwned.length === 0 && plan.missingBuy.length === 0) {
      return {
        ok: false,
        message: "Bạn đang mặc đầy đủ bộ trang phục này rồi!",
        spentGold: 0,
      };
    }

    if (this.inventory.getGold() < plan.totalCost) {
      return {
        ok: false,
        message: `Cần ${plan.totalCost.toLocaleString("vi-VN")} Vàng để mua phần còn thiếu của bộ "${plan.preset.name}".`,
        spentGold: 0,
      };
    }

    if (plan.totalCost > 0 && !this.inventory.trySpendGold(plan.totalCost)) {
      return { ok: false, message: "Không đủ Vàng.", spentGold: 0 };
    }

    for (const owned of plan.equipFromOwned) {
      this.inventory.removeItemFromZone(owned.zone, owned.uid);
    }
    for (const disp of plan.displacedSlots) {
      this.inventory.addItemToZone(disp.destZone, disp.prevDef.inventoryItemId, "city");
    }
    for (const owned of plan.equipFromOwned) {
      this.equipment[owned.slot] = owned.def.id;
    }
    for (const buy of plan.missingBuy) {
      this.equipment[buy.slot] = buy.def.id;
    }

    this.cachedEquipStats = computeEquipmentStats(this.equipment);
    this.inventory.setEquippedGear(this.equipment);
    this.player.setAppearance(this.equipment, this.hairId, this.gender);
    this.callbacks.onRequestSave?.(true);

    return {
      ok: true,
      spentGold: plan.totalCost,
      message:
        plan.totalCost > 0
          ? `⚡ Đã mua (${plan.totalCost.toLocaleString("vi-VN")} Vàng) & mặc nhanh "${plan.preset.name}"!`
          : `👕 Đã mặc nhanh "${plan.preset.name}" từ đồ sẵn có!`,
    };
  }

  public getQuickUseConsumables(limit = 6): Array<{
    uid: string;
    itemDef: CollectibleItemDef;
    consumable: ConsumableDef;
    count: number;
  }> {
    const sorted = [...this.inventory.getBackpackItems()].sort((a, b) =>
      a.y !== b.y ? a.y - b.y : a.x - b.x,
    );
    const byId = new Map<
      string,
      {
        uid: string;
        itemDef: CollectibleItemDef;
        consumable: ConsumableDef;
        count: number;
      }
    >();
    const results: Array<{
      uid: string;
      itemDef: CollectibleItemDef;
      consumable: ConsumableDef;
      count: number;
    }> = [];
    for (const inst of sorted) {
      const itemDef = ITEM_BY_ID[inst.itemId];
      const consumable = itemDef?.consumableId ? CONSUMABLE_BY_ID[itemDef.consumableId] : null;
      if (!itemDef || !consumable) continue;
      const remUses = getItemRemainingUses(inst, itemDef);
      const existing = byId.get(consumable.id);
      if (existing) {
        existing.count += remUses;
        continue;
      }
      if (results.length >= limit) continue;
      const entry = { uid: inst.uid, itemDef, consumable, count: remUses };
      byId.set(consumable.id, entry);
      results.push(entry);
    }
    return results;
  }

  public getPendingConsumeProgress(): {
    name: string;
    emoji: string;
    progress01: number;
    remainingSec: number;
  } | null {
    if (!this.pendingConsume) return null;
    const { consumable, elapsedMs, durationMs } = this.pendingConsume;
    const progress01 = Math.min(1, Math.max(0, elapsedMs / Math.max(1, durationMs)));
    const remainingSec = Math.max(0, (durationMs - elapsedMs) / 1000);
    return {
      name: consumable.name,
      emoji: consumable.emoji,
      progress01,
      remainingSec,
    };
  }

  public buyConsumable(
    consumableId: string,
    mode: "eat" | "pack",
  ): { ok: boolean; started?: boolean; message: string } {
    const def = CONSUMABLE_BY_ID[consumableId];
    if (!def) return { ok: false, message: "Vật phẩm không tồn tại." };

    if (mode === "pack") {
      if (this.inventory.getSummary().walletGold < def.priceGold) {
        return {
          ok: false,
          message: `Cần ${def.priceGold.toLocaleString("vi-VN")} Vàng để mua ${def.name}.`,
        };
      }
      const addRes = this.inventory.addItemToBackpack(def.inventoryItemId, "city");
      if (!addRes.ok) return addRes;
      this.inventory.trySpendGold(def.priceGold);
      this.callbacks.onRequestSave?.(true);
      return {
        ok: true,
        message: `Đã mua & cất ${def.name} (${def.maxUses} lần dùng) vào Balo!`,
      };
    }

    if (this.pendingConsume) {
      return {
        ok: false,
        message: `Đang dùng ${this.pendingConsume.consumable.name}, vui lòng chờ xong!`,
      };
    }

    const singlePrice = getConsumableSingleUsePrice(def);
    if (this.inventory.getSummary().walletGold < singlePrice) {
      return {
        ok: false,
        message: `Cần ${singlePrice.toLocaleString("vi-VN")} Vàng để dùng 1 phần ${def.name}.`,
      };
    }

    this.pendingConsume = {
      consumable: def,
      backpackUid: null,
      priceGold: singlePrice,
      elapsedMs: 0,
      durationMs: def.useDurationMs,
    };
    return {
      ok: true,
      started: true,
      message: `Đang sử dụng ${def.name} (${(def.useDurationMs / 1000).toFixed(1)}s)...`,
    };
  }

  public useBackpackFood(uid: string): { ok: boolean; started?: boolean; message: string } {
    if (this.pendingConsume) {
      return {
        ok: false,
        message: `Đang dùng ${this.pendingConsume.consumable.name}, vui lòng chờ xong!`,
      };
    }
    const inst = this.inventory.getBackpackItems().find((i) => i.uid === uid);
    const itemDef = inst ? ITEM_BY_ID[inst.itemId] : null;
    const def = itemDef?.consumableId ? CONSUMABLE_BY_ID[itemDef.consumableId] : null;
    if (!inst || !def) {
      return { ok: false, message: "Vật phẩm này không thể ăn/uống trực tiếp." };
    }

    this.pendingConsume = {
      consumable: def,
      backpackUid: uid,
      priceGold: 0,
      elapsedMs: 0,
      durationMs: def.useDurationMs,
    };
    return {
      ok: true,
      started: true,
      message: `Đang sử dụng ${def.name} (${(def.useDurationMs / 1000).toFixed(1)}s)...`,
    };
  }

  private applyConsumableEffect(c: ConsumableDef): void {
    this.reputation.consumablesUsed += 1;
    if (c.staminaBoostPct && c.staminaBoostDurationMs) {
      this.survival.staminaBuff = {
        boostPct: c.staminaBoostPct,
        expiresAt: Date.now() + c.staminaBoostDurationMs,
      };
    }
    const maxStamina = getActiveStaminaMax(
      this.survival,
      Date.now(),
      this.inventory.getPermanentStaminaBonusPct(),
    );

    if (c.isFullRestore) {
      this.survival.hp = 100;
      this.survival.hunger = 100;
      this.survival.stamina = maxStamina;
      this.survival.bodyTempC = SURVIVAL_IDEAL_TEMP_C;
    } else {
      this.survival.hunger = Math.min(100, this.survival.hunger + c.hungerRestore);
      this.survival.stamina = Math.min(maxStamina, this.survival.stamina + c.staminaRestore);
      this.survival.hp = Math.min(100, this.survival.hp + c.hpRestore);
      if (c.id === "food_medkit") {
        this.survival.bodyTempC += (SURVIVAL_IDEAL_TEMP_C - this.survival.bodyTempC) * 0.65;
      } else if (c.tempDeltaC !== 0) {
        this.survival.bodyTempC = Math.max(
          34.0,
          Math.min(41.0, this.survival.bodyTempC + c.tempDeltaC),
        );
      }
    }
    this.callbacks.onRequestSave?.(true);
  }

  private stepPendingConsume(dtSeconds: number): void {
    if (!this.pendingConsume) return;
    this.pendingConsume.elapsedMs += dtSeconds * 1000;
    if (this.pendingConsume.elapsedMs < this.pendingConsume.durationMs) return;

    const job = this.pendingConsume;
    this.pendingConsume = null;

    if (job.backpackUid) {
      const consumed = this.inventory.consumeBackpackItem(job.backpackUid);
      if (!consumed) return;
      this.applyConsumableEffect(consumed);
      const remainingInst = this.inventory.getBackpackItems().find((i) => i.uid === job.backpackUid);
      const usesTitle = remainingInst
        ? `Còn ${getItemRemainingUses(remainingInst)}/${consumed.maxUses} lần`
        : `0/${consumed.maxUses} lần`;
      const buffNote = consumed.staminaBoostPct
        ? ` +${consumed.staminaBoostPct}% Thể lực (${Math.round((consumed.staminaBoostDurationMs ?? 0) / 60_000)} phút)`
        : "";
      this.callbacks.onConsumeCompleted?.(
        remainingInst
          ? `${consumed.emoji} Đã dùng ${consumed.name} (${usesTitle})`
          : `${consumed.emoji} Đã dùng hết ${consumed.name} (${usesTitle})`,
        consumed.isFullRestore
          ? "Hồi phục 100% Máu, Đói, Thể lực & Thân nhiệt!"
          : `+${consumed.hungerRestore} Đói, +${consumed.staminaRestore} Thể lực, +${consumed.hpRestore} Máu.${buffNote}`,
      );
      return;
    }

    if (job.priceGold > 0 && !this.inventory.trySpendGold(job.priceGold)) {
      this.callbacks.onConsumeCompleted?.("Không đủ Vàng", "Không thể hoàn tất giao dịch.");
      return;
    }

    this.applyConsumableEffect(job.consumable);
    const buffNote = job.consumable.staminaBoostPct
      ? ` +${job.consumable.staminaBoostPct}% Thể lực (${Math.round((job.consumable.staminaBoostDurationMs ?? 0) / 60_000)} phút)`
      : "";
    this.callbacks.onConsumeCompleted?.(
      `${job.consumable.emoji} Đã dùng ${job.consumable.name}`,
      job.consumable.isFullRestore
        ? "Hồi phục 100% Máu, Đói, Thể lực & Thân nhiệt!"
        : `+${job.consumable.hungerRestore} Đói, +${job.consumable.staminaRestore} Thể lực, +${job.consumable.hpRestore} Máu.${buffNote}`,
    );
  }

  public setCharacterSkin(skinId: CharacterSkinId): void {
    this.player.setSkin(skinId);
    this.callbacks.onRequestSave?.(true);
  }

  public getCharacterSkin(): CharacterSkinId {
    return this.player.getSkin();
  }

  public cycleEnvironmentPreset(): EnvironmentPreset {
    return this.weatherService.cyclePreset();
  }

  public getEnvironmentState(): EnvironmentState {
    return this.weatherService.getEnvironmentState();
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    sound.muteAll();
    if (enabled) {
      sound.unmuteAll();
    }
    this.callbacks.onRequestSave?.(true);
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
    if (this.isMovementLocked()) return;
    if (this.isInJail) {
      const clampedX = Math.max(0, Math.min(JAIL_WIDTH, worldX));
      const clampedY = Math.max(0, Math.min(JAIL_HEIGHT, worldY));
      const path = this.jailRoom.pathfinder.findPath(
        { x: this.player.x, y: this.player.y },
        { x: clampedX, y: clampedY },
      );
      if (path.length > 0) {
        this.player.setPath(path);
        const end = path[path.length - 1];
        this.jailRoom.addRipple(end.x, end.y, 0x34d399);
      } else {
        this.jailRoom.addRipple(clampedX, clampedY, 0xf43f5e);
      }
      if (playSfx && this.soundEnabled) {
        try {
          sound.play("sfx-press", { volume: 0.22 });
        } catch {
          // AudioContext unlocks automatically on first user gesture
        }
      }
      return;
    }
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

  public getSecurityZoneAt(x: number, y: number): SecurityZone {
    const col = Math.max(0, Math.min(this.data.cols - 1, Math.floor(x / TILE_SIZE)));
    const row = Math.max(0, Math.min(this.data.rows - 1, Math.floor(y / TILE_SIZE)));
    return this.data.securityZones[row * this.data.cols + col];
  }

  private isInSnowZoneAt(x: number): boolean {
    if (this.activeMapId !== "japan") return false;
    const col = Math.floor(x / TILE_SIZE);
    return col >= JAPAN_SNOW_START_COL;
  }

  public getCurrentSecurityZone(): SecurityZone {
    if (this.isInJail) return "green";
    return this.getSecurityZoneAt(this.player.x, this.player.y);
  }

  public setLootingOpen(isOpen: boolean): void {
    this.isLootingContainerOpen = isOpen;
    if (!isOpen) this.lootingCheckAccum = 0;
  }

  public getGlobalPoliceIgnoreRemainingMs(): number {
    return Math.max(0, this.globalPoliceIgnoreUntil - Date.now());
  }

  public getPlayerSurfaceState(): SurfaceState {
    return this.player.getSurfaceState();
  }

  public getSurfaceAt(x: number, y: number): SurfaceState {
    if (this.isInJail) return "dry";
    const col = Math.max(0, Math.min(this.data.cols - 1, Math.floor(x / TILE_SIZE)));
    const row = Math.max(0, Math.min(this.data.rows - 1, Math.floor(y / TILE_SIZE)));
    const tile = this.data.tiles[row * this.data.cols + col];
    if (tile === "water") return "swim";
    if (tile === "shallow" || tile === "puddle") return "wade";
    return "dry";
  }

  public getDestination(): Point | null {
    return this.player.getDestination();
  }

  public navigateToBuildingKind(kind: BuildingKind): { ok: boolean; name: string } {
    const jpNames: Partial<Record<BuildingKind, string>> = {
      city_home_house: "🏯 Dinh Thự Riêng Tokyo",
      city_collection_hall: "🗼 Tháp Bảo Tàng Tokyo",
      city_auction_house: "⚖️ Sàn Đấu Giá Tokyo",
      city_backpack_shop: "🎒 Tiệm Balo Akihabara",
      city_clothing_shop: "👘 Tiệm Kimono & Giáp Samurai",
      city_butcher_shop: "🍜 Quán Ramen Ichiraku",
      city_pharmacy: "💊 Dược Đường Kanpo",
      city_airport: "✈️ Sân Bay Narita",
      city_quest_guild: "📜 Bảng Ủy Thác Tokyo",
      city_reputation_hall: "🏛️ Sảnh Danh Vọng Tokyo",
      city_pet_gacha: "🐾 Nhà Nhận Nuôi Thú Cưng",
    };
    const label = (this.activeMapId === "japan" ? jpNames[kind] : undefined) ?? BUILDING_META[kind].name;
    const prop = this.data.props.find((p) => p.kind === kind);
    if (!prop) {
      return { ok: false, name: `Không tìm thấy ${label}` };
    }
    const offsets: Array<[number, number]> = [
      [0, 42],
      [0, 56],
      [-36, 42],
      [36, 42],
      [-48, 24],
      [48, 24],
      [0, -24],
    ];
    let targetX = prop.x;
    let targetY = prop.y + 42;
    for (const [ox, oy] of offsets) {
      if (this.pathfinder.isWalkableWorld(prop.x + ox, prop.y + oy)) {
        targetX = prop.x + ox;
        targetY = prop.y + oy;
        break;
      }
    }
    this.moveToWorldPoint(targetX, targetY, true);
    return { ok: true, name: label };
  }

  public getPoliceMarkers(): PoliceOfficerMarker[] {
    return this.police.getMarkers(
      Date.now(),
      this.ignoreUntilByOfficer,
      this.globalPoliceIgnoreUntil,
    );
  }

  public getDetainedRemainingMs(): number {
    return Math.max(0, this.detainedUntil - Date.now());
  }

  public isDetained(): boolean {
    return this.getDetainedRemainingMs() > 0;
  }

  public isMovementLocked(): boolean {
    return (
      !this.onboardingDone ||
      this.faintRespawnCooldown > 0 ||
      this.activePoliceChallengeOfficerId !== null ||
      this.activeVaultPuzzle !== null ||
      this.activeJailStationId !== null
    );
  }

  public getDailyQuestBoard(): DailyQuestBoardState {
    if (Date.now() >= this.questBoard.nextRefreshAt) {
      this.questBoard = generateDailyQuestBoard(this.activeMapId);
      this.callbacks.onRequestSave?.(true);
    }
    return this.questBoard;
  }

  public rerollDailyQuestBoard(): { ok: boolean; message: string } {
    if (!this.isAtQuestBoard()) {
      return {
        ok: false,
        message: "🏛️ Phải đến Hội Sở Nhiệm Vụ mới đổi / làm mới nhiệm vụ được!",
      };
    }
    const board = this.getDailyQuestBoard();
    const pendingCount = board.quests.filter((q) => !q.claimed).length;
    if (pendingCount <= 0) {
      return {
        ok: false,
        message: "✅ Bạn đã hoàn thành toàn bộ nhiệm vụ trong mốc 4 giờ này. Hãy đợi lượt reset tiếp theo!",
      };
    }
    if (!this.inventory.trySpendGold(QUEST_MANUAL_REROLL_COST_GOLD)) {
      return {
        ok: false,
        message: `Cần ${QUEST_MANUAL_REROLL_COST_GOLD} Vàng để đổi nhiệm vụ.`,
      };
    }
    this.questBoard = rerollPendingQuests(board);
    this.callbacks.onRequestSave?.(true);
    return {
      ok: true,
      message: `🔄 Đã đổi ${pendingCount} nhiệm vụ chưa hoàn thành (độ khó & phần thưởng tương đương)!`,
    };
  }

  public deliverOrClaimDailyQuest(questId: string): { ok: boolean; message: string } {
    const board = this.getDailyQuestBoard();
    const q = board.quests.find((entry) => entry.id === questId);
    if (!q) return { ok: false, message: "Không tìm thấy nhiệm vụ." };
    if (q.claimed) return { ok: false, message: "Nhiệm vụ này đã nhận thưởng rồi." };
    if (!this.isAtQuestBoard()) {
      return {
        ok: false,
        message: "🏛️ Phải đến Hội Sở Nhiệm Vụ mới bàn giao vật phẩm và nhận thưởng được!",
      };
    }

    if (q.kind === "deliver" && q.progress < q.targetCount) {
      if (!q.targetItemId) return { ok: false, message: "Vật phẩm nhiệm vụ không hợp lệ." };
      const counts = this.inventory.countItemAcrossZones(q.targetItemId);
      if (counts.total <= 0) {
        return { ok: false, message: "Bạn chưa có vật phẩm cần giao trong Balo, Safebox hay Kho Nhà." };
      }
      const needed = q.targetCount - q.progress;
      const delivered = this.inventory.consumeItemsPreferred(q.targetItemId, Math.min(needed, counts.total));
      q.progress = Math.min(q.targetCount, q.progress + delivered);
      if (q.progress < q.targetCount) {
        this.callbacks.onRequestSave?.(true);
        return {
          ok: true,
          message: `📦 Đã giao ${delivered} món (${q.progress}/${q.targetCount}). Cần thêm ${q.targetCount - q.progress}!`,
        };
      }
    }

    if (q.progress < q.targetCount) {
      return { ok: false, message: `Chưa hoàn thành tiến độ (${q.progress}/${q.targetCount}).` };
    }

    q.claimed = true;
    this.reputation.dailyQuestsCompleted += 1;
    if (q.reward.gold > 0) {
      this.inventory.addGold(q.reward.gold);
    }

    let itemNote = "";
    if (q.reward.itemId && q.reward.itemQty > 0) {
      const def = ITEM_BY_ID[q.reward.itemId];
      let storedHome = 0;
      let storedBag = 0;
      for (let i = 0; i < q.reward.itemQty; i++) {
        const bagRes = this.inventory.addItemToZone("backpack", q.reward.itemId, "city");
        if (bagRes.ok) {
          storedBag += 1;
        } else {
          const homeRes = this.inventory.addItemToZone("home", q.reward.itemId, "city");
          if (homeRes.ok) storedHome += 1;
        }
      }
      if (def) {
        const where = storedHome > 0 && storedBag === 0 ? " (gửi Kho Nhà)" : storedHome > 0 ? " (1 phần gửi Kho Nhà)" : "";
        itemNote = ` + ${q.reward.itemQty}× ${def.name}${where}`;
      }
    }

    this.playPressSfx();
    this.callbacks.onRequestSave?.(true);
    return {
      ok: true,
      message: `🎉 Nhận thưởng +${q.reward.gold.toLocaleString("vi-VN")} Vàng${itemNote}!`,
    };
  }

  private advanceMinigameQuests(amount = 1): void {
    this.reputation.minigamesWon += amount;
    const board = this.getDailyQuestBoard();
    let changed = false;
    for (const q of board.quests) {
      if (q.kind === "minigame" && !q.claimed && q.progress < q.targetCount) {
        q.progress = Math.min(q.targetCount, q.progress + amount);
        changed = true;
      }
    }
    this.callbacks.onRequestSave?.(false);
    if (changed) this.callbacks.onRequestSave?.(false);
  }

  public getReputationSummary(): ReputationSummaryView {
    this.reputation.peakGold = Math.max(this.reputation.peakGold, this.inventory.getGold());
    return buildReputationSummary(this.reputation);
  }

  public claimReputationMilestone(milestoneId: string): { ok: boolean; message: string } {
    this.reputation.peakGold = Math.max(this.reputation.peakGold, this.inventory.getGold());
    const def = REPUTATION_MILESTONE_BY_ID[milestoneId];
    if (!def) return { ok: false, message: "Không tìm thấy mốc danh vọng." };
    if (this.reputation.claimedIds.includes(milestoneId)) {
      return { ok: false, message: "Mốc danh vọng này đã nhận thưởng rồi." };
    }
    if (this.reputation[def.statKey] < def.target) {
      return { ok: false, message: "Bạn chưa đạt điều kiện của mốc danh vọng này." };
    }

    this.reputation.claimedIds.push(milestoneId);
    this.reputation.points += def.reward.points;
    this.inventory.addGold(def.reward.gold);
    this.reputation.peakGold = Math.max(this.reputation.peakGold, this.inventory.getGold());

    let itemNote = "";
    if (def.reward.bonusItemKind) {
      const bonusId = pickReputationBonusItemId(def.reward.bonusItemKind, this.activeMapId);
      const itemDef = bonusId ? ITEM_BY_ID[bonusId] : null;
      if (bonusId && itemDef) {
        const bagRes = this.inventory.addItemToZone("backpack", bonusId, "city");
        let storedWhere = "";
        if (!bagRes.ok) {
          const homeRes = this.inventory.addItemToZone("home", bonusId, "city");
          if (homeRes.ok) storedWhere = " (gửi Kho Nhà)";
        }
        itemNote = ` & 1× ${itemDef.name}${storedWhere}`;
      }
    }

    this.playPressSfx();
    this.callbacks.onRequestSave?.(true);
    return {
      ok: true,
      message: `🏆 +${def.reward.points} Danh vọng, +${def.reward.gold.toLocaleString("vi-VN")} Vàng${itemNote}!`,
    };
  }

  public claimAllReputationMilestones(): { ok: boolean; claimedCount: number; message: string } {
    const summary = this.getReputationSummary();
    const ready = summary.milestones.filter((m) => m.completed && !m.claimed);
    if (ready.length === 0) {
      return { ok: false, claimedCount: 0, message: "Chưa có mốc danh vọng nào sẵn sàng nhận thưởng." };
    }
    let totalPoints = 0;
    let totalGold = 0;
    let count = 0;
    for (const m of ready) {
      const res = this.claimReputationMilestone(m.id);
      if (res.ok) {
        totalPoints += m.reward.points;
        totalGold += m.reward.gold;
        count += 1;
      }
    }
    return {
      ok: count > 0,
      claimedCount: count,
      message: `🏆 Đã nhận ${count} mốc: +${totalPoints} Danh vọng & +${totalGold.toLocaleString("vi-VN")} Vàng!`,
    };
  }

  public buyReputationShopItem(itemId: string): { ok: boolean; message: string } {
    if (!this.isAtReputationHall()) {
      return {
        ok: false,
        message: "🏛️ Phải đến Sảnh Danh Vọng mới đổi được vật phẩm Đỏ giới hạn!",
      };
    }
    const shopEntry = REPUTATION_SHOP_BY_ID[itemId];
    const itemDef = ITEM_BY_ID[itemId];
    if (!shopEntry || !itemDef) {
      return { ok: false, message: "Vật phẩm danh vọng không tồn tại." };
    }
    if (this.reputation.points < shopEntry.costPoints) {
      return {
        ok: false,
        message: `Cần ${shopEntry.costPoints} điểm Danh vọng (bạn đang có ${this.reputation.points}).`,
      };
    }

    const bagRes = this.inventory.addItemToZone("backpack", itemId, "city");
    let storedWhere = "vào Balo";
    if (!bagRes.ok) {
      const homeRes = this.inventory.addItemToZone("home", itemId, "city");
      if (!homeRes.ok) {
        return {
          ok: false,
          message: "Balo và Kho Nhà đều đã đầy! Hãy dọn bớt chỗ trống trước khi đổi.",
        };
      }
      storedWhere = "vào Kho Nhà";
    }

    this.reputation.points -= shopEntry.costPoints;
    this.playPressSfx();
    this.callbacks.onRequestSave?.(true);
    return {
      ok: true,
      message: `🔴 Đã đổi 1× ${itemDef.name} (${shopEntry.costPoints} Danh vọng) và cất ${storedWhere}!`,
    };
  }

  private advanceExploreQuests(target: ExploreTargetKind, amount = 1): void {
    const board = this.getDailyQuestBoard();
    let changed = false;
    for (const q of board.quests) {
      if (q.kind === "explore" && q.exploreTarget === target && !q.claimed && q.progress < q.targetCount) {
        q.progress = Math.min(q.targetCount, q.progress + amount);
        changed = true;
      }
    }
    if (changed) this.callbacks.onRequestSave?.(false);
  }

  public completeVaultPuzzle(): void {
    const v = this.activeVaultPuzzle;
    this.activeVaultPuzzle = null;
    if (!v) return;

    const zone = this.getSecurityZoneAt(this.player.x, this.player.y);
    const container = this.inventory.openOrGenerateContainer(
      v.containerId,
      v.title,
      v.sourceType,
      v.biome,
      zone === "green" ? "yellow" : zone,
      this.activeMapId,
    );

    if (v.chestId) {
      const cv = this.chestVisuals.find((c) => c.chest.id === v.chestId);
      if (cv) {
        cv.chest.opened = true;
        if (cv.chest.kind !== "trash") {
          cv.sprite.texture = this.atlas.chestOpen;
        }
        cv.aura.visible = false;
      }
    }

    this.playPressSfx();
    this.advanceMinigameQuests(1);
    if (zone !== "green") {
      this.advanceExploreQuests("loot_containers", 1);
    }
    this.callbacks.onRequestSave?.(true);
    this.callbacks.onVaultUnlocked?.({
      mapId: this.activeMapId,
      containerId: v.containerId,
      chestId: v.chestId,
      container,
    });
    this.callbacks.onOpenContainer?.(container);
  }

  public markSharedChestOpened(chestId: string): void {
    const cv = this.chestVisuals.find((c) => c.chest.id === chestId);
    if (!cv) return;
    cv.chest.opened = true;
    if (cv.chest.kind !== "trash") {
      cv.sprite.texture = this.atlas.chestOpen;
    }
    cv.aura.visible = false;
  }

  public cancelVaultPuzzle(): void {
    this.activeVaultPuzzle = null;
  }

  public resolveJailMinigame(won: boolean, stationId: string): { reducedMs: number; released: boolean } {
    this.activeJailStationId = null;
    if (!won || !this.isInJail) {
      return { reducedMs: 0, released: false };
    }

    this.jailRoom.relocateStation(stationId);
    this.advanceMinigameQuests(1);
    const prev = this.detainedUntil;
    this.detainedUntil = Math.max(Date.now(), prev - 60_000);
    if (this.detainedUntil <= Date.now()) {
      this.detainedUntil = 0;
      this.exitJailRoom();
      this.callbacks.onDetentionEnded?.();
      this.callbacks.onRequestSave?.(true);
      return { reducedMs: 60_000, released: true };
    }

    this.callbacks.onRequestSave?.(true);
    return { reducedMs: 60_000, released: false };
  }

  public cancelJailMinigame(): void {
    this.activeJailStationId = null;
  }

  private enterJailRoom(): void {
    this.isInJail = true;
    this.isLootingContainerOpen = false;
    this.lootingCheckAccum = 0;
    this.pendingConsume = null;
    this.jailRoom.randomizeStations();
    this.player.clearPath();
    this.player.setManualDirection(0, 0);
    this.jailRoom.entityLayer.addChild(this.player);
    this.player.position.set(this.jailRoom.spawnPoint.x, this.jailRoom.spawnPoint.y);
    this.player.setFacing("down");
    this.player.setSurvivalVisuals({
      speedMultiplier: 1,
      isSweating: false,
      isShivering: false,
    });
    this.worldContainer.visible = false;
    this.worldLightsContainer.visible = false;
    this.atmosphere.screenOverlayLayer.visible = false;
    this.jailRoom.container.visible = true;
    this.jailRoom.syncCameraTransform(
      this.app.screen.width,
      this.app.screen.height,
      this.player.x,
      this.player.y,
    );
  }

  private exitJailRoom(): void {
    this.isInJail = false;
    this.activeJailStationId = null;
    this.player.clearPath();
    this.player.setManualDirection(0, 0);
    this.entityLayer.addChild(this.player);
    this.player.position.set(this.data.policeDetainRespawn.x, this.data.policeDetainRespawn.y);
    this.player.setFacing("down");
    this.camX = this.data.policeDetainRespawn.x;
    this.camY = this.data.policeDetainRespawn.y;
    this.lastSavedPlayerX = this.data.policeDetainRespawn.x;
    this.lastSavedPlayerY = this.data.policeDetainRespawn.y;
    this.jailRoom.container.visible = false;
    this.worldContainer.visible = true;
    this.worldLightsContainer.visible = true;
    this.atmosphere.screenOverlayLayer.visible = true;
    this.forceCullUpdate = true;
    this.syncCameraTransform();
  }

  public resolvePoliceChallenge(won: boolean): {
    won: boolean;
    lostItemCount: number;
    lostBackpack: boolean;
    officerId: string | null;
  } {
    const officerId = this.activePoliceChallengeOfficerId;
    this.activePoliceChallengeOfficerId = null;

    if (!officerId) {
      return { won, lostItemCount: 0, lostBackpack: false, officerId: null };
    }

    if (won) {
      // ALL police ignore the player temporarily for 45 seconds after winning a check
      const ignoreMs = 45_000;
      this.globalPoliceIgnoreUntil = Date.now() + ignoreMs;
      this.ignoreUntilByOfficer = {};
      this.advanceMinigameQuests(1);
      this.callbacks.onRequestSave?.(true);
      return { won: true, lostItemCount: 0, lostBackpack: false, officerId };
    }

    // Lost -> Confiscate backpack + all items + all worn gear, force 0-value Prisoner Uniform,
    // Safebox & Home Storage stay untouched! Detain inside Jail Room for 5 minutes.
    const { lostItemCount, lostBackpack } = this.inventory.confiscateOnArrest();
    this.equipment = createPrisonerEquippedGear();
    this.cachedEquipStats = computeEquipmentStats(this.equipment);
    this.inventory.setEquippedGear(this.equipment);
    this.player.setAppearance(this.equipment, this.hairId, this.gender);

    this.detainedUntil = Date.now() + 300_000;
    this.ignoreUntilByOfficer[officerId] = Date.now() + 315_000;
    this.enterJailRoom();
    this.callbacks.onRequestSave?.(true);
    this.callbacks.onPoliceDetained?.(lostItemCount, 300_000, lostBackpack);
    return { won: false, lostItemCount, lostBackpack, officerId };
  }

  public getNearbyInteraction(): NearbyInteraction | null {
    if (this.isInJail) {
      const st = this.jailRoom.getNearbyStation(this.player.x, this.player.y);
      if (!st) return null;
      const nameMap: Record<ArcadeMinigameKind, string> = {
        memory_cards: "Lật Thẻ Cặp",
        lockpick: "Bẻ Khóa Cơ Học",
        timing_bar: "Chặn Thanh Trượt",
      };
      return {
        type: "jail_minigame",
        stationId: st.id,
        kind: st.kind,
        label: `❗ Chơi Minigame: ${nameMap[st.kind]} (Giảm 1 phút) [E]`,
      };
    }
    const px = this.player.x;
    const py = this.player.y;

    let closestChest: ChestVisual | null = null;
    let bestChestDist = 104;
    for (const cv of this.chestVisuals) {
      const cy = cv.chest.y - 12;
      if (Math.abs(px - cv.chest.x) >= bestChestDist || Math.abs(py - cy) >= bestChestDist) continue;
      const d = Math.hypot(px - cv.chest.x, py - cy);
      if (d < bestChestDist) {
        bestChestDist = d;
        closestChest = cv;
      }
    }

    let closestFoodCartDist = 78;
    let nearbyFoodProp: WorldProp | null = null;
    for (const prop of this.foodCartProps) {
      const fy = prop.y - 12;
      if (Math.abs(px - prop.x) >= closestFoodCartDist || Math.abs(py - fy) >= closestFoodCartDist) continue;
      const d = Math.hypot(px - prop.x, py - fy);
      if (d < closestFoodCartDist) {
        closestFoodCartDist = d;
        nearbyFoodProp = prop;
      }
    }

    if (nearbyFoodProp && (!closestChest || closestFoodCartDist <= bestChestDist)) {
      return {
        type: "shop",
        name:
          nearbyFoodProp.kind === "jp_vending_machine"
            ? "🥤 Máy Bán Hàng Tự Động Nhật"
            : "Xe Đồ Ăn Nhanh",
        shopKind: "food",
      };
    }

    if (closestChest) {
      const remainingMs = this.inventory.getContainerRemainingMs(closestChest.chest.id);
      const searched = remainingMs !== null;
      if (!searched && closestChest.chest.opened) {
        closestChest.chest.opened = false;
        if (closestChest.chest.kind !== "trash") {
          closestChest.sprite.texture = this.atlas.chestClosed;
        }
        closestChest.aura.visible = true;
      }
      const icon =
        closestChest.chest.kind === "trash"
          ? "🗑️"
          : closestChest.chest.kind === "royal"
            ? searched
              ? "👑"
              : "🔐"
            : "🧰";
      const locked = closestChest.chest.kind === "royal" && !searched;
      const verb =
        closestChest.chest.kind === "trash"
          ? searched
            ? "Xem Thùng Rác"
            : "Lục Thùng Rác"
          : locked
            ? "Giải Đố Mở Khóa"
            : searched
              ? "Mở lại"
              : "Mở";
      return {
        type: "chest",
        chest: closestChest.chest,
        searched,
        remainingMs,
        locked,
        label: `${icon} ${verb}: ${closestChest.chest.name}`,
      };
    }

    let closestBuilding: OccludableProp | null = null;
    let bestBldDist = Number.POSITIVE_INFINITY;
    for (const op of this.buildingOccludables) {
      if (
        Math.abs(px - op.x) <= op.halfW + 38 &&
        py <= op.bottomY + 42 &&
        py >= op.topY - 24
      ) {
        const d = Math.hypot(px - op.x, py - op.depthY);
        if (d < bestBldDist) {
          bestBldDist = d;
          closestBuilding = op;
        }
      }
    }

    if (closestBuilding && isBuildingProp(closestBuilding.prop.kind)) {
      const kind = closestBuilding.prop.kind;
      const meta = BUILDING_META[kind];
      if (meta.tier === "shop") {
        return {
          type: "shop",
          name: meta.name,
          shopKind: meta.shopKind ?? "backpack",
        };
      }
      if (meta.tier === "home") {
        return {
          type: "home",
          name: meta.name,
        };
      }
      if (meta.tier === "collection") {
        return {
          type: "collection",
          name: meta.name,
        };
      }
      if (meta.tier === "auction") {
        return {
          type: "auction",
          name: meta.name,
        };
      }
      if (meta.tier === "airport") {
        return {
          type: "airport",
          name: meta.name,
        };
      }
      if (meta.tier === "quest") {
        return {
          type: "quest",
          name: meta.name,
        };
      }
      if (meta.tier === "reputation") {
        return {
          type: "reputation",
          name: meta.name,
        };
      }
      if (meta.tier === "gacha") {
        return {
          type: "gacha",
          name: meta.name,
        };
      }
      if (meta.tier === "police") {
        return null;
      }

      const prefix = this.activeMapId === "japan" ? "jp_bld-" : "bld-";
      const containerId = `${prefix}${closestBuilding.prop.id}`;
      const existing = this.inventory.getContainer(containerId);
      const remainingMs = existing ? this.inventory.getContainerRemainingMs(containerId) : null;
      const col = Math.max(0, Math.min(this.data.cols - 1, Math.floor(closestBuilding.x / TILE_SIZE)));
      const row = Math.max(0, Math.min(this.data.rows - 1, Math.floor(closestBuilding.bottomY / TILE_SIZE)));
      return {
        type: "building",
        propId: closestBuilding.prop.id,
        kind,
        name: meta.name,
        tier: meta.tier,
        isVault: Boolean(meta.isVault),
        biome: this.data.biomes[row * this.data.cols + col],
        searched: Boolean(existing),
        remainingCount: existing ? existing.items.length : 0,
        remainingMs,
        x: closestBuilding.x,
        y: closestBuilding.depthY,
      };
    }

    return null;
  }

  public triggerInteraction(): boolean {
    if (this.isMovementLocked()) return false;
    const target = this.getNearbyInteraction();
    if (!target) return false;

    if (target.type === "jail_minigame") {
      this.activeJailStationId = target.stationId;
      this.player.clearPath();
      this.player.setManualDirection(0, 0);
      this.playPressSfx();
      this.callbacks.onOpenJailMinigame?.({ stationId: target.stationId, kind: target.kind });
      return true;
    }

    if (this.isInJail) return false;

    if (target.type === "shop") {
      this.playPressSfx();
      this.callbacks.onOpenShop?.(target.shopKind);
      return true;
    }

    if (target.type === "home") {
      this.playPressSfx();
      this.callbacks.onOpenHomeStorage?.();
      return true;
    }

    if (target.type === "collection") {
      this.playPressSfx();
      this.callbacks.onOpenCollectionHall?.();
      return true;
    }

    if (target.type === "auction") {
      this.playPressSfx();
      this.callbacks.onOpenAuctionHouse?.();
      return true;
    }

    if (target.type === "airport") {
      this.playPressSfx();
      this.callbacks.onOpenAirport?.();
      return true;
    }

    if (target.type === "quest") {
      this.playPressSfx();
      this.callbacks.onOpenQuestBoard?.();
      return true;
    }

    if (target.type === "reputation") {
      this.playPressSfx();
      this.callbacks.onOpenReputationShop?.();
      return true;
    }

    if (target.type === "gacha") {
      this.playPressSfx();
      this.callbacks.onOpenPetGacha?.();
      return true;
    }

    if (target.type === "chest") {
      const cv = this.chestVisuals.find((c) => c.chest.id === target.chest.id);
      if (!cv) return false;

      const sourceType: LootSourceType =
        cv.chest.kind === "trash"
          ? "trash_bin"
          : cv.chest.kind === "royal"
            ? "chest_royal"
            : "chest_wooden";

      if (sourceType === "chest_royal" && !this.inventory.isContainerSearched(cv.chest.id)) {
        const chestZone = this.getSecurityZoneAt(cv.chest.x, cv.chest.y);
        const puzzle = this.inventory.getOrAssignContainerPuzzle(cv.chest.id);
        this.activeVaultPuzzle = {
          containerId: cv.chest.id,
          title: cv.chest.name,
          sourceType: "chest_royal",
          biome: cv.chest.biome,
          zone: chestZone,
          kind: puzzle.kind,
          seed: puzzle.seed,
          chestId: cv.chest.id,
        };
        this.player.clearPath();
        this.player.setManualDirection(0, 0);
        this.playPressSfx();
        this.callbacks.onOpenVaultPuzzle?.(this.activeVaultPuzzle);
        return true;
      }

      const wasLooted = this.inventory.isContainerSearched(cv.chest.id);
      const chestZone = this.getSecurityZoneAt(cv.chest.x, cv.chest.y);
      const container = this.inventory.openOrGenerateContainer(
        cv.chest.id,
        cv.chest.name,
        sourceType,
        cv.chest.biome,
        chestZone,
        this.activeMapId,
      );
      if (!wasLooted && chestZone !== "green" && sourceType !== "trash_bin") {
        this.advanceExploreQuests("loot_containers", 1);
      }

      cv.chest.opened = true;
      if (cv.chest.kind !== "trash") {
        cv.sprite.texture = this.atlas.chestOpen;
      }
      cv.aura.visible = false;

      this.playPressSfx();
      this.callbacks.onOpenContainer?.(container);
      return true;
    }

    const prefix = this.activeMapId === "japan" ? "jp_bld-" : "bld-";
    const containerId = `${prefix}${target.propId}`;
    const sourceType: LootSourceType = target.isVault
      ? "house_vault"
      : target.tier === "landmark"
        ? "house_landmark"
        : "house_standard";

    if (target.isVault && !this.inventory.isContainerSearched(containerId)) {
      const bldZone = this.getSecurityZoneAt(target.x, target.y);
      const puzzle = this.inventory.getOrAssignContainerPuzzle(containerId);
      this.activeVaultPuzzle = {
        containerId,
        title: target.name,
        sourceType: "house_vault",
        biome: target.biome,
        zone: bldZone,
        kind: puzzle.kind,
        seed: puzzle.seed,
      };
      this.player.clearPath();
      this.player.setManualDirection(0, 0);
      this.playPressSfx();
      this.callbacks.onOpenVaultPuzzle?.(this.activeVaultPuzzle);
      return true;
    }

    const wasLooted = this.inventory.isContainerSearched(containerId);
    const bldZone = this.getSecurityZoneAt(target.x, target.y);
    const container = this.inventory.openOrGenerateContainer(
      containerId,
      target.name,
      sourceType,
      target.biome,
      bldZone,
      this.activeMapId,
    );
    if (!wasLooted && bldZone !== "green") {
      this.advanceExploreQuests("loot_containers", 1);
    }
    this.playPressSfx();
    this.callbacks.onOpenContainer?.(container);
    return true;
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

    if (this.faintRespawnCooldown > 0) {
      this.faintRespawnCooldown = Math.max(0, this.faintRespawnCooldown - dt);
      this.player.setManualDirection(0, 0);
      this.player.clearPath();
    } else if (
      this.activePoliceChallengeOfficerId !== null ||
      this.activeVaultPuzzle !== null ||
      this.activeJailStationId !== null
    ) {
      this.player.setManualDirection(0, 0);
      this.player.clearPath();
    } else if (kx !== 0 || ky !== 0) {
      this.player.setManualDirection(kx, ky);
    } else {
      this.player.setManualDirection(0, 0);
    }

    if (this.detainedUntil > 0 && Date.now() >= this.detainedUntil) {
      this.detainedUntil = 0;
      if (this.isInJail) {
        this.exitJailRoom();
      }
      this.callbacks.onDetentionEnded?.();
      this.callbacks.onRequestSave?.(true);
    }

    if (this.isInJail) {
      this.player.update(dt, this.jailRoom.pathfinder);
      this.player.setSurvivalVisuals({
        speedMultiplier: 1,
        isSweating: false,
        isShivering: false,
      });
      this.jailRoom.renderOverlay(dt, this.player.getRemainingPath());
      this.jailRoom.syncCameraTransform(
        this.app.screen.width,
        this.app.screen.height,
        this.player.x,
        this.player.y,
      );
      return;
    }

    this.player.update(dt, this.pathfinder);
    this.stepRemotePlayers(dt);
    const stepVx = dt > 0.001 ? (this.player.x - this.prevStepX) / dt : 0;
    const stepVy = dt > 0.001 ? (this.player.y - this.prevStepY) / dt : 0;
    this.prevStepX = this.player.x;
    this.prevStepY = this.player.y;
    this.callbacks.onPlayerMoveSample?.({
      mapId: this.activeMapId,
      x: this.player.x,
      y: this.player.y,
      vx: stepVx,
      vy: stepVy,
      facing: this.player.getFacing(),
      isMoving: this.player.isMoving(),
      hp: this.survival.hp,
      hunger: this.survival.hunger,
      stamina: this.survival.stamina,
      bodyTempC: this.survival.bodyTempC,
      skinId: this.player.getSkin(),
      gender: this.gender,
      hairId: this.hairId,
      equipped: this.equipment,
      equippedPetId: this.equippedPetId,
    });

    const camLerp = 1 - Math.exp(-8.5 * dt);
    this.camX += (this.player.x - this.camX) * camLerp;
    this.camY += (this.player.y - this.camY) * camLerp;
    this.zoom += (this.targetZoom - this.zoom) * (1 - Math.exp(-10 * dt));

    this.syncCameraTransform();
    this.checkLandmarks();
    this.renderWaterWakesAndDroplets(dt);
    this.renderPathAndRipples(dt);
    this.animateLilypads();

    const env = this.weatherService.getEnvironmentState();
    const playerZone = this.getCurrentSecurityZone();
    if (!this.isInJail) {
      if (playerZone === "yellow") this.advanceExploreQuests("visit_yellow", 1);
      else if (playerZone === "red") this.advanceExploreQuests("visit_red", 1);
      if (this.isInSnowZoneAt(this.player.x)) this.advanceExploreQuests("visit_snow", 1);
    }
    let caughtOfficer = this.police.step(dt, {
      playerX: this.player.x,
      playerY: this.player.y,
      playerZone,
      nightFactor: env.nightFactor,
      canArrest: !this.isMovementLocked(),
      isLooting: this.isLootingContainerOpen,
      ignoreUntilById: this.ignoreUntilByOfficer,
      globalIgnoreUntil: this.globalPoliceIgnoreUntil,
    });

    // While actively looting in Yellow or Red zone, police stay moving & have a lower chance to interrupt if nearby
    if (
      !caughtOfficer &&
      this.isLootingContainerOpen &&
      !this.isMovementLocked() &&
      playerZone !== "green" &&
      this.globalPoliceIgnoreUntil <= Date.now()
    ) {
      this.lootingCheckAccum += dt;
      if (this.lootingCheckAccum >= 2.5) {
        this.lootingCheckAccum = 0;
        const askChance = playerZone === "red" ? 0.05 : 0.03;
        if (Math.random() < askChance) {
          const nearest = this.police.findNearestOfficer(
            this.player.x,
            this.player.y,
            this.ignoreUntilByOfficer,
            this.globalPoliceIgnoreUntil,
          );
          if (nearest && nearest.distance <= 460) {
            caughtOfficer = {
              id: nearest.id,
              name: nearest.name,
              biome: nearest.biome,
              zone: playerZone,
            };
          }
        }
      }
    } else if (!this.isLootingContainerOpen) {
      this.lootingCheckAccum = 0;
    }

    if (caughtOfficer) {
      const blendChance = Math.min(
        MAX_BLEND_CHANCE,
        Math.max(0, this.cachedEquipStats.blendChance),
      );
      if (blendChance > 0 && Math.random() < blendChance) {
        this.ignoreUntilByOfficer[caughtOfficer.id] = Date.now() + 18_000;
        this.callbacks.onRequestSave?.(true);
        this.callbacks.onPoliceBlendIgnored?.(
          caughtOfficer.name,
          Math.round(blendChance * 100),
        );
      } else {
        this.activePoliceChallengeOfficerId = caughtOfficer.id;
        this.isLootingContainerOpen = false;
        this.player.setManualDirection(0, 0);
        this.player.clearPath();
        this.callbacks.onRequestSave?.(true);
        if (this.lastChaseOfficerId !== caughtOfficer.id) {
          this.lastChaseOfficerId = caughtOfficer.id;
          this.callbacks.onPoliceChaseStarted?.(caughtOfficer.id, this.player.x, this.player.y);
        }
        this.callbacks.onPoliceChallenge?.(caughtOfficer);
      }
    }
    this.updatePropOcclusionFade(dt);
    this.animateChestsAndPopups();

    if (!this.isMovementLocked()) {
      this.stepPendingConsume(dt);
      const activePet = this.getEquippedPet();
      const survivalTick = stepSurvivalState(this.survival, dt, {
        isMoving: this.player.isMoving(),
        surface: this.player.getSurfaceState(),
        env,
        equip: this.cachedEquipStats,
        inSnowZone: this.isInSnowZoneAt(this.player.x),
        securityZone: playerZone,
        mapId: this.activeMapId,
        biome: this.getCurrentBiome(),
        totalWeightKg: this.inventory.getCarriedWeightKg(this.cachedEquipStats.weightKg),
        permanentStaminaBonusPct:
          this.inventory.getPermanentStaminaBonusPct() + (activePet?.bonuses.staminaPct ?? 0),
        heavySpeedBonusPct: this.inventory.getHeavySpeedBonusPct(),
      });
      this.lastSurvivalTick = survivalTick;
      const consumeSlowMul = this.pendingConsume ? 0.34 : 1;
      const petSpeedMul = 1 + (activePet?.bonuses.speedPct ?? 0) / 100;
      this.player.setSurvivalVisuals({
        speedMultiplier: survivalTick.speedMultiplier * consumeSlowMul * petSpeedMul,
        isSweating: survivalTick.thermal.isSweating,
        isShivering: survivalTick.thermal.isShivering,
      });

      if (survivalTick.fainted) {
        this.pendingConsume = null;
        this.faintRespawnCooldown = 2.6;
        const walletGold = this.inventory.getGold();
        const maxHospitalFee = this.activeMapId === "japan" ? 150 : 30;
        const fee = Math.min(walletGold, maxHospitalFee);
        if (fee > 0) {
          this.inventory.trySpendGold(fee);
        }
        this.survival = {
          hp: 75,
          hunger: 45,
          stamina: 65,
          bodyTempC: SURVIVAL_IDEAL_TEMP_C,
          staminaBuff: null,
        };
        this.player.clearPath();
        this.player.setManualDirection(0, 0);
        this.player.position.set(this.data.hospitalRespawn.x, this.data.hospitalRespawn.y);
        this.player.setFacing("down");
        this.camX = this.data.hospitalRespawn.x;
        this.camY = this.data.hospitalRespawn.y;
        this.lastSavedPlayerX = this.data.hospitalRespawn.x;
        this.lastSavedPlayerY = this.data.hospitalRespawn.y;
        this.lastSurvivalTick = {
          thermal: evaluateThermalState(
            env,
            "dry",
            this.cachedEquipStats,
            SURVIVAL_IDEAL_TEMP_C,
            {
              inSnowZone: this.isInSnowZoneAt(this.data.hospitalRespawn.x),
              securityZone: this.getSecurityZoneAt(
                this.data.hospitalRespawn.x,
                this.data.hospitalRespawn.y,
              ),
              mapId: this.activeMapId,
              biome: this.getCurrentBiome(),
            },
          ),
          blurIntensity: 0,
          speedMultiplier: 1,
          fainted: false,
          faintReason: null,
        };
        this.player.setSurvivalVisuals({
          speedMultiplier: 1,
          isSweating: false,
          isShivering: false,
        });
        this.callbacks.onRequestSave?.(true);
        this.callbacks.onFaintedToHospital?.(survivalTick.faintReason ?? "kiệt sức", fee);
      }
    }

    this.refreshCheckAccumulator += dt;
    if (this.refreshCheckAccumulator >= 1) {
      this.refreshCheckAccumulator = 0;
      const expiredIds = this.inventory.purgeExpiredContainers();
      if (expiredIds.length > 0) {
        this.syncChestVisualsAfterRefresh(expiredIds);
        this.callbacks.onContainersRefreshed?.(expiredIds);
      }
    }

    this.positionSaveAccumulator += dt;
    this.survivalSaveAccumulator += dt;
    if (this.positionSaveAccumulator >= 3.0) {
      this.positionSaveAccumulator = 0;
      if (Math.hypot(this.player.x - this.lastSavedPlayerX, this.player.y - this.lastSavedPlayerY) >= 24) {
        this.lastSavedPlayerX = this.player.x;
        this.lastSavedPlayerY = this.player.y;
        this.callbacks.onRequestSave?.(false);
      }
    }
    if (this.survivalSaveAccumulator >= 8.0) {
      this.survivalSaveAccumulator = 0;
      this.callbacks.onRequestSave?.(false);
    }

    const halfW = this.app.screen.width / (2 * this.zoom);
    const halfH = this.app.screen.height / (2 * this.zoom);
    const viewBounds = {
      minX: this.camX - halfW,
      maxX: this.camX + halfW,
      minY: this.camY - halfH,
      maxY: this.camY + halfH,
    };

    this.atmosphere.update(dt, env, this.player.x, this.player.y, this.camX, this.worldContainer, viewBounds);
    this.weatherParticles.update(dt, env, viewBounds);
    this.streamNextTerrainChunks(2);
    this.streamNextProps(24);
    this.updateCollectionOrbit();
    this.updatePetFollower(dt);
  }

  public destroy(): void {
    if (this.prewarmTimerId !== null) {
      window.clearTimeout(this.prewarmTimerId);
      this.prewarmTimerId = null;
    }
    this.weatherService.stop();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.app.canvas.removeEventListener("wheel", this.onWheel);
  }

  private buildTerrainChunks(): void {
    this.initTerrainChunkGrid();
  }

  private initTerrainChunkGrid(): void {
    const { cols, rows } = this.data;

    for (let cy = 0; cy < rows; cy += CHUNK_TILES) {
      for (let cx = 0; cx < cols; cx += CHUNK_TILES) {
        const chunk = new Container();
        const maxRow = Math.min(rows, cy + CHUNK_TILES);
        const maxCol = Math.min(cols, cx + CHUNK_TILES);
        this.groundLayer.addChild(chunk);
        this.terrainChunks.push({
          node: chunk,
          cx,
          cy,
          maxCol,
          maxRow,
          minX: cx * TILE_SIZE,
          minY: cy * TILE_SIZE,
          maxX: maxCol * TILE_SIZE,
          maxY: maxRow * TILE_SIZE,
          built: false,
        });
      }
    }
    this.forceCullUpdate = true;
  }

  private populateTerrainChunk(ch: (typeof this.terrainChunks)[number]): void {
    if (ch.built) return;
    ch.built = true;

    const { cols, rows, tiles, puddleUnderlay } = this.data;
    const decorGfx = new Graphics();

    for (let row = ch.cy; row < ch.maxRow; row++) {
      for (let col = ch.cx; col < ch.maxCol; col++) {
        const idx = row * cols + col;
        const tile = tiles[idx];
        const px = col * TILE_SIZE;
        const py = row * TILE_SIZE;

        if (tile === "bridge") {
          const waterTex = this.pickTileVariant(this.atlas.tiles.water, col, row);
          const wSprite = new Sprite(waterTex);
          wSprite.position.set(px, py);
          wSprite.width = TILE_SIZE + 0.5;
          wSprite.height = TILE_SIZE + 0.5;
          wSprite.tint = 0x38bdf8;
          ch.node.addChild(wSprite);

          const northTile = row > 0 ? tiles[(row - 1) * cols + col] : "water";
          const southTile = row < rows - 1 ? tiles[(row + 1) * cols + col] : "water";
          const westTile = col > 0 ? tiles[row * cols + (col - 1)] : "water";
          const eastTile = col < cols - 1 ? tiles[row * cols + (col + 1)] : "water";
          const northIsBridge = northTile === "bridge";
          const southIsBridge = southTile === "bridge";
          const westIsBridge = westTile === "bridge";
          const eastIsBridge = eastTile === "bridge";
          const isHorizontalBridge =
            (westIsBridge || eastIsBridge) &&
            northTile !== "dirt" &&
            southTile !== "dirt" &&
            northTile !== "road" &&
            southTile !== "road";

          if (isHorizontalBridge) {
            decorGfx
              .rect(px, py, TILE_SIZE, TILE_SIZE)
              .fill(0x8b5a2b)
              .rect(px + 6, py, 2, TILE_SIZE)
              .fill(0x5c3a1b)
              .rect(px + 22, py, 2, TILE_SIZE)
              .fill(0x5c3a1b)
              .rect(px + 38, py, 2, TILE_SIZE)
              .fill(0x5c3a1b);
            if (!northIsBridge) {
              decorGfx.rect(px, py, TILE_SIZE, 5).fill(0x4a2c11);
            }
            if (!southIsBridge) {
              decorGfx.rect(px, py + TILE_SIZE - 5, TILE_SIZE, 5).fill(0x4a2c11);
            }
          } else {
            decorGfx
              .rect(px, py, TILE_SIZE, TILE_SIZE)
              .fill(0x8b5a2b)
              .rect(px, py + 6, TILE_SIZE, 2)
              .fill(0x5c3a1b)
              .rect(px, py + 22, TILE_SIZE, 2)
              .fill(0x5c3a1b)
              .rect(px, py + 38, TILE_SIZE, 2)
              .fill(0x5c3a1b);
            if (!westIsBridge) {
              decorGfx.rect(px, py, 5, TILE_SIZE).fill(0x4a2c11);
            }
            if (!eastIsBridge) {
              decorGfx.rect(px + TILE_SIZE - 5, py, 5, TILE_SIZE).fill(0x4a2c11);
            }
          }
          continue;
        }

        if (tile === "puddle") {
          const baseTile = puddleUnderlay[idx];
          const baseTex = this.resolveTileTexture(baseTile, col, row);
          const baseSprite = new Sprite(baseTex);
          baseSprite.position.set(px, py);
          baseSprite.width = TILE_SIZE + 0.5;
          baseSprite.height = TILE_SIZE + 0.5;
          ch.node.addChild(baseSprite);
          this.drawPuddleOverlay(decorGfx, tiles, cols, rows, col, row, px, py);
          continue;
        }

        const tex = this.resolveTileTexture(tile, col, row);
        const sprite = new Sprite(tex);
        sprite.position.set(px, py);
        sprite.width = TILE_SIZE + 0.5;
        sprite.height = TILE_SIZE + 0.5;

        const isSnowMountain = this.data.mapId === "japan" && col >= JAPAN_SNOW_START_COL;
        if (tile === "water") {
          sprite.tint = isSnowMountain ? 0x0369a1 : 0x0284c7;
        } else if (tile === "shallow") {
          sprite.tint = isSnowMountain ? 0xbae6fd : 0x7dd3fc;
          this.drawWaterEdgeFoam(decorGfx, tiles, cols, rows, col, row, px, py);
        } else if (isSnowMountain) {
          if (tile === "forest") {
            sprite.tint = 0xcbd5e1;
          } else if (tile === "meadow") {
            sprite.tint = 0xf1f5f9;
          } else if (tile === "grass") {
            sprite.tint = 0xe2e8f0;
          } else if (tile === "sand") {
            sprite.tint = 0xe0f2fe;
          } else if (tile === "dirt") {
            sprite.tint = 0xdbeafe;
            decorGfx
              .rect(px + 4, py + 4, 8, 3)
              .fill({ color: 0xf8fafc, alpha: 0.45 })
              .rect(px + TILE_SIZE - 14, py + TILE_SIZE - 9, 9, 3)
              .fill({ color: 0xe0f2fe, alpha: 0.45 });
          }
          if ((tile === "grass" || tile === "meadow" || tile === "forest") && (col * 13 + row * 7) % 5 === 0) {
            decorGfx.ellipse(px + 24, py + 24, 14, 7).fill({ color: 0xffffff, alpha: 0.36 });
          }
        } else if (tile === "forest") {
          sprite.tint = 0xdbeafe;
        } else if (tile === "stone") {
          if (this.data.mapId === "japan" && col <= 55) sprite.tint = 0xe2e8f0;
          this.drawStoneEdgeTrim(decorGfx, tiles, cols, rows, col, row, px, py);
        } else if (tile === "sidewalk") {
          if (this.data.mapId === "japan" && col <= 55) sprite.tint = 0xe2e8f0;
          this.drawSidewalkCurb(decorGfx, tiles, cols, rows, col, row, px, py);
        } else if (tile === "road") {
          if (this.data.mapId === "japan" && col <= 55) sprite.tint = 0xcbd5e1;
          this.drawRoadMarkings(decorGfx, tiles, cols, rows, col, row, px, py);
        }

        ch.node.addChild(sprite);
      }
    }

    ch.node.addChild(decorGfx);
  }

  private ensureVisibleTerrainChunksBuilt(): void {
    const halfViewWorldW = this.app.screen.width / (2 * this.zoom);
    const halfViewWorldH = this.app.screen.height / (2 * this.zoom);
    const chunkSpan = CHUNK_TILES * TILE_SIZE;
    const minX = this.camX - halfViewWorldW - chunkSpan;
    const maxX = this.camX + halfViewWorldW + chunkSpan;
    const minY = this.camY - halfViewWorldH - chunkSpan;
    const maxY = this.camY + halfViewWorldH + chunkSpan;

    for (const ch of this.terrainChunks) {
      if (!ch.built && ch.maxX >= minX && ch.minX <= maxX && ch.maxY >= minY && ch.minY <= maxY) {
        this.populateTerrainChunk(ch);
      }
    }
  }

  private streamNextTerrainChunks(budget = 2): void {
    let remaining = budget;
    while (remaining > 0) {
      let bestChunk: (typeof this.terrainChunks)[number] | null = null;
      let bestDistSq = Number.POSITIVE_INFINITY;
      for (const ch of this.terrainChunks) {
        if (ch.built) continue;
        const cx = (ch.minX + ch.maxX) * 0.5;
        const cy = (ch.minY + ch.maxY) * 0.5;
        const dSq = (cx - this.camX) ** 2 + (cy - this.camY) ** 2;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestChunk = ch;
        }
      }
      if (!bestChunk) break;
      this.populateTerrainChunk(bestChunk);
      remaining--;
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
      case "road":
        return this.atlas.tiles.road[hash % this.atlas.tiles.road.length];
      case "sidewalk":
        return this.atlas.tiles.sidewalk[hash % this.atlas.tiles.sidewalk.length];
      case "water":
      case "shallow":
      case "puddle":
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

  private drawSidewalkCurb(
    g: Graphics,
    tiles: TileType[],
    cols: number,
    rows: number,
    col: number,
    row: number,
    px: number,
    py: number,
  ): void {
    const isRoad = (c: number, r: number): boolean => {
      if (c < 0 || r < 0 || c >= cols || r >= rows) return false;
      return tiles[r * cols + c] === "road";
    };

    if (isRoad(col, row + 1)) {
      g.rect(px, py + TILE_SIZE - 4, TILE_SIZE, 4).fill({ color: 0x94a3b8, alpha: 0.9 });
    }
    if (isRoad(col, row - 1)) {
      g.rect(px, py, TILE_SIZE, 3).fill({ color: 0x64748b, alpha: 0.75 });
    }
    if (isRoad(col - 1, row)) {
      g.rect(px, py, 3, TILE_SIZE).fill({ color: 0x64748b, alpha: 0.75 });
    }
    if (isRoad(col + 1, row)) {
      g.rect(px + TILE_SIZE - 3, py, 3, TILE_SIZE).fill({ color: 0x94a3b8, alpha: 0.85 });
    }
  }

  private drawRoadMarkings(
    g: Graphics,
    tiles: TileType[],
    cols: number,
    rows: number,
    col: number,
    row: number,
    px: number,
    py: number,
  ): void {
    const isRoad = (c: number, r: number): boolean => {
      if (c < 0 || r < 0 || c >= cols || r >= rows) return false;
      return tiles[r * cols + c] === "road";
    };

    const up = isRoad(col, row - 1);
    const down = isRoad(col, row + 1);
    const left = isRoad(col - 1, row);
    const right = isRoad(col + 1, row);

    const isHorizLane = left && right && !(up && down);
    const isVertLane = up && down && !(left && right);

    // Crosswalk stripes right before entering an intersection
    const nextToIntersectionX =
      isHorizLane &&
      ((isRoad(col + 1, row - 1) && isRoad(col + 1, row + 1)) ||
        (isRoad(col - 1, row - 1) && isRoad(col - 1, row + 1)));
    const nextToIntersectionY =
      isVertLane &&
      ((isRoad(col - 1, row + 1) && isRoad(col + 1, row + 1)) ||
        (isRoad(col - 1, row - 1) && isRoad(col + 1, row - 1)));

    if (nextToIntersectionX) {
      const startX = isRoad(col + 1, row - 1) ? px + 14 : px + 8;
      for (let sy = 5; sy <= TILE_SIZE - 9; sy += 11) {
        g.rect(startX, py + sy, 26, 6).fill({ color: 0xf1f5f9, alpha: 0.82 });
      }
      return;
    }

    if (nextToIntersectionY) {
      const startY = isRoad(col - 1, row + 1) ? py + 14 : py + 8;
      for (let sx = 5; sx <= TILE_SIZE - 9; sx += 11) {
        g.rect(px + sx, startY, 6, 26).fill({ color: 0xf1f5f9, alpha: 0.82 });
      }
      return;
    }

    // Center dashed yellow lane divider between the 2 lanes
    if (isHorizLane && down && !up) {
      g.rect(px + 6, py + TILE_SIZE - 2, 14, 3).fill({ color: 0xfacc15, alpha: 0.86 });
      g.rect(px + 28, py + TILE_SIZE - 2, 14, 3).fill({ color: 0xfacc15, alpha: 0.86 });
    } else if (isVertLane && right && !left) {
      g.rect(px + TILE_SIZE - 2, py + 6, 3, 14).fill({ color: 0xfacc15, alpha: 0.86 });
      g.rect(px + TILE_SIZE - 2, py + 28, 3, 14).fill({ color: 0xfacc15, alpha: 0.86 });
    }
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
      const t = tiles[r * cols + c];
      return t === "water" || t === "shallow";
    };

    if (!isWater(col, row - 1)) g.rect(px, py, TILE_SIZE, 4).fill({ color: 0xe0f2fe, alpha: 0.55 });
    if (!isWater(col, row + 1)) g.rect(px, py + TILE_SIZE - 4, TILE_SIZE, 4).fill({ color: 0xe0f2fe, alpha: 0.45 });
    if (!isWater(col - 1, row)) g.rect(px, py, 4, TILE_SIZE).fill({ color: 0xe0f2fe, alpha: 0.55 });
    if (!isWater(col + 1, row)) g.rect(px + TILE_SIZE - 4, py, 4, TILE_SIZE).fill({ color: 0xe0f2fe, alpha: 0.45 });
  }

  private drawPuddleOverlay(
    g: Graphics,
    tiles: TileType[],
    cols: number,
    rows: number,
    col: number,
    row: number,
    px: number,
    py: number,
  ): void {
    const isPuddle = (c: number, r: number): boolean => {
      if (c < 0 || r < 0 || c >= cols || r >= rows) return false;
      return tiles[r * cols + c] === "puddle";
    };

    const hasUp = isPuddle(col, row - 1);
    const hasDown = isPuddle(col, row + 1);
    const hasLeft = isPuddle(col - 1, row);
    const hasRight = isPuddle(col + 1, row);

    const inset = 7;
    const left = hasLeft ? px : px + inset;
    const right = hasRight ? px + TILE_SIZE : px + TILE_SIZE - inset;
    const top = hasUp ? py : py + inset;
    const bottom = hasDown ? py + TILE_SIZE : py + TILE_SIZE - inset;
    const w = right - left;
    const h = bottom - top;

    // Seamless interior pool fill (zero grid lines between adjacent puddle tiles)
    g.rect(left, top, w, h).fill({ color: 0x38bdf8, alpha: 0.36 });

    // Soft shoreline foam outline strictly along exterior edges
    if (!hasUp) {
      g.rect(left, top, w, 2.5).fill({ color: 0xbae6fd, alpha: 0.52 });
    }
    if (!hasDown) {
      g.rect(left, bottom - 2.5, w, 2.5).fill({ color: 0x7dd3fc, alpha: 0.45 });
    }
    if (!hasLeft) {
      g.rect(left, top, 2.5, h).fill({ color: 0xbae6fd, alpha: 0.52 });
    }
    if (!hasRight) {
      g.rect(right - 2.5, top, 2.5, h).fill({ color: 0x7dd3fc, alpha: 0.45 });
    }

    // Subtle organic glint ripple on sparse puddle tiles
    if ((col + row) % 3 === 0) {
      g.roundRect(left + w * 0.22, top + h * 0.28, w * 0.36, 2.5, 1.2).fill({
        color: 0xe0f2fe,
        alpha: 0.45,
      });
    }
  }

  private buildZoneBoundaryMarkers(): void {
    const g = new Graphics();
    const boundaries: Array<{ col: number; color: number }> = [
      { col: GREEN_END_COL + 1, color: 0x10b981 },
      { col: YELLOW_END_COL + 1, color: 0xef4444 },
    ];
    for (const b of boundaries) {
      const x = b.col * TILE_SIZE;
      for (let y = TILE_SIZE * 2; y < WORLD_HEIGHT - TILE_SIZE * 2; y += 28) {
        g.rect(x - 2, y, 4, 16).fill({ color: b.color, alpha: 0.45 });
      }
    }
    this.groundLayer.addChild(g);
  }

  private buildLilypads(): void {
    for (let i = 0; i < this.data.lilypads.length; i++) {
      const pos = this.data.lilypads[i];
      const sprite = new Sprite(this.atlas.lilypads[i % 4]);
      sprite.anchor.set(0.5);
      sprite.scale.set(PIXEL_SCALE * 0.85);
      sprite.position.set(pos.x, pos.y);
      this.waterAnimLayer.addChild(sprite);
      this.lilypadSprites.push({ sprite, x: pos.x, y: pos.y, phase: i * 0.8 });
    }
  }

  private mountPropNode(prop: WorldProp): void {
    const node = this.createPropSprite(prop);
    const halfW = this.app.screen.width / (2 * Math.max(0.6, this.zoom));
    const halfH = this.app.screen.height / (2 * Math.max(0.6, this.zoom));
    node.visible =
      prop.x >= this.camX - halfW - TILE_SIZE - 240 &&
      prop.x <= this.camX + halfW + TILE_SIZE + 240 &&
      prop.y >= this.camY - halfH - TILE_SIZE - 80 &&
      prop.y <= this.camY + halfH + TILE_SIZE + 380;
    this.entityLayer.addChild(node);
    this.propNodes.push({ node, x: prop.x, y: prop.y });
  }

  private buildPropsAndBuildings(): void {
    const halfViewW = this.app.screen.width / (2 * Math.max(0.6, this.zoom));
    const halfViewH = this.app.screen.height / (2 * Math.max(0.6, this.zoom));
    const minX = this.camX - halfViewW - 360;
    const maxX = this.camX + halfViewW + 360;
    const minY = this.camY - halfViewH - 360;
    const maxY = this.camY + halfViewH + 360;

    this.pendingProps = [];
    for (const prop of this.data.props) {
      if (prop.kind === "food_cart" || prop.kind === "jp_vending_machine") {
        this.foodCartProps.push(prop);
      }
      const inInitialView = prop.x >= minX && prop.x <= maxX && prop.y >= minY && prop.y <= maxY;
      if (
        inInitialView ||
        isBuildingProp(prop.kind) ||
        prop.kind === "food_cart" ||
        prop.kind === "jp_vending_machine"
      ) {
        this.mountPropNode(prop);
      } else {
        this.pendingProps.push(prop);
      }
    }

    // Sort descending by squared distance so .pop() yields nearest prop in O(1)
    this.pendingProps.sort((a, b) => {
      const da = (a.x - this.camX) ** 2 + (a.y - this.camY) ** 2;
      const db = (b.x - this.camX) ** 2 + (b.y - this.camY) ** 2;
      return db - da;
    });
  }

  private streamNextProps(budget = 24): void {
    let count = budget;
    while (count > 0 && this.pendingProps.length > 0) {
      const prop = this.pendingProps.pop()!;
      this.mountPropNode(prop);
      count--;
    }
  }

  private createPropSprite(prop: WorldProp): Container {
    const container = new Container();
    container.x = prop.x;
    container.y = prop.y;

    const isJapan = this.activeMapId === "japan";
    const JP_GREEN_BLD_TEXTURE_OVERRIDE: Partial<Record<PropKind, BuildingKind>> = {
      city_home_house: "jp_ryokan_inn",
      city_collection_hall: "jp_tokyo_tower",
      city_auction_house: "jp_shinkansen_station",
      city_backpack_shop: "jp_akihabara_arcade",
      city_clothing_shop: "jp_samurai_manor",
      city_butcher_shop: "jp_village_machiya",
      plains_garden_inn: "jp_snow_onsen_temple",
      city_pharmacy: "plains_archway",
      city_police_station: "jp_ninja_dojo",
      city_quest_guild: "jp_shinkansen_station",
      city_reputation_hall: "jp_shinto_shrine",
      city_pet_gacha: "jp_akihabara_arcade",
    };
    const overrideKind = isJapan ? JP_GREEN_BLD_TEXTURE_OVERRIDE[prop.kind] : undefined;
    const tex = overrideKind ? this.atlas.buildings[overrideKind] : this.atlas.props[prop.kind];
    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5, 0.94);
    const isBld = isBuildingProp(prop.kind);
    sprite.scale.set(
      prop.kind === "city_collection_hall"
        ? isJapan
          ? BUILDING_PIXEL_SCALE * 0.94
          : BUILDING_PIXEL_SCALE * 0.82
        : isBld
          ? BUILDING_PIXEL_SCALE
          : prop.kind === "jp_torii_gate"
            ? PIXEL_SCALE * 1.15
            : PIXEL_SCALE,
    );
    if (prop.kind === "sakura_tree" || prop.kind === "sakura_small") {
      sprite.tint = 0xffb7d5;
    } else if (prop.kind === "momiji_tree" || prop.kind === "momiji_small") {
      sprite.tint = 0xff784f;
    }

    // Buildings include a flat oval courtyard at the bottom ~22% of the sprite;
    // lift zIndex to the actual wall line so player stands cleanly on top of the front lawn!
    const depthY = isBld ? prop.y - sprite.height * 0.22 : prop.y;
    container.zIndex = depthY;

    const shadowWidth = Math.max(18, sprite.width * 0.42);
    const shadow = new Sprite(this.atlas.shadow);
    shadow.anchor.set(0.5, 0.5);
    shadow.position.set(0, -2);
    shadow.width = shadowWidth * 2;
    shadow.height = Math.max(7, shadowWidth * 0.25) * 2;
    shadow.alpha = 0.28;

    container.addChild(shadow, sprite);

    const SERVICE_SIGNS: Partial<Record<PropKind, { text: string; color: number }>> = {
      city_backpack_shop: { text: "🏪 SHOP BALO", color: 0xfef08a },
      city_clothing_shop: { text: "👔 SHOP QUẦN ÁO", color: 0xe9d5ff },
      city_hair_salon: { text: "💇 TIỆM TÓC", color: 0xfbcfe8 },
      city_pharmacy: { text: "💊 HIỆU THUỐC", color: 0x99f6e4 },
      city_butcher_shop: { text: "🍜 QUÁN ĂN", color: 0xfed7aa },
      plains_garden_inn: { text: "🍽️ NHÀ HÀNG", color: 0xfed7aa },
      city_home_house: { text: "🏠 NHÀ RIÊNG", color: 0xa7f3d0 },
      city_collection_hall: { text: "🏛️ PHÒNG SƯU TẦM", color: 0xfde047 },
      city_auction_house: { text: "⚖️ NHÀ ĐẤU GIÁ", color: 0xfbbf24 },
      city_airport: { text: "✈️ SÂN BAY QUỐC TẾ", color: 0x7dd3fc },
      city_quest_guild: { text: "📜 HỘI SỞ NHIỆM VỤ", color: 0xfde047 },
      city_reputation_hall: { text: "🏛️ SẢNH DANH VỌNG", color: 0xf43f5e },
      city_pet_gacha: { text: "🐾 NHÀ NHẬN NUÔI THÚ CƯNG", color: 0xf472b6 },
      city_hospital: { text: "🏥 BỆNH VIỆN", color: 0xfecdd3 },
      city_police_station: { text: "🚓 CÔNG AN PHƯỜNG", color: 0x93c5fd },
    };

    const JP_SERVICE_SIGNS: Partial<Record<PropKind, { text: string; color: number }>> = {
      city_backpack_shop: { text: "🎒 TIỆM BALO AKIHABARA", color: 0xfef08a },
      city_clothing_shop: { text: "👘 TIỆM KIMONO & GIÁP SAMURAI", color: 0xfbcfe8 },
      city_hair_salon: { text: "💇 SALON TÓC HARAJUKU", color: 0xe9d5ff },
      city_pharmacy: { text: "💊 DƯỢC ĐƯỜNG KANPO", color: 0x99f6e4 },
      city_butcher_shop: { text: "🍜 QUÁN RAMEN ICHIRAKU", color: 0xfed7aa },
      plains_garden_inn: { text: "🍣 NHÀ HÀNG OMAKASE & ONSEN", color: 0xfed7aa },
      city_home_house: { text: "🏯 DINH THỰ RIÊNG TOKYO", color: 0xa7f3d0 },
      city_collection_hall: { text: "🗼 THÁP BẢO TÀNG TOKYO", color: 0xfde047 },
      city_auction_house: { text: "⚖️ SÀN ĐẤU GIÁ TOKYO", color: 0xfbbf24 },
      city_airport: { text: "✈️ SÂN BAY NARITA (5.000🪙)", color: 0x7dd3fc },
      city_quest_guild: { text: "📜 BẢNG ỦY THÁC TOKYO", color: 0xfde047 },
      city_reputation_hall: { text: "🏛️ SẢNH DANH VỌNG TOKYO", color: 0xf43f5e },
      city_pet_gacha: { text: "🐾 NHÀ NHẬN NUÔI THÚ CƯNG", color: 0xf472b6 },
      city_hospital: { text: "🏥 BỆNH VIỆN TOKYO", color: 0xfecdd3 },
      city_police_station: { text: "🚓 ĐỒN CẢNH SÁT KOBAN", color: 0x93c5fd },
    };

    const signMeta = (isJapan ? JP_SERVICE_SIGNS[prop.kind] : undefined) ?? SERVICE_SIGNS[prop.kind];
    if (signMeta) {
      const tag = new Text({
        text: signMeta.text,
        style: {
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 13,
          fontWeight: "800",
          fill: signMeta.color,
          stroke: { color: 0x0f172a, width: 4 },
        },
      });
      tag.anchor.set(0.5, 1);
      tag.position.set(0, -sprite.height * 0.94 - 4);
      container.addChild(tag);
    }

    if (
      isBld ||
      prop.kind === "oak_warm" ||
      prop.kind === "oak_moss" ||
      prop.kind === "tree_small_warm" ||
      prop.kind === "tree_small_moss" ||
      prop.kind === "city_tree" ||
      prop.kind === "city_tree_warm" ||
      prop.kind === "sakura_tree" ||
      prop.kind === "sakura_small" ||
      prop.kind === "momiji_tree" ||
      prop.kind === "momiji_small" ||
      prop.kind === "jp_torii_gate" ||
      prop.kind === "jp_bamboo_cluster" ||
      prop.kind === "jp_snow_pine" ||
      prop.kind === "lodge" ||
      prop.kind === "hut" ||
      prop.kind === "watchtower" ||
      prop.kind === "shrine_ruin"
    ) {
      const entry: OccludableProp = {
        container,
        prop,
        x: prop.x,
        bottomY: prop.y,
        topY: prop.y - sprite.height * 0.94,
        depthY,
        halfW: sprite.width * 0.44,
      };
      this.occludableProps.push(entry);
      if (isBld) {
        this.buildingOccludables.push(entry);
      }
    }

    if (prop.kind === "city_collection_hall") {
      this.collectionOrbitHost = {
        x: prop.x,
        y: prop.y,
        height: sprite.height,
        depthY,
      };
      this.refreshCollectionOrbitSprites();
    }

    return container;
  }

  private getOrbitTexture(src: string): Promise<Texture> {
    const hashed = withAssetHash(src);
    let p = this.orbitTextureCache.get(hashed);
    if (!p) {
      p = Assets.load<Texture>(hashed);
      this.orbitTextureCache.set(hashed, p);
    }
    return p;
  }

  private refreshCollectionOrbitSprites(): void {
    for (const entry of this.collectionOrbitItems) {
      entry.node.destroy({ children: true });
    }
    this.collectionOrbitItems.length = 0;
    if (!this.collectionOrbitHost) return;

    const slots = this.inventory.getCollectionHallStates();
    const displayedEntries = Object.entries(slots).filter(([, slot]) => slot.displayed);
    const total = displayedEntries.length;
    if (total === 0) return;

    displayedEntries.forEach(([itemId, slot], idx) => {
      const def = ITEM_BY_ID[itemId];
      if (!def) return;

      const node = new Container();
      const glow = new Graphics();

      if (slot.lightLevel === 2) {
        // Golden Tier 2: radiant dual-ring aura + 4 golden star flares
        glow
          .circle(0, 0, 20)
          .fill({ color: 0xf59e0b, alpha: 0.24 })
          .circle(0, 0, 14)
          .fill({ color: 0xfde047, alpha: 0.36 })
          .circle(0, 0, 17)
          .stroke({ color: 0xfef08a, width: 1.5, alpha: 0.85 });
        for (let r = 0; r < 4; r++) {
          const ang = (r * Math.PI) / 2;
          glow
            .moveTo(Math.cos(ang) * 12, Math.sin(ang) * 12)
            .lineTo(Math.cos(ang) * 23, Math.sin(ang) * 23)
            .stroke({ color: 0xfef08a, width: 1.8, alpha: 0.9 });
        }
      } else if (slot.lightLevel === 1) {
        // White Tier 1: silver-white halo + 4 crisp star ticks
        glow
          .circle(0, 0, 17)
          .fill({ color: 0xbae6fd, alpha: 0.26 })
          .circle(0, 0, 13)
          .stroke({ color: 0xffffff, width: 1.3, alpha: 0.78 });
        for (let r = 0; r < 4; r++) {
          const ang = (r * Math.PI) / 2 + Math.PI / 4;
          glow
            .moveTo(Math.cos(ang) * 11, Math.sin(ang) * 11)
            .lineTo(Math.cos(ang) * 18, Math.sin(ang) * 18)
            .stroke({ color: 0xe0f2fe, width: 1.4, alpha: 0.85 });
        }
      } else {
        // Tier 0: subtle crimson aura
        glow
          .circle(0, 0, 13)
          .fill({ color: 0xf43f5e, alpha: 0.2 })
          .circle(0, 0, 13)
          .stroke({ color: 0xfda4af, width: 1, alpha: 0.45 });
      }

      const iconSprite = new Sprite();
      iconSprite.anchor.set(0.5, 0.5);
      iconSprite.alpha = slot.lightLevel === 0 ? 0.88 : 1;
      void this.getOrbitTexture(def.iconSrc).then((tex) => {
        if (iconSprite.destroyed) return;
        iconSprite.texture = tex;
        const maxSide = Math.max(tex.width || 32, tex.height || 32);
        const targetPx = slot.lightLevel === 2 ? 25 : slot.lightLevel === 1 ? 22 : 19;
        const scale = targetPx / Math.max(1, maxSide);
        iconSprite.scale.set(scale);
      });

      node.addChild(glow, iconSprite);
      this.entityLayer.addChild(node);

      const ring = idx % 2;
      this.collectionOrbitItems.push({
        node,
        glow,
        lightLevel: slot.lightLevel,
        phaseOffset: (idx / total) * Math.PI * 2,
        radiusX: 82 + ring * 24,
        radiusY: 30 + ring * 10,
        speed: slot.lightLevel === 2 ? 0.78 : slot.lightLevel === 1 ? 0.65 : 0.52,
      });
    });

    this.updateCollectionOrbit();
  }

  private updateCollectionOrbit(): void {
    const host = this.collectionOrbitHost;
    if (!host || this.collectionOrbitItems.length === 0) return;

    const centerY = host.y - host.height * 0.46;
    for (const item of this.collectionOrbitItems) {
      const angle = this.elapsed * item.speed + item.phaseOffset;
      const sinA = Math.sin(angle);
      const bob = Math.sin(this.elapsed * 2.8 + item.phaseOffset) * 4;
      item.node.position.set(
        host.x + Math.cos(angle) * item.radiusX,
        centerY + sinA * item.radiusY + bob,
      );
      item.node.zIndex = sinA >= 0 ? host.depthY + 40 : host.depthY - 40;

      if (item.lightLevel === 2) {
        item.glow.rotation = this.elapsed * 1.1;
        const pulse = 1 + Math.sin(this.elapsed * 4.2 + item.phaseOffset) * 0.14;
        item.glow.scale.set(pulse);
      } else if (item.lightLevel === 1) {
        item.glow.rotation = -this.elapsed * 0.65;
        const pulse = 1 + Math.sin(this.elapsed * 2.8 + item.phaseOffset) * 0.08;
        item.glow.scale.set(pulse);
      }
    }
  }

  private refreshPetFollower(): void {
    if (this.petNode) {
      this.petNode.destroy({ children: true });
      this.petNode = null;
      this.petSprite = null;
      this.petAura = null;
      this.petBubble = null;
    }
    this.petIdleFrames = [];
    this.petRunFrames = [];
    this.petPlayFrames = [];
    this.petIdleTime = 0;

    const pet = this.getEquippedPet();
    if (!pet) return;

    const node = new Container();
    const shadow = new Sprite(this.atlas.shadow);
    shadow.anchor.set(0.5, 0.5);
    shadow.position.set(0, 6);
    shadow.width = 24;
    shadow.height = 10;
    shadow.alpha = 0.28;

    const groundGlow = new Graphics();
    const aura = new Graphics();
    if (pet.rarity === "S") {
      // Soft borderless multi-layer crimson & gold floor glow
      groundGlow
        .ellipse(0, 5, 24, 10)
        .fill({ color: 0xf43f5e, alpha: 0.14 })
        .ellipse(0, 5, 17, 7)
        .fill({ color: 0xfde047, alpha: 0.22 })
        .ellipse(0, 5, 10, 4)
        .fill({ color: 0xfef9c3, alpha: 0.26 });
      // Orbiting sparkle motes (no hard ring border)
      for (let r = 0; r < 5; r++) {
        const ang = (r * Math.PI * 2) / 5;
        const rad = 16 + (r % 2) * 4;
        aura
          .circle(Math.cos(ang) * rad, -8 + Math.sin(ang) * (rad * 0.55), r % 2 === 0 ? 2.1 : 1.5)
          .fill({ color: r % 2 === 0 ? 0xfef08a : 0xfb7185, alpha: 0.85 });
      }
    } else if (pet.rarity === "A") {
      groundGlow
        .ellipse(0, 5, 20, 8.5)
        .fill({ color: 0xf59e0b, alpha: 0.12 })
        .ellipse(0, 5, 13, 5.5)
        .fill({ color: 0xfde047, alpha: 0.2 });
      for (let r = 0; r < 3; r++) {
        const ang = (r * Math.PI * 2) / 3;
        aura
          .circle(Math.cos(ang) * 15, -8 + Math.sin(ang) * 8, 1.7)
          .fill({ color: 0xfef08a, alpha: 0.78 });
      }
    } else if (pet.rarity === "B") {
      groundGlow
        .ellipse(0, 5, 16, 7)
        .fill({ color: 0x38bdf8, alpha: 0.11 })
        .ellipse(0, 5, 10, 4.5)
        .fill({ color: 0xbae6fd, alpha: 0.16 });
      for (let r = 0; r < 2; r++) {
        const ang = r * Math.PI;
        aura
          .circle(Math.cos(ang) * 13, -7 + Math.sin(ang) * 6, 1.4)
          .fill({ color: 0xe0f2fe, alpha: 0.68 });
      }
    }

    const sprite = new Sprite();
    sprite.anchor.set(0.5, 0.85);

    const bubble = new Text({
      text: "",
      style: {
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 13,
        fontWeight: "800",
        fill: 0xffffff,
        stroke: { color: 0x0f172a, width: 3.5 },
      },
    });
    bubble.anchor.set(0.5, 1);
    bubble.position.set(0, -34);
    bubble.visible = false;

    const sheet = pet.spriteSheet;
    const sliceStrip = (tex: Texture, w: number, h: number, count: number): Texture[] => {
      const out: Texture[] = [];
      for (let i = 0; i < count; i++) {
        if ((i + 1) * w > tex.source.width + 1) break;
        out.push(
          new Texture({
            source: tex.source,
            frame: new Rectangle(i * w, 0, w, h),
          }),
        );
      }
      return out.length > 0 ? out : [tex];
    };

    const loaders: Array<Promise<Texture>> = [
      this.getOrbitTexture(sheet.idleSrc),
      this.getOrbitTexture(sheet.runSrc),
    ];
    if (sheet.playSrc) {
      loaders.push(this.getOrbitTexture(sheet.playSrc));
    }

    void Promise.all(loaders).then(([idleTex, runTex, playTex]) => {
      if (sprite.destroyed) return;
      this.petIdleFrames = sliceStrip(idleTex, sheet.iw, sheet.ih, sheet.ic);
      this.petRunFrames = sliceStrip(runTex, sheet.rw, sheet.rh, sheet.rc);
      if (playTex && sheet.pw && sheet.ph && sheet.pc) {
        this.petPlayFrames = sliceStrip(playTex, sheet.pw, sheet.ph, sheet.pc);
      }
      sprite.texture = this.petIdleFrames[0];
      const targetPx = pet.rarity === "S" ? 36 : pet.rarity === "A" ? 33 : 30;
      this.petBaseScale = targetPx / Math.max(1, sheet.iw);
      sprite.scale.set(this.petBaseScale * this.petFacingSign, this.petBaseScale);
    });

    node.addChild(shadow, groundGlow, aura, sprite, bubble);
    this.entityLayer.addChild(node);
    this.petPosX = this.player.x - 28;
    this.petPosY = this.player.y + 4;
    node.position.set(this.petPosX, this.petPosY);
    node.zIndex = this.petPosY;

    this.petNode = node;
    this.petSprite = sprite;
    this.petAura = aura;
    this.petBubble = bubble;
  }

  private updatePetFollower(dt: number): void {
    if (!this.petNode || !this.petSprite) return;

    const pet = this.getEquippedPet();
    const isSmartRank = pet !== null && (pet.rarity === "A" || pet.rarity === "S");
    const playerMoving = this.player.isMoving();
    this.petIdleTime = playerMoving ? 0 : this.petIdleTime + dt;

    // Smart Rank A/S Companion: sniff nearby unopened chests & alert nearby police
    let targetX = this.player.x - 30;
    let targetY = this.player.y + 6;
    let bubbleText = "";
    let playfulOrbit = false;

    if (isSmartRank) {
      const zone = this.getSecurityZoneAt(this.player.x, this.player.y);
      if (zone !== "green") {
        const nearestPolice = this.police.findNearestOfficer(
          this.player.x,
          this.player.y,
          this.ignoreUntilByOfficer,
          this.globalPoliceIgnoreUntil,
        );
        if (nearestPolice && nearestPolice.distance <= 195) {
          bubbleText = "🚨!";
        }
      }

      const sniffRange = pet.rarity === "S" ? 320 : 260;
      let nearestChestDist = sniffRange;
      let sniffChestX = 0;
      let sniffChestY = 0;
      let foundChest = false;
      for (const cv of this.chestVisuals) {
        if (cv.chest.opened) continue;
        const d = Math.hypot(cv.chest.x - this.player.x, cv.chest.y - this.player.y);
        if (d < nearestChestDist) {
          nearestChestDist = d;
          sniffChestX = cv.chest.x;
          sniffChestY = cv.chest.y;
          foundChest = true;
        }
      }

      if (foundChest) {
        // Lean/trot toward the treasure chest while staying tethered near the player
        const ang = Math.atan2(sniffChestY - this.player.y, sniffChestX - this.player.x);
        targetX = this.player.x + Math.cos(ang) * 44;
        targetY = this.player.y + Math.sin(ang) * 44;
        if (!bubbleText) bubbleText = "💎!";
      } else if (this.petIdleTime >= 2.8) {
        // Playful idle behavior for Rank A/S: orbit around player or bounce with toy
        playfulOrbit = true;
        const cycle = Math.floor(this.petIdleTime / 4.5) % 2;
        if (cycle === 0) {
          const orbitAng = this.elapsed * 2.1;
          targetX = this.player.x + Math.cos(orbitAng) * 36;
          targetY = this.player.y + Math.sin(orbitAng) * 20;
        }
        if (!bubbleText) {
          const icons = pet.rarity === "S" ? ["✨", "🎵", "⚡", "❤️"] : ["🎾", "🐾", "🎵", "❤️"];
          bubbleText = icons[Math.floor(this.elapsed * 0.7) % icons.length];
        }
      }
    }

    const dx = targetX - this.petPosX;
    const dy = targetY - this.petPosY;
    const dist = Math.hypot(dx, dy);

    if (dist > 220) {
      this.petPosX = targetX;
      this.petPosY = targetY;
    } else {
      const follow = 1 - Math.exp(-7.5 * dt);
      this.petPosX += dx * follow;
      this.petPosY += dy * follow;
    }

    if (Math.abs(dx) > 1.0) {
      this.petFacingSign = dx >= 0 ? 1 : -1;
    }

    const moving = dist > 5 || playerMoving;
    const usePlay = playfulOrbit && !moving && this.petPlayFrames.length > 0;
    const frames = usePlay
      ? this.petPlayFrames
      : moving && this.petRunFrames.length > 0
        ? this.petRunFrames
        : this.petIdleFrames;
    if (frames.length > 0) {
      const fps = moving ? 10 : 8;
      const frameIdx = Math.floor(this.elapsed * fps) % frames.length;
      if (this.petSprite.texture !== frames[frameIdx]) {
        this.petSprite.texture = frames[frameIdx];
      }
    }

    const bob = moving
      ? Math.abs(Math.sin(this.elapsed * 10)) * 2.8
      : usePlay
        ? Math.abs(Math.sin(this.elapsed * 7)) * 3.2
        : 0;
    this.petSprite.position.set(0, -bob);
    this.petSprite.scale.set(this.petBaseScale * this.petFacingSign, this.petBaseScale);

    if (this.petAura) {
      this.petAura.position.set(0, -bob);
      this.petAura.rotation = this.elapsed * 1.1;
      const pulse = 1 + Math.sin(this.elapsed * 3.5) * 0.08;
      this.petAura.scale.set(pulse);
    }

    if (this.petBubble) {
      if (bubbleText) {
        this.petBubble.visible = true;
        this.petBubble.text = bubbleText;
        this.petBubble.position.set(0, -34 - bob + Math.sin(this.elapsed * 5) * 2);
      } else {
        this.petBubble.visible = false;
      }
    }

    if (moving) {
      this.petDustAccum += dt;
      if (this.petDustAccum >= 0.22) {
        this.petDustAccum = 0;
        const puff = new Graphics().circle(0, 0, 3).fill({ color: 0xe2e8f0, alpha: 0.45 });
        puff.position.set(this.petPosX, this.petPosY + 4);
        puff.zIndex = this.petPosY - 1;
        this.entityLayer.addChild(puff);
        window.setTimeout(() => {
          if (!puff.destroyed) puff.destroy();
        }, 220);
      }
      if (pet?.rarity === "S") {
        this.petStarAccum += dt;
        if (this.petStarAccum >= 0.16) {
          this.petStarAccum = 0;
          const starColor = Math.random() < 0.5 ? 0xfde047 : 0xfb7185;
          const star = new Graphics().circle(0, 0, 2.5).fill({ color: starColor, alpha: 0.85 });
          star.position.set(
            this.petPosX + (Math.random() - 0.5) * 14,
            this.petPosY - 6 + (Math.random() - 0.5) * 10,
          );
          star.zIndex = this.petPosY + 1;
          this.entityLayer.addChild(star);
          window.setTimeout(() => {
            if (!star.destroyed) star.destroy();
          }, 320);
        }
      }
    } else {
      this.petDustAccum = 0;
      this.petStarAccum = 0;
    }

    this.petNode.position.set(this.petPosX, this.petPosY);
    this.petNode.zIndex = this.petPosY;
  }

  private buildChests(): void {
    for (const chest of this.data.chests) {
      const searched = this.inventory.isContainerSearched(chest.id);
      chest.opened = searched;

      const container = new Container();
      container.position.set(chest.x, chest.y);
      container.zIndex = chest.y;

      const shadow = new Sprite(this.atlas.shadow);
      shadow.anchor.set(0.5, 0.5);
      shadow.position.set(0, -1);
      shadow.width = 32;
      shadow.height = 12;
      shadow.alpha = 0.34;

      const auraColor =
        chest.kind === "trash"
          ? 0x94a3b8
          : chest.kind === "royal"
            ? 0xef4444
            : 0xeab308;
      const aura = new Graphics()
        .ellipse(0, -6, 20, 9)
        .stroke({ width: 2, color: auraColor, alpha: 0.72 });
      aura.visible = !searched;

      const tex =
        chest.kind === "trash"
          ? this.atlas.props.trash_bin
          : searched
            ? this.atlas.chestOpen
            : this.atlas.chestClosed;
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5, 0.92);
      sprite.scale.set(chest.kind === "trash" ? 2.75 : 2.5);
      if (chest.kind === "royal" && !searched) {
        sprite.tint = 0xfef08a;
      }

      container.addChild(shadow, aura, sprite);
      this.entityLayer.addChild(container);
      this.chestVisuals.push({ chest, container, sprite, aura });
    }
  }

  private syncChestVisualsAfterRefresh(expiredIds: string[]): void {
    const expiredSet = new Set(expiredIds);
    for (const cv of this.chestVisuals) {
      if (!expiredSet.has(cv.chest.id)) continue;
      cv.chest.opened = false;
      if (cv.chest.kind !== "trash") {
        cv.sprite.texture = this.atlas.chestClosed;
      }
      cv.aura.visible = true;
    }
  }

  private animateChestsAndPopups(): void {
    for (let i = 0; i < this.chestVisuals.length; i++) {
      const cv = this.chestVisuals[i];
      if (!cv.container.visible || cv.chest.opened) continue;
      const pulse = 0.92 + Math.sin(this.elapsed * 3.8 + i) * 0.12;
      cv.aura.scale.set(pulse);
      cv.aura.alpha = 0.52 + Math.sin(this.elapsed * 3.8 + i) * 0.25;
    }
  }

  private playPressSfx(): void {
    if (!this.soundEnabled) return;
    try {
      sound.play("sfx-press", { volume: 0.25 });
    } catch {
      // Ignore audio lock before gesture
    }
  }

  /**
   * Smoothly fades any building or tall tree behind which the player walks
   * so the character remains 100% visible at all times.
   */
  private updatePropOcclusionFade(dt: number): void {
    const px = this.player.x;
    const py = this.player.y;
    const lerpRate = Math.min(1, 10 * dt);

    for (const op of this.occludableProps) {
      if (!op.container.visible) continue;
      const behindStructure =
        py < op.depthY - 2 &&
        py > op.topY - 12 &&
        Math.abs(px - op.x) < op.halfW;
      const targetAlpha = behindStructure ? 0.36 : 1.0;
      if (Math.abs(op.container.alpha - targetAlpha) > 0.005) {
        op.container.alpha += (targetAlpha - op.container.alpha) * lerpRate;
      } else {
        op.container.alpha = targetAlpha;
      }
    }
  }

  private spawnWaterStepEffect(x: number, y: number, mode: "wade" | "swim"): void {
    if (this.waterWakes.length < 40) {
      this.waterWakes.push({
        x,
        y: mode === "swim" ? y - 8 : y - 1,
        age: 0,
        duration: mode === "swim" ? 0.8 : 0.55,
        maxRadiusX: mode === "swim" ? 34 : 22,
        maxRadiusY: mode === "swim" ? 13 : 8,
      });
    }

    const splashCount = mode === "wade" ? 4 : 3;
    for (let i = 0; i < splashCount && this.waterDroplets.length < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 28 + Math.random() * 44;
      this.waterDroplets.push({
        x: x + (Math.random() - 0.5) * 10,
        y: mode === "swim" ? y - 10 : y - 2,
        vx: Math.cos(angle) * speed,
        vy: -55 - Math.random() * 45,
        age: 0,
        duration: 0.32 + Math.random() * 0.14,
      });
    }
  }

  private renderWaterWakesAndDroplets(dt: number): void {
    const hasParticles = this.waterWakes.length > 0 || this.waterDroplets.length > 0;
    if (!hasParticles && !this.waterLayerDirty) return;
    const g = this.waterWakeLayer;
    g.clear();
    if (!hasParticles) {
      this.waterLayerDirty = false;
      return;
    }
    this.waterLayerDirty = true;

    for (let i = this.waterWakes.length - 1; i >= 0; i--) {
      const w = this.waterWakes[i];
      w.age += dt;
      if (w.age >= w.duration) {
        this.waterWakes.splice(i, 1);
        continue;
      }
      const p = w.age / w.duration;
      const rx = 8 + p * w.maxRadiusX;
      const ry = 3 + p * w.maxRadiusY;
      const alpha = (1 - p) * 0.72;
      g.ellipse(w.x, w.y, rx, ry).stroke({ width: 1.8, color: 0xe0f2fe, alpha });
    }

    for (let i = this.waterDroplets.length - 1; i >= 0; i--) {
      const d = this.waterDroplets[i];
      d.age += dt;
      if (d.age >= d.duration) {
        this.waterDroplets.splice(i, 1);
        continue;
      }
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 320 * dt;
      const alpha = 1 - d.age / d.duration;
      g.circle(d.x, d.y, 2.2).fill({ color: 0xbae6fd, alpha });
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
    const remaining = this.player.getRemainingPath();
    const hasShapes = remaining.length > 0 || this.ripples.length > 0;
    if (!hasShapes && !this.pathLayerDirty) return;
    const g = this.pathOverlayLayer;
    g.clear();
    if (!hasShapes) {
      this.pathLayerDirty = false;
      return;
    }
    this.pathLayerDirty = true;

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

  private animateLilypads(): void {
    const frameBase = Math.floor(this.elapsed * 3);
    for (const lp of this.lilypadSprites) {
      if (!lp.sprite.visible) continue;
      const frame = (frameBase + Math.floor(lp.phase)) % 4;
      const tex = this.atlas.lilypads[frame];
      if (lp.sprite.texture !== tex) {
        lp.sprite.texture = tex;
      }
    }
  }

  private checkLandmarks(): void {
    let discoveredCount = 0;
    for (const lm of this.data.landmarks) {
      if (lm.discovered) continue;
      if (Math.hypot(this.player.x - lm.x, this.player.y - lm.y) <= lm.radius) {
        lm.discovered = true;
        this.discoveredLandmarkIds.add(lm.id);
        discoveredCount += 1;
        this.callbacks.onLandmarkDiscovered?.(lm);
      }
    }
    if (discoveredCount > 0) {
      this.advanceExploreQuests("discover_landmarks", discoveredCount);
      this.callbacks.onRequestSave?.(true);
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

    const res = this.app.renderer.resolution || 1;
    const posX = Math.round((viewW / 2 - this.camX * this.zoom) * res) / res;
    const posY = Math.round((viewH / 2 - this.camY * this.zoom) * res) / res;

    this.worldContainer.scale.set(this.zoom);
    this.worldContainer.position.set(posX, posY);

    this.worldLightsContainer.scale.set(this.zoom);
    this.worldLightsContainer.position.set(posX, posY);

    const movedFar =
      this.forceCullUpdate ||
      Number.isNaN(this.lastCullCamX) ||
      Math.abs(this.camX - this.lastCullCamX) >= 12 ||
      Math.abs(this.camY - this.lastCullCamY) >= 12 ||
      Math.abs(this.zoom - this.lastCullZoom) >= 0.005;
    if (!movedFar) {
      return;
    }

    this.lastCullCamX = this.camX;
    this.lastCullCamY = this.camY;
    this.lastCullZoom = this.zoom;
    this.forceCullUpdate = false;

    const minVisibleX = this.camX - halfViewWorldW - TILE_SIZE;
    const maxVisibleX = this.camX + halfViewWorldW + TILE_SIZE;
    const minVisibleY = this.camY - halfViewWorldH - TILE_SIZE;
    const maxVisibleY = this.camY + halfViewWorldH + TILE_SIZE;

    for (const ch of this.terrainChunks) {
      const visible =
        ch.maxX >= minVisibleX &&
        ch.minX <= maxVisibleX &&
        ch.maxY >= minVisibleY &&
        ch.minY <= maxVisibleY;
      ch.node.visible = visible;
      if (visible && !ch.built) {
        this.populateTerrainChunk(ch);
      }
    }

    // Frustum-cull world entities cleanly outside the camera viewport (+sprite height/width padding)
    const propMinX = minVisibleX - 240;
    const propMaxX = maxVisibleX + 240;
    const propMinY = minVisibleY - 80;
    const propMaxY = maxVisibleY + 380;

    if (this.pendingProps.length > 0) {
      for (let i = this.pendingProps.length - 1; i >= 0; i--) {
        const p = this.pendingProps[i];
        if (p.x >= propMinX && p.x <= propMaxX && p.y >= propMinY && p.y <= propMaxY) {
          const lastIdx = this.pendingProps.length - 1;
          this.pendingProps[i] = this.pendingProps[lastIdx];
          this.pendingProps.pop();
          this.mountPropNode(p);
        }
      }
    }

    for (const pn of this.propNodes) {
      pn.node.visible =
        pn.x >= propMinX && pn.x <= propMaxX && pn.y >= propMinY && pn.y <= propMaxY;
    }
    for (const cv of this.chestVisuals) {
      cv.container.visible =
        cv.chest.x >= propMinX &&
        cv.chest.x <= propMaxX &&
        cv.chest.y >= propMinY &&
        cv.chest.y <= propMaxY;
    }
    for (const lp of this.lilypadSprites) {
      lp.sprite.visible =
        lp.x >= minVisibleX - 48 &&
        lp.x <= maxVisibleX + 48 &&
        lp.y >= minVisibleY - 48 &&
        lp.y <= maxVisibleY + 48;
    }
  }

  private updateResponsiveBaseZoom(width: number, height: number, immediate = false): void {
    const minDim = Math.min(width, height);
    const defaultZoom = minDim < 500 ? 45 / 48 : 1.0;
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
      this.atmosphere.resize(width, height);
      this.updateResponsiveBaseZoom(width, height, false);
      this.forceCullUpdate = true;
      this.syncCameraTransform();
      if (this.isInJail) {
        this.jailRoom.syncCameraTransform(width, height, this.player.x, this.player.y);
      }
    });

    this.app.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  private readonly onPointerDown = (e: FederatedPointerEvent): void => {
    this.isPointerDown = true;
    const targetContainer = this.isInJail ? this.jailRoom.container : this.worldContainer;
    const worldPos = targetContainer.toLocal(e.global);
    if (this.isInJail && !this.isMovementLocked()) {
      const st = this.jailRoom.getStationAtPoint(worldPos.x, worldPos.y, 40);
      if (st) {
        const dist = Math.hypot(this.player.x - st.x, this.player.y - st.y);
        if (dist <= 76) {
          this.isPointerDown = false;
          this.triggerInteraction();
          return;
        }
        this.lastDragPathAt = performance.now();
        this.moveToWorldPoint(st.x, st.y, true);
        return;
      }
    }
    this.lastDragPathAt = performance.now();
    this.moveToWorldPoint(worldPos.x, worldPos.y, true);
  };

  private readonly onPointerMove = (e: FederatedPointerEvent): void => {
    if (!this.isPointerDown) return;
    const now = performance.now();
    if (now - this.lastDragPathAt < 85) return;
    this.lastDragPathAt = now;

    const targetContainer = this.isInJail ? this.jailRoom.container : this.worldContainer;
    const worldPos = targetContainer.toLocal(e.global);
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
    if (e.code === "KeyE" && !e.repeat) {
      this.triggerInteraction();
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
  };
}
