import { withAssetHash } from "../assetUrl.ts";
import {
  AIRPORT_GENDER_CHANGE_COST,
  AIRPORT_JAPAN_FLIGHT_COST,
  CONSUMABLE_BY_ID,
  CONSUMABLE_CATALOG,
  GARMENT_BY_ID,
  GARMENT_CATALOG,
  HAIR_BY_ID,
  HAIR_OPTIONS,
  computeEquipmentStats,
  createDefaultEquippedGear,
  getCharacterBodyScale,
  getConsumableSingleUsePrice,
  resolveGarmentLayerKey,
  type EquipmentSlot,
  type EquippedGear,
  type GarmentDef,
} from "../world/EquipmentCatalog.ts";
import { getActiveStaminaMax } from "../world/SurvivalSystem.ts";
import {
  BACKPACK_CATALOG,
  canPlaceOnGrid,
  COLLECTION_RED_ITEMS,
  getEffectiveSize,
  getItemEffectiveValueGold,
  getItemMaxUses,
  getItemRemainingUses,
  getItemSearchDurationMs,
  getNextGymTier,
  getNextHomeTier,
  getNextSafeboxTier,
  getNextTreadmillTier,
  GOLD_LAMP_REQUIRED_COUNT,
  ITEM_BY_ID,
  type CollectibleItemDef,
  type ContainerLootState,
  type GridItemInstance,
  type GridZone,
  type UpgradeKind,
} from "../world/LootSystem.ts";
import {
  BIOME_LABELS,
  GREEN_END_COL,
  MAP_LABELS,
  isBuildingProp,
  SECURITY_ZONE_META,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  YELLOW_END_COL,
  type BuildingKind,
  type CharacterGender,
  type MapId,
  type SecurityZone,
  type TileType,
} from "../world/types.ts";
import {
  hideMapTransitionOverlay,
  setLoadingProgress,
  showMapTransitionOverlay,
} from "../platform.ts";
import {
  QUEST_MANUAL_REROLL_COST_GOLD,
  formatQuestCountdown,
  type DailyQuestEntry,
} from "../world/QuestSystem.ts";
import {
  REPUTATION_SHOP_BY_ID,
  REPUTATION_SHOP_ITEMS,
  type ReputationCategory,
} from "../world/ReputationSystem.ts";
import {
  PET_BY_ID,
  PET_CATALOG,
  PET_GACHA_COST_GOLD,
  formatPetBonusSummary,
  type GachaRollOutcome,
} from "../world/PetSystem.ts";
import type { PendingVaultTarget, ShopKind, WorldScene } from "../world/WorldScene.ts";
import {
  ArcadeMinigameController,
  type ArcadeDifficulty,
  type ArcadeMinigameKind,
} from "./ArcadeMinigames.ts";
import { PuzzleMinigameModal } from "./PuzzleMinigameModal.ts";

const GUIDE_SLIDES: ReadonlyArray<{
  icon: string;
  heading: string;
  sub: string;
  imageSrc: string;
  imageFit?: "cover" | "contain";
  points: readonly string[];
}> = [
  {
    icon: "🗺️",
    heading: "Di Chuyển & 3 Khu Vực Bản Đồ",
    sub: "Làm quen địa hình và mức độ rủi ro theo từng vùng",
    imageSrc: "./assets/world/guide/slide-1-world.png",
    imageFit: "cover",
    points: [
      "Dùng chuột/chạm để dẫn đường hoặc phím WASD / mũi tên để di chuyển; nhấn [E] hoặc nút tương tác khi đứng gần rương và tòa nhà.",
      "🟢 Vùng Xanh: Khu an toàn (-70% hiệu ứng bất lợi), có Nhà Riêng, Shop, Hội Sở Nhiệm Vụ & Sân Bay.",
      "🟡 Vùng Vàng: (-40% hiệu ứng bất lợi) có cảnh sát tuần tra & nhiều nhà dân, cửa tiệm loot đồ.",
      "🔴 Vùng Đỏ: Rủi ro cao nhất (90% bất lợi), nhiều Rương Hoàng Gia, Két khóa và tỷ lệ vật phẩm hiếm cao nhất.",
    ],
  },
  {
    icon: "🌡️",
    heading: "Sinh Tồn, Thời Tiết & Trang Bị",
    sub: "Giữ thân nhiệt, no bụng và cân đối tải trọng balo",
    imageSrc: "./assets/world/guide/slide-5-wardrobe.png",
    imageFit: "contain",
    points: [
      "Luôn theo dõi Máu ❤️, Độ No 🍗, Thể Lực ⚡ và Thân Nhiệt 🌡️ ở góc trên bên trái.",
      "Map Hà Nội có nắng gắt sốc nhiệt, bụi mịn/nồm ẩm, mưa bão ngập trơn và chướng khí vùng sâu; Map Nhật có núi tuyết Hokkaido rét buốt.",
      "Mang nặng từ 10kg và 20kg sẽ hao thể lực nhanh hơn và đi chậm hơn; khi đang ăn/uống/dùng thuốc sẽ di chuyển chậm đi 66%.",
    ],
  },
  {
    icon: "🎒",
    heading: "Balo, Safebox & Kho Nhà Vĩnh Viễn",
    sub: "Quản lý ô lưới thông minh và bảo vệ chiến lợi phẩm",
    imageSrc: "./assets/world/guide/slide-3-bag.png",
    imageFit: "contain",
    points: [
      "Kéo thả và bấm [R] để xoay vật phẩm vừa khít vào lưới Balo. Trong Shop có nút Bán đồ không phải đồ ăn cực nhanh.",
      "🔐 Safebox bảo vệ vật phẩm an toàn 100% không bị tịch thu khi bị Cảnh Sát bắt.",
      "🏠 Kho Nhà là kho lưu trữ vĩnh viễn và là nơi giao nộp nguyên liệu nâng cấp Safebox, Kho Nhà, Phòng Gym & Máy Chạy Bộ.",
    ],
  },
  {
    icon: "📜",
    heading: "Nhiệm Vụ Nâng Cấp & Hội Sở 4 Giờ",
    sub: "Theo dõi tiến độ nâng cấp và kiếm Vàng, Đồ ăn, Thuốc, Đồ Đỏ",
    imageSrc: "./assets/world/guide/slide-4-missions.png",
    imageFit: "contain",
    points: [
      "Bấm nút [📋 Nhiệm vụ] ngay trên màn hình để xem tiến trình nâng cấp Safebox, Kho Nhà, Phòng Gym (+Thể lực) & Máy Chạy Bộ (+Tốc độ mang nặng).",
      "Ghé [📜 Hội Sở Nhiệm Vụ] trong Vùng Xanh mỗi 4 giờ để nhận 3–5 nhiệm vụ Giao đồ, Khám phá hoặc Minigame; cảnh báo Cảnh sát 'Đang bị tình nghi' báo trước 2s, Vùng Đỏ được sai 2 lần.",
      "Vật phẩm Đồ Đỏ (S) có thể đem trưng bày tại [🏛️ Phòng Sưu Tầm] để nhận thưởng lớn.",
    ],
  },
  {
    icon: "🧭",
    heading: "Bản Đồ Lớn 3 Vùng & Minimap 5×",
    sub: "Quan sát toàn cảnh, lọc khu vực và di chuyển nhanh",
    imageSrc: "./assets/world/guide/slide-2-fullmap.png",
    imageFit: "contain",
    points: [
      "Minimap góc trên bên phải luôn zoom 5× quanh người chơi để theo dõi cảnh sát và rương gần nhất.",
      "Chạm vào minimap hoặc nhấn [M] để mở Bản Đồ Lớn, chạm bất kỳ điểm nào để tự động dẫn đường.",
      "Dùng thanh lọc [Toàn Bản Đồ / Vùng Xanh / Vùng Vàng / Vùng Đỏ] hoặc các nút đi nhanh tới Nhà, Shop, Hội Sở Nhiệm Vụ, Sân Bay.",
    ],
  },
  {
    icon: "✈️",
    heading: "Sân Bay Quốc Tế & Nhật Bản",
    sub: "Mở rộng hành trình sang Tokyo – Samurai – Núi Tuyết",
    imageSrc: "./assets/world/guide/slide-6-airport.png",
    imageFit: "contain",
    points: [
      "Tại Sân Bay Quốc Tế, mua vé sang Nhật Bản (5.000 Vàng) với đô thị Tokyo, nông thôn Samurai, núi tuyết Hokkaido cùng 10 món ăn & 10 trang phục Nhật riêng.",
      "Hoặc chọn bay Thái Lan (500 Vàng) để đổi giới tính nhân vật Nam ⇄ Nữ bất cứ lúc nào.",
      "Toàn bộ Balo, Safebox, Kho Nhà và Phòng Sưu Tầm được đồng bộ xuyên suốt giữa hai bản đồ!",
    ],
  },
];

const MINIMAP_COLORS: Record<TileType, string> = {
  grass: "#2d6a4f",
  meadow: "#52b788",
  forest: "#1b4332",
  sand: "#e9c46a",
  puddle: "#38bdf8",
  shallow: "#38bdf8",
  water: "#0284c7",
  dirt: "#8d5b36",
  stone: "#64748b",
  bridge: "#9a6b3b",
  road: "#334155",
  sidewalk: "#94a3b8",
};

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const MINIMAP_RGB: Record<TileType, [number, number, number]> = {
  grass: hexToRgb(MINIMAP_COLORS.grass),
  meadow: hexToRgb(MINIMAP_COLORS.meadow),
  forest: hexToRgb(MINIMAP_COLORS.forest),
  sand: hexToRgb(MINIMAP_COLORS.sand),
  puddle: hexToRgb(MINIMAP_COLORS.puddle),
  shallow: hexToRgb(MINIMAP_COLORS.shallow),
  water: hexToRgb(MINIMAP_COLORS.water),
  dirt: hexToRgb(MINIMAP_COLORS.dirt),
  stone: hexToRgb(MINIMAP_COLORS.stone),
  bridge: hexToRgb(MINIMAP_COLORS.bridge),
  road: hexToRgb(MINIMAP_COLORS.road),
  sidewalk: hexToRgb(MINIMAP_COLORS.sidewalk),
};

const SNOW_FOREST_RGB = hexToRgb("#cbd5e1");
const SNOW_MEADOW_RGB = hexToRgb("#f8fafc");
const SNOW_SAND_RGB = hexToRgb("#e0f2fe");
const SNOW_DEFAULT_RGB = hexToRgb("#e2e8f0");

interface ActiveDragState {
  item: GridItemInstance;
  fromZone: GridZone;
  rotated: boolean;
  startX: number;
  startY: number;
  isDragging: boolean;
  offsetX: number;
  offsetY: number;
  ghostEl: HTMLElement | null;
  hoverZone: GridZone | null;
  hoverCol: number;
  hoverRow: number;
  hoverValid: boolean;
}

/**
 * Responsive HUD overlay, Minimap, Context Prompts, Delta-Force Spatial Grid
 * Inventory & Looting Modal (drag-and-drop + rotate), and Backpack Shop Modal.
 */
export class Hud {
  private readonly scene: WorldScene;

  private readonly minimapBtn: HTMLButtonElement;
  private readonly minimapCanvas: HTMLCanvasElement;
  private readonly minimapCtx: CanvasRenderingContext2D;
  private terrainSnapshot: HTMLCanvasElement;
  private readonly terrainSnapshotCache = new Map<MapId, HTMLCanvasElement>();
  private readonly toastEl: HTMLElement;
  private readonly toastTitleEl: HTMLElement;
  private readonly toastSubEl: HTMLElement;
  private readonly bagBtn: HTMLButtonElement;
  private readonly hudMenuBtn: HTMLButtonElement;
  private readonly hudMenuPopoverEl: HTMLElement;
  private readonly missionsBtn: HTMLButtonElement;
  private readonly guideBtn: HTMLButtonElement;
  private readonly soundToggleBtn: HTMLButtonElement;
  private readonly interactBarEl: HTMLElement;
  private readonly interactBtn: HTMLButtonElement;

  // Full World Map Modal
  private readonly fullmapModalEl: HTMLElement;
  private readonly fullmapTitleEl: HTMLElement;
  private readonly fullmapCloseBtn: HTMLButtonElement;
  private readonly fullmapMetaEl: HTMLElement;
  private readonly fullmapCanvas: HTMLCanvasElement;
  private readonly fullmapCtx: CanvasRenderingContext2D;

  // Spatial Inventory + Loot Container Modal
  private readonly bagModalEl: HTMLElement;
  private readonly bagTitleEl: HTMLElement;
  private readonly bagCloseBtn: HTMLButtonElement;
  private readonly bagStatsEl: HTMLElement;
  private readonly bagGridsWrapEl: HTMLElement;
  private readonly containerPanelEl: HTMLElement;
  private readonly containerTitleEl: HTMLElement;
  private readonly containerSubEl: HTMLElement;
  private readonly containerGridEl: HTMLElement;
  private readonly openHomeUpgradeBtn: HTMLButtonElement;
  private readonly backpackTitleEl: HTMLElement;
  private readonly backpackSubEl: HTMLElement;
  private readonly noBackpackBannerEl: HTMLElement;
  private readonly backpackGridEl: HTMLElement;
  private readonly safeboxTitleEl: HTMLElement;
  private readonly safeboxSubEl: HTMLElement;
  private readonly openSafeboxUpgradeBtn: HTMLButtonElement;
  private readonly safeboxGridEl: HTMLElement;
  private readonly inspectorEl: HTMLElement;

  // Shop Modal
  private readonly shopModalEl: HTMLElement;
  private readonly shopCardEl: HTMLElement;
  private readonly tabShopSellBtn: HTMLButtonElement;
  private readonly tabShopUpgradeBtn: HTMLButtonElement;
  private readonly shopCloseBtn: HTMLButtonElement;
  private readonly shopStatsEl: HTMLElement;
  private readonly shopOpenSafeboxBtn: HTMLButtonElement;
  private readonly shopEquippedBpBarEl: HTMLElement;
  private readonly shopBackpacksEl: HTMLElement;
  private readonly shopSellTitleEl: HTMLElement;
  private readonly shopSellZoneBagBtn: HTMLButtonElement;
  private readonly shopSellZoneSafeboxBtn: HTMLButtonElement;
  private readonly shopSellGridEl: HTMLElement;
  private readonly shopInspectorEl: HTMLElement;
  private readonly shopSellNonFoodBtn: HTMLButtonElement;
  private readonly shopSellAllBtn: HTMLButtonElement;

  // Safebox, Home Storage, Gym & Treadmill Upgrade Modal
  private readonly safeboxModalEl: HTMLElement;
  private readonly sbTitleEl: HTMLElement;
  private readonly upTabDailyBtn: HTMLButtonElement;
  private readonly upTabSafeboxBtn: HTMLButtonElement;
  private readonly upTabHomeBtn: HTMLButtonElement;
  private readonly upTabGymBtn: HTMLButtonElement;
  private readonly upTabTreadmillBtn: HTMLButtonElement;
  private readonly safeboxCloseBtn: HTMLButtonElement;
  private readonly safeboxStatsEl: HTMLElement;
  private readonly safeboxTierBannerEl: HTMLElement;
  private readonly safeboxReqListEl: HTMLElement;
  private readonly safeboxDeliverAllBtn: HTMLButtonElement;

  // 4-Hour Quest Board Modal
  private readonly questBoardModalEl: HTMLElement;
  private readonly questBoardStatsEl: HTMLElement;
  private readonly questBoardListEl: HTMLElement;
  private readonly questBoardCloseBtn: HTMLButtonElement;
  private readonly questBoardRerollBtn: HTMLButtonElement;

  // Cumulative Reputation Modal
  private readonly reputationBtn: HTMLButtonElement;
  private readonly reputationModalEl: HTMLElement;
  private readonly reputationStatsEl: HTMLElement;
  private readonly reputationBannerEl: HTMLElement;
  private readonly reputationTabsEl: HTMLElement;
  private readonly reputationListEl: HTMLElement;
  private readonly reputationCloseBtn: HTMLButtonElement;
  private readonly reputationClaimAllBtn: HTMLButtonElement;
  private isReputationOpen = false;
  private reputationCategory: ReputationCategory = "all";

  // Pet Gacha & Companion Modal
  private readonly petsBtn: HTMLButtonElement;
  private readonly petModalEl: HTMLElement;
  private readonly petStatsEl: HTMLElement;
  private readonly petTabsEl: HTMLElement;
  private readonly petBodyEl: HTMLElement;
  private readonly petCloseBtn: HTMLButtonElement;
  private readonly petRoll1Btn: HTMLButtonElement;
  private readonly petRoll5Btn: HTMLButtonElement;
  private isPetModalOpen = false;
  private petModalTab: "gacha" | "roster" = "gacha";
  private previewPetId: string = PET_CATALOG[0].id;
  private previewPetAnim: "idle" | "run" | "play" = "idle";
  private lastGachaOutcomes: GachaRollOutcome[] = [];

  // How-To-Play Slide Deck Modal
  private readonly guideModalEl: HTMLElement;
  private readonly guideStepMetaEl: HTMLElement;
  private readonly guideSlideStageEl: HTMLElement;
  private readonly guideDotsEl: HTMLElement;
  private readonly guideCloseBtn: HTMLButtonElement;
  private readonly guidePrevBtn: HTMLButtonElement;
  private readonly guideNextBtn: HTMLButtonElement;

  // Survival Telemetry + Blur Vignette + Hospital Overlay
  private readonly pixiContainerEl: HTMLElement;
  private readonly vignetteEl: HTMLElement;
  private readonly hospitalOverlayEl: HTMLElement;
  private readonly hospitalTitleEl: HTMLElement;
  private readonly hospitalSubEl: HTMLElement;
  private readonly hpBarEl: HTMLElement;
  private readonly hpValEl: HTMLElement;
  private readonly hungerBarEl: HTMLElement;
  private readonly hungerValEl: HTMLElement;
  private readonly staminaBarEl: HTMLElement;
  private readonly staminaValEl: HTMLElement;
  private readonly thermalTextEl: HTMLElement;

  // Wardrobe, Clothing Shop & Food Shop Modals
  private readonly wardrobeBtn: HTMLButtonElement;
  private readonly wardrobeModalEl: HTMLElement;
  private readonly wardrobeCloseBtn: HTMLButtonElement;
  private readonly wardrobeStatsEl: HTMLElement;
  private readonly wardrobePreviewCanvas: HTMLCanvasElement;
  private readonly wardrobeThermalEl: HTMLElement;
  private readonly wardrobeHairListEl: HTMLElement;
  private readonly wardrobeSlotsEl: HTMLElement;
  private readonly wardrobeOwnedListEl: HTMLElement;
  private readonly wardrobeSavePresetBtn: HTMLButtonElement;

  private readonly clothShopModalEl: HTMLElement;
  private readonly clothShopCloseBtn: HTMLButtonElement;
  private readonly clothShopStatsEl: HTMLElement;
  private readonly clothShopPreviewCanvas: HTMLCanvasElement;
  private readonly clothShopEquipSummaryEl: HTMLElement;
  private readonly clothShopSavePresetBtn: HTMLButtonElement;
  private readonly clothShopPresetsListEl: HTMLElement;
  private readonly clothShopListEl: HTMLElement;

  private readonly foodShopModalEl: HTMLElement;
  private readonly foodShopTitleEl: HTMLElement;
  private readonly foodShopCloseBtn: HTMLButtonElement;
  private readonly foodShopStatsEl: HTMLElement;
  private readonly foodShopListEl: HTMLElement;

  private readonly quickUseBtn: HTMLButtonElement;
  private readonly quickWheelModalEl: HTMLElement;
  private readonly quickWheelCloseBtn: HTMLButtonElement;
  private readonly quickWheelRingEl: HTMLElement;
  private readonly quickWheelEmptyEl: HTMLElement;

  private readonly consumeToastEl: HTMLElement;
  private readonly consumeLabelEl: HTMLElement;
  private readonly consumeTimeEl: HTMLElement;
  private readonly consumeFillEl: HTMLElement;

  private readonly hairShopModalEl: HTMLElement;
  private readonly hairShopCloseBtn: HTMLButtonElement;
  private readonly hairShopStatsEl: HTMLElement;
  private readonly hairShopPreviewCanvas: HTMLCanvasElement;
  private readonly hairShopSummaryEl: HTMLElement;
  private readonly hairShopListEl: HTMLElement;

  private readonly detentionOverlayEl: HTMLElement;
  private readonly detentionSubEl: HTMLElement;
  private readonly detentionCountdownEl: HTMLElement;
  private readonly policeModalEl: HTMLElement;
  private readonly policeTitleEl: HTMLElement;
  private readonly policeStatsEl: HTMLElement;
  private readonly policeStatusEl: HTMLElement;
  private readonly policeTimerTrackEl: HTMLElement;
  private readonly policeTimerFillEl: HTMLElement;
  private readonly policeGridEl: HTMLElement;
  private readonly policeArcadeStageEl: HTMLElement;

  private readonly airportModalEl: HTMLElement;
  private readonly airportCloseBtn: HTMLButtonElement;
  private readonly airportStatsEl: HTMLElement;
  private readonly airportTabFlightBtn: HTMLButtonElement;
  private readonly airportTabGenderBtn: HTMLButtonElement;
  private readonly airportFlightPanelEl: HTMLElement;
  private readonly airportGenderPanelEl: HTMLElement;
  private readonly airportFlightRouteEl: HTMLElement;
  private readonly airportFlightInfoEl: HTMLElement;
  private readonly airportFlightNoteEl: HTMLElement;
  private readonly airportFlyMapBtn: HTMLButtonElement;
  private readonly airportThailandOriginEl: HTMLElement;
  private readonly airportCurLabelEl: HTMLElement;
  private readonly airportNextLabelEl: HTMLElement;
  private readonly airportCurCanvas: HTMLCanvasElement;
  private readonly airportNextCanvas: HTMLCanvasElement;
  private readonly airportNoteEl: HTMLElement;
  private readonly airportFlyBtn: HTMLButtonElement;
  private activeAirportTab: "flight" | "gender" = "flight";

  private readonly collectionModalEl: HTMLElement;
  private readonly collectionCloseBtn: HTMLButtonElement;
  private readonly collectionStatsEl: HTMLElement;
  private readonly collectionGridEl: HTMLElement;

  private readonly onboardModalEl: HTMLElement;
  private readonly onboardMaleBtn: HTMLButtonElement;
  private readonly onboardFemaleBtn: HTMLButtonElement;
  private readonly onboardMaleCanvas: HTMLCanvasElement;
  private readonly onboardFemaleCanvas: HTMLCanvasElement;
  private readonly onboardStartBtn: HTMLButtonElement;
  private onboardSelectedGender: CharacterGender = "male";
  private isOnboardingOpen = false;

  private readonly purchaseModalEl: HTMLElement;
  private readonly purchaseSubtitleEl: HTMLElement;
  private readonly purchaseItemBoxEl: HTMLElement;
  private readonly purchaseReceiptEl: HTMLElement;
  private readonly purchaseWarningEl: HTMLElement;
  private readonly purchaseCloseBtn: HTMLButtonElement;
  private readonly purchaseCancelBtn: HTMLButtonElement;
  private readonly purchaseAltBtn: HTMLButtonElement;
  private readonly purchaseConfirmBtn: HTMLButtonElement;
  private purchaseAction: { onConfirm: () => void; onAlt?: () => void } | null = null;

  private isBagOpen = false;
  private isHomeStorageOpen = false;
  private isShopOpen = false;
  private shopSellZone: "backpack" | "safebox" = "backpack";
  private isSafeboxModalOpen = false;
  private isQuestBoardOpen = false;
  private isGuideModalOpen = false;
  private guideSlideIdx = 0;
  private safeboxOpenedFromHome = false;
  private upgradeModalMode: "daily" | UpgradeKind = "daily";
  private isWardrobeOpen = false;
  private isClothingShopOpen = false;
  private isFoodShopOpen = false;
  private foodShopMode: "food" | "pharmacy" = "food";
  private isQuickWheelOpen = false;
  private isHairShopOpen = false;
  private isAirportOpen = false;
  private isCollectionOpen = false;
  private isPoliceModalOpen = false;
  private policeSuspicionTimerId: number | null = null;
  private isFullmapOpen = false;
  private fullmapZoneFilter: "all" | SecurityZone = "all";
  private readonly vaultPuzzle: PuzzleMinigameModal;
  private readonly trimmedIconCache = new Map<string, string>();
  private readonly trimmedIconWaiters = new Map<string, HTMLImageElement[]>();
  private policeGame: {
    officerId: string;
    officerName: string;
    zone: SecurityZone;
    difficulty: ArcadeDifficulty;
    maxAttempts: number;
    maxFails: number;
    attempt: number;
    fails: number;
    gameKind: "police_4x4" | ArcadeMinigameKind;
    sequence: number[];
    phase: "preview" | "input" | "done" | "cooldown";
    flashIdx: number;
    flashTimerMs: number;
    inputMaxMs: number;
    inputRemainingMs: number;
    picked: number[];
  } | null = null;
  private policeArcadeCtrl: ArcadeMinigameController | null = null;
  private clothShopPreviewGear: EquippedGear | null = null;
  private hairShopPreviewId: string | null = null;
  private activeContainer: ContainerLootState | null = null;
  private selectedItem: { uid: string; zone: GridZone } | null = null;
  private selectedShopUid: string | null = null;
  private drag: ActiveDragState | null = null;
  private readonly lpcImageCache = new Map<string, HTMLImageElement>();

  private scanQueue: string[] = [];
  private activeScanUid: string | null = null;
  private scanElapsedMs = 0;
  private scanDurationMs = 0;
  private activeScanFillEl: HTMLDivElement | null = null;
  private justRevealedUid: string | null = null;

  private toastTimer: number | null = null;
  private hospitalTimer: number | null = null;
  private lastHudTick = 0;
  private lastCooldownTick = 0;
  private lastMinimapDrawAt = 0;
  private lastSurvivalSignature = "";
  private lastPromptSignature = "";

  constructor(scene: WorldScene) {
    this.scene = scene;

    this.minimapBtn = document.getElementById("btn-minimap") as HTMLButtonElement;
    this.minimapCanvas = document.getElementById("hud-minimap") as HTMLCanvasElement;
    this.minimapCtx = this.minimapCanvas.getContext("2d")!;
    this.toastEl = document.getElementById("hud-toast")!;
    this.toastTitleEl = document.getElementById("hud-toast-title")!;
    this.toastSubEl = document.getElementById("hud-toast-sub")!;
    this.bagBtn = document.getElementById("btn-bag") as HTMLButtonElement;
    this.hudMenuBtn = document.getElementById("btn-hud-menu") as HTMLButtonElement;
    this.hudMenuPopoverEl = document.getElementById("hud-menu-popover")!;
    this.missionsBtn = document.getElementById("btn-missions") as HTMLButtonElement;
    this.guideBtn = document.getElementById("btn-guide") as HTMLButtonElement;
    this.soundToggleBtn = document.getElementById("btn-sound-toggle") as HTMLButtonElement;
    this.wardrobeBtn = document.getElementById("btn-wardrobe") as HTMLButtonElement;
    this.interactBarEl = document.getElementById("interact-bar")!;
    this.interactBtn = document.getElementById("btn-interact") as HTMLButtonElement;

    this.pixiContainerEl = document.getElementById("pixi-container")!;
    this.vignetteEl = document.getElementById("survival-vignette")!;
    this.hospitalOverlayEl = document.getElementById("hospital-overlay")!;
    this.hospitalTitleEl = document.getElementById("hospital-title")!;
    this.hospitalSubEl = document.getElementById("hospital-sub")!;
    this.hpBarEl = document.getElementById("sv-hp-bar")!;
    this.hpValEl = document.getElementById("sv-hp-val")!;
    this.hungerBarEl = document.getElementById("sv-hunger-bar")!;
    this.hungerValEl = document.getElementById("sv-hunger-val")!;
    this.staminaBarEl = document.getElementById("sv-stamina-bar")!;
    this.staminaValEl = document.getElementById("sv-stamina-val")!;
    this.thermalTextEl = document.getElementById("sv-thermal-text")!;

    this.fullmapModalEl = document.getElementById("fullmap-modal")!;
    this.fullmapTitleEl = document.getElementById("fullmap-title")!;
    this.fullmapCloseBtn = document.getElementById("btn-fullmap-close") as HTMLButtonElement;
    this.fullmapMetaEl = document.getElementById("fullmap-meta")!;
    this.fullmapCanvas = document.getElementById("fullmap-canvas") as HTMLCanvasElement;
    this.fullmapCtx = this.fullmapCanvas.getContext("2d")!;

    this.bagModalEl = document.getElementById("bag-modal")!;
    this.bagTitleEl = document.getElementById("bag-title")!;
    this.bagCloseBtn = document.getElementById("btn-bag-close") as HTMLButtonElement;
    this.bagStatsEl = document.getElementById("bag-stats")!;
    this.bagGridsWrapEl = document.getElementById("bag-grids-wrap")!;
    this.containerPanelEl = document.getElementById("container-panel")!;
    this.containerTitleEl = document.getElementById("container-panel-title")!;
    this.containerSubEl = document.getElementById("container-panel-sub")!;
    this.containerGridEl = document.getElementById("loot-container-grid")!;
    this.openHomeUpgradeBtn = document.getElementById("btn-open-home-upgrade") as HTMLButtonElement;
    this.backpackTitleEl = document.getElementById("backpack-panel-title")!;
    this.backpackSubEl = document.getElementById("backpack-panel-sub")!;
    this.noBackpackBannerEl = document.getElementById("no-backpack-banner")!;
    this.backpackGridEl = document.getElementById("loot-backpack-grid")!;
    this.safeboxTitleEl = document.getElementById("safebox-panel-title")!;
    this.safeboxSubEl = document.getElementById("safebox-panel-sub")!;
    this.openSafeboxUpgradeBtn = document.getElementById("btn-open-safebox-upgrade") as HTMLButtonElement;
    this.safeboxGridEl = document.getElementById("safebox-grid")!;
    this.inspectorEl = document.getElementById("item-inspector")!;

    this.shopModalEl = document.getElementById("shop-modal")!;
    this.shopCardEl = this.shopModalEl.querySelector(".shop-card") as HTMLElement;
    this.tabShopSellBtn = document.getElementById("tab-shop-sell") as HTMLButtonElement;
    this.tabShopUpgradeBtn = document.getElementById("tab-shop-upgrade") as HTMLButtonElement;
    this.shopCloseBtn = document.getElementById("btn-shop-close") as HTMLButtonElement;
    this.shopStatsEl = document.getElementById("shop-stats")!;
    this.shopOpenSafeboxBtn = document.getElementById("btn-shop-open-safebox") as HTMLButtonElement;
    this.shopEquippedBpBarEl = document.getElementById("shop-equipped-bp-bar")!;
    this.shopBackpacksEl = document.getElementById("shop-backpacks")!;
    this.shopSellTitleEl = document.getElementById("shop-sell-title")!;
    this.shopSellZoneBagBtn = document.getElementById("btn-sell-zone-bag") as HTMLButtonElement;
    this.shopSellZoneSafeboxBtn = document.getElementById("btn-sell-zone-safebox") as HTMLButtonElement;
    this.shopSellGridEl = document.getElementById("shop-sell-grid")!;
    this.shopInspectorEl = document.getElementById("shop-inspector")!;
    this.shopSellNonFoodBtn = document.getElementById("btn-shop-sell-nonfood") as HTMLButtonElement;
    this.shopSellAllBtn = document.getElementById("btn-shop-sell-all") as HTMLButtonElement;

    this.safeboxModalEl = document.getElementById("safebox-modal")!;
    this.sbTitleEl = document.getElementById("sb-title")!;
    this.upTabDailyBtn = document.getElementById("btn-up-tab-daily") as HTMLButtonElement;
    this.upTabSafeboxBtn = document.getElementById("btn-up-tab-safebox") as HTMLButtonElement;
    this.upTabHomeBtn = document.getElementById("btn-up-tab-home") as HTMLButtonElement;
    this.upTabGymBtn = document.getElementById("btn-up-tab-gym") as HTMLButtonElement;
    this.upTabTreadmillBtn = document.getElementById("btn-up-tab-treadmill") as HTMLButtonElement;
    this.safeboxCloseBtn = document.getElementById("btn-sb-close") as HTMLButtonElement;
    this.safeboxStatsEl = document.getElementById("sb-stats")!;
    this.safeboxTierBannerEl = document.getElementById("sb-tier-banner")!;
    this.safeboxReqListEl = document.getElementById("sb-requirements-list")!;
    this.safeboxDeliverAllBtn = document.getElementById("btn-sb-deliver-all") as HTMLButtonElement;

    this.questBoardModalEl = document.getElementById("quest-board-modal")!;
    this.questBoardStatsEl = document.getElementById("qb-stats")!;
    this.questBoardListEl = document.getElementById("qb-list")!;
    this.questBoardCloseBtn = document.getElementById("btn-qb-close") as HTMLButtonElement;
    this.questBoardRerollBtn = document.getElementById("btn-qb-reroll") as HTMLButtonElement;

    this.reputationBtn = document.getElementById("btn-reputation") as HTMLButtonElement;
    this.reputationModalEl = document.getElementById("reputation-modal")!;
    this.reputationStatsEl = document.getElementById("rep-stats")!;
    this.reputationBannerEl = document.getElementById("rep-rank-banner")!;
    this.reputationTabsEl = document.getElementById("rep-category-tabs")!;
    this.reputationListEl = document.getElementById("rep-list")!;
    this.reputationCloseBtn = document.getElementById("btn-rep-close") as HTMLButtonElement;
    this.reputationClaimAllBtn = document.getElementById("btn-rep-claim-all") as HTMLButtonElement;

    this.petsBtn = document.getElementById("btn-pets") as HTMLButtonElement;
    this.petModalEl = document.getElementById("pet-gacha-modal")!;
    this.petStatsEl = document.getElementById("pet-stats")!;
    this.petTabsEl = document.getElementById("pet-tabs")!;
    this.petBodyEl = document.getElementById("pet-body")!;
    this.petCloseBtn = document.getElementById("btn-pet-close") as HTMLButtonElement;
    this.petRoll1Btn = document.getElementById("btn-pet-roll-1") as HTMLButtonElement;
    this.petRoll5Btn = document.getElementById("btn-pet-roll-5") as HTMLButtonElement;

    this.guideModalEl = document.getElementById("guide-modal")!;
    this.guideStepMetaEl = document.getElementById("guide-step-meta")!;
    this.guideSlideStageEl = document.getElementById("guide-slide-stage")!;
    this.guideDotsEl = document.getElementById("guide-dots")!;
    this.guideCloseBtn = document.getElementById("btn-guide-close") as HTMLButtonElement;
    this.guidePrevBtn = document.getElementById("btn-guide-prev") as HTMLButtonElement;
    this.guideNextBtn = document.getElementById("btn-guide-next") as HTMLButtonElement;

    this.wardrobeModalEl = document.getElementById("wardrobe-modal")!;
    this.wardrobeCloseBtn = document.getElementById("btn-wardrobe-close") as HTMLButtonElement;
    this.wardrobeStatsEl = document.getElementById("wardrobe-stats")!;
    this.wardrobePreviewCanvas = document.getElementById("wardrobe-preview-canvas") as HTMLCanvasElement;
    this.wardrobeThermalEl = document.getElementById("wardrobe-thermal-card")!;
    this.wardrobeHairListEl = document.getElementById("wardrobe-hair-list")!;
    this.wardrobeSlotsEl = document.getElementById("wardrobe-slots")!;
    this.wardrobeOwnedListEl = document.getElementById("wardrobe-owned-list")!;
    this.wardrobeSavePresetBtn = document.getElementById("btn-wardrobe-save-preset") as HTMLButtonElement;

    this.clothShopModalEl = document.getElementById("clothing-shop-modal")!;
    this.clothShopCloseBtn = document.getElementById("btn-clothshop-close") as HTMLButtonElement;
    this.clothShopStatsEl = document.getElementById("clothshop-stats")!;
    this.clothShopPreviewCanvas = document.getElementById("clothshop-preview-canvas") as HTMLCanvasElement;
    this.clothShopEquipSummaryEl = document.getElementById("clothshop-equip-summary")!;
    this.clothShopSavePresetBtn = document.getElementById("btn-clothshop-save-preset") as HTMLButtonElement;
    this.clothShopPresetsListEl = document.getElementById("clothshop-presets-list")!;
    this.clothShopListEl = document.getElementById("clothshop-list")!;

    this.foodShopModalEl = document.getElementById("food-shop-modal")!;
    this.foodShopTitleEl = document.getElementById("foodshop-title")!;
    this.foodShopCloseBtn = document.getElementById("btn-foodshop-close") as HTMLButtonElement;
    this.foodShopStatsEl = document.getElementById("foodshop-stats")!;
    this.foodShopListEl = document.getElementById("foodshop-list")!;

    this.quickUseBtn = document.getElementById("btn-quick-use") as HTMLButtonElement;
    this.quickWheelModalEl = document.getElementById("quick-wheel-modal")!;
    this.quickWheelCloseBtn = document.getElementById("btn-quick-wheel-close") as HTMLButtonElement;
    this.quickWheelRingEl = document.getElementById("quick-wheel-ring")!;
    this.quickWheelEmptyEl = document.getElementById("quick-wheel-empty")!;

    this.consumeToastEl = document.getElementById("consume-progress-toast")!;
    this.consumeLabelEl = document.getElementById("consume-progress-label")!;
    this.consumeTimeEl = document.getElementById("consume-progress-time")!;
    this.consumeFillEl = document.getElementById("consume-progress-fill")!;

    this.hairShopModalEl = document.getElementById("hair-shop-modal")!;
    this.hairShopCloseBtn = document.getElementById("btn-hairshop-close") as HTMLButtonElement;
    this.hairShopStatsEl = document.getElementById("hairshop-stats")!;
    this.hairShopPreviewCanvas = document.getElementById("hairshop-preview-canvas") as HTMLCanvasElement;
    this.hairShopSummaryEl = document.getElementById("hairshop-summary")!;
    this.hairShopListEl = document.getElementById("hairshop-list")!;

    this.detentionOverlayEl = document.getElementById("detention-overlay")!;
    this.detentionSubEl = document.getElementById("detention-sub")!;
    this.detentionCountdownEl = document.getElementById("detention-countdown")!;
    this.policeModalEl = document.getElementById("police-modal")!;
    this.policeTitleEl = document.getElementById("police-title")!;
    this.policeStatsEl = document.getElementById("police-stats")!;
    this.policeStatusEl = document.getElementById("police-status")!;
    this.policeTimerTrackEl = document.getElementById("police-timer-track")!;
    this.policeTimerFillEl = document.getElementById("police-timer-fill")!;
    this.policeGridEl = document.getElementById("police-memory-grid")!;
    this.policeArcadeStageEl = document.getElementById("police-arcade-stage")!;

    this.airportModalEl = document.getElementById("airport-modal")!;
    this.airportCloseBtn = document.getElementById("btn-airport-close") as HTMLButtonElement;
    this.airportStatsEl = document.getElementById("airport-stats")!;
    this.airportTabFlightBtn = document.getElementById("btn-airport-tab-flight") as HTMLButtonElement;
    this.airportTabGenderBtn = document.getElementById("btn-airport-tab-gender") as HTMLButtonElement;
    this.airportFlightPanelEl = document.getElementById("airport-flight-panel")!;
    this.airportGenderPanelEl = document.getElementById("airport-gender-panel")!;
    this.airportFlightRouteEl = document.getElementById("airport-flight-route")!;
    this.airportFlightInfoEl = document.getElementById("airport-flight-info")!;
    this.airportFlightNoteEl = document.getElementById("airport-flight-note")!;
    this.airportFlyMapBtn = document.getElementById("btn-airport-fly-map") as HTMLButtonElement;
    this.airportThailandOriginEl = document.getElementById("airport-thailand-origin")!;
    this.airportCurLabelEl = document.getElementById("airport-cur-label")!;
    this.airportNextLabelEl = document.getElementById("airport-next-label")!;
    this.airportCurCanvas = document.getElementById("airport-cur-canvas") as HTMLCanvasElement;
    this.airportNextCanvas = document.getElementById("airport-next-canvas") as HTMLCanvasElement;
    this.airportNoteEl = document.getElementById("airport-note")!;
    this.airportFlyBtn = document.getElementById("btn-airport-fly") as HTMLButtonElement;

    this.collectionModalEl = document.getElementById("collection-modal")!;
    this.collectionCloseBtn = document.getElementById("btn-coll-close") as HTMLButtonElement;
    this.collectionStatsEl = document.getElementById("coll-stats")!;
    this.collectionGridEl = document.getElementById("collection-grid")!;

    this.onboardModalEl = document.getElementById("onboarding-modal")!;
    this.onboardMaleBtn = document.getElementById("btn-onboard-male") as HTMLButtonElement;
    this.onboardFemaleBtn = document.getElementById("btn-onboard-female") as HTMLButtonElement;
    this.onboardMaleCanvas = document.getElementById("onboard-male-canvas") as HTMLCanvasElement;
    this.onboardFemaleCanvas = document.getElementById("onboard-female-canvas") as HTMLCanvasElement;
    this.onboardStartBtn = document.getElementById("btn-onboard-start") as HTMLButtonElement;

    this.purchaseModalEl = document.getElementById("purchase-confirm-modal")!;
    this.purchaseSubtitleEl = document.getElementById("pc-subtitle")!;
    this.purchaseItemBoxEl = document.getElementById("pc-item-box")!;
    this.purchaseReceiptEl = document.getElementById("pc-receipt")!;
    this.purchaseWarningEl = document.getElementById("pc-warning")!;
    this.purchaseCloseBtn = document.getElementById("btn-pc-close") as HTMLButtonElement;
    this.purchaseCancelBtn = document.getElementById("btn-pc-cancel") as HTMLButtonElement;
    this.purchaseAltBtn = document.getElementById("btn-pc-alt") as HTMLButtonElement;
    this.purchaseConfirmBtn = document.getElementById("btn-pc-confirm") as HTMLButtonElement;

    this.minimapCanvas.width = this.scene.data.cols;
    this.minimapCanvas.height = this.scene.data.rows;
    this.fullmapCanvas.width = this.scene.data.cols * 5;
    this.fullmapCanvas.height = this.scene.data.rows * 5;
    this.terrainSnapshot = this.bakeTerrainSnapshot();
    this.updateMapTitles();
    this.vaultPuzzle = new PuzzleMinigameModal();
    this.refreshBagBadge();
    this.updateSurvivalHud();
    this.updateInteractPrompt();
    this.syncSoundButtonLabel();
    this.drawMinimap();
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

  private closeAllModals(
    except?:
      | "bag"
      | "shop"
      | "wardrobe"
      | "clothshop"
      | "foodshop"
      | "quickwheel"
      | "hairshop"
      | "airport"
      | "collection"
      | "fullmap"
      | "vaultpuzzle"
      | "safebox"
      | "questboard"
      | "reputation"
      | "pet"
      | "guide",
  ): void {
    if (except !== "bag" && this.isBagOpen) {
      this.setBagOpen(false);
    }
    if (except !== "shop" && this.isShopOpen) {
      this.setShopOpen(false);
    }
    if (except !== "safebox" && this.isSafeboxModalOpen) {
      this.isSafeboxModalOpen = false;
      this.safeboxModalEl.classList.remove("is-open");
    }
    if (except !== "questboard" && this.isQuestBoardOpen) {
      this.isQuestBoardOpen = false;
      this.questBoardModalEl.classList.remove("is-open");
    }
    if (except !== "reputation" && this.isReputationOpen) {
      this.isReputationOpen = false;
      this.reputationModalEl.classList.remove("is-open");
    }
    if (except !== "pet" && this.isPetModalOpen) {
      this.isPetModalOpen = false;
      this.petModalEl.classList.remove("is-open");
    }
    if (except !== "guide" && this.isGuideModalOpen) {
      this.isGuideModalOpen = false;
      this.guideModalEl.classList.remove("is-open");
    }
    if (except !== "wardrobe" && this.isWardrobeOpen) {
      this.isWardrobeOpen = false;
      this.wardrobeModalEl.classList.remove("is-open");
    }
    if (except !== "clothshop" && this.isClothingShopOpen) {
      this.isClothingShopOpen = false;
      this.clothShopPreviewGear = null;
      this.clothShopModalEl.classList.remove("is-open");
    }
    if (except !== "foodshop" && this.isFoodShopOpen) {
      this.isFoodShopOpen = false;
      this.foodShopModalEl.classList.remove("is-open");
    }
    if (except !== "quickwheel" && this.isQuickWheelOpen) {
      this.isQuickWheelOpen = false;
      this.quickWheelModalEl.classList.remove("is-open");
    }
    if (except !== "hairshop" && this.isHairShopOpen) {
      this.isHairShopOpen = false;
      this.hairShopPreviewId = null;
      this.hairShopModalEl.classList.remove("is-open");
    }
    if (except !== "airport" && this.isAirportOpen) {
      this.isAirportOpen = false;
      this.airportModalEl.classList.remove("is-open");
    }
    if (except !== "collection" && this.isCollectionOpen) {
      this.isCollectionOpen = false;
      this.collectionModalEl.classList.remove("is-open");
    }
    if (except !== "fullmap" && this.isFullmapOpen) {
      this.isFullmapOpen = false;
      this.fullmapModalEl.classList.remove("is-open");
    }
    if (except !== "vaultpuzzle" && this.vaultPuzzle.isOpen()) {
      this.vaultPuzzle.close();
      this.scene.cancelVaultPuzzle();
      this.scene.cancelJailMinigame();
    }
    this.closePurchaseConfirm();
  }

  private closePurchaseConfirm(): void {
    this.purchaseAction = null;
    this.purchaseModalEl.classList.remove("is-open");
  }

  private openBagDirect(): void {
    this.closeAllModals();
    this.activeContainer = null;
    this.setBagOpen(true);
  }

  private openPurchaseConfirm(opts: {
    subtitle: string;
    itemTitle: string;
    itemDesc: string;
    priceGold: number;
    bagLine?: string;
    blockedReason?: string | null;
    altAction?: { label: string; onSelect: () => void };
    confirmLabel?: string;
    onConfirm: () => void;
  }): void {
    const wallet = this.scene.inventory.getSummary().walletGold;
    const after = wallet - opts.priceGold;
    const lackGold = after < 0;

    this.purchaseSubtitleEl.textContent = opts.subtitle;

    this.purchaseItemBoxEl.replaceChildren();
    const titleEl = document.createElement("div");
    titleEl.className = "pc-item-title";
    titleEl.textContent = opts.itemTitle;
    const descEl = document.createElement("div");
    descEl.className = "pc-item-desc";
    descEl.textContent = opts.itemDesc;
    this.purchaseItemBoxEl.append(titleEl, descEl);

    this.purchaseReceiptEl.replaceChildren();
    const rows: Array<[string, string, string?]> = [
      ["Giá thanh toán", `🪙 ${opts.priceGold.toLocaleString("vi-VN")} Vàng`],
      ["Số dư ví hiện có", `🪙 ${wallet.toLocaleString("vi-VN")} Vàng`],
      [
        "Còn lại sau mua",
        lackGold
          ? `Thiếu ${Math.abs(after).toLocaleString("vi-VN")} Vàng`
          : `🪙 ${after.toLocaleString("vi-VN")} Vàng`,
        lackGold ? "is-danger" : "is-ok",
      ],
    ];
    if (opts.bagLine) {
      rows.push(["Khoang Balo", opts.bagLine]);
    }
    for (const [k, v, cls] of rows) {
      const row = document.createElement("div");
      row.className = "pc-receipt-row";
      const kSpan = document.createElement("span");
      kSpan.textContent = k;
      const vSpan = document.createElement("strong");
      if (cls) vSpan.className = cls;
      vSpan.textContent = v;
      row.append(kSpan, vSpan);
      this.purchaseReceiptEl.appendChild(row);
    }

    const warnMsg =
      opts.blockedReason ??
      (lackGold
        ? `⚠️ Ví không đủ Vàng (cần thêm ${Math.abs(after).toLocaleString("vi-VN")} Vàng).`
        : null);
    if (warnMsg) {
      this.purchaseWarningEl.textContent = warnMsg;
      this.purchaseWarningEl.classList.remove("is-hidden");
    } else {
      this.purchaseWarningEl.classList.add("is-hidden");
    }

    if (opts.altAction && !lackGold) {
      this.purchaseAltBtn.textContent = opts.altAction.label;
      this.purchaseAltBtn.classList.remove("is-hidden");
    } else {
      this.purchaseAltBtn.classList.add("is-hidden");
    }

    this.purchaseConfirmBtn.textContent =
      opts.confirmLabel ?? `💳 Thanh toán (${opts.priceGold.toLocaleString("vi-VN")} Vàng)`;
    this.purchaseConfirmBtn.disabled = Boolean(opts.blockedReason) || lackGold;
    this.purchaseAction = {
      onConfirm: opts.onConfirm,
      onAlt: opts.altAction?.onSelect,
    };
    this.purchaseModalEl.classList.add("is-open");
  }

  public openVaultPuzzleModal(target: PendingVaultTarget): void {
    if (this.isPoliceModalOpen) return;
    this.closeAllModals("vaultpuzzle");
    const difficulty: ArcadeDifficulty = target.zone === "red" ? "hard" : "normal";
    this.vaultPuzzle.open(
      {
        containerId: target.containerId,
        title: target.title,
        sourceType: target.sourceType,
        kind: target.kind,
        seed: target.seed,
        zone: target.zone,
        difficulty,
        extraMisses: target.zone === "red" ? 1 : 0,
      },
      () => {
        this.scene.completeVaultPuzzle();
      },
      () => {
        this.scene.cancelVaultPuzzle();
      },
    );
  }

  public openJailMinigameModal(station: { stationId: string; kind: ArcadeMinigameKind }): void {
    if (this.isPoliceModalOpen) return;
    this.closeAllModals("vaultpuzzle");
    this.vaultPuzzle.open(
      {
        containerId: station.stationId,
        title: "Phòng Tạm Giam",
        sourceType: "jail_station",
        kind: station.kind,
      },
      () => {
        const res = this.scene.resolveJailMinigame(true, station.stationId);
        if (!res.released) {
          this.showDiscoveryToast(
            "⏳ Giảm 1 phút tạm giam!",
            "Chiến thắng minigame giúp giảm 60 giây thời gian giam.",
          );
        }
        this.updateDetentionCountdown(this.scene.getDetainedRemainingMs());
      },
      () => {
        this.scene.cancelJailMinigame();
      },
    );
  }

  public openLootModal(container: ContainerLootState): void {
    this.closeAllModals("bag");
    this.isHomeStorageOpen = false;
    this.activeContainer = container;
    this.selectedItem = null;
    this.initContainerScan(container);
    this.isBagOpen = true;
    this.bagModalEl.classList.add("is-open");
    this.renderLootAndBagModal();
  }

  public openHomeStorageModal(): void {
    this.closeAllModals("bag");
    this.activeContainer = null;
    this.resetContainerScan();
    this.isHomeStorageOpen = true;
    this.selectedItem = null;
    this.isBagOpen = true;
    this.bagModalEl.classList.add("is-open");
    this.renderLootAndBagModal();
  }

  public openShopModal(shopKind: ShopKind = "backpack"): void {
    if (shopKind === "clothing") {
      this.closeAllModals("clothshop");
      this.clothShopPreviewGear = null;
      this.isClothingShopOpen = true;
      this.clothShopModalEl.classList.add("is-open");
      this.renderClothingShopModal();
      return;
    }
    if (shopKind === "food" || shopKind === "pharmacy") {
      this.closeAllModals("foodshop");
      this.foodShopMode = shopKind;
      this.isFoodShopOpen = true;
      this.foodShopModalEl.classList.add("is-open");
      this.renderFoodShopModal();
      return;
    }
    if (shopKind === "hair") {
      this.closeAllModals("hairshop");
      this.hairShopPreviewId = null;
      this.isHairShopOpen = true;
      this.hairShopModalEl.classList.add("is-open");
      this.renderHairShopModal();
      return;
    }
    this.closeAllModals("shop");
    this.selectedShopUid = null;
    this.setShopOpen(true);
  }

  public openQuickWheelModal(): void {
    if (this.isOnboardingOpen || this.isPoliceModalOpen || this.vaultPuzzle.isOpen()) return;
    if (this.isQuickWheelOpen) {
      this.closeAllModals();
      return;
    }
    this.closeAllModals("quickwheel");
    this.isQuickWheelOpen = true;
    this.quickWheelModalEl.classList.add("is-open");
    this.renderQuickWheel();
  }

  public handleConsumeCompleted(title: string, message: string): void {
    this.updateConsumeProgressToast();
    this.showDiscoveryToast(title, message);
    this.refreshBagBadge();
    this.updateSurvivalHud();
    if (this.isBagOpen) this.renderLootAndBagModal();
    if (this.isFoodShopOpen) this.renderFoodShopModal();
    if (this.isQuickWheelOpen) this.renderQuickWheel();
  }

  public openAirportModal(): void {
    this.closeAllModals("airport");
    this.isAirportOpen = true;
    this.airportModalEl.classList.add("is-open");
    this.setAirportTab(this.activeAirportTab);
    this.renderAirportModal();
  }

  public handleMapChanged(): void {
    this.terrainSnapshot = this.bakeTerrainSnapshot();
    this.updateMapTitles();
    this.drawMinimap();
    if (this.isFullmapOpen) {
      this.drawFullMap();
    }
    this.refreshBagBadge();
    this.updateSurvivalHud();
    this.updateInteractPrompt();
    if (this.isAirportOpen) {
      this.renderAirportModal();
    }
  }

  private updateMapTitles(): void {
    const mapId = this.scene.getActiveMapId();
    this.fullmapTitleEl.textContent = `🗺️ Bản Đồ: ${MAP_LABELS[mapId]}`;
  }

  private setAirportTab(tab: "flight" | "gender"): void {
    this.activeAirportTab = tab;
    const isFlight = tab === "flight";
    this.airportTabFlightBtn.classList.toggle("is-active", isFlight);
    this.airportTabGenderBtn.classList.toggle("is-active", !isFlight);
    this.airportTabFlightBtn.setAttribute("aria-selected", String(isFlight));
    this.airportTabGenderBtn.setAttribute("aria-selected", String(!isFlight));
    this.airportFlightPanelEl.classList.toggle("is-hidden", !isFlight);
    this.airportGenderPanelEl.classList.toggle("is-hidden", isFlight);
  }

  private syncSoundButtonLabel(): void {
    const enabled = this.scene.isSoundEnabled();
    this.soundToggleBtn.textContent = enabled ? "🔊 Âm thanh: Bật" : "🔇 Âm thanh: Tắt";
    this.soundToggleBtn.classList.toggle("is-muted", !enabled);
  }

  public openGuideModal(startIndex = 0): void {
    this.closeAllModals("guide");
    this.isGuideModalOpen = true;
    this.guideSlideIdx = Math.max(0, Math.min(GUIDE_SLIDES.length - 1, startIndex));
    this.guideModalEl.classList.add("is-open");
    this.renderGuideSlide();
  }

  private renderGuideSlide(): void {
    const total = GUIDE_SLIDES.length;
    const slide = GUIDE_SLIDES[this.guideSlideIdx];

    this.guideStepMetaEl.replaceChildren();
    const pill = document.createElement("span");
    pill.className = "bag-stat-pill";
    pill.textContent = `Trang ${this.guideSlideIdx + 1}/${total}`;
    this.guideStepMetaEl.appendChild(pill);

    this.guideSlideStageEl.replaceChildren();
    const hero = document.createElement("div");
    hero.className = "guide-slide-hero";
    const ico = document.createElement("div");
    ico.className = "guide-slide-icon";
    ico.textContent = slide.icon;
    const headWrap = document.createElement("div");
    const h = document.createElement("div");
    h.className = "guide-slide-heading";
    h.textContent = slide.heading;
    const s = document.createElement("div");
    s.className = "guide-slide-sub";
    s.textContent = slide.sub;
    headWrap.append(h, s);
    hero.append(ico, headWrap);

    const mediaWrap = document.createElement("div");
    mediaWrap.className = "guide-slide-media";
    const img = document.createElement("img");
    img.className = `guide-slide-img${slide.imageFit === "cover" ? " is-cover" : ""}`;
    img.src = withAssetHash(slide.imageSrc);
    img.alt = slide.heading;
    img.loading = "eager";
    mediaWrap.appendChild(img);

    const list = document.createElement("ul");
    list.className = "guide-slide-points";
    for (const pt of slide.points) {
      const li = document.createElement("li");
      li.textContent = pt;
      list.appendChild(li);
    }

    this.guideSlideStageEl.append(hero, mediaWrap, list);

    this.guideDotsEl.replaceChildren();
    for (let i = 0; i < total; i++) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `guide-dot${i === this.guideSlideIdx ? " is-active" : ""}`;
      dot.setAttribute("aria-label", `Trang ${i + 1}`);
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        this.guideSlideIdx = i;
        this.renderGuideSlide();
      });
      this.guideDotsEl.appendChild(dot);
    }

    this.guidePrevBtn.disabled = this.guideSlideIdx === 0;
    this.guideNextBtn.textContent =
      this.guideSlideIdx >= total - 1 ? "✅ Bắt đầu chơi" : "Tiếp ➡️";
  }

  public openQuestBoardModal(): void {
    this.closeAllModals("questboard");
    this.isQuestBoardOpen = true;
    this.questBoardModalEl.classList.add("is-open");
    this.renderQuestBoardModal();
  }

  private buildDailyQuestRow(
    q: DailyQuestEntry,
    onAfterAction: () => void,
    atQuestBoard = this.scene.isAtQuestBoard(),
  ): HTMLElement {
    const inv = this.scene.inventory;
    const row = document.createElement("div");
    const isReady = q.progress >= q.targetCount;
    row.className = `sb-req-row${q.claimed || isReady ? " is-complete" : ""}`;

    const meta = document.createElement("div");
    meta.className = "sb-req-meta";

    const title = document.createElement("div");
    title.className = "sb-req-name";
    title.textContent = `${q.title} • Độ khó ${q.difficultyScore.toFixed(1)}★`;

    const desc = document.createElement("div");
    desc.className = "qb-card-meta";
    desc.textContent = q.description;

    const rewardItemDef = q.reward.itemId ? ITEM_BY_ID[q.reward.itemId] : null;
    const rewardPill = document.createElement("div");
    rewardPill.className = `qb-reward-pill${q.reward.categoryLabel === "Đồ Đỏ (S)" ? " is-red" : ""}`;
    rewardPill.textContent = rewardItemDef
      ? `🎁 Thưởng [${q.reward.categoryLabel}]: +${q.reward.gold.toLocaleString("vi-VN")} Vàng & ${q.reward.itemQty}× ${rewardItemDef.name}`
      : `🎁 Thưởng [Tiền]: +${q.reward.gold.toLocaleString("vi-VN")} Vàng`;

    const sub = document.createElement("div");
    sub.className = "sb-req-sub";
    if (q.kind === "deliver" && q.targetItemId && !q.claimed) {
      const owned = inv.countItemAcrossZones(q.targetItemId).total;
      sub.textContent = `Tiến độ: ${q.progress}/${q.targetCount} • Đang giữ: ${owned}`;
    } else {
      sub.textContent = `Tiến độ: ${q.progress}/${q.targetCount}`;
    }

    const bar = document.createElement("div");
    bar.className = "sb-req-bar";
    const fill = document.createElement("div");
    fill.className = "sb-req-bar-fill";
    fill.style.width = `${Math.min(100, (q.progress / q.targetCount) * 100)}%`;
    bar.appendChild(fill);

    meta.append(title, desc, rewardPill, sub, bar);

    const act = document.createElement("div");
    act.className = "sb-req-actions";
    const btn = document.createElement("button");
    btn.type = "button";
    if (q.claimed) {
      btn.className = "btn-card-secondary";
      btn.textContent = "✅ Đã nhận";
      btn.disabled = true;
    } else if (isReady) {
      btn.className = atQuestBoard ? "btn-card-primary" : "btn-card-secondary";
      btn.textContent = atQuestBoard ? "🎁 Nhận thưởng" : "🔒 Về Hội Sở nhận";
      btn.disabled = !atQuestBoard;
    } else if (q.kind === "deliver" && q.targetItemId) {
      const owned = inv.countItemAcrossZones(q.targetItemId).total;
      if (!atQuestBoard) {
        btn.className = "btn-card-secondary";
        btn.textContent = owned > 0 ? "🔒 Về Hội Sở giao" : "⏳ Thiếu đồ";
        btn.disabled = true;
      } else {
        btn.className = owned > 0 ? "btn-card-primary" : "btn-card-secondary";
        btn.textContent = owned > 0 ? `📦 Giao đồ (${owned})` : "⏳ Thiếu đồ";
        btn.disabled = owned <= 0;
      }
    } else {
      btn.className = "btn-card-secondary";
      btn.textContent = "⏳ Đang làm";
      btn.disabled = true;
    }

    btn.addEventListener("click", () => {
      const res = this.scene.deliverOrClaimDailyQuest(q.id);
      this.showDiscoveryToast(
        res.ok ? "📜 Nhiệm vụ 4 giờ" : "Chưa thể hoàn thành",
        res.message,
      );
      this.refreshBagBadge();
      onAfterAction();
    });

    act.appendChild(btn);
    row.append(meta, act);
    return row;
  }

  private renderQuestBoardModal(): void {
    const board = this.scene.getDailyQuestBoard();
    const inv = this.scene.inventory;
    const remMs = Math.max(0, board.nextRefreshAt - Date.now());
    const claimedCount = board.quests.filter((q) => q.claimed).length;

    this.questBoardStatsEl.replaceChildren();
    for (const txt of [
      `⏳ Làm mới sau: ${formatQuestCountdown(remMs)}`,
      `✅ Hoàn thành: ${claimedCount}/${board.quests.length}`,
      `💰 ${inv.getGold().toLocaleString("vi-VN")} Vàng`,
    ]) {
      const pill = document.createElement("span");
      pill.className = "bag-stat-pill";
      pill.textContent = txt;
      this.questBoardStatsEl.appendChild(pill);
    }

    const pendingCount = board.quests.filter((q) => !q.claimed).length;
    if (pendingCount <= 0) {
      this.questBoardRerollBtn.textContent = "⏳ Đã xong hết — Chờ reset 4 giờ";
      this.questBoardRerollBtn.disabled = true;
    } else {
      this.questBoardRerollBtn.textContent = `🔄 Đổi ${pendingCount} NV chưa xong (${QUEST_MANUAL_REROLL_COST_GOLD} Vàng)`;
      this.questBoardRerollBtn.disabled = inv.getGold() < QUEST_MANUAL_REROLL_COST_GOLD;
    }

    this.questBoardListEl.replaceChildren();
    for (const q of board.quests) {
      this.questBoardListEl.appendChild(
        this.buildDailyQuestRow(q, () => this.renderQuestBoardModal()),
      );
    }
  }

  public openCollectionModal(): void {
    this.closeAllModals("collection");
    this.isCollectionOpen = true;
    this.collectionModalEl.classList.add("is-open");
    this.renderCollectionModal();
  }

  public openPetGachaModal(tab: "gacha" | "roster" = "gacha"): void {
    this.closeAllModals("pet");
    this.isPetModalOpen = true;
    this.petModalTab = tab;
    this.petModalEl.classList.add("is-open");
    this.renderPetGachaModal();
  }

  private renderPetGachaModal(): void {
    const ownedIds = new Set(this.scene.getOwnedPetIds());
    const equipped = this.scene.getEquippedPet();
    const gold = this.scene.inventory.getGold();
    const atGacha = this.scene.isAtPetGacha();

    this.petStatsEl.replaceChildren();
    for (const txt of [
      `💰 ${gold.toLocaleString("vi-VN")} Vàng`,
      `🐾 Sở hữu: ${ownedIds.size}/${PET_CATALOG.length}`,
      equipped ? `✨ Đang theo: ${equipped.emoji} ${equipped.name}` : "💤 Chưa chọn Pet",
    ]) {
      const pill = document.createElement("span");
      pill.className = "bag-stat-pill";
      pill.textContent = txt;
      this.petStatsEl.appendChild(pill);
    }

    for (const btn of this.petTabsEl.querySelectorAll<HTMLButtonElement>("[data-pet-tab]")) {
      btn.classList.toggle("is-active", btn.dataset.petTab === this.petModalTab);
    }

    this.petBodyEl.replaceChildren();

    // Pet Live Preview & Effects Panel
    const previewPet = PET_BY_ID[this.previewPetId] ?? equipped ?? PET_CATALOG[0];
    if (previewPet) {
      if (this.previewPetAnim === "play" && !previewPet.playIconSrc) {
        this.previewPetAnim = "idle";
      }
      const pCard = document.createElement("div");
      pCard.className = `pet-preview-card is-${previewPet.rarity}`;

      const stage = document.createElement("div");
      stage.className = "pet-preview-stage";
      const pImg = document.createElement("img");
      pImg.src =
        this.previewPetAnim === "run"
          ? previewPet.runIconSrc
          : this.previewPetAnim === "play" && previewPet.playIconSrc
            ? previewPet.playIconSrc
            : previewPet.iconSrc;
      pImg.alt = previewPet.name;
      stage.appendChild(pImg);

      const info = document.createElement("div");
      info.className = "pet-preview-info";

      const pTitle = document.createElement("div");
      pTitle.className = "sb-req-name";
      const pDot = document.createElement("span");
      pDot.className = `r-dot r-dot-${previewPet.rarity}`;
      const pLbl = document.createElement("span");
      pLbl.textContent = ` Xem trước [Hạng ${previewPet.rarity}] ${previewPet.emoji} ${previewPet.name}`;
      pTitle.append(pDot, pLbl);

      const pBonus = document.createElement("div");
      pBonus.className = `rep-reward-line${previewPet.rarity === "S" ? " is-red" : ""}`;
      pBonus.textContent = `✨ Hiệu ứng: ${formatPetBonusSummary(previewPet.bonuses)}`;

      info.append(pTitle, pBonus);
      if (previewPet.smartTrait) {
        const smartEl = document.createElement("div");
        smartEl.className = "pet-smart-pill";
        smartEl.textContent = previewPet.smartTrait;
        info.appendChild(smartEl);
      }

      const animActs = document.createElement("div");
      animActs.className = "pet-preview-actions";
      const modes: Array<{ key: "idle" | "run" | "play"; label: string }> = [
        { key: "idle", label: "🧍 Đứng yên" },
        { key: "run", label: "🏃 Chạy" },
      ];
      if (previewPet.playIconSrc) {
        modes.push({ key: "play", label: "🎾 Nghịch ngợm" });
      }
      for (const m of modes) {
        const ab = document.createElement("button");
        ab.type = "button";
        ab.className = `btn-sell-zone${this.previewPetAnim === m.key ? " is-active" : ""}`;
        ab.textContent = m.label;
        ab.addEventListener("click", () => {
          this.previewPetAnim = m.key;
          this.renderPetGachaModal();
        });
        animActs.appendChild(ab);
      }
      info.appendChild(animActs);

      pCard.append(stage, info);
      this.petBodyEl.appendChild(pCard);
    }

    if (this.petModalTab === "gacha") {
      if (this.lastGachaOutcomes.length === 0) {
        const empty = document.createElement("div");
        empty.className = "sb-tier-banner";
        empty.textContent = atGacha
          ? `🎰 Sẵn sàng! Mỗi lượt nhận nuôi tốn ${PET_GACHA_COST_GOLD.toLocaleString("vi-VN")} Vàng.`
          : "🔒 Hãy đến Nhà Nhận Nuôi Thú Cưng để nhận nuôi bằng Vàng (hoặc chọn Pet trong Bộ Sưu Tập để xem trước).";
        this.petBodyEl.appendChild(empty);
      } else {
        for (const out of this.lastGachaOutcomes) {
          const row = document.createElement("div");
          row.className = `sb-req-row${out.kind === "pet" || out.rarity === "S" ? " is-complete" : ""}`;

          const icon = document.createElement("img");
          icon.className = "sb-req-icon";
          icon.src = out.kind === "pet" ? out.pet.iconSrc : out.item.iconSrc;
          icon.alt = out.kind === "pet" ? out.pet.name : out.item.name;

          const meta = document.createElement("div");
          meta.className = "sb-req-meta";
          const title = document.createElement("div");
          title.className = "sb-req-name";
          const dot = document.createElement("span");
          dot.className = `r-dot r-dot-${out.rarity}`;
          const lbl = document.createElement("span");
          lbl.textContent =
            out.kind === "pet"
              ? ` [PET ${out.rarity}] ${out.pet.emoji} ${out.pet.name}`
              : ` [${out.rarity}] ${out.item.name}`;
          title.append(dot, lbl);

          const sub = document.createElement("div");
          sub.className = "sb-req-sub";
          if (out.kind === "pet") {
            sub.textContent = out.isDuplicate
              ? `Trùng Pet — Hoàn trả +${out.refundGold.toLocaleString("vi-VN")} Vàng!`
              : `🎉 Pet mới! ${formatPetBonusSummary(out.pet.bonuses)}`;
          } else {
            sub.textContent =
              out.storedWhere === "backpack"
                ? "Đã cất vào Balo"
                : out.storedWhere === "home"
                  ? "Balo đầy — Đã gửi Kho Nhà"
                  : `Balo & Kho đầy — Tự bán +${out.overflowGold.toLocaleString("vi-VN")} Vàng`;
          }

          meta.append(title, sub);
          row.append(icon, meta);
          this.petBodyEl.appendChild(row);
        }
      }
    } else {
      const rarityOrder: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };
      const sorted = [...PET_CATALOG].sort((a, b) => {
        const ownDiff = Number(ownedIds.has(b.id)) - Number(ownedIds.has(a.id));
        if (ownDiff !== 0) return ownDiff;
        return rarityOrder[a.rarity] - rarityOrder[b.rarity];
      });

      for (const pet of sorted) {
        const owned = ownedIds.has(pet.id);
        const isEq = equipped?.id === pet.id;
        const row = document.createElement("div");
        row.className = `sb-req-row${isEq ? " is-complete" : ""}`;

        const icon = document.createElement("img");
        icon.className = "sb-req-icon";
        icon.src = pet.iconSrc;
        icon.alt = pet.name;
        if (!owned) icon.style.opacity = "0.4";

        const meta = document.createElement("div");
        meta.className = "sb-req-meta";
        const title = document.createElement("div");
        title.className = "sb-req-name";
        const dot = document.createElement("span");
        dot.className = `r-dot r-dot-${pet.rarity}`;
        const lbl = document.createElement("span");
        lbl.textContent = ` [Hạng ${pet.rarity}] ${pet.emoji} ${pet.name}`;
        title.append(dot, lbl);

        const desc = document.createElement("div");
        desc.className = "qb-card-meta";
        desc.textContent = pet.description;

        const bonusLine = document.createElement("div");
        bonusLine.className = `rep-reward-line${pet.rarity === "S" ? " is-red" : ""}`;
        bonusLine.textContent = `✨ Hiệu ứng: ${formatPetBonusSummary(pet.bonuses)}`;

        meta.append(title, desc, bonusLine);
        if (pet.smartTrait) {
          const smartEl = document.createElement("div");
          smartEl.className = "pet-smart-pill";
          smartEl.textContent = pet.smartTrait;
          meta.appendChild(smartEl);
        }

        const act = document.createElement("div");
        act.className = "sb-req-actions";
        const previewBtn = document.createElement("button");
        previewBtn.type = "button";
        previewBtn.className = "btn-card-secondary";
        previewBtn.textContent = "👁️ Xem trước";
        previewBtn.addEventListener("click", () => {
          this.previewPetId = pet.id;
          this.previewPetAnim = pet.playIconSrc ? "play" : "idle";
          this.renderPetGachaModal();
        });
        act.appendChild(previewBtn);

        const btn = document.createElement("button");
        btn.type = "button";
        if (!owned) {
          btn.className = "btn-card-secondary";
          btn.textContent = "🔒 Quay Gacha để mở";
          btn.disabled = true;
        } else if (isEq) {
          btn.className = "btn-card-secondary";
          btn.textContent = "💤 Cho nghỉ";
        } else {
          btn.className = "btn-card-primary";
          btn.textContent = "🐾 Cho đi theo";
        }
        btn.addEventListener("click", () => {
          const res = this.scene.equipPet(isEq ? null : pet.id);
          this.showDiscoveryToast("🐾 Thú Cưng", res.message);
          this.renderPetGachaModal();
        });
        act.appendChild(btn);

        row.append(icon, meta, act);
        this.petBodyEl.appendChild(row);
      }
    }

    if (!atGacha) {
      this.petRoll1Btn.textContent = "🔒 Đến Nhà Nhận Nuôi để quay";
      this.petRoll1Btn.disabled = true;
      this.petRoll5Btn.textContent = "🔒 Quay 5 lần (10.000🪙)";
      this.petRoll5Btn.disabled = true;
    } else {
      this.petRoll1Btn.textContent = `🎰 Quay 1 lần (${PET_GACHA_COST_GOLD.toLocaleString("vi-VN")}🪙)`;
      this.petRoll1Btn.disabled = gold < PET_GACHA_COST_GOLD;
      this.petRoll5Btn.textContent = `🎲 Quay 5 lần (${(PET_GACHA_COST_GOLD * 5).toLocaleString("vi-VN")}🪙)`;
      this.petRoll5Btn.disabled = gold < PET_GACHA_COST_GOLD * 5;
    }
  }

  public openReputationModal(category?: ReputationCategory): void {
    this.closeAllModals("reputation");
    this.isReputationOpen = true;
    if (category) this.reputationCategory = category;
    this.reputationModalEl.classList.add("is-open");
    this.renderReputationModal();
  }

  private renderReputationModal(): void {
    const summary = this.scene.getReputationSummary();
    const { state, rank, nextRank, progressInRank01 } = summary;

    this.reputationStatsEl.replaceChildren();
    for (const txt of [
      `${rank.badge} ${rank.title}`,
      `⭐ ${state.points.toLocaleString("vi-VN")} Danh vọng`,
      `🏅 Mốc: ${summary.totalClaimed}/${summary.totalMilestones}`,
    ]) {
      const pill = document.createElement("span");
      pill.className = "bag-stat-pill";
      pill.textContent = txt;
      this.reputationStatsEl.appendChild(pill);
    }

    this.reputationBannerEl.replaceChildren();
    const top = document.createElement("div");
    top.className = "rep-rank-top";
    const rTitle = document.createElement("span");
    rTitle.className = "rep-rank-title";
    rTitle.textContent = `${rank.badge} Cấp ${rank.level}: ${rank.title} (${state.points.toLocaleString("vi-VN")} điểm)`;
    const rNext = document.createElement("span");
    rNext.className = "rep-rank-next";
    rNext.textContent = nextRank
      ? `Tiếp theo: ${nextRank.badge} ${nextRank.title} (${nextRank.minPoints.toLocaleString("vi-VN")} điểm)`
      : "👑 Đã đạt cấp Danh vọng cao nhất!";
    top.append(rTitle, rNext);

    const rBar = document.createElement("div");
    rBar.className = "rep-rank-bar";
    const rFill = document.createElement("div");
    rFill.className = "rep-rank-bar-fill";
    rFill.style.width = `${Math.round(progressInRank01 * 100)}%`;
    rBar.appendChild(rFill);
    this.reputationBannerEl.append(top, rBar);

    for (const btn of this.reputationTabsEl.querySelectorAll<HTMLButtonElement>("[data-rep-cat]")) {
      const cat = btn.dataset.repCat as ReputationCategory;
      btn.classList.toggle("is-active", cat === this.reputationCategory);
    }

    this.reputationListEl.replaceChildren();

    if (this.reputationCategory === "shop") {
      const atRepHall = this.scene.isAtReputationHall();
      for (const entry of REPUTATION_SHOP_ITEMS) {
        const def = ITEM_BY_ID[entry.itemId];
        if (!def) continue;
        const owned = this.scene.inventory.countItemAcrossZones(entry.itemId).total;
        const canAfford = state.points >= entry.costPoints;

        const row = document.createElement("div");
        row.className = "sb-req-row";

        const icon = document.createElement("img");
        icon.className = "sb-req-icon";
        icon.src = def.iconSrc;
        icon.alt = def.name;

        const meta = document.createElement("div");
        meta.className = "sb-req-meta";

        const title = document.createElement("div");
        title.className = "sb-req-name";
        const dot = document.createElement("span");
        dot.className = `r-dot r-dot-${def.rarity}`;
        const label = document.createElement("span");
        label.textContent = ` ${def.name} (${def.w}×${def.h}) • Giới hạn Danh vọng`;
        title.append(dot, label);

        const desc = document.createElement("div");
        desc.className = "qb-card-meta";
        desc.textContent = def.description;

        const costLine = document.createElement("div");
        costLine.className = "rep-reward-line is-red";
        costLine.textContent = `⭐ Giá đổi: ${entry.costPoints.toLocaleString("vi-VN")} Danh vọng • Đang giữ: ${owned}`;

        meta.append(title, desc, costLine);

        const act = document.createElement("div");
        act.className = "sb-req-actions";
        const btn = document.createElement("button");
        btn.type = "button";
        if (!atRepHall) {
          btn.className = "btn-card-secondary";
          btn.textContent = "🔒 Đến Sảnh Danh Vọng";
          btn.disabled = true;
        } else {
          btn.className = canAfford ? "btn-card-primary" : "btn-card-secondary";
          btn.textContent = canAfford ? `🛒 Đổi (${entry.costPoints}⭐)` : `🔒 Thiếu (${entry.costPoints}⭐)`;
          btn.disabled = !canAfford;
        }
        btn.addEventListener("click", () => {
          const res = this.scene.buyReputationShopItem(entry.itemId);
          this.showDiscoveryToast(
            res.ok ? "🔴 Đổi Đồ Đỏ Danh Vọng" : "Không thể đổi",
            res.message,
          );
          this.refreshBagBadge();
          this.renderReputationModal();
        });
        act.appendChild(btn);

        row.append(icon, meta, act);
        this.reputationListEl.appendChild(row);
      }

      this.reputationClaimAllBtn.textContent = atRepHall
        ? `🏛️ Tại Sảnh Danh Vọng • Điểm hiện có: ${state.points.toLocaleString("vi-VN")}⭐`
        : `🏛️ Đến Sảnh Danh Vọng để đổi Đồ Đỏ • Điểm: ${state.points.toLocaleString("vi-VN")}⭐`;
      this.reputationClaimAllBtn.disabled = true;
      return;
    }

    const filtered = summary.activeMilestones.filter(
      (m) => this.reputationCategory === "all" || m.category === this.reputationCategory,
    );
    const sorted = [...filtered].sort((a, b) => {
      const rankOrder = (x: typeof a): number => (x.completed && !x.claimed ? 0 : !x.claimed ? 1 : 2);
      const diff = rankOrder(a) - rankOrder(b);
      return diff !== 0 ? diff : a.tierIndex - b.tierIndex;
    });

    this.reputationListEl.replaceChildren();
    for (const m of sorted) {
      const row = document.createElement("div");
      row.className = `sb-req-row${m.completed || m.claimed ? " is-complete" : ""}`;

      const meta = document.createElement("div");
      meta.className = "sb-req-meta";

      const title = document.createElement("div");
      title.className = "sb-req-name";
      title.textContent = `${m.icon} [${m.trackLabel} • Bậc ${m.tierIndex}/${m.tierTotal}] ${m.title}`;

      const desc = document.createElement("div");
      desc.className = "qb-card-meta";
      desc.textContent = m.description;

      const rewardLine = document.createElement("div");
      rewardLine.className = `rep-reward-line${m.reward.bonusItemKind === "red_s" ? " is-red" : ""}`;
      const bonusPart = m.reward.bonusItemLabel ? ` & ${m.reward.bonusItemLabel}` : "";
      rewardLine.textContent = `🎁 +${m.reward.points} Danh vọng • +${m.reward.gold.toLocaleString("vi-VN")} Vàng${bonusPart}`;

      const clampedCur = Math.min(m.current, m.target);
      const sub = document.createElement("div");
      sub.className = "sb-req-sub";
      sub.textContent = `Tiến độ: ${clampedCur.toLocaleString("vi-VN")}/${m.target.toLocaleString("vi-VN")}`;

      const bar = document.createElement("div");
      bar.className = "sb-req-bar";
      const fill = document.createElement("div");
      fill.className = "sb-req-bar-fill";
      fill.style.width = `${Math.min(100, (clampedCur / Math.max(1, m.target)) * 100)}%`;
      bar.appendChild(fill);

      meta.append(title, desc, rewardLine, sub, bar);

      const act = document.createElement("div");
      act.className = "sb-req-actions";
      const btn = document.createElement("button");
      btn.type = "button";
      if (m.claimed) {
        btn.className = "btn-card-secondary";
        btn.textContent = "✅ Đã nhận";
        btn.disabled = true;
      } else if (m.completed) {
        btn.className = "btn-card-primary";
        btn.textContent = "🎁 Nhận thưởng";
      } else {
        btn.className = "btn-card-secondary";
        btn.textContent = "⏳ Đang tích lũy";
        btn.disabled = true;
      }
      btn.addEventListener("click", () => {
        const res = this.scene.claimReputationMilestone(m.id);
        this.showDiscoveryToast(
          res.ok ? "🏆 Nhận thưởng Danh vọng" : "Chưa thể nhận",
          res.message,
        );
        this.refreshBagBadge();
        this.renderReputationModal();
      });
      act.appendChild(btn);

      row.append(meta, act);
      this.reputationListEl.appendChild(row);
    }

    this.reputationClaimAllBtn.textContent =
      summary.claimableCount > 0
        ? `🎁 Nhận tất cả mốc đã đạt (${summary.claimableCount})`
        : "⏳ Chưa có mốc nào sẵn sàng nhận";
    this.reputationClaimAllBtn.disabled = summary.claimableCount <= 0;
  }

  public openOnboardingModal(): void {
    this.closeAllModals();
    this.isOnboardingOpen = true;
    this.onboardSelectedGender = "male";
    this.onboardMaleBtn.classList.add("is-active");
    this.onboardFemaleBtn.classList.remove("is-active");
    this.onboardModalEl.classList.add("is-open");

    const starterGear = createDefaultEquippedGear();
    const defaultHairId = HAIR_OPTIONS[0].id;
    void this.drawDollPreviewCanvas(this.onboardMaleCanvas, {
      equipped: starterGear,
      hairId: defaultHairId,
      gender: "male",
    });
    void this.drawDollPreviewCanvas(this.onboardFemaleCanvas, {
      equipped: starterGear,
      hairId: defaultHairId,
      gender: "female",
    });
  }

  public openPoliceChallengeModal(officer: {
    id: string;
    name: string;
    zone?: SecurityZone;
  }): void {
    if (this.policeSuspicionTimerId !== null) {
      window.clearTimeout(this.policeSuspicionTimerId);
      this.policeSuspicionTimerId = null;
    }
    this.closeAllModals();
    this.policeArcadeCtrl?.destroy();
    this.policeArcadeCtrl = null;
    this.policeGame = null;
    this.policeModalEl.classList.remove("is-open");
    this.isPoliceModalOpen = true;

    const isJapan = this.scene.getActiveMapId() === "japan";
    const zone: SecurityZone =
      officer.zone === "red" || officer.zone === "yellow"
        ? officer.zone
        : this.scene.getCurrentSecurityZone() === "red"
          ? "red"
          : "yellow";
    const maxAttempts = zone === "red" ? 2 : isJapan ? 3 : 5;
    const maxFails = zone === "red" ? 2 : isJapan ? 2 : 3;
    const difficulty: ArcadeDifficulty =
      zone === "red" ? (isJapan ? "hard" : "normal") : "normal";
    const inputMaxMs = zone === "red" ? (isJapan ? 12_500 : 14_500) : isJapan ? 11_000 : 15_000;

    const delayMs = 3000;
    this.showDiscoveryToast(
      "🚨 Đang bị tình nghi!",
      `${officer.name} phát hiện dấu hiệu khả nghi — Kiểm tra sau 3 giây...`,
    );

    this.policeTitleEl.textContent = `🚓 ${officer.name} — Chặn Kiểm Tra`;
    this.policeStatsEl.replaceChildren();
    for (const txt of [
      zone === "red" ? "🔴 Vùng Đỏ" : "🟡 Vùng Vàng",
      `⏳ Bắt đầu sau 3s`,
    ]) {
      const p = document.createElement("span");
      p.className = "bag-stat-pill";
      p.textContent = txt;
      this.policeStatsEl.appendChild(p);
    }
    this.policeStatusEl.textContent = `🚨 ${officer.name}: "Đứng lại! Chuẩn bị kiểm tra hành chính..."`;
    this.policeTimerTrackEl.style.display = "none";
    this.policeGridEl.style.display = "block";
    this.policeGridEl.replaceChildren();
    const introStage = document.createElement("div");
    introStage.className = "police-intro-stage";
    const modelCanvas = document.createElement("canvas");
    modelCanvas.width = 160;
    modelCanvas.height = 160;
    modelCanvas.className = "police-intro-model";
    modelCanvas.setAttribute("aria-label", officer.name);
    void this.drawPolicePreviewCanvas(modelCanvas, isJapan, zone);
    const introCaption = document.createElement("div");
    introCaption.style.fontWeight = "800";
    introCaption.style.fontSize = "14px";
    introCaption.style.color = "#bfdbfe";
    introCaption.textContent = "Đang áp giải vào khu vực kiểm tra (3 giây)...";
    introStage.append(modelCanvas, introCaption);
    this.policeGridEl.appendChild(introStage);
    this.policeModalEl.classList.add("is-open");

    this.policeSuspicionTimerId = window.setTimeout(() => {
      this.policeSuspicionTimerId = null;
      if (!this.isPoliceModalOpen || this.scene.isDetained()) return;
      this.policeTimerTrackEl.style.display = "";
      this.policeGridEl.style.display = "";
      this.policeGame = {
        officerId: officer.id,
        officerName: officer.name,
        zone,
        difficulty,
        maxAttempts,
        maxFails,
        attempt: 1,
        fails: 0,
        gameKind: "police_4x4",
        sequence: [],
        phase: "preview",
        flashIdx: 0,
        flashTimerMs: 0,
        inputMaxMs,
        inputRemainingMs: inputMaxMs,
        picked: [],
      };
      this.policeModalEl.classList.add("is-open");
      this.startNextPoliceRound();
    }, delayMs);
  }

  private startNextPoliceRound(): void {
    const g = this.policeGame;
    if (!g) return;
    this.policeArcadeCtrl?.destroy();
    this.policeArcadeCtrl = null;

    const games: Array<"police_4x4" | ArcadeMinigameKind> = [
      "police_4x4",
      "memory_cards",
      "lockpick",
      "timing_bar",
    ];
    const isJapan = this.scene.getActiveMapId() === "japan";
    g.gameKind = games[Math.floor(Math.random() * games.length)];
    g.phase = "preview";
    g.flashIdx = 0;
    g.flashTimerMs = 0;
    g.inputRemainingMs = g.inputMaxMs;
    g.picked = [];

    if (g.gameKind === "police_4x4") {
      const pool = Array.from({ length: 16 }, (_, i) => i);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const seqLen = g.zone === "red" ? (isJapan ? 5 : 4) : isJapan ? 6 : 5;
      g.sequence = pool.slice(0, seqLen);
    } else {
      g.sequence = [];
    }

    this.renderPoliceModal();
  }

  private handlePoliceRoundResult(won: boolean): void {
    const g = this.policeGame;
    if (!g || g.phase === "done" || g.phase === "cooldown") return;

    this.policeArcadeCtrl?.destroy();
    this.policeArcadeCtrl = null;

    if (won) {
      g.phase = "done";
      this.isPoliceModalOpen = false;
      this.policeModalEl.classList.remove("is-open");
      this.policeGame = null;
      this.scene.resolvePoliceChallenge(true);
      this.showDiscoveryToast(
        "✅ Vượt kiểm tra thành công!",
        "Tất cả Cảnh Sát sẽ bỏ qua bạn trong 45 giây tới.",
      );
      return;
    }

    g.fails += 1;
    g.attempt += 1;
    if (g.fails >= g.maxFails || g.attempt > g.maxAttempts) {
      g.phase = "done";
      this.scene.resolvePoliceChallenge(false);
      return;
    }

    g.phase = "cooldown";
    this.policeStatusEl.textContent = `❌ Chưa đúng (Sai ${g.fails}/${g.maxFails}) — Đổi thử thách lượt ${g.attempt}/${g.maxAttempts}...`;
    window.setTimeout(() => {
      if (this.policeGame === g && this.isPoliceModalOpen) {
        this.startNextPoliceRound();
      }
    }, 700);
  }

  public showDetentionScreen(lostItemCount: number, durationMs: number, resumed = false): void {
    if (this.policeSuspicionTimerId !== null) {
      window.clearTimeout(this.policeSuspicionTimerId);
      this.policeSuspicionTimerId = null;
    }
    this.closeAllModals();
    this.policeArcadeCtrl?.destroy();
    this.policeArcadeCtrl = null;
    this.isPoliceModalOpen = false;
    this.policeModalEl.classList.remove("is-open");
    this.policeGame = null;

    this.detentionSubEl.textContent = resumed
      ? "Đang bị tạm giam tại Công An Phường."
      : lostItemCount > 0
        ? `Bị bắt! Tịch thu ${lostItemCount} món đồ, Balo & trang bị (Safebox được giữ lại).`
        : "Bị bắt! Đã tịch thu Balo & trang bị đang mặc (Safebox được giữ lại).";
    this.detentionOverlayEl.classList.add("is-open");
    this.refreshBagBadge();
    this.updateDetentionCountdown(durationMs);
  }

  public handleDetentionEnded(): void {
    this.detentionOverlayEl.classList.remove("is-open");
    this.showDiscoveryToast(
      "🔓 Đã hết thời gian tạm giam",
      "Bạn đã được thả tự do trước Công An Phường!",
    );
  }

  public openWardrobeModal(): void {
    if (this.isOnboardingOpen || this.isPoliceModalOpen || this.vaultPuzzle.isOpen()) return;
    this.closeAllModals("wardrobe");
    this.isWardrobeOpen = true;
    this.wardrobeModalEl.classList.add("is-open");
    this.renderWardrobeModal();
  }

  public showFaintedHospitalScreen(reason: string, feeGold: number): void {
    this.closeAllModals();
    const hospName = this.scene.getActiveMapId() === "japan" ? "Bệnh Viện Tokyo" : "Bệnh Viện Thành Phố";
    this.hospitalTitleEl.textContent = `🚑 Ngất xỉu do ${reason}!`;
    const feeMsg =
      feeGold > 0
        ? `Chi phí cấp cứu ${feeGold} Vàng. Đang phục hồi sức khỏe tại ${hospName}...`
        : `Đã được đưa về cấp cứu miễn phí tại ${hospName}...`;
    this.hospitalSubEl.textContent = feeMsg;
    this.hospitalOverlayEl.classList.add("is-open");
    this.updateSurvivalHud();

    if (this.hospitalTimer !== null) {
      window.clearTimeout(this.hospitalTimer);
    }
    this.hospitalTimer = window.setTimeout(() => {
      this.hospitalOverlayEl.classList.remove("is-open");
      this.showDiscoveryToast(
        `🏥 Đã hồi tỉnh tại ${hospName}`,
        "Thể trạng đã được cấp cứu ổn định.",
      );
    }, 2500);
  }

  public update(dtSeconds: number): void {
    this.advanceContainerScan(dtSeconds);
    this.advancePoliceMinigame(dtSeconds);
    this.updateConsumeProgressToast();

    const detMs = this.scene.getDetainedRemainingMs();
    if (detMs > 0) {
      this.updateDetentionCountdown(detMs);
    }

    const now = performance.now();
    if (now - this.lastHudTick < 50) return;
    this.lastHudTick = now;

    if (this.isBagOpen && this.activeContainer && !this.activeScanUid && now - this.lastCooldownTick >= 500) {
      this.lastCooldownTick = now;
      this.updateContainerSubtitle();
    }

    this.updateSurvivalHud();
    this.updateInteractPrompt();
    if (now - this.lastMinimapDrawAt >= 120) {
      this.lastMinimapDrawAt = now;
      this.drawMinimap();
    }
    if (this.isFullmapOpen) {
      this.drawFullMap();
    }
  }

  public handleContainersRefreshed(expiredIds: string[]): void {
    for (const id of expiredIds) {
      this.vaultPuzzle.clearSession(id);
    }
    this.updateInteractPrompt();
    if (
      this.isBagOpen &&
      this.activeContainer &&
      expiredIds.includes(this.activeContainer.containerId)
    ) {
      const prev = this.activeContainer;
      this.cancelDrag();
      const fresh = this.scene.inventory.openOrGenerateContainer(
        prev.containerId,
        prev.title,
        prev.sourceType,
        prev.biome,
      );
      this.openLootModal(fresh);
      this.showDiscoveryToast(
        "🔄 Đã làm mới vật phẩm!",
        `${fresh.title} vừa xóa đồ cũ và tạo lại đồ mới.`,
      );
    }
  }

  private resetContainerScan(): void {
    this.scanQueue = [];
    this.activeScanUid = null;
    this.scanElapsedMs = 0;
    this.scanDurationMs = 0;
    this.activeScanFillEl = null;
    this.justRevealedUid = null;
  }

  private initContainerScan(container: ContainerLootState): void {
    this.resetContainerScan();
    const unrevealed = container.items.filter((item) => item.revealed === false);
    if (unrevealed.length === 0) return;

    // Scan sequentially from rightmost item center to leftmost (top-to-bottom on X ties)
    unrevealed.sort((a, b) => {
      const defA = ITEM_BY_ID[a.itemId];
      const defB = ITEM_BY_ID[b.itemId];
      const wA = defA ? getEffectiveSize(defA, a.rotated).w : 1;
      const wB = defB ? getEffectiveSize(defB, b.rotated).w : 1;
      const rightA = a.x + wA / 2;
      const rightB = b.x + wB / 2;
      if (Math.abs(rightB - rightA) > 0.01) {
        return rightB - rightA;
      }
      if (a.y !== b.y) return a.y - b.y;
      return b.x - a.x;
    });

    this.scanQueue = unrevealed.map((item) => item.uid);
    this.startNextScanItem();
  }

  private startNextScanItem(): void {
    if (!this.activeContainer) {
      this.activeScanUid = null;
      this.scanElapsedMs = 0;
      this.scanDurationMs = 0;
      this.activeScanFillEl = null;
      return;
    }

    while (this.scanQueue.length > 0) {
      const nextUid = this.scanQueue.shift()!;
      const item = this.activeContainer.items.find((entry) => entry.uid === nextUid);
      if (item && item.revealed === false) {
        const def = ITEM_BY_ID[item.itemId];
        this.activeScanUid = item.uid;
        this.scanElapsedMs = 0;
        this.scanDurationMs = def ? getItemSearchDurationMs(def) : 600;
        this.activeScanFillEl = null;
        return;
      }
    }

    this.activeScanUid = null;
    this.scanElapsedMs = 0;
    this.scanDurationMs = 0;
    this.activeScanFillEl = null;
  }

  private advanceContainerScan(dtSeconds: number): void {
    if (!this.isBagOpen || !this.activeContainer || !this.activeScanUid) return;

    this.scanElapsedMs += Math.min(Math.max(dtSeconds, 0), 0.25) * 1000;
    if (this.scanElapsedMs >= this.scanDurationMs) {
      const completedUid = this.activeScanUid;
      this.scene.inventory.markItemRevealed(this.activeContainer.containerId, completedUid);
      this.justRevealedUid = completedUid;
      this.startNextScanItem();
      this.renderLootAndBagModal();
      return;
    }

    if (this.activeScanFillEl) {
      const pct = Math.min(100, Math.max(0, (this.scanElapsedMs / Math.max(1, this.scanDurationMs)) * 100));
      this.activeScanFillEl.style.width = `${pct.toFixed(1)}%`;
    }
  }

  private updateInteractPrompt(): void {
    const target = this.scene.getNearbyInteraction();
    if (!target) {
      if (this.lastPromptSignature !== "hidden") {
        this.lastPromptSignature = "hidden";
        this.interactBarEl.classList.remove("is-visible");
      }
      return;
    }

    let nextClass = "btn-interact is-building";
    let nextText = "";
    if (target.type === "shop") {
      nextClass = "btn-interact is-shop";
      const shopIco =
        target.shopKind === "clothing"
          ? "👔"
          : target.shopKind === "food"
            ? "🍜"
            : target.shopKind === "hair"
              ? "💇"
              : target.shopKind === "pharmacy"
                ? "💊"
                : "🏪";
      nextText = `${shopIco} Vào ${target.name} [E]`;
    } else if (target.type === "home") {
      nextClass = "btn-interact is-shop";
      nextText = `🏠 Vào ${target.name} [E]`;
    } else if (target.type === "collection") {
      nextClass = "btn-interact is-shop";
      nextText = `🏛️ Vào ${target.name} [E]`;
    } else if (target.type === "airport") {
      nextClass = "btn-interact is-building";
      nextText = `✈️ Check-in ${target.name} [E]`;
    } else if (target.type === "quest") {
      nextClass = "btn-interact is-shop";
      nextText = `📜 Vào ${target.name} [E]`;
    } else if (target.type === "reputation") {
      nextClass = "btn-interact is-shop";
      nextText = `🏛️ Vào ${target.name} [E]`;
    } else if (target.type === "gacha") {
      nextClass = "btn-interact is-shop";
      nextText = `🐾 Vào ${target.name} [E]`;
    } else if (target.type === "jail_minigame") {
      nextClass = "btn-interact is-jail";
      nextText = target.label;
    } else if (target.type === "chest") {
      nextClass = target.chest.kind === "trash" ? "btn-interact is-trash" : "btn-interact";
      nextText = `${target.label} [E]`;
    } else {
      nextClass = "btn-interact is-building";
      nextText = target.searched
        ? `🔍 Kiểm tra: ${target.name} [E]`
        : target.isVault
          ? `🔐 Giải Đố Mở Két: ${target.name} (Đồ Đỏ/Vàng) [E]`
          : `🔍 Tìm kiếm: ${target.name} [E]`;
    }

    const signature = `${nextClass}|${nextText}`;
    if (signature === this.lastPromptSignature) return;
    this.lastPromptSignature = signature;

    this.interactBarEl.classList.add("is-visible");
    this.interactBtn.className = nextClass;
    this.interactBtn.textContent = nextText;
  }

  private bakeTerrainSnapshot(): HTMLCanvasElement {
    const { cols, rows, tiles, mapId } = this.scene.data;
    const cached = this.terrainSnapshotCache.get(mapId);
    if (cached) {
      return cached;
    }

    const offscreen = document.createElement("canvas");
    offscreen.width = cols;
    offscreen.height = rows;

    const isJapan = mapId === "japan";
    const ctx = offscreen.getContext("2d")!;
    const imgData = ctx.createImageData(cols, rows);
    const px = imgData.data;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const tile = tiles[idx];
        let rgb: [number, number, number];
        if (isJapan && c >= 98 && tile !== "water" && tile !== "shallow" && tile !== "road" && tile !== "bridge") {
          rgb =
            tile === "forest" || tile === "dirt"
              ? SNOW_FOREST_RGB
              : tile === "meadow"
                ? SNOW_MEADOW_RGB
                : tile === "sand"
                  ? SNOW_SAND_RGB
                  : SNOW_DEFAULT_RGB;
        } else {
          rgb = MINIMAP_RGB[tile];
        }
        const offset = idx * 4;
        px[offset] = rgb[0];
        px[offset + 1] = rgb[1];
        px[offset + 2] = rgb[2];
        px[offset + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Subtle zone borders on minimap terrain snapshot
    ctx.fillStyle = "rgba(16, 185, 129, 0.72)";
    ctx.fillRect(GREEN_END_COL + 1, 2, 1, rows - 4);
    ctx.fillStyle = "rgba(239, 68, 68, 0.72)";
    ctx.fillRect(YELLOW_END_COL + 1, 2, 1, rows - 4);

    ctx.fillStyle = "#e2e8f0";
    for (const prop of this.scene.data.props) {
      if (prop.kind === "city_backpack_shop") {
        const bx = Math.round(prop.x / TILE_SIZE);
        const by = Math.round(prop.y / TILE_SIZE);
        ctx.fillStyle = "#facc15";
        ctx.fillRect(bx - 1, by - 1, 3, 3);
        ctx.fillStyle = "#e2e8f0";
      } else if (isBuildingProp(prop.kind)) {
        const bx = Math.round(prop.x / TILE_SIZE);
        const by = Math.round(prop.y / TILE_SIZE);
        ctx.fillRect(bx - 1, by - 1, 3, 2);
      }
    }

    this.terrainSnapshotCache.set(mapId, offscreen);
    return offscreen;
  }

  private drawMinimap(): void {
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const ctx = this.minimapCtx;
    const snap = this.terrainSnapshot;

    const zoom = 5;
    const viewW = WORLD_WIDTH / zoom;
    const viewH = WORLD_HEIGHT / zoom;
    const viewX = Math.max(0, Math.min(WORLD_WIDTH - viewW, this.scene.player.x - viewW / 2));
    const viewY = Math.max(0, Math.min(WORLD_HEIGHT - viewH, this.scene.player.y - viewH / 2));

    const sx = (viewX / WORLD_WIDTH) * snap.width;
    const sy = (viewY / WORLD_HEIGHT) * snap.height;
    const sw = snap.width / zoom;
    const sh = snap.height / zoom;

    const toX = (wx: number): number => ((wx - viewX) / viewW) * w;
    const toY = (wy: number): number => ((wy - viewY) / viewH) * h;
    const rScale = 1.45;

    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(snap, sx, sy, sw, sh, 0, 0, w, h);

    for (const p of this.scene.getPoliceMarkers()) {
      const px = toX(p.x);
      const py = toY(p.y);
      if (px < -6 || px > w + 6 || py < -6 || py > h + 6) continue;
      ctx.fillStyle = p.ignored ? "#6ee7b7" : p.state === "chase" ? "#ef4444" : "#3b82f6";
      ctx.beginPath();
      ctx.arc(px, py, 2.2 * rScale, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const ch of this.scene.data.chests) {
      if (this.scene.inventory.isContainerLootedEmpty(ch.id)) continue;
      const cx = toX(ch.x);
      const cy = toY(ch.y);
      if (cx < -6 || cx > w + 6 || cy < -6 || cy > h + 6) continue;
      ctx.fillStyle =
        ch.kind === "trash"
          ? "#cbd5e1"
          : ch.kind === "royal"
            ? "#ef4444"
            : "#38bdf8";
      ctx.beginPath();
      ctx.arc(cx, cy, (ch.kind === "trash" ? 1.6 : 2.3) * rScale, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const lm of this.scene.data.landmarks) {
      const lx = toX(lm.x);
      const ly = toY(lm.y);
      if (lx < -6 || lx > w + 6 || ly < -6 || ly > h + 6) continue;
      ctx.fillStyle = lm.discovered ? "#34d399" : "#f59e0b";
      ctx.beginPath();
      ctx.arc(lx, ly, 2.5 * rScale, 0, Math.PI * 2);
      ctx.fill();
    }

    const dest = this.scene.getDestination();
    if (dest) {
      const dx = toX(dest.x);
      const dy = toY(dest.y);
      ctx.strokeStyle = "#6ee7b7";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(dx, dy, 3.5 * rScale, 0, Math.PI * 2);
      ctx.stroke();
    }

    const px = toX(this.scene.player.x);
    const py = toY(this.scene.player.y);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(px, py, 3.2 * rScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#059669";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private bindEvents(): void {
    window.addEventListener("keydown", (e) => {
      if (this.isOnboardingOpen) return;
      if (this.isPoliceModalOpen) {
        this.policeArcadeCtrl?.handleKeyDown(e);
        return;
      }
      if (this.vaultPuzzle.isOpen()) return;
      if (e.key === "Escape") {
        if (this.purchaseModalEl.classList.contains("is-open")) {
          this.closePurchaseConfirm();
          return;
        }
        this.closeAllModals();
      } else if ((e.code === "KeyI" || e.code === "KeyB") && !e.repeat) {
        if (this.isBagOpen) {
          this.setBagOpen(false);
        } else {
          this.activeContainer = null;
          this.setBagOpen(true);
        }
      } else if (e.code === "KeyC" && !e.repeat) {
        if (this.isWardrobeOpen) {
          this.closeAllModals();
        } else {
          this.openWardrobeModal();
        }
      } else if (e.code === "KeyM" && !e.repeat) {
        if (this.scene.isDetained()) return;
        this.setFullmapOpen(!this.isFullmapOpen);
      } else if (e.code === "KeyR" && !e.repeat && this.isBagOpen) {
        this.rotateActiveSelectionOrDrag();
      }
    });

    this.minimapBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.minimapBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.isOnboardingOpen || this.isPoliceModalOpen || this.vaultPuzzle.isOpen() || this.scene.isDetained()) return;
      this.setFullmapOpen(true);
    });

    this.fullmapCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.setFullmapOpen(false);
    });

    this.fullmapModalEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.target === this.fullmapModalEl) {
        this.setFullmapOpen(false);
      }
    });

    this.fullmapCanvas.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      const rect = this.fullmapCanvas.getBoundingClientRect();
      const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      const bounds = this.getFullmapViewBounds();
      this.scene.moveToWorldPoint(
        bounds.viewX + nx * bounds.viewW,
        bounds.viewY + ny * bounds.viewH,
        true,
      );
      this.setFullmapOpen(false);
    });

    const zoneFilterEl = document.getElementById("fullmap-zone-filter");
    if (zoneFilterEl) {
      zoneFilterEl.addEventListener("pointerdown", (e) => e.stopPropagation());
      zoneFilterEl.addEventListener("click", (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-zone-filter]");
        if (!btn) return;
        const z = btn.dataset.zoneFilter as "all" | SecurityZone | undefined;
        if (!z) return;
        this.fullmapZoneFilter = z;
        zoneFilterEl.querySelectorAll<HTMLButtonElement>("[data-zone-filter]").forEach((b) => {
          b.classList.toggle("is-active", b.dataset.zoneFilter === z);
        });
        this.drawFullMap();
      });
    }

    const quickNavEl = document.getElementById("fullmap-quick-nav");
    if (quickNavEl) {
      for (const btn of quickNavEl.querySelectorAll<HTMLButtonElement>("[data-nav-kind]")) {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (this.scene.isMovementLocked()) return;
          const kind = btn.dataset.navKind as BuildingKind | undefined;
          if (!kind) return;
          const res = this.scene.navigateToBuildingKind(kind);
          this.setFullmapOpen(false);
          this.showDiscoveryToast(
            res.ok ? "🧭 Đang dẫn đường" : "Không tìm thấy địa điểm",
            res.ok ? `Tự động di chuyển tới ${res.name}.` : res.name,
          );
        });
      }
    }

    this.interactBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.interactBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.scene.triggerInteraction();
      this.updateInteractPrompt();
      this.refreshBagBadge();
    });

    this.bagBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.bagBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.isOnboardingOpen || this.isPoliceModalOpen || this.vaultPuzzle.isOpen()) return;
      if (this.isBagOpen) {
        this.setBagOpen(false);
      } else {
        this.activeContainer = null;
        this.setBagOpen(true);
      }
    });

    this.bagCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.setBagOpen(false);
    });

    this.bagModalEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.target === this.bagModalEl) {
        this.setBagOpen(false);
      }
    });

    this.shopCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.setShopOpen(false);
    });

    this.tabShopSellBtn.addEventListener("click", () => this.setShopMobileTab("sell"));
    this.tabShopUpgradeBtn.addEventListener("click", () => this.setShopMobileTab("upgrade"));

    this.shopModalEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.target === this.shopModalEl) {
        this.setShopOpen(false);
      }
    });

    this.shopSellZoneBagBtn.addEventListener("click", () => {
      this.shopSellZone = "backpack";
      this.selectedShopUid = null;
      this.renderShopModal();
    });

    this.shopSellZoneSafeboxBtn.addEventListener("click", () => {
      this.shopSellZone = "safebox";
      this.selectedShopUid = null;
      this.renderShopModal();
    });

    this.shopOpenSafeboxBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openSafeboxModal("safebox");
    });

    this.openSafeboxUpgradeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openSafeboxModal("safebox");
    });

    this.openHomeUpgradeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openSafeboxModal("home");
    });

    const switchUpgradeTab = (mode: "daily" | UpgradeKind) => {
      this.upgradeModalMode = mode;
      this.renderSafeboxModal();
    };
    this.upTabDailyBtn.addEventListener("click", () => switchUpgradeTab("daily"));
    this.upTabSafeboxBtn.addEventListener("click", () => switchUpgradeTab("safebox"));
    this.upTabHomeBtn.addEventListener("click", () => switchUpgradeTab("home"));
    this.upTabGymBtn.addEventListener("click", () => switchUpgradeTab("gym"));
    this.upTabTreadmillBtn.addEventListener("click", () => switchUpgradeTab("treadmill"));

    this.safeboxCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeAllModals();
    });

    this.safeboxModalEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.target === this.safeboxModalEl) this.closeAllModals();
    });

    this.questBoardCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeAllModals();
    });
    this.questBoardModalEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.target === this.questBoardModalEl) this.closeAllModals();
    });
    this.questBoardRerollBtn.addEventListener("click", () => {
      const res = this.scene.rerollDailyQuestBoard();
      this.showDiscoveryToast(res.ok ? "🔄 Làm mới nhiệm vụ" : "Không đủ Vàng", res.message);
      this.renderQuestBoardModal();
    });

    this.safeboxDeliverAllBtn.addEventListener("click", () => {
      if (this.upgradeModalMode === "daily") {
        const res = this.scene.rerollDailyQuestBoard();
        this.showDiscoveryToast(res.ok ? "🔄 Làm mới nhiệm vụ" : "Không đủ Vàng", res.message);
        this.renderSafeboxModal();
        return;
      }
      const atHome = this.safeboxOpenedFromHome || this.scene.isAtHome();
      const labelMap: Record<UpgradeKind, string> = {
        safebox: "Safebox",
        home: "Kho Nhà",
        gym: "Phòng Gym",
        treadmill: "Máy Chạy Bộ",
      };
      const label = labelMap[this.upgradeModalMode];
      const res = this.scene.deliverAllUpgradeItems(this.upgradeModalMode, atHome);
      this.showDiscoveryToast(
        res.upgraded ? `🎉 Nâng cấp ${label}!` : res.deliveredTotal > 0 ? "📦 Đã giao vật phẩm" : "Không thể giao",
        res.message,
      );
      this.refreshBagBadge();
      this.updateSurvivalHud();
      this.renderSafeboxModal();
    });

    this.shopSellNonFoodBtn.addEventListener("click", () => {
      const { soldCount, earnedGold } = this.scene.inventory.sellAllInZone(this.shopSellZone, true);
      const zoneLabel = this.shopSellZone === "safebox" ? "Safebox" : "Balo";
      this.showDiscoveryToast(
        soldCount > 0 ? "🧺 Đã bán vật phẩm (trừ đồ ăn)" : "Không có vật phẩm cần bán",
        soldCount > 0
          ? `Nhận +${earnedGold.toLocaleString("vi-VN")} Vàng (giữ lại đồ ăn & thuốc).`
          : `${zoneLabel} chỉ còn đồ ăn hoặc đang trống.`,
      );
      this.selectedShopUid = null;
      this.refreshBagBadge();
      this.renderShopModal();
    });

    this.shopSellAllBtn.addEventListener("click", () => {
      const { soldCount, earnedGold } = this.scene.inventory.sellAllInZone(this.shopSellZone, false);
      const zoneLabel = this.shopSellZone === "safebox" ? "Safebox" : "Balo";
      this.showDiscoveryToast(
        soldCount > 0 ? `💵 Đã bán toàn bộ ${zoneLabel}` : `${zoneLabel} trống`,
        soldCount > 0 ? `Thu về +${earnedGold.toLocaleString("vi-VN")} Vàng!` : "Chưa có vật phẩm để bán.",
      );
      this.selectedShopUid = null;
      this.refreshBagBadge();
      this.renderShopModal();
    });

    const setMenuOpen = (open: boolean): void => {
      this.hudMenuPopoverEl.classList.toggle("is-open", open);
      this.hudMenuBtn.setAttribute("aria-expanded", String(open));
    };

    this.hudMenuBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.hudMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.isOnboardingOpen || this.isPoliceModalOpen || this.vaultPuzzle.isOpen() || this.scene.isDetained()) return;
      this.syncSoundButtonLabel();
      const repSummary = this.scene.getReputationSummary();
      this.reputationBtn.textContent =
        repSummary.claimableCount > 0 ? `🏆 Danh vọng (${repSummary.claimableCount})` : "🏆 Danh vọng";
      setMenuOpen(!this.hudMenuPopoverEl.classList.contains("is-open"));
    });

    window.addEventListener("pointerdown", (e) => {
      if (
        this.hudMenuPopoverEl.classList.contains("is-open") &&
        !(e.target as HTMLElement | null)?.closest("#hud-menu-wrap")
      ) {
        setMenuOpen(false);
      }
    });

    this.missionsBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.missionsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setMenuOpen(false);
      if (this.isOnboardingOpen || this.isPoliceModalOpen || this.vaultPuzzle.isOpen() || this.scene.isDetained()) return;
      if (this.isSafeboxModalOpen) {
        this.closeAllModals();
      } else {
        this.openSafeboxModal(this.upgradeModalMode);
      }
    });

    this.reputationBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.reputationBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setMenuOpen(false);
      if (this.isOnboardingOpen || this.isPoliceModalOpen || this.vaultPuzzle.isOpen() || this.scene.isDetained()) return;
      if (this.isReputationOpen) {
        this.closeAllModals();
      } else {
        this.openReputationModal();
      }
    });

    this.reputationCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeAllModals();
    });
    this.reputationModalEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.target === this.reputationModalEl) this.closeAllModals();
    });
    this.reputationTabsEl.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>("[data-rep-cat]");
      if (!btn) return;
      const cat = btn.dataset.repCat as ReputationCategory | undefined;
      if (!cat) return;
      this.reputationCategory = cat;
      this.renderReputationModal();
    });
    this.reputationClaimAllBtn.addEventListener("click", () => {
      const res = this.scene.claimAllReputationMilestones();
      this.showDiscoveryToast(
        res.ok ? "🏆 Nhận thưởng Danh vọng" : "Chưa có mốc sẵn sàng",
        res.message,
      );
      this.refreshBagBadge();
      this.renderReputationModal();
    });

    this.petsBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.petsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setMenuOpen(false);
      if (this.isOnboardingOpen || this.isPoliceModalOpen || this.vaultPuzzle.isOpen() || this.scene.isDetained()) return;
      if (this.isPetModalOpen) {
        this.closeAllModals();
      } else {
        this.openPetGachaModal("roster");
      }
    });
    this.petCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeAllModals();
    });
    this.petModalEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.target === this.petModalEl) this.closeAllModals();
    });
    this.petTabsEl.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>("[data-pet-tab]");
      if (!btn) return;
      const tab = btn.dataset.petTab as "gacha" | "roster" | undefined;
      if (!tab) return;
      this.petModalTab = tab;
      this.renderPetGachaModal();
    });
    const runGacha = (times: 1 | 5) => {
      const res = this.scene.rollPetGacha(times);
      if (res.ok) {
        this.lastGachaOutcomes = res.results;
        const firstPet = res.results.find((r) => r.kind === "pet");
        if (firstPet && firstPet.kind === "pet") {
          this.previewPetId = firstPet.pet.id;
          this.previewPetAnim = firstPet.pet.playIconSrc ? "play" : "idle";
        }
        this.petModalTab = "gacha";
      }
      this.showDiscoveryToast(res.ok ? "🐾 Kết Quả Gacha" : "Không thể quay", res.message);
      this.refreshBagBadge();
      this.renderPetGachaModal();
    };
    this.petRoll1Btn.addEventListener("click", () => runGacha(1));
    this.petRoll5Btn.addEventListener("click", () => runGacha(5));

    this.guideBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.guideBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setMenuOpen(false);
      if (this.isOnboardingOpen || this.isPoliceModalOpen || this.vaultPuzzle.isOpen() || this.scene.isDetained()) return;
      if (this.isGuideModalOpen) {
        this.closeAllModals();
      } else {
        this.openGuideModal(0);
      }
    });

    this.soundToggleBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.soundToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const next = !this.scene.isSoundEnabled();
      this.scene.setSoundEnabled(next);
      this.syncSoundButtonLabel();
      this.showDiscoveryToast(
        next ? "🔊 Đã bật âm thanh" : "🔇 Đã tắt âm thanh",
        next ? "Hiệu ứng âm thanh trong game đã được bật." : "Toàn bộ âm thanh trong game đã được tắt.",
      );
    });

    this.guideCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeAllModals();
    });
    this.guideModalEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.target === this.guideModalEl) this.closeAllModals();
    });
    this.guidePrevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.guideSlideIdx > 0) {
        this.guideSlideIdx -= 1;
        this.renderGuideSlide();
      }
    });
    this.guideNextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.guideSlideIdx < GUIDE_SLIDES.length - 1) {
        this.guideSlideIdx += 1;
        this.renderGuideSlide();
      } else {
        this.closeAllModals();
      }
    });

    this.wardrobeBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.wardrobeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.isOnboardingOpen) return;
      if (this.isWardrobeOpen) {
        this.closeAllModals();
      } else {
        this.openWardrobeModal();
      }
    });

    this.wardrobeCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeAllModals();
    });
    this.wardrobeModalEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.target === this.wardrobeModalEl) this.closeAllModals();
    });
    this.wardrobeSavePresetBtn.addEventListener("click", () => {
      const res = this.scene.saveCurrentOutfitPreset();
      this.showDiscoveryToast(res.ok ? "💾 Lưu bộ trang phục" : "Không thể lưu", res.message);
    });

    this.clothShopCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeAllModals();
    });
    this.clothShopModalEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.target === this.clothShopModalEl) this.closeAllModals();
    });
    this.clothShopSavePresetBtn.addEventListener("click", () => {
      const targetGear = this.clothShopPreviewGear ?? this.scene.getEquippedGear();
      const res = this.scene.saveCurrentOutfitPreset(targetGear);
      this.showDiscoveryToast(res.ok ? "💾 Lưu bộ trang phục" : "Không thể lưu", res.message);
      if (res.ok) this.renderClothingShopModal();
    });

    this.foodShopCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeAllModals();
    });
    this.foodShopModalEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.target === this.foodShopModalEl) this.closeAllModals();
    });

    this.hairShopCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeAllModals();
    });
    this.hairShopModalEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.target === this.hairShopModalEl) this.closeAllModals();
    });

    this.airportCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeAllModals();
    });
    this.airportModalEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.target === this.airportModalEl) this.closeAllModals();
    });
    this.airportTabFlightBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.setAirportTab("flight");
    });
    this.airportTabGenderBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.setAirportTab("gender");
    });
    this.airportFlyMapBtn.addEventListener("click", () => {
      const currentMap = this.scene.getActiveMapId();
      const targetMap: MapId = currentMap === "vietnam" ? "japan" : "vietnam";
      const isToJapan = targetMap === "japan";
      this.openPurchaseConfirm({
        subtitle: "✈️ Sân Bay Quốc Tế — Vé Máy Bay Quốc Tế",
        itemTitle: isToJapan
          ? "🛫 Bay sang Nhật Bản (Tokyo – Nông Thôn Samurai – Núi Tuyết)"
          : "🛫 Bay về Việt Nam (Hà Nội – Đồng Bằng – Hoàng Thành)",
        itemDesc:
          "Giữ nguyên balo, trang bị, ví vàng, đồ sưu tầm và đồng bộ thời gian thực tại điểm đến.",
        priceGold: AIRPORT_JAPAN_FLIGHT_COST,
        onConfirm: () => {
          const destLabel = isToJapan ? "Nhật Bản (Tokyo Narita)" : "Việt Nam (Nội Bài)";
          showMapTransitionOverlay({
            badge: isToJapan ? "🛫🇯🇵" : "🛫🇻🇳",
            title: `Chuyến bay đến ${destLabel}`,
            subtitle: "Đang làm thủ tục & khởi tạo bản đồ mới...",
            tip: isToJapan
              ? "Mẹo: Mua trang phục giữ ấm tại Tokyo trước khi tiến lên vùng núi tuyết Hokkaido."
              : "Mẹo: Ghé Nhà Riêng để cất bảo vật Nhật Bản vào Phòng Sưu Tầm.",
            progressPct: 35,
          });
          this.closeAllModals();
          window.requestAnimationFrame(() => {
            setLoadingProgress(0.75, `Đang hạ cánh xuống ${destLabel}...`);
            const res = this.scene.flyToMap(targetMap);
            setLoadingProgress(1, res.ok ? "Đã hạ cánh an toàn!" : res.message);
            window.setTimeout(() => {
              hideMapTransitionOverlay();
              this.showDiscoveryToast(
                res.ok ? `✈️ Đã hạ cánh tại ${MAP_LABELS[res.activeMapId]}!` : "Không thể xuất cảnh",
                res.message,
              );
            }, 320);
          });
        },
      });
    });
    this.airportFlyBtn.addEventListener("click", () => {
      this.openPurchaseConfirm({
        subtitle: "✈️ Sân Bay Quốc Tế — Vé Bangkok",
        itemTitle:
          this.scene.getGender() === "male"
            ? "✈️ Bay Thái Lan & Chuyển sang Nhân Vật Nữ"
            : "✈️ Bay Thái Lan & Chuyển sang Nhân Vật Nam",
        itemDesc: "Bao gồm vé khứ hồi và thay đổi diện mạo nhân vật chính.",
        priceGold: AIRPORT_GENDER_CHANGE_COST,
        onConfirm: () => {
          const res = this.scene.flyToThailandChangeGender();
          this.showDiscoveryToast(
            res.ok ? "✈️ Hoàn tất chuyến bay Thái Lan!" : "Không thể xuất cảnh",
            res.message,
          );
          if (res.ok) {
            this.refreshBagBadge();
            this.updateSurvivalHud();
            this.renderAirportModal();
          }
        },
      });
    });

    const selectOnboardGender = (g: CharacterGender) => {
      this.onboardSelectedGender = g;
      this.onboardMaleBtn.classList.toggle("is-active", g === "male");
      this.onboardFemaleBtn.classList.toggle("is-active", g === "female");
    };
    this.onboardMaleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      selectOnboardGender("male");
    });
    this.onboardFemaleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      selectOnboardGender("female");
    });
    this.onboardStartBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.scene.completeOnboarding(this.onboardSelectedGender);
      this.isOnboardingOpen = false;
      this.onboardModalEl.classList.remove("is-open");
      this.refreshBagBadge();
      this.updateSurvivalHud();
      this.openGuideModal(0);
    });
    this.onboardModalEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
    });

    this.collectionCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeAllModals();
    });
    this.collectionModalEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.target === this.collectionModalEl) this.closeAllModals();
    });

    this.purchaseModalEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.target === this.purchaseModalEl) this.closePurchaseConfirm();
    });
    this.purchaseCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closePurchaseConfirm();
    });
    this.purchaseCancelBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closePurchaseConfirm();
    });
    this.purchaseConfirmBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const act = this.purchaseAction;
      this.closePurchaseConfirm();
      act?.onConfirm();
    });
    this.purchaseAltBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const act = this.purchaseAction;
      this.closePurchaseConfirm();
      act?.onAlt?.();
    });

    this.quickUseBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.quickUseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openQuickWheelModal();
    });
    this.quickWheelCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeAllModals();
    });
    this.quickWheelModalEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.target === this.quickWheelModalEl) this.closeAllModals();
    });

    // Global drag listeners for seamless desktop + mobile spatial grid drag & drop
    window.addEventListener("pointermove", this.onGlobalPointerMove);
    window.addEventListener("pointerup", this.onGlobalPointerUp);
    window.addEventListener("pointercancel", this.onGlobalPointerUp);
    window.addEventListener("resize", () => {
      if (this.isBagOpen) this.renderLootAndBagModal();
      if (this.isShopOpen) this.renderShopModal();
      if (this.isQuickWheelOpen) this.renderQuickWheel();
    });
  }

  private setShopMobileTab(tab: "sell" | "upgrade"): void {
    this.shopCardEl.dataset.shopTab = tab;
    const isSell = tab === "sell";
    this.tabShopSellBtn.classList.toggle("is-active", isSell);
    this.tabShopUpgradeBtn.classList.toggle("is-active", !isSell);
    this.tabShopSellBtn.setAttribute("aria-selected", String(isSell));
    this.tabShopUpgradeBtn.setAttribute("aria-selected", String(!isSell));
    if (isSell && this.isShopOpen) {
      this.renderShopModal();
    }
  }

  private setFullmapOpen(open: boolean): void {
    this.isFullmapOpen = open;
    if (open) {
      this.setBagOpen(false);
      this.setShopOpen(false);
      this.drawFullMap();
    }
    this.fullmapModalEl.classList.toggle("is-open", open);
  }

  private getFullmapViewBounds(): { viewX: number; viewY: number; viewW: number; viewH: number } {
    const greenBoundaryX = (GREEN_END_COL + 1) * TILE_SIZE;
    const yellowBoundaryX = (YELLOW_END_COL + 1) * TILE_SIZE;
    if (this.fullmapZoneFilter === "green") {
      return { viewX: 0, viewY: 0, viewW: greenBoundaryX, viewH: WORLD_HEIGHT };
    }
    if (this.fullmapZoneFilter === "yellow") {
      return {
        viewX: greenBoundaryX,
        viewY: 0,
        viewW: yellowBoundaryX - greenBoundaryX,
        viewH: WORLD_HEIGHT,
      };
    }
    if (this.fullmapZoneFilter === "red") {
      return {
        viewX: yellowBoundaryX,
        viewY: 0,
        viewW: WORLD_WIDTH - yellowBoundaryX,
        viewH: WORLD_HEIGHT,
      };
    }
    return { viewX: 0, viewY: 0, viewW: WORLD_WIDTH, viewH: WORLD_HEIGHT };
  }

  private drawFullMap(): void {
    const w = this.fullmapCanvas.width;
    const h = this.fullmapCanvas.height;
    const ctx = this.fullmapCtx;
    const snap = this.terrainSnapshot;
    const bounds = this.getFullmapViewBounds();

    const sx = (bounds.viewX / WORLD_WIDTH) * snap.width;
    const sw = (bounds.viewW / WORLD_WIDTH) * snap.width;
    const toX = (wx: number): number => ((wx - bounds.viewX) / bounds.viewW) * w;
    const toY = (wy: number): number => ((wy - bounds.viewY) / bounds.viewH) * h;

    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(snap, sx, 0, sw, snap.height, 0, 0, w, h);

    const greenEndX = toX((GREEN_END_COL + 1) * TILE_SIZE);
    const yellowEndX = toX((YELLOW_END_COL + 1) * TILE_SIZE);

    if (this.fullmapZoneFilter === "all") {
      ctx.fillStyle = "rgba(16, 185, 129, 0.10)";
      ctx.fillRect(0, 0, greenEndX, h);
      ctx.fillStyle = "rgba(234, 179, 8, 0.08)";
      ctx.fillRect(greenEndX, 0, yellowEndX - greenEndX, h);
      ctx.fillStyle = "rgba(239, 68, 68, 0.13)";
      ctx.fillRect(yellowEndX, 0, w - yellowEndX, h);

      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.strokeStyle = "rgba(16, 185, 129, 0.78)";
      ctx.beginPath();
      ctx.moveTo(greenEndX, 0);
      ctx.lineTo(greenEndX, h);
      ctx.stroke();

      ctx.strokeStyle = "rgba(239, 68, 68, 0.78)";
      ctx.beginPath();
      ctx.moveTo(yellowEndX, 0);
      ctx.lineTo(yellowEndX, h);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle =
        this.fullmapZoneFilter === "green"
          ? "rgba(16, 185, 129, 0.08)"
          : this.fullmapZoneFilter === "yellow"
            ? "rgba(234, 179, 8, 0.07)"
            : "rgba(239, 68, 68, 0.11)";
      ctx.fillRect(0, 0, w, h);
    }

    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    const isJapanMap = this.scene.getActiveMapId() === "japan";
    const zoneHeaderByKey: Record<SecurityZone, [string, number, string]> = isJapanMap
      ? {
          green: ["🟢 ĐÔ THỊ TOKYO (AN TOÀN)", this.fullmapZoneFilter === "green" ? w * 0.5 : greenEndX * 0.5, "#6ee7b7"],
          yellow: ["🟡 NÔNG THÔN SAMURAI", this.fullmapZoneFilter === "yellow" ? w * 0.5 : (greenEndX + yellowEndX) * 0.5, "#fde047"],
          red: ["🔴 NÚI TUYẾT SHOGUN (KHẮC NGHIỆT)", this.fullmapZoneFilter === "red" ? w * 0.5 : (yellowEndX + w) * 0.5, "#fca5a5"],
        }
      : {
          green: ["🟢 VÙNG XANH (AN TOÀN)", this.fullmapZoneFilter === "green" ? w * 0.5 : greenEndX * 0.5, "#6ee7b7"],
          yellow: ["🟡 VÙNG VÀNG (CHIẾM ĐA SỐ)", this.fullmapZoneFilter === "yellow" ? w * 0.5 : (greenEndX + yellowEndX) * 0.5, "#fde047"],
          red: ["🔴 VÙNG ĐỎ (NHIỀU ĐỒ)", this.fullmapZoneFilter === "red" ? w * 0.5 : (yellowEndX + w) * 0.5, "#fca5a5"],
        };
    const zoneHeaders =
      this.fullmapZoneFilter === "all"
        ? [zoneHeaderByKey.green, zoneHeaderByKey.yellow, zoneHeaderByKey.red]
        : [zoneHeaderByKey[this.fullmapZoneFilter]];
    for (const [label, zx, colHex] of zoneHeaders) {
      ctx.fillStyle = "rgba(2, 6, 23, 0.78)";
      ctx.fillRect(zx - 114, 8, 228, 24);
      ctx.fillStyle = colHex;
      ctx.fillText(label, zx, 24);
    }

    // Patrolling police officers
    for (const p of this.scene.getPoliceMarkers()) {
      const px = toX(p.x);
      const py = toY(p.y);
      if (px < -10 || px > w + 10) continue;
      ctx.fillStyle = p.ignored ? "#6ee7b7" : p.state === "chase" ? "#ef4444" : "#3b82f6";
      ctx.beginPath();
      ctx.arc(px, py, p.state === "chase" ? 6 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Chests & Trash bins
    for (const ch of this.scene.data.chests) {
      if (this.scene.inventory.isContainerLootedEmpty(ch.id)) continue;
      const cx = toX(ch.x);
      const cy = toY(ch.y);
      if (cx < -10 || cx > w + 10) continue;
      ctx.fillStyle =
        ch.kind === "trash" ? "#cbd5e1" : ch.kind === "royal" ? "#ef4444" : "#38bdf8";
      ctx.beginPath();
      ctx.arc(cx, cy, ch.kind === "trash" ? 3.5 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Highlight Home Storage, Shops & City Hospital clearly
    const mapPoiStyles: Record<string, { color: string; label: string; textColor: string }> = {
      city_home_house: { color: "#10b981", label: isJapanMap ? "🏯 Nhà" : "🏠 Nhà", textColor: "#a7f3d0" },
      city_collection_hall: { color: "#e11d48", label: isJapanMap ? "🗼 Tháp Bảo Tàng" : "🏛️ Sưu Tầm", textColor: "#fecdd3" },
      city_backpack_shop: { color: "#facc15", label: isJapanMap ? "🎒 Akihabara" : "🏪 Shop Balo", textColor: "#fef08a" },
      city_clothing_shop: { color: "#c084fc", label: isJapanMap ? "👘 Kimono" : "👔 Shop Áo", textColor: "#e9d5ff" },
      city_hair_salon: { color: "#f472b6", label: isJapanMap ? "💇 Harajuku" : "💇 Tiệm Tóc", textColor: "#fbcfe8" },
      city_pharmacy: { color: "#14b8a6", label: isJapanMap ? "💊 Kanpo" : "💊 Nhà Thuốc", textColor: "#99f6e4" },
      city_butcher_shop: { color: "#fb923c", label: isJapanMap ? "🍜 Ramen" : "🍜 Quán Ăn", textColor: "#fed7aa" },
      plains_garden_inn: { color: "#fb923c", label: isJapanMap ? "🍣 Omakase" : "🍜 Nhà Hàng", textColor: "#fed7aa" },
      plains_pagoda: { color: "#f59e0b", label: "⛩️ Chùa Cổ", textColor: "#fde68a" },
      city_airport: { color: "#38bdf8", label: isJapanMap ? "✈️ Narita" : "✈️ Sân Bay", textColor: "#bae6fd" },
      city_quest_guild: { color: "#facc15", label: isJapanMap ? "📜 Ủy Thác" : "📜 Nhiệm Vụ", textColor: "#fef08a" },
      city_reputation_hall: { color: "#f43f5e", label: "🏛️ Danh Vọng", textColor: "#fecdd3" },
      city_pet_gacha: { color: "#f472b6", label: "🐾 Nhận Nuôi", textColor: "#fbcfe8" },
      city_police_station: { color: "#2563eb", label: isJapanMap ? "🚓 Koban" : "🚓 Phường", textColor: "#93c5fd" },
      city_hospital: { color: "#f43f5e", label: "🏥 Bệnh Viện", textColor: "#fecdd3" },
      jp_ryokan_inn: { color: "#f97316", label: "🏮 Lữ Quán", textColor: "#fed7aa" },
      jp_shinto_shrine: { color: "#f43f5e", label: "⛩️ Thần Xã", textColor: "#fecdd3" },
      jp_ninja_dojo: { color: "#a855f7", label: "🥷 Võ Đường", textColor: "#e9d5ff" },
      jp_shogun_castle: { color: "#ef4444", label: "🏯 Thành Shogun", textColor: "#fecaca" },
      jp_tokyo_tower: { color: "#fb7185", label: "🗼 Tháp Tokyo", textColor: "#fecdd3" },
      jp_shinkansen_station: { color: "#0ea5e9", label: "🚄 Shinkansen", textColor: "#bae6fd" },
      jp_akihabara_arcade: { color: "#ec4899", label: "🏙️ Akihabara", textColor: "#fbcfe8" },
      jp_samurai_manor: { color: "#f59e0b", label: "⚔️ Samurai", textColor: "#fde68a" },
      jp_snow_onsen_temple: { color: "#7dd3fc", label: "♨️ Đền Tuyết", textColor: "#e0f2fe" },
    };

    for (const prop of this.scene.data.props) {
      const poi = mapPoiStyles[prop.kind];
      if (!poi) continue;
      const sxp = toX(prop.x);
      const syp = toY(prop.y);
      if (sxp < -30 || sxp > w + 30) continue;
      ctx.fillStyle = poi.color;
      ctx.beginPath();
      ctx.arc(sxp, syp, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillStyle = poi.textColor;
      ctx.fillText(poi.label, sxp, syp - 10);
    }

    // Landmarks
    ctx.font = "11px system-ui, sans-serif";
    for (const lm of this.scene.data.landmarks) {
      const lx = toX(lm.x);
      const ly = toY(lm.y);
      if (lx < -10 || lx > w + 10) continue;
      ctx.fillStyle = lm.discovered ? "#34d399" : "#f59e0b";
      ctx.beginPath();
      ctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Active destination
    const dest = this.scene.getDestination();
    if (dest) {
      const dx = toX(dest.x);
      const dy = toY(dest.y);
      if (dx >= -12 && dx <= w + 12) {
        ctx.strokeStyle = "#6ee7b7";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(dx, dy, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Player marker
    const px = toX(this.scene.player.x);
    const py = toY(this.scene.player.y);
    if (px >= -12 && px <= w + 12) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(px, py, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    const tx = Math.floor(this.scene.player.x / TILE_SIZE);
    const ty = Math.floor(this.scene.player.y / TILE_SIZE);
    const biome = this.scene.getCurrentBiome();
    const secZone = this.scene.getCurrentSecurityZone();
    const secMeta = SECURITY_ZONE_META[secZone];
    const env = this.scene.weatherService.getEnvironmentState();
    const clockCity = this.scene.getActiveMapId() === "japan" ? "Tokyo" : "Hà Nội";
    this.fullmapMetaEl.replaceChildren();
    for (const txt of [
      `${secMeta.emoji} ${secMeta.label} • ${BIOME_LABELS[biome]} (X:${tx} Y:${ty})`,
      `🕒 ${clockCity} ${env.hanoiTimeText} • ${env.temperatureC}°C • ${env.conditionLabel}`,
    ]) {
      const pill = document.createElement("span");
      pill.className = "bag-stat-pill";
      pill.textContent = txt;
      this.fullmapMetaEl.appendChild(pill);
    }
  }

  private setBagOpen(open: boolean): void {
    this.isBagOpen = open;
    if (open) {
      this.closeAllModals("bag");
      this.selectedItem = null;
      this.renderLootAndBagModal();
      this.scene.setLootingOpen(!this.isHomeStorageOpen && Boolean(this.activeContainer));
    } else {
      this.cancelDrag();
      this.resetContainerScan();
      this.activeContainer = null;
      this.isHomeStorageOpen = false;
      this.scene.setLootingOpen(false);
    }
    this.bagModalEl.classList.toggle("is-open", open);
    this.refreshBagBadge();
  }

  private setShopOpen(open: boolean): void {
    this.isShopOpen = open;
    if (open) {
      this.isBagOpen = false;
      this.bagModalEl.classList.remove("is-open");
      if (this.isFullmapOpen) {
        this.isFullmapOpen = false;
        this.fullmapModalEl.classList.remove("is-open");
      }
      this.setShopMobileTab("sell");
      this.renderShopModal();
    }
    this.shopModalEl.classList.toggle("is-open", open);
    this.refreshBagBadge();
  }

  private refreshBagBadge(): void {
    const bp = this.scene.inventory.getBackpackTier();
    const sum = this.scene.inventory.getSummary();
    this.bagBtn.textContent = bp
      ? `🎒 Balo (${sum.usedCells}/${sum.totalCells})`
      : `🔐 Safebox (${this.scene.inventory.getSafeboxItems().length} món)`;
  }

  private updateContainerSubtitle(): void {
    if (this.isHomeStorageOpen) {
      const homeTier = this.scene.inventory.getHomeTier();
      this.containerSubEl.textContent = `${homeTier.cols}×${homeTier.rows} ô (Lưu vĩnh viễn)`;
      return;
    }
    if (!this.activeContainer) return;
    const unrevealedCount = this.activeContainer.items.filter((item) => item.revealed === false).length;
    if (this.activeScanUid && unrevealedCount > 0) {
      this.containerSubEl.textContent = `🔍 Đang quét từ phải qua trái...`;
      return;
    }
    this.containerSubEl.textContent = `${this.activeContainer.cols}×${this.activeContainer.rows} ô`;
  }

  private renderLootAndBagModal(): void {
    const bp = this.scene.inventory.getBackpackTier();
    const sb = this.scene.inventory.getSafeboxTier();
    const sbItems = this.scene.inventory.getSafeboxItems();
    const sum = this.scene.inventory.getSummary();
    const { totalWeightKg } = this.scene.getSurvivalSnapshot();

    const hasExternalGrid = this.isHomeStorageOpen || this.activeContainer !== null;
    this.bagGridsWrapEl.classList.toggle("is-single", !hasExternalGrid);

    this.bagTitleEl.textContent = this.isHomeStorageOpen
      ? "🏠 Nhà Riêng (Kho Lưu Trữ Vĩnh Viễn)"
      : this.activeContainer
        ? `🔍 Tìm Kiếm: ${this.activeContainer.title}`
        : bp
          ? `🎒 Balo Nhân Vật (${bp.name})`
          : "🔐 Safebox & Balo (Chưa đeo Balo)";

    let sbUsedCells = 0;
    for (const it of sbItems) {
      const def = ITEM_BY_ID[it.itemId];
      if (def) sbUsedCells += def.w * def.h;
    }

    this.bagStatsEl.replaceChildren();
    const statPills = [
      `🪙 Ví: ${sum.walletGold.toLocaleString("vi-VN")} Vàng`,
      bp ? `📦 Balo: ${sum.usedCells}/${sum.totalCells} ô` : "📦 Balo: Chưa đeo",
      `🔐 Safebox: ${sbUsedCells}/${sb.cols * sb.rows} ô`,
      `💎 Giá trị balo: ${sum.bagValue.toLocaleString("vi-VN")} Vàng`,
      `⚖️ Mang theo: ${totalWeightKg.toFixed(1)} kg`,
    ];
    for (const txt of statPills) {
      const s = document.createElement("span");
      s.className = "bag-stat-pill";
      s.textContent = txt;
      this.bagStatsEl.appendChild(s);
    }

    this.activeScanFillEl = null;

    if (this.isHomeStorageOpen) {
      const homeTier = this.scene.inventory.getHomeTier();
      this.containerPanelEl.classList.remove("is-hidden");
      this.openHomeUpgradeBtn.classList.remove("is-hidden");
      this.containerTitleEl.textContent = `🏠 ${homeTier.name}`;
      this.updateContainerSubtitle();
      this.renderDeltaGrid(
        this.containerGridEl,
        homeTier.cols,
        homeTier.rows,
        this.scene.inventory.getHomeItems(),
        "home",
        true,
      );
    } else if (this.activeContainer) {
      this.containerPanelEl.classList.remove("is-hidden");
      this.openHomeUpgradeBtn.classList.add("is-hidden");
      this.containerTitleEl.textContent = `📦 ${this.activeContainer.title}`;
      this.updateContainerSubtitle();
      this.renderDeltaGrid(
        this.containerGridEl,
        this.activeContainer.cols,
        this.activeContainer.rows,
        this.activeContainer.items,
        "container",
        true,
      );
      this.justRevealedUid = null;
    } else {
      this.openHomeUpgradeBtn.classList.add("is-hidden");
      this.containerPanelEl.classList.add("is-hidden");
    }

    if (bp) {
      this.noBackpackBannerEl.classList.add("is-hidden");
      this.backpackGridEl.classList.remove("is-hidden");
      this.backpackTitleEl.textContent = `🎒 ${bp.name}`;
      this.backpackSubEl.textContent = `${bp.cols}×${bp.rows} ô`;
      this.renderDeltaGrid(
        this.backpackGridEl,
        bp.cols,
        bp.rows,
        this.scene.inventory.getBackpackItems(),
        "backpack",
        true,
      );
    } else {
      this.noBackpackBannerEl.classList.remove("is-hidden");
      this.backpackGridEl.replaceChildren();
      this.backpackGridEl.classList.add("is-hidden");
      this.backpackTitleEl.textContent = "🎒 Chưa đeo Balo";
      this.backpackSubEl.textContent = "0×0 ô";
    }

    this.safeboxTitleEl.textContent = `🔐 Safebox ${sb.cols}×${sb.rows}`;
    this.safeboxSubEl.textContent = `${sbUsedCells}/${sb.cols * sb.rows} ô`;
    this.openSafeboxUpgradeBtn.textContent =
      this.isHomeStorageOpen || this.scene.isAtHome() ? "⬆️ Nâng cấp Safebox" : "📋 NV Safebox";
    this.renderDeltaGrid(this.safeboxGridEl, sb.cols, sb.rows, sbItems, "safebox", true);

    this.renderInspector();
  }

  private computeDeltaCellPx(
    cols: number,
    rows: number,
    isShopSell: boolean,
    zone?: GridZone,
  ): number {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const twoPanels = !isShopSell && (this.isHomeStorageOpen || this.activeContainer !== null);
    const isLandscapeShort = vh <= 540;
    const isPortraitNarrow = vw <= 720 && !isLandscapeShort;

    const gap = 2;
    const pad = 8;

    const bp = this.scene.inventory.getBackpackTier();
    const sb = this.scene.inventory.getSafeboxTier();
    const isPersonal = !isShopSell && (zone === "backpack" || zone === "safebox");

    let maxW: number;
    let maxH: number;
    let minCell = 20;
    if (isLandscapeShort) {
      minCell = 16;
      if (isShopSell) {
        // Landscape Shop puts grid next to sell controls inside the right column
        maxW = vw >= 680 ? vw * 0.34 : vw - 60;
        maxH = Math.max(115, vh - 120);
      } else if (isPersonal && bp) {
        const personalTotalCols = bp.cols + sb.cols;
        const containerCols = twoPanels
          ? this.isHomeStorageOpen
            ? this.scene.inventory.getHomeTier().cols
            : (this.activeContainer?.cols ?? 6)
          : 0;
        const personalShare = twoPanels ? (vw - 110) * (personalTotalCols / (personalTotalCols + containerCols)) : vw - 76;
        const byPersonalW = Math.floor((personalShare - 20 - (personalTotalCols - 2) * gap) / personalTotalCols);
        const byPersonalH = Math.floor((Math.max(115, vh - 125) - pad - (Math.max(bp.rows, sb.rows) - 1) * gap) / Math.max(bp.rows, sb.rows));
        return Math.max(minCell, Math.min(34, byPersonalW, byPersonalH));
      } else {
        maxW = twoPanels ? (vw - 84) * 0.42 : vw - 60;
        maxH = Math.max(115, vh - 125);
      }
    } else if (isPortraitNarrow) {
      if (isPersonal && bp) {
        // Fit [Backpack | Safebox] cleanly side-by-side within mobile portrait width!
        const personalTotalCols = bp.cols + sb.cols;
        const availPersonalW = vw - 70;
        const byPersonalW = Math.floor((availPersonalW - (personalTotalCols - 2) * gap) / personalTotalCols);
        const maxRows = Math.max(bp.rows, sb.rows);
        const availH = twoPanels ? Math.max(145, (vh - 200) * 0.48) : vh - 210;
        const byPersonalH = Math.floor((availH - pad - (maxRows - 1) * gap) / maxRows);
        return Math.max(18, Math.min(36, byPersonalW, byPersonalH));
      }
      if (isPersonal && !bp) {
        maxW = vw - 220;
        maxH = twoPanels ? Math.max(130, (vh - 190) * 0.46) : vh - 200;
      } else {
        maxW = vw - 44;
        maxH = isShopSell ? Math.max(150, vh - 290) : twoPanels ? Math.max(130, (vh - 195) * 0.42) : vh - 200;
      }
    } else {
      const sideBySide = twoPanels || isShopSell;
      if (isPersonal && bp) {
        const personalTotalCols = bp.cols + sb.cols;
        const availPersonalW = twoPanels ? Math.min(540, (vw - 110) * 0.56) : Math.min(560, vw - 80);
        const byPersonalW = Math.floor((availPersonalW - 24 - (personalTotalCols - 2) * gap) / personalTotalCols);
        const maxRows = Math.max(bp.rows, sb.rows);
        const byPersonalH = Math.floor((Math.min(340, vh - 210) - pad - (maxRows - 1) * gap) / maxRows);
        return Math.max(minCell, Math.min(38, byPersonalW, byPersonalH));
      }
      maxW = sideBySide ? Math.min(380, (vw - 120) * 0.44) : 420;
      maxH = Math.min(340, vh - 200);
    }

    const hRows = zone === "home" ? Math.min(rows, 9) : rows;
    const byW = Math.floor((maxW - pad - (cols - 1) * gap) / cols);
    const byH = Math.floor((maxH - pad - (hRows - 1) * gap) / hRows);
    return Math.max(minCell, Math.min(40, byW, byH));
  }

  private renderDeltaGrid(
    gridEl: HTMLElement,
    cols: number,
    rows: number,
    items: readonly GridItemInstance[],
    zone: GridZone,
    enableDrag: boolean,
  ): void {
    gridEl.replaceChildren();
    const cellPx = this.computeDeltaCellPx(cols, rows, !enableDrag, zone);
    gridEl.style.setProperty("--cell", `${cellPx}px`);
    gridEl.dataset.cellPx = String(cellPx);
    gridEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell))`;
    gridEl.style.gridTemplateRows = `repeat(${rows}, var(--cell))`;

    const cells: HTMLElement[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = document.createElement("div");
        cell.className = "delta-cell";
        cell.dataset.gx = String(x);
        cell.dataset.gy = String(y);
        gridEl.appendChild(cell);
        cells.push(cell);
      }
    }

    const gap = 2;
    const pad = 4;

    for (const item of items) {
      const def = ITEM_BY_ID[item.itemId];
      if (!def) continue;
      const { w, h } = getEffectiveSize(def, item.rotated);
      const isMasked = zone === "container" && item.revealed === false;
      const isScanning = isMasked && this.activeScanUid === item.uid;
      const isSelected =
        !isMasked &&
        (zone === "backpack" && !this.isBagOpen && this.isShopOpen
          ? this.selectedShopUid === item.uid
          : this.selectedItem?.uid === item.uid && this.selectedItem?.zone === zone);

      const el = document.createElement("div");
      if (isMasked) {
        el.className = `delta-item is-masked${isScanning ? " is-scanning" : ""}`;
      } else {
        const justRevealedClass = this.justRevealedUid === item.uid ? " is-just-revealed" : "";
        el.className = `delta-item tier-${def.rarity}${item.rotated ? " is-rotated" : ""}${isSelected ? " is-selected" : ""}${justRevealedClass}`;
      }
      el.dataset.uid = item.uid;
      el.style.left = `${pad + item.x * (cellPx + gap)}px`;
      el.style.top = `${pad + item.y * (cellPx + gap)}px`;
      el.style.width = `${w * cellPx + (w - 1) * gap}px`;
      el.style.height = `${h * cellPx + (h - 1) * gap}px`;

      if (isMasked) {
        if (isScanning) {
          const ring = document.createElement("span");
          ring.className = "delta-scan-ring";
          const bar = document.createElement("div");
          bar.className = "delta-scan-bar";
          const fill = document.createElement("div");
          fill.className = "delta-scan-fill";
          const pct = Math.min(100, Math.max(0, (this.scanElapsedMs / Math.max(1, this.scanDurationMs)) * 100));
          fill.style.width = `${pct.toFixed(1)}%`;
          bar.appendChild(fill);
          el.append(ring, bar);
          this.activeScanFillEl = fill;
        } else {
          const q = document.createElement("span");
          q.className = "delta-scan-q";
          q.textContent = "?";
          el.appendChild(q);
        }
        gridEl.appendChild(el);
        continue;
      }

      // Only show Rarity Color Dot + Pixel Sprite (no clutter size text or rarity labels)
      const dot = document.createElement("span");
      dot.className = `delta-item-dot r-dot-${def.rarity}`;

      const img = document.createElement("img");
      this.applyGridItemIcon(img, def, cellPx, gap);

      el.append(img, dot);
      if (def.consumableId) {
        const usesBadge = document.createElement("span");
        usesBadge.className = "delta-item-uses";
        usesBadge.textContent = `${getItemRemainingUses(item, def)}/${getItemMaxUses(def)}`;
        el.appendChild(usesBadge);
      }

      if (enableDrag) {
        el.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const rect = el.getBoundingClientRect();
          this.selectedItem = { uid: item.uid, zone };
          this.renderInspector();
          this.highlightSelectedElement(gridEl, item.uid);

          this.drag = {
            item,
            fromZone: zone,
            rotated: item.rotated,
            startX: e.clientX,
            startY: e.clientY,
            isDragging: false,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            ghostEl: null,
            hoverZone: null,
            hoverCol: 0,
            hoverRow: 0,
            hoverValid: false,
          };
        });
      } else {
        // Shop sell grid click-to-inspect
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          this.selectedShopUid = item.uid;
          this.renderShopModal();
        });
      }

      gridEl.appendChild(el);
    }
    void cells;
  }

  private highlightSelectedElement(activeGridEl: HTMLElement, uid: string): void {
    for (const el of this.bagModalEl.querySelectorAll(".delta-item.is-selected")) {
      el.classList.remove("is-selected");
    }
    const target = activeGridEl.querySelector(`.delta-item[data-uid="${uid}"]`);
    target?.classList.add("is-selected");
  }

  private readonly onGlobalPointerMove = (e: PointerEvent): void => {
    if (!this.drag) return;

    if (!this.drag.isDragging) {
      if (Math.hypot(e.clientX - this.drag.startX, e.clientY - this.drag.startY) < 6) {
        return;
      }
      this.startDragGhost(e);
    }

    if (!this.drag.ghostEl) return;
    this.drag.ghostEl.style.left = `${e.clientX - this.drag.offsetX}px`;
    this.drag.ghostEl.style.top = `${e.clientY - this.drag.offsetY}px`;
    this.updateDragHoverPreview(e.clientX, e.clientY);
  };

  private readonly onGlobalPointerUp = (): void => {
    if (!this.drag) return;

    const d = this.drag;
    if (d.isDragging) {
      if (d.hoverZone && d.hoverValid) {
        const containerId = this.activeContainer ? this.activeContainer.containerId : null;
        this.scene.inventory.placeMovedItem(
          d.fromZone,
          d.hoverZone,
          containerId,
          d.item.uid,
          d.hoverCol,
          d.hoverRow,
          d.rotated,
        );
        this.selectedItem = { uid: d.item.uid, zone: d.hoverZone };
      } else {
        // Dropped outside valid slots or outside both grids -> keep original position (no discard!)
        this.showDiscoveryToast(
          "Không thể vứt đồ ra ngoài",
          "Hãy kéo vật phẩm thả vào ô Balo hoặc bỏ lại vào Nơi tìm kiếm / Thùng rác.",
        );
      }
      this.cancelDrag();
      this.renderLootAndBagModal();
      this.refreshBagBadge();
    } else {
      this.drag = null;
    }
  };

  private startDragGhost(e: PointerEvent): void {
    if (!this.drag) return;
    const def = ITEM_BY_ID[this.drag.item.itemId];
    if (!def) return;
    this.drag.isDragging = true;

    const sourceGrid =
      this.drag.fromZone === "backpack"
        ? this.backpackGridEl
        : this.drag.fromZone === "safebox"
          ? this.safeboxGridEl
          : this.containerGridEl;
    const cellPx = Number(sourceGrid.dataset.cellPx || 34);
    const gap = 2;
    const { w, h } = getEffectiveSize(def, this.drag.rotated);

    const ghost = document.createElement("div");
    ghost.className = `delta-item delta-drag-ghost tier-${def.rarity}${this.drag.rotated ? " is-rotated" : ""}`;
    ghost.style.width = `${w * cellPx + (w - 1) * gap}px`;
    ghost.style.height = `${h * cellPx + (h - 1) * gap}px`;
    ghost.style.left = `${e.clientX - this.drag.offsetX}px`;
    ghost.style.top = `${e.clientY - this.drag.offsetY}px`;

    const img = document.createElement("img");
    this.applyGridItemIcon(img, def, cellPx, gap);
    const dot = document.createElement("span");
    dot.className = `delta-item-dot r-dot-${def.rarity}`;
    ghost.append(img, dot);
    document.body.appendChild(ghost);
    this.drag.ghostEl = ghost;
  }

  /**
   * Scales grid item icons proportionally to their full unrotated w*h cell span
   * (e.g. 2x2, 3x3, 3x4, 4x4) and trims transparent PNG margins so large items fill ~90% of their cells.
   */
  private applyGridItemIcon(
    img: HTMLImageElement,
    def: CollectibleItemDef,
    cellPx: number,
    gap: number,
  ): void {
    img.alt = "";
    const unrotW = def.w * cellPx + (def.w - 1) * gap;
    const unrotH = def.h * cellPx + (def.h - 1) * gap;
    const fillRatio = def.w > 1 || def.h > 1 ? 0.9 : 0.78;
    img.style.width = `${Math.max(18, Math.round(unrotW * fillRatio))}px`;
    img.style.height = `${Math.max(18, Math.round(unrotH * fillRatio))}px`;
    img.style.maxWidth = "none";
    img.style.maxHeight = "none";
    img.style.flexShrink = "0";
    this.applyTrimmedItemSrc(img, def.iconSrc);
  }

  private applyTrimmedItemSrc(img: HTMLImageElement, rawIconSrc: string): void {
    const iconSrc = withAssetHash(rawIconSrc);
    const cached = this.trimmedIconCache.get(iconSrc);
    if (cached) {
      img.src = cached;
      return;
    }

    img.src = iconSrc;
    if (iconSrc.startsWith("data:")) {
      return;
    }

    const waiters = this.trimmedIconWaiters.get(iconSrc);
    if (waiters) {
      waiters.push(img);
      return;
    }

    this.trimmedIconWaiters.set(iconSrc, [img]);
    const srcImg = new Image();
    srcImg.onload = () => {
      const pendingTargets = this.trimmedIconWaiters.get(iconSrc) ?? [];
      this.trimmedIconWaiters.delete(iconSrc);
      try {
        const w = srcImg.naturalWidth;
        const h = srcImg.naturalHeight;
        if (w <= 0 || h <= 0) return;
        const scan = document.createElement("canvas");
        scan.width = w;
        scan.height = h;
        const sCtx = scan.getContext("2d");
        if (!sCtx) {
          scan.width = 0;
          scan.height = 0;
          return;
        }
        sCtx.drawImage(srcImg, 0, 0);
        const data = sCtx.getImageData(0, 0, w, h).data;
        let minX = w;
        let maxX = -1;
        let minY = h;
        let maxY = -1;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 8) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX < minX || maxY < minY) {
          scan.width = 0;
          scan.height = 0;
          return;
        }
        const cw = maxX - minX + 1;
        const ch = maxY - minY + 1;
        const crop = document.createElement("canvas");
        crop.width = cw;
        crop.height = ch;
        const cCtx = crop.getContext("2d");
        if (!cCtx) {
          scan.width = 0;
          scan.height = 0;
          crop.width = 0;
          crop.height = 0;
          return;
        }
        cCtx.imageSmoothingEnabled = false;
        cCtx.drawImage(scan, minX, minY, cw, ch, 0, 0, cw, ch);
        const croppedUrl = crop.toDataURL();
        scan.width = 0;
        scan.height = 0;
        crop.width = 0;
        crop.height = 0;
        this.trimmedIconCache.set(iconSrc, croppedUrl);
        for (const target of pendingTargets) {
          if (target.isConnected) {
            target.src = croppedUrl;
          }
        }
      } catch {
        // Ignore CORS/taint edge cases safely
      }
    };
    srcImg.onerror = () => {
      this.trimmedIconWaiters.delete(iconSrc);
    };
    srcImg.src = iconSrc;
  }

  private updateDragHoverPreview(clientX: number, clientY: number): void {
    this.clearGridPreviewClasses();
    if (!this.drag) return;
    const def = ITEM_BY_ID[this.drag.item.itemId];
    if (!def) return;

    const gap = 2;
    const pad = 4;
    const { w, h } = getEffectiveSize(def, this.drag.rotated);

    const targets: Array<{ zone: GridZone; el: HTMLElement; cols: number; rows: number; list: readonly GridItemInstance[] }> = [];
    const bp = this.scene.inventory.getBackpackTier();
    if (bp) {
      targets.push({
        zone: "backpack",
        el: this.backpackGridEl,
        cols: bp.cols,
        rows: bp.rows,
        list: this.scene.inventory.getBackpackItems(),
      });
    }
    const sb = this.scene.inventory.getSafeboxTier();
    targets.push({
      zone: "safebox",
      el: this.safeboxGridEl,
      cols: sb.cols,
      rows: sb.rows,
      list: this.scene.inventory.getSafeboxItems(),
    });
    if (this.isHomeStorageOpen) {
      const homeTier = this.scene.inventory.getHomeTier();
      targets.push({
        zone: "home",
        el: this.containerGridEl,
        cols: homeTier.cols,
        rows: homeTier.rows,
        list: this.scene.inventory.getHomeItems(),
      });
    } else if (this.activeContainer) {
      targets.push({
        zone: "container",
        el: this.containerGridEl,
        cols: this.activeContainer.cols,
        rows: this.activeContainer.rows,
        list: this.activeContainer.items,
      });
    }

    this.drag.hoverZone = null;
    this.drag.hoverValid = false;

    for (const t of targets) {
      const rect = t.el.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
        continue;
      }

      const cellPx = Number(t.el.dataset.cellPx || 34);
      const itemLeftPx = clientX - this.drag.offsetX;
      const itemTopPx = clientY - this.drag.offsetY;
      const gx = Math.round((itemLeftPx - rect.left - pad) / (cellPx + gap));
      const gy = Math.round((itemTopPx - rect.top - pad) / (cellPx + gap));

      const clampedX = Math.max(0, Math.min(t.cols - w, gx));
      const clampedY = Math.max(0, Math.min(t.rows - h, gy));
      const valid = canPlaceOnGrid(
        t.cols,
        t.rows,
        t.list,
        clampedX,
        clampedY,
        w,
        h,
        this.drag.fromZone === t.zone ? this.drag.item.uid : undefined,
      );

      this.drag.hoverZone = t.zone;
      this.drag.hoverCol = clampedX;
      this.drag.hoverRow = clampedY;
      this.drag.hoverValid = valid;

      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          const cx = clampedX + dx;
          const cy = clampedY + dy;
          const cell = t.el.querySelector<HTMLElement>(`.delta-cell[data-gx="${cx}"][data-gy="${cy}"]`);
          if (cell) {
            cell.classList.add(valid ? "is-preview-ok" : "is-preview-bad");
          }
        }
      }
      break;
    }
  }

  private clearGridPreviewClasses(): void {
    for (const el of this.bagModalEl.querySelectorAll(".delta-cell.is-preview-ok, .delta-cell.is-preview-bad")) {
      el.classList.remove("is-preview-ok", "is-preview-bad");
    }
  }

  private cancelDrag(): void {
    this.clearGridPreviewClasses();
    if (this.drag?.ghostEl) {
      this.drag.ghostEl.remove();
    }
    this.drag = null;
  }

  private rotateActiveSelectionOrDrag(): void {
    if (this.drag && this.drag.isDragging) {
      this.drag.rotated = !this.drag.rotated;
      const def = ITEM_BY_ID[this.drag.item.itemId];
      if (def && this.drag.ghostEl) {
        const cellPx = window.innerWidth <= 640 ? 34 : 40;
        const { w, h } = getEffectiveSize(def, this.drag.rotated);
        this.drag.ghostEl.style.width = `${w * cellPx + (w - 1) * 2}px`;
        this.drag.ghostEl.style.height = `${h * cellPx + (h - 1) * 2}px`;
        this.drag.ghostEl.classList.toggle("is-rotated", this.drag.rotated);
      }
      return;
    }

    if (!this.selectedItem) return;
    const list =
      this.selectedItem.zone === "backpack"
        ? this.scene.inventory.getBackpackItems()
        : this.selectedItem.zone === "safebox"
          ? this.scene.inventory.getSafeboxItems()
          : this.selectedItem.zone === "home"
            ? this.scene.inventory.getHomeItems()
            : this.activeContainer?.items ?? [];
    const inst = list.find((i) => i.uid === this.selectedItem!.uid);
    if (!inst) return;
    const containerId = this.activeContainer ? this.activeContainer.containerId : null;
    const ok = this.scene.inventory.placeMovedItem(
      this.selectedItem.zone,
      this.selectedItem.zone,
      containerId,
      inst.uid,
      inst.x,
      inst.y,
      !inst.rotated,
    );
    if (ok) {
      this.renderLootAndBagModal();
    } else {
      this.showDiscoveryToast("Không đủ chỗ xoay", "Cần chừa khoảng trống xung quanh để xoay 90°.");
    }
  }

  private renderInspector(): void {
    this.inspectorEl.replaceChildren();
    this.inspectorEl.classList.remove("is-hidden");
    const renderEmptyInspector = (): void => {
      const placeholder = document.createElement("div");
      placeholder.className = "inspector-placeholder";
      placeholder.textContent = "👆 Chạm vào vật phẩm để xem chi tiết, xoay hoặc cất nhanh.";
      this.inspectorEl.appendChild(placeholder);
    };

    if (!this.selectedItem) {
      renderEmptyInspector();
      return;
    }

    const list =
      this.selectedItem.zone === "backpack"
        ? this.scene.inventory.getBackpackItems()
        : this.selectedItem.zone === "safebox"
          ? this.scene.inventory.getSafeboxItems()
          : this.selectedItem.zone === "home"
            ? this.scene.inventory.getHomeItems()
            : this.activeContainer?.items ?? [];
    const inst = list.find((i) => i.uid === this.selectedItem!.uid);
    const def = inst ? ITEM_BY_ID[inst.itemId] : null;
    if (!inst || !def) {
      this.selectedItem = null;
      renderEmptyInspector();
      return;
    }

    const { w, h } = getEffectiveSize(def, inst.rotated);
    const hasWornBackpack = Boolean(this.scene.inventory.getBackpackTier());

    const left = document.createElement("div");
    left.className = "inspector-left";

    const img = document.createElement("img");
    img.className = "inspector-icon";
    img.src = def.iconSrc;

    const textBox = document.createElement("div");
    const title = document.createElement("div");
    title.className = "inspector-title";
    const dot = document.createElement("span");
    dot.className = `r-dot r-dot-${def.rarity}`;
    const nameSpan = document.createElement("span");
    const valGold = getItemEffectiveValueGold(inst, def);
    const usesSuffix = def.consumableId
      ? ` • 🔄 ${getItemRemainingUses(inst, def)}/${getItemMaxUses(def)} lần`
      : "";
    nameSpan.textContent = `${def.name} • 🪙 ${valGold} Vàng • ⚖️ ${def.weightKg} kg${usesSuffix}`;
    title.append(dot, nameSpan);

    const desc = document.createElement("div");
    desc.className = "inspector-desc";
    desc.textContent = `${def.description} (${BIOME_LABELS[inst.originBiome]})`;

    textBox.append(title, desc);
    left.append(img, textBox);

    const actions = document.createElement("div");
    actions.className = "inspector-actions";

    if (this.selectedItem.zone === "backpack" && def.consumableId) {
      const cDef = CONSUMABLE_BY_ID[def.consumableId];
      const durText = cDef ? ` • ${(cDef.useDurationMs / 1000).toFixed(1)}s` : "";
      const remUses = getItemRemainingUses(inst, def);
      const maxUses = getItemMaxUses(def);
      const eatBtn = document.createElement("button");
      eatBtn.type = "button";
      eatBtn.className = "inspector-btn";
      eatBtn.textContent = `🍽️ Dùng (${remUses}/${maxUses}${durText})`;
      eatBtn.addEventListener("click", () => {
        if (!this.selectedItem) return;
        const res = this.scene.useBackpackFood(this.selectedItem.uid);
        if (!res.ok) {
          this.showDiscoveryToast("Không thể dùng", res.message);
        } else {
          this.renderLootAndBagModal();
          this.updateConsumeProgressToast();
        }
      });
      actions.appendChild(eatBtn);
    }

    if (def.backpackId) {
      const wearBpBtn = document.createElement("button");
      wearBpBtn.type = "button";
      wearBpBtn.className = "inspector-btn";
      wearBpBtn.textContent = "🎒 Đeo Balo này lên người";
      wearBpBtn.addEventListener("click", () => {
        if (!this.selectedItem) return;
        const containerId = this.activeContainer ? this.activeContainer.containerId : null;
        const res = this.scene.equipBackpackFromInventory(
          this.selectedItem.zone,
          this.selectedItem.uid,
          containerId,
        );
        this.showDiscoveryToast(res.ok ? "🎒 Đã thay Balo" : "Không thể đeo Balo", res.message);
        if (res.ok) {
          this.selectedItem = null;
          this.renderLootAndBagModal();
          this.refreshBagBadge();
          this.updateSurvivalHud();
        }
      });
      actions.appendChild(wearBpBtn);
    }

    if (
      (this.selectedItem.zone === "backpack" ||
        this.selectedItem.zone === "home" ||
        this.selectedItem.zone === "safebox") &&
      def.garmentId
    ) {
      const equipBtn = document.createElement("button");
      equipBtn.type = "button";
      equipBtn.className = "inspector-btn";
      equipBtn.textContent = "👕 Mặc lên người";
      equipBtn.addEventListener("click", () => {
        if (!this.selectedItem || this.selectedItem.zone === "container") return;
        const res = this.scene.equipGarmentFromInventory(
          this.selectedItem.zone,
          this.selectedItem.uid,
        );
        this.showDiscoveryToast(res.ok ? "👕 Đã thay đồ" : "Không đủ chỗ đổi đồ", res.message);
        if (res.ok) {
          this.selectedItem = null;
          this.renderLootAndBagModal();
          this.refreshBagBadge();
          this.updateSurvivalHud();
        }
      });
      actions.appendChild(equipBtn);
    }

    if (def.w !== def.h) {
      const rotBtn = document.createElement("button");
      rotBtn.type = "button";
      rotBtn.className = "inspector-btn";
      rotBtn.textContent = "↻ Xoay [R]";
      rotBtn.addEventListener("click", () => this.rotateActiveSelectionOrDrag());
      actions.appendChild(rotBtn);
    }

    const transferTargets: Array<{ toZone: GridZone; label: string }> = [];
    if (this.selectedItem.zone === "container") {
      if (hasWornBackpack) transferTargets.push({ toZone: "backpack", label: "📥 Cất vào Balo" });
      transferTargets.push({ toZone: "safebox", label: "🔐 Cất Safebox" });
    } else if (this.selectedItem.zone === "backpack") {
      if (this.isHomeStorageOpen) {
        transferTargets.push({ toZone: "home", label: "🏠 Cất vào Kho Nhà" });
      } else if (this.activeContainer) {
        transferTargets.push({ toZone: "container", label: "📤 Bỏ lại nơi tìm kiếm" });
      }
      transferTargets.push({ toZone: "safebox", label: "🔐 Cất Safebox" });
    } else if (this.selectedItem.zone === "safebox") {
      if (hasWornBackpack) transferTargets.push({ toZone: "backpack", label: "📥 Rút ra Balo" });
      if (this.isHomeStorageOpen) transferTargets.push({ toZone: "home", label: "🏠 Cất vào Kho Nhà" });
    } else if (this.selectedItem.zone === "home") {
      if (hasWornBackpack) transferTargets.push({ toZone: "backpack", label: "📥 Cất vào Balo" });
      transferTargets.push({ toZone: "safebox", label: "🔐 Cất Safebox" });
    }

    for (const target of transferTargets) {
      const moveBtn = document.createElement("button");
      moveBtn.type = "button";
      moveBtn.className = "inspector-btn";
      moveBtn.textContent = target.label;
      moveBtn.addEventListener("click", () => {
        if (!this.selectedItem) return;
        const containerId = this.activeContainer ? this.activeContainer.containerId : null;
        const ok = this.scene.inventory.quickTransfer(
          this.selectedItem.zone,
          target.toZone,
          containerId,
          this.selectedItem.uid,
        );
        if (!ok) {
          this.showDiscoveryToast(
            "Không còn chỗ trống vừa kích thước!",
            `Item cần ${w}×${h} ô trống.`,
          );
        } else {
          this.selectedItem = null;
          this.renderLootAndBagModal();
          this.refreshBagBadge();
        }
      });
      actions.appendChild(moveBtn);
    }

    this.inspectorEl.append(left, actions);
  }

  private renderShopModal(): void {
    const bp = this.scene.inventory.getBackpackTier();
    const sb = this.scene.inventory.getSafeboxTier();
    const sum = this.scene.inventory.getSummary();

    this.shopStatsEl.replaceChildren();
    for (const txt of [
      `🪙 Ví: ${sum.walletGold.toLocaleString("vi-VN")} Vàng`,
      bp ? `🎒 Đang đeo: ${bp.name} (${bp.cols}×${bp.rows})` : "🎒 Đang đeo: Chưa có Balo (0/0)",
      bp ? `📦 Balo: ${sum.usedCells}/${sum.totalCells} ô` : `🔐 Safebox: ${sb.cols}×${sb.rows} ô`,
    ]) {
      const pill = document.createElement("span");
      pill.className = "bag-stat-pill";
      pill.textContent = txt;
      this.shopStatsEl.appendChild(pill);
    }

    // Current worn backpack quick-sell bar
    this.shopEquippedBpBarEl.replaceChildren();
    if (bp) {
      const bpInfo = document.createElement("div");
      bpInfo.textContent = `🎒 Đang đeo: ${bp.name} (${bp.cols}×${bp.rows} ô • ⚖️ ${bp.weightKg}kg • Bán lại: ${bp.valueGold} Vàng)`;
      const sellBpBtn = document.createElement("button");
      sellBpBtn.type = "button";
      sellBpBtn.className = "btn-card-secondary";
      const bagHasItems = this.scene.inventory.getBackpackItems().length > 0;
      sellBpBtn.textContent = `💰 Bán Balo đang đeo (+${bp.valueGold})`;
      sellBpBtn.addEventListener("click", () => {
        if (bagHasItems) {
          this.showDiscoveryToast(
            "Balo đang có đồ bên trong",
            "Hãy bán bớt đồ hoặc cất vào Safebox trước khi bán Balo đang đeo!",
          );
          this.setShopMobileTab("sell");
          return;
        }
        const res = this.scene.sellEquippedBackpack();
        this.showDiscoveryToast(res.ok ? "💰 Bán Balo thành công" : "Không thể bán", res.message);
        this.selectedShopUid = null;
        this.refreshBagBadge();
        this.updateSurvivalHud();
        this.renderShopModal();
      });
      this.shopEquippedBpBarEl.append(bpInfo, sellBpBtn);
    } else {
      const warn = document.createElement("div");
      warn.textContent = "⚠️ Bạn hiện chưa đeo Balo nào (0/0 ô). Hãy mua 1 chiếc bên dưới!";
      this.shopEquippedBpBarEl.appendChild(warn);
    }

    this.shopBackpacksEl.replaceChildren();
    for (const tier of BACKPACK_CATALOG) {
      const card = document.createElement("div");
      const isEquipped = bp?.id === tier.id;
      card.className = `shop-bp-card${isEquipped ? " is-equipped" : ""}`;

      const info = document.createElement("div");
      const name = document.createElement("div");
      name.className = "shop-bp-name";
      name.textContent = `${tier.name} (${tier.cols}×${tier.rows} ô • Gấp gọn: ${tier.itemW}×${tier.itemH} • ⚖️ ${tier.weightKg}kg)`;
      const desc = document.createElement("div");
      desc.className = "shop-bp-desc";
      desc.textContent = `🪙 Giá: ${tier.priceGold} • Bán lại: ${tier.valueGold} Vàng — ${tier.description}`;
      info.append(name, desc);

      const btnWrap = document.createElement("div");
      btnWrap.className = "shop-bp-actions";

      const packZone: "backpack" | "safebox" = bp ? "backpack" : "safebox";
      const bpItemDef = ITEM_BY_ID[tier.inventoryItemId];
      const canFitPacked = bpItemDef
        ? Boolean(this.scene.inventory.canFitItemInZone(packZone, bpItemDef.id))
        : false;

      const equipBuyBtn = document.createElement("button");
      equipBuyBtn.type = "button";
      equipBuyBtn.className = "shop-bp-btn";
      if (isEquipped) {
        equipBuyBtn.textContent = "✓ Đang đeo";
        equipBuyBtn.disabled = true;
      } else {
        equipBuyBtn.textContent = `🎒 Mua & Đeo (${tier.priceGold})`;
        equipBuyBtn.addEventListener("click", () => {
          const check = this.scene.inventory.canBuyAndEquipBackpack(tier.id);
          this.openPurchaseConfirm({
            subtitle: "🏪 Shop Balo • Mua & Đeo lên người",
            itemTitle: `🎒 ${tier.name}`,
            itemDesc: `${tier.cols}×${tier.rows} ô (Gấp gọn: ${tier.itemW}×${tier.itemH}) • ⚖️ ${tier.weightKg}kg • Giá bán lại: ${tier.valueGold} Vàng.${bp ? ` Balo cũ (${bp.name}) sẽ được cất vào Balo mới hoặc Safebox.` : ""}`,
            priceGold: tier.priceGold,
            bagLine: bp
              ? `Balo hiện tại: ${bp.name} (${sum.usedCells}/${sum.totalCells} ô)`
              : "Chưa đeo Balo — đeo ngay sau khi mua",
            blockedReason: check.ok ? null : check.reason ?? "Không đủ chỗ đổi Balo.",
            altAction:
              check.ok || !canFitPacked
                ? undefined
                : {
                    label: bp ? `📥 Bỏ Balo (${tier.priceGold})` : `🔐 Bỏ Safebox (${tier.priceGold})`,
                    onSelect: () => {
                      const res = this.scene.buyBackpack(tier.id, "pack", packZone);
                      this.showDiscoveryToast(res.ok ? "🏪 Mua Balo dự phòng" : "Không thể mua", res.message);
                      if (res.ok) {
                        this.refreshBagBadge();
                        this.updateSurvivalHud();
                        this.renderShopModal();
                      }
                    },
                  },
            onConfirm: () => {
              const res = this.scene.buyBackpack(tier.id, "equip");
              this.showDiscoveryToast(res.ok ? "🏪 Mua & Đeo Balo" : "Không thể đeo Balo", res.message);
              if (res.ok) {
                this.refreshBagBadge();
                this.updateSurvivalHud();
                this.renderShopModal();
              }
            },
          });
        });
      }

      const packBuyBtn = document.createElement("button");
      packBuyBtn.type = "button";
      packBuyBtn.className = "btn-card-secondary";
      packBuyBtn.textContent = bp ? `📥 Bỏ Balo (${tier.priceGold})` : `🔐 Bỏ Safebox (${tier.priceGold})`;
      packBuyBtn.addEventListener("click", () => {
        const canFit = bpItemDef
          ? Boolean(this.scene.inventory.canFitItemInZone(packZone, bpItemDef.id))
          : false;
        const canEquipNow = !isEquipped && this.scene.inventory.canBuyAndEquipBackpack(tier.id).ok;
        this.openPurchaseConfirm({
          subtitle: `🏪 Shop Balo • Mua cất vào ${bp ? "Balo" : "Safebox"}`,
          itemTitle: `🎒 ${tier.name} (Gấp ${tier.itemW}×${tier.itemH} ô)`,
          itemDesc: `Mua dạng vật phẩm dự phòng để bỏ vào balo/safebox hoặc bán lại (${tier.valueGold} Vàng).`,
          priceGold: tier.priceGold,
          bagLine: canFit
            ? `Đủ chỗ trống ${tier.itemW}×${tier.itemH} ô trong ${bp ? "Balo" : "Safebox"}`
            : `Không đủ ${tier.itemW}×${tier.itemH} ô trong ${bp ? "Balo" : "Safebox"}`,
          blockedReason: canFit
            ? null
            : `⚠️ ${bp ? "Balo" : "Safebox"} không đủ ${tier.itemW}×${tier.itemH} ô trống để chứa ${tier.name}!`,
          altAction:
            canFit || !canEquipNow
              ? undefined
              : {
                  label: `🎒 Mua & Đeo ngay (${tier.priceGold})`,
                  onSelect: () => {
                    const res = this.scene.buyBackpack(tier.id, "equip");
                    this.showDiscoveryToast(res.ok ? "🏪 Mua & Đeo Balo" : "Không thể đeo", res.message);
                    if (res.ok) {
                      this.refreshBagBadge();
                      this.updateSurvivalHud();
                      this.renderShopModal();
                    }
                  },
                },
          onConfirm: () => {
            const res = this.scene.buyBackpack(tier.id, "pack", packZone);
            this.showDiscoveryToast(res.ok ? "🏪 Mua Balo dự phòng" : "Không thể mua", res.message);
            if (res.ok) {
              this.refreshBagBadge();
              this.updateSurvivalHud();
              this.renderShopModal();
            }
          },
        });
      });

      btnWrap.append(equipBuyBtn, packBuyBtn);
      card.append(info, btnWrap);
      this.shopBackpacksEl.appendChild(card);
    }

    // Sell zone switcher & grid
    const isSellSafebox = this.shopSellZone === "safebox";
    this.shopSellZoneBagBtn.classList.toggle("is-active", !isSellSafebox);
    this.shopSellZoneSafeboxBtn.classList.toggle("is-active", isSellSafebox);
    this.shopSellTitleEl.textContent = isSellSafebox
      ? "💰 Bán Đồ Trong Safebox (Chạm item)"
      : "💰 Bán Đồ Trong Balo (Chạm item)";
    this.shopSellAllBtn.textContent = isSellSafebox ? "💵 Bán toàn bộ Safebox" : "💵 Bán toàn bộ Balo";

    const sellItems = isSellSafebox
      ? this.scene.inventory.getSafeboxItems()
      : this.scene.inventory.getBackpackItems();

    if (!isSellSafebox && !bp) {
      this.shopSellGridEl.replaceChildren();
      this.shopSellGridEl.style.gridTemplateColumns = "1fr";
      this.shopSellGridEl.style.gridTemplateRows = "auto";
      const emptyMsg = document.createElement("div");
      emptyMsg.className = "no-backpack-banner";
      emptyMsg.textContent = "Chưa đeo Balo.";
      this.shopSellGridEl.appendChild(emptyMsg);
    } else {
      const gridCols = isSellSafebox ? sb.cols : bp!.cols;
      const gridRows = isSellSafebox ? sb.rows : bp!.rows;
      this.renderDeltaGrid(
        this.shopSellGridEl,
        gridCols,
        gridRows,
        sellItems,
        this.shopSellZone,
        false,
      );
    }

    this.shopInspectorEl.replaceChildren();
    const sel = this.selectedShopUid
      ? sellItems.find((i) => i.uid === this.selectedShopUid)
      : null;
    const selDef = sel ? ITEM_BY_ID[sel.itemId] : null;

    if (!sel || !selDef) {
      const ph = document.createElement("div");
      ph.className = "inspector-placeholder";
      ph.textContent = "Chạm vật phẩm để bán.";
      this.shopInspectorEl.appendChild(ph);
    } else {
      const left = document.createElement("div");
      left.className = "inspector-left";
      const img = document.createElement("img");
      img.className = "inspector-icon";
      img.src = selDef.iconSrc;
      const box = document.createElement("div");
      const t = document.createElement("div");
      t.className = "inspector-title";
      const d = document.createElement("span");
      d.className = `r-dot r-dot-${selDef.rarity}`;
      const selVal = getItemEffectiveValueGold(sel, selDef);
      const usesNote = selDef.consumableId
        ? ` (${getItemRemainingUses(sel, selDef)}/${getItemMaxUses(selDef)} lần)`
        : "";
      const n = document.createElement("span");
      n.textContent = `${selDef.name}${usesNote} • 🪙 ${selVal} Vàng`;
      t.append(d, n);
      box.appendChild(t);
      left.append(img, box);

      const sellBtn = document.createElement("button");
      sellBtn.type = "button";
      sellBtn.className = "inspector-btn";
      sellBtn.textContent = `💰 Bán (+${selVal} Vàng)`;
      sellBtn.addEventListener("click", () => {
        const gold = this.scene.inventory.sellItemInZone(this.shopSellZone, sel.uid);
        this.selectedShopUid = null;
        this.showDiscoveryToast("💰 Bán thành công", `Nhận +${gold} Vàng từ ${selDef.name}`);
        this.refreshBagBadge();
        this.updateSurvivalHud();
        this.renderShopModal();
      });

      this.shopInspectorEl.append(left, sellBtn);
    }
  }

  private openSafeboxModal(mode: "daily" | UpgradeKind = "daily"): void {
    this.safeboxOpenedFromHome = this.isHomeStorageOpen || this.scene.isAtHome();
    this.upgradeModalMode = mode;
    this.closeAllModals("safebox");
    this.isSafeboxModalOpen = true;
    this.safeboxModalEl.classList.add("is-open");
    this.renderSafeboxModal();
  }

  private renderSafeboxModal(): void {
    const mode = this.upgradeModalMode;
    this.upTabDailyBtn.classList.toggle("is-active", mode === "daily");
    this.upTabSafeboxBtn.classList.toggle("is-active", mode === "safebox");
    this.upTabHomeBtn.classList.toggle("is-active", mode === "home");
    this.upTabGymBtn.classList.toggle("is-active", mode === "gym");
    this.upTabTreadmillBtn.classList.toggle("is-active", mode === "treadmill");

    const inv = this.scene.inventory;
    const board = this.scene.getDailyQuestBoard();
    const dailyClaimed = board.quests.filter((q) => q.claimed).length;
    this.upTabDailyBtn.textContent = `📜 Hằng ngày (${dailyClaimed}/${board.quests.length})`;
    const formatTabProgress = (
      icon: string,
      name: string,
      reqs: ReadonlyArray<{ deliveredCount: number; requiredCount: number }> | null | undefined,
      hasNext: boolean,
    ): string => {
      if (!hasNext || !reqs) return `${icon} ${name} (MAX)`;
      const done = reqs.filter((r) => r.deliveredCount >= r.requiredCount).length;
      return `${icon} ${name} (${done}/${reqs.length})`;
    };
    this.upTabSafeboxBtn.textContent = formatTabProgress(
      "🔐",
      "Safebox",
      inv.getSafeboxContract()?.requirements,
      Boolean(getNextSafeboxTier(inv.getSafeboxTier().id)),
    );
    this.upTabHomeBtn.textContent = formatTabProgress(
      "🏠",
      "Kho Nhà",
      inv.getHomeContract()?.requirements,
      Boolean(getNextHomeTier(inv.getHomeTier().id)),
    );
    this.upTabGymBtn.textContent = formatTabProgress(
      "🏋️",
      "Phòng Gym",
      inv.getGymContract()?.requirements,
      Boolean(getNextGymTier(inv.getGymTier().id)),
    );
    this.upTabTreadmillBtn.textContent = formatTabProgress(
      "🏃",
      "Máy Chạy Bộ",
      inv.getTreadmillContract()?.requirements,
      Boolean(getNextTreadmillTier(inv.getTreadmillTier().id)),
    );

    if (mode === "daily") {
      const atQuestBoard = this.scene.isAtQuestBoard();
      const remMs = Math.max(0, board.nextRefreshAt - Date.now());
      this.sbTitleEl.textContent = "📜 Nhiệm Vụ Hằng Ngày (Làm mới 4 giờ)";
      this.safeboxStatsEl.replaceChildren();
      for (const txt of [
        `⏳ Làm mới sau: ${formatQuestCountdown(remMs)}`,
        `✅ Hoàn thành: ${dailyClaimed}/${board.quests.length}`,
        `💰 ${inv.getGold().toLocaleString("vi-VN")} Vàng`,
        atQuestBoard ? "🏛️ Tại Hội Sở Nhiệm Vụ" : "🚶 Ngoài đường (Chỉ xem NV)",
      ]) {
        const s = document.createElement("span");
        s.className = "bag-stat-pill";
        s.textContent = txt;
        this.safeboxStatsEl.appendChild(s);
      }

      this.safeboxTierBannerEl.replaceChildren();
      const headLine = document.createElement("div");
      headLine.style.fontWeight = "800";
      headLine.textContent = `Bảng Ủy Thác 4 Giờ • Đang có ${board.quests.length} nhiệm vụ`;
      const subLine = document.createElement("div");
      subLine.style.opacity = "0.92";
      subLine.textContent = atQuestBoard
        ? "🏛️ Tại Hội Sở Nhiệm Vụ — sẵn sàng bàn giao & nhận thưởng."
        : "🔒 Chỉ bàn giao vật phẩm & nhận thưởng tại Hội Sở Nhiệm Vụ.";
      this.safeboxTierBannerEl.append(headLine, subLine);

      this.safeboxReqListEl.replaceChildren();
      for (const q of board.quests) {
        this.safeboxReqListEl.appendChild(
          this.buildDailyQuestRow(q, () => this.renderSafeboxModal(), atQuestBoard),
        );
      }

      const pendingCount = board.quests.filter((q) => !q.claimed).length;
      if (!atQuestBoard) {
        this.safeboxDeliverAllBtn.textContent = `🔒 Đến Hội Sở để đổi NV (${QUEST_MANUAL_REROLL_COST_GOLD} Vàng)`;
        this.safeboxDeliverAllBtn.disabled = true;
      } else if (pendingCount <= 0) {
        this.safeboxDeliverAllBtn.textContent = "⏳ Đã xong hết — Chờ reset 4 giờ";
        this.safeboxDeliverAllBtn.disabled = true;
      } else {
        this.safeboxDeliverAllBtn.textContent = `🔄 Đổi ${pendingCount} NV chưa xong (${QUEST_MANUAL_REROLL_COST_GOLD} Vàng)`;
        this.safeboxDeliverAllBtn.disabled = inv.getGold() < QUEST_MANUAL_REROLL_COST_GOLD;
      }
      return;
    }
    const viewCfg =
      mode === "home"
        ? (() => {
            const curTier = inv.getHomeTier();
            const nextTier = getNextHomeTier(curTier.id);
            return {
              label: "Kho Nhà",
              icon: "🏠",
              modalTitle: "🏠 Nâng Cấp Kho Nhà Riêng",
              curTier,
              nextTier,
              curLabel: `${curTier.name} (${curTier.cols}×${curTier.rows})`,
              nextLabel: nextTier ? `${nextTier.cols}×${nextTier.rows}` : null,
              nextFullLabel: nextTier ? `${nextTier.name} (${nextTier.cols}×${nextTier.rows})` : "",
              reqs: inv.getHomeContract()?.requirements ?? null,
              maxLabel: "9×16 (144 ô)",
            };
          })()
        : mode === "gym"
          ? (() => {
              const curTier = inv.getGymTier();
              const nextTier = getNextGymTier(curTier.id);
              return {
                label: "Phòng Gym",
                icon: "🏋️",
                modalTitle: "🏋️ Phòng Gym — Thể Lực Vĩnh Viễn",
                curTier,
                nextTier,
                curLabel: curTier.name,
                nextLabel: nextTier ? `+${nextTier.bonusPct ?? 0}% Thể lực` : null,
                nextFullLabel: nextTier ? nextTier.name : "",
                reqs: inv.getGymContract()?.requirements ?? null,
                maxLabel: "+15% Thể lực vĩnh viễn",
              };
            })()
          : mode === "treadmill"
            ? (() => {
                const curTier = inv.getTreadmillTier();
                const nextTier = getNextTreadmillTier(curTier.id);
                return {
                  label: "Máy Chạy Bộ",
                  icon: "🏃",
                  modalTitle: "🏃 Máy Chạy Bộ — Chạy Nặng (≥10kg & ≥20kg)",
                  curTier,
                  nextTier,
                  curLabel: curTier.name,
                  nextLabel: nextTier ? `+${nextTier.bonusPct ?? 0}% tốc độ` : null,
                  nextFullLabel: nextTier ? nextTier.name : "",
                  reqs: inv.getTreadmillContract()?.requirements ?? null,
                  maxLabel: "+20% tốc độ khi mang nặng ≥10kg & ≥20kg",
                };
              })()
            : (() => {
                const curTier = inv.getSafeboxTier();
                const nextTier = getNextSafeboxTier(curTier.id);
                return {
                  label: "Safebox",
                  icon: "🔐",
                  modalTitle: "🔐 Nâng Cấp Safebox Vĩnh Viễn",
                  curTier,
                  nextTier,
                  curLabel: `${curTier.name} (${curTier.cols}×${curTier.rows})`,
                  nextLabel: nextTier ? `${nextTier.cols}×${nextTier.rows}` : null,
                  nextFullLabel: nextTier ? `${nextTier.name} (${nextTier.cols}×${nextTier.rows})` : "",
                  reqs: inv.getSafeboxContract()?.requirements ?? null,
                  maxLabel: "5×5 (25 ô)",
                };
              })();

    const atHome = this.safeboxOpenedFromHome || this.scene.isAtHome();
    this.sbTitleEl.textContent = viewCfg.modalTitle;

    this.safeboxStatsEl.replaceChildren();
    for (const txt of [
      `${viewCfg.icon} Hiện tại: ${viewCfg.curLabel}`,
      viewCfg.nextLabel ? `⬆️ Mục tiêu: ${viewCfg.nextLabel}` : "🏆 Đạt cấp tối đa",
      atHome ? "🏠 Vị trí: Tại Nhà (Nâng cấp được)" : "🚶 Ngoài đường (Chỉ xem NV)",
    ]) {
      const s = document.createElement("span");
      s.className = "bag-stat-pill";
      s.textContent = txt;
      this.safeboxStatsEl.appendChild(s);
    }

    this.safeboxTierBannerEl.replaceChildren();
    this.safeboxReqListEl.replaceChildren();

    if (!viewCfg.nextTier || !viewCfg.reqs) {
      this.safeboxTierBannerEl.textContent = `🏆 ${viewCfg.label} đã đạt cấp tối đa ${viewCfg.maxLabel}.`;
      this.safeboxDeliverAllBtn.textContent = `🏆 Đã đạt ${viewCfg.label} tối đa`;
      this.safeboxDeliverAllBtn.disabled = true;
      return;
    }

    const doneCount = viewCfg.reqs.filter((r) => r.deliveredCount >= r.requiredCount).length;
    const headLine = document.createElement("div");
    headLine.style.fontWeight = "800";
    headLine.textContent = `Nâng cấp ${viewCfg.curLabel} ➜ ${viewCfg.nextFullLabel} • Hoàn thành ${doneCount}/${viewCfg.reqs.length} mục`;
    const subLine = document.createElement("div");
    subLine.style.opacity = "0.92";
    subLine.textContent = atHome
      ? "🏠 Tại Nhà Riêng — sẵn sàng giao nộp."
      : "🔒 Chỉ nâng cấp được tại Nhà Riêng.";
    this.safeboxTierBannerEl.append(headLine, subLine);

    let canDeliverAny = false;
    for (const req of viewCfg.reqs) {
      const def = ITEM_BY_ID[req.itemId];
      if (!def) continue;
      const counts = inv.countItemAcrossZones(req.itemId);
      const isDone = req.deliveredCount >= req.requiredCount;
      if (atHome && !isDone && counts.total > 0) canDeliverAny = true;

      const row = document.createElement("div");
      row.className = `sb-req-row${isDone ? " is-complete" : ""}`;

      const icon = document.createElement("img");
      icon.className = "sb-req-icon";
      icon.src = def.iconSrc;
      icon.alt = def.name;

      const meta = document.createElement("div");
      meta.className = "sb-req-meta";

      const title = document.createElement("div");
      title.className = "sb-req-name";
      const dot = document.createElement("span");
      dot.className = `r-dot r-dot-${def.rarity}`;
      const labelEl = document.createElement("span");
      labelEl.textContent = ` ${def.name} (${def.w}×${def.h})${isDone ? " ✅ Đã hoàn thành" : ""}`;
      title.append(dot, labelEl);

      const sub = document.createElement("div");
      sub.className = "sb-req-sub";
      const missingCount = Math.max(0, req.requiredCount - req.deliveredCount);
      const repShopEntry = REPUTATION_SHOP_BY_ID[req.itemId];
      const repHint = repShopEntry ? ` • ⭐ Đổi ở Danh vọng (${repShopEntry.costPoints}⭐)` : "";
      sub.textContent = isDone
        ? `Hoàn tất: ${req.deliveredCount}/${req.requiredCount}`
        : `Đã nộp: ${req.deliveredCount}/${req.requiredCount} (Còn thiếu ${missingCount}) • Đang giữ: ${counts.total}${repHint}`;

      const bar = document.createElement("div");
      bar.className = "sb-req-bar";
      const fill = document.createElement("div");
      fill.className = "sb-req-bar-fill";
      fill.style.width = `${Math.min(100, (req.deliveredCount / req.requiredCount) * 100)}%`;
      bar.appendChild(fill);

      meta.append(title, sub, bar);

      const act = document.createElement("div");
      act.className = "sb-req-actions";
      if (atHome) {
        const deliverBtn = document.createElement("button");
        deliverBtn.type = "button";
        deliverBtn.className = isDone ? "btn-card-secondary" : "btn-card-primary";
        deliverBtn.textContent = isDone ? "✅ Đã xong" : `📤 Giao 1 (${counts.total})`;
        deliverBtn.disabled = isDone || counts.total <= 0;
        deliverBtn.addEventListener("click", () => {
          const upgradeMode = this.upgradeModalMode === "daily" ? "safebox" : this.upgradeModalMode;
          const res = this.scene.deliverUpgradeItem(upgradeMode, req.itemId, atHome);
          this.showDiscoveryToast(
            res.upgraded ? `🎉 Nâng cấp ${viewCfg.label}!` : res.ok ? "📤 Đã giao nộp" : "Không thể giao",
            res.message,
          );
          this.refreshBagBadge();
          this.updateSurvivalHud();
          this.renderSafeboxModal();
        });
        act.appendChild(deliverBtn);
      } else {
        const statusTag = document.createElement("span");
        statusTag.className = "shop-item-tag";
        statusTag.textContent = isDone ? "✅ Hoàn thành" : "🔒 Về Nhà nâng cấp";
        act.appendChild(statusTag);
      }

      row.append(icon, meta, act);
      this.safeboxReqListEl.appendChild(row);
    }

    if (!atHome) {
      this.safeboxDeliverAllBtn.textContent = `🏠 Về Nhà Riêng để Giao & Nâng cấp ${viewCfg.label}`;
      this.safeboxDeliverAllBtn.disabled = true;
    } else {
      this.safeboxDeliverAllBtn.textContent = "📦 Giao tất cả vật phẩm đang có";
      this.safeboxDeliverAllBtn.disabled = !canDeliverAny;
    }
  }

  private renderCollectionModal(): void {
    const inv = this.scene.inventory;
    const slots = inv.getCollectionHallStates();
    const total = COLLECTION_RED_ITEMS.length;
    let displayedCount = 0;
    let whiteCount = 0;
    let goldCount = 0;

    for (const def of COLLECTION_RED_ITEMS) {
      const slot = slots[def.id];
      if (!slot) continue;
      if (slot.displayed) displayedCount += 1;
      if (slot.lightLevel >= 1) whiteCount += 1;
      if (slot.lightLevel >= 2) goldCount += 1;
    }

    this.collectionStatsEl.replaceChildren();
    for (const txt of [
      `🖼️ Trưng bày: ${displayedCount}/${total}`,
      `⚪ Đèn Trắng: ${whiteCount}/${total}`,
      `🌟 Đèn Vàng: ${goldCount}/${total}`,
    ]) {
      const pill = document.createElement("span");
      pill.className = "bag-stat-pill";
      pill.textContent = txt;
      this.collectionStatsEl.appendChild(pill);
    }

    this.collectionGridEl.replaceChildren();
    for (const def of COLLECTION_RED_ITEMS) {
      const slot = slots[def.id] ?? { displayed: false, lightLevel: 0, goldLampProgress: 0 };
      const counts = inv.countItemAcrossZones(def.id);

      const card = document.createElement("div");
      card.className =
        "coll-item-card" +
        (slot.displayed ? " is-displayed" : "") +
        (slot.lightLevel === 2 ? " is-light-gold" : slot.lightLevel === 1 ? " is-light-white" : "");

      const head = document.createElement("div");
      head.className = "coll-item-head";

      const iconWrap = document.createElement("div");
      iconWrap.className = `coll-icon-wrap${slot.displayed ? "" : " is-greyed"}`;
      const icon = document.createElement("img");
      icon.className = "coll-icon";
      icon.alt = def.name;
      iconWrap.appendChild(icon);
      this.applyTrimmedItemSrc(icon, def.iconSrc);

      const meta = document.createElement("div");
      meta.className = "coll-item-meta";

      const nameEl = document.createElement("div");
      nameEl.className = "coll-item-name";
      nameEl.textContent = def.name;

      const originTag = def.mapOrigin === "japan" ? "🇯🇵 Nhật Bản" : "🇻🇳 Việt Nam";
      const subEl = document.createElement("div");
      subEl.className = "coll-item-sub";
      subEl.textContent = `${def.w}×${def.h} ô • ${def.valueGold.toLocaleString("vi-VN")} Vàng • Đang giữ: ${counts.total} • ${originTag}`;

      const stateEl = document.createElement("div");
      stateEl.className = "coll-item-sub";
      stateEl.textContent = slot.displayed ? "✅ Đang trưng bày trong tủ" : "⬜ Chưa bỏ vào (Xám)";

      const lightBadge = document.createElement("span");
      lightBadge.className =
        "coll-light-badge" +
        (slot.lightLevel === 2 ? " is-gold" : slot.lightLevel === 1 ? " is-white" : "");
      lightBadge.textContent =
        slot.lightLevel === 2
          ? "🌟 Đèn Vàng (Lv.2)"
          : slot.lightLevel === 1
            ? "⚪ Đèn Trắng (Lv.1)"
            : "Tắt đèn (Lv.0)";

      meta.append(nameEl, subEl, stateEl, lightBadge);
      head.append(iconWrap, meta);
      card.appendChild(head);

      if (slot.lightLevel === 1) {
        const bar = document.createElement("div");
        bar.className = "sb-req-bar";
        const fill = document.createElement("div");
        fill.className = "sb-req-bar-fill";
        fill.style.width = `${Math.min(100, (slot.goldLampProgress / GOLD_LAMP_REQUIRED_COUNT) * 100)}%`;
        bar.appendChild(fill);
        card.appendChild(bar);
      }

      const actions = document.createElement("div");
      actions.className = "coll-actions";

      const displayBtn = document.createElement("button");
      displayBtn.type = "button";
      if (slot.displayed) {
        displayBtn.className = "btn-card-secondary";
        displayBtn.textContent = "📤 Lấy vật phẩm ra";
        displayBtn.addEventListener("click", () => {
          const res = this.scene.withdrawCollectionItem(def.id);
          this.showDiscoveryToast(res.ok ? "📤 Đã lấy ra" : "Không thể lấy ra", res.message);
          this.refreshBagBadge();
          this.updateSurvivalHud();
          this.renderCollectionModal();
        });
      } else {
        displayBtn.className = "btn-card-primary";
        displayBtn.textContent = `🖼️ Bỏ vào trưng bày (${counts.total})`;
        displayBtn.disabled = counts.total <= 0;
        displayBtn.addEventListener("click", () => {
          const res = this.scene.depositCollectionItem(def.id);
          this.showDiscoveryToast(res.ok ? "🖼️ Đã trưng bày" : "Chưa có vật phẩm", res.message);
          this.refreshBagBadge();
          this.updateSurvivalHud();
          this.renderCollectionModal();
        });
      }
      actions.appendChild(displayBtn);

      if (slot.lightLevel === 0) {
        const whiteBtn = document.createElement("button");
        whiteBtn.type = "button";
        whiteBtn.className = "btn-card-secondary";
        whiteBtn.textContent = `⚪ Lên Đèn Trắng (Nộp 1 • Có: ${counts.total})`;
        whiteBtn.disabled = counts.total <= 0;
        whiteBtn.addEventListener("click", () => {
          const res = this.scene.upgradeCollectionLight(def.id);
          this.showDiscoveryToast(res.ok ? "⚪ Lên Đèn Trắng" : "Thiếu đồ đỏ", res.message);
          this.refreshBagBadge();
          this.updateSurvivalHud();
          this.renderCollectionModal();
        });
        actions.appendChild(whiteBtn);
      } else if (slot.lightLevel === 1) {
        const goldBtn = document.createElement("button");
        goldBtn.type = "button";
        goldBtn.className = "coll-btn-gold";
        goldBtn.textContent = `🌟 Nộp Đèn Vàng (${slot.goldLampProgress}/${GOLD_LAMP_REQUIRED_COUNT} • Có: ${counts.total})`;
        goldBtn.disabled = counts.total <= 0;
        goldBtn.addEventListener("click", () => {
          const res = this.scene.upgradeCollectionLight(def.id);
          this.showDiscoveryToast(
            res.slot?.lightLevel === 2 ? "🌟 Lên Đèn Vàng!" : res.ok ? "✨ Đã nộp Đèn Vàng" : "Thiếu đồ đỏ",
            res.message,
          );
          this.refreshBagBadge();
          this.updateSurvivalHud();
          this.renderCollectionModal();
        });
        actions.appendChild(goldBtn);
      } else {
        const maxedBtn = document.createElement("button");
        maxedBtn.type = "button";
        maxedBtn.className = "coll-btn-gold";
        maxedBtn.disabled = true;
        maxedBtn.textContent = "👑 Đèn Vàng Vĩnh Viễn (Tối đa)";
        actions.appendChild(maxedBtn);
      }

      card.appendChild(actions);
      this.collectionGridEl.appendChild(card);
    }
  }

  private updateSurvivalHud(): void {
    const { state, result, totalWeightKg } = this.scene.getSurvivalSnapshot();
    const hp = Math.round(state.hp);
    const hunger = Math.round(state.hunger);
    const stamina = Math.round(state.stamina);
    const nowMs = Date.now();
    const permStaminaPct = this.scene.inventory.getPermanentStaminaBonusPct();
    const heavySpeedPct = this.scene.inventory.getHeavySpeedBonusPct();
    const maxStamina = getActiveStaminaMax(state, nowMs, permStaminaPct);

    let buffSuffix = "";
    if (permStaminaPct > 0) {
      buffSuffix += ` • 🏋️ +${permStaminaPct}%`;
    }
    if (heavySpeedPct > 0) {
      buffSuffix += ` • 🏃 +${heavySpeedPct}%`;
    }
    if (state.staminaBuff && state.staminaBuff.expiresAt > nowMs) {
      const remSec = Math.ceil((state.staminaBuff.expiresAt - nowMs) / 1000);
      const mins = Math.floor(remSec / 60);
      const secs = remSec % 60;
      const clock = mins > 0 ? `${mins}m${String(secs).padStart(2, "0")}s` : `${secs}s`;
      buffSuffix += ` • 💊 +${state.staminaBuff.boostPct}% (${clock})`;
    }

    const zone = this.scene.getCurrentSecurityZone();
    const zoneMeta = SECURITY_ZONE_META[zone];
    const mapBadge = this.scene.getActiveMapId() === "japan" ? "🇯🇵" : "🇻🇳";
    const ignoreMs = this.scene.getGlobalPoliceIgnoreRemainingMs();
    const ignoreSuffix = ignoreMs > 0 ? ` • 🛡️ Miễn kiểm: ${Math.ceil(ignoreMs / 1000)}s` : "";

    const thermalText = `${mapBadge} ${zoneMeta.emoji} ${zoneMeta.label} • 🌡️ ${state.bodyTempC.toFixed(1)}°C • ⚖️ ${totalWeightKg.toFixed(1)}kg • ${result.thermal.statusLabel}${buffSuffix}${ignoreSuffix}`;
    const staminaPct = Math.min(100, (state.stamina / maxStamina) * 100).toFixed(1);
    const blurPx = (result.blurIntensity * 4.2).toFixed(2);
    const blurFilter = result.blurIntensity > 0.01 ? `blur(${blurPx}px)` : "none";
    const vignetteOpacity = (result.blurIntensity * 0.92).toFixed(2);
    const sig = `${hp}|${hunger}|${stamina}|${staminaPct}|${result.thermal.isSweating}|${result.thermal.isShivering}|${blurFilter}|${vignetteOpacity}|${thermalText}`;
    if (sig === this.lastSurvivalSignature) return;
    this.lastSurvivalSignature = sig;

    this.hpBarEl.style.width = `${hp}%`;
    this.hpValEl.textContent = String(hp);
    this.hungerBarEl.style.width = `${hunger}%`;
    this.hungerValEl.textContent = String(hunger);
    this.staminaBarEl.style.width = `${staminaPct}%`;
    this.staminaValEl.textContent = String(stamina);

    this.thermalTextEl.textContent = thermalText;
    this.thermalTextEl.classList.toggle("is-hot", result.thermal.isSweating);
    this.thermalTextEl.classList.toggle("is-cold", result.thermal.isShivering);

    // Apply subtle world vision blur + dark crimson vignette when starving / exhausted / wounded
    this.pixiContainerEl.style.filter = blurFilter;
    this.vignetteEl.style.opacity = vignetteOpacity;
  }

  private updateConsumeProgressToast(): void {
    const prog = this.scene.getPendingConsumeProgress();
    if (!prog) {
      this.consumeToastEl.classList.remove("is-visible");
      return;
    }
    this.consumeToastEl.classList.add("is-visible");
    this.consumeLabelEl.textContent = `${prog.emoji} Đang dùng: ${prog.name}`;
    this.consumeTimeEl.textContent = `${prog.remainingSec.toFixed(1)}s`;
    this.consumeFillEl.style.width = `${(prog.progress01 * 100).toFixed(1)}%`;
  }

  private renderQuickWheel(): void {
    const items = this.scene.getQuickUseConsumables(6);
    this.quickWheelEmptyEl.classList.toggle("is-hidden", items.length > 0);

    for (const old of this.quickWheelRingEl.querySelectorAll(".quick-wheel-slot")) {
      old.remove();
    }

    const ringPx = this.quickWheelRingEl.getBoundingClientRect().width || 300;
    const radius = Math.max(72, Math.round(ringPx * 0.34));

    for (let i = 0; i < 6; i++) {
      const angleRad = ((-90 + i * 60) * Math.PI) / 180;
      const ox = Math.round(Math.cos(angleRad) * radius);
      const oy = Math.round(Math.sin(angleRad) * radius);

      const entry = items[i];
      const slotBtn = document.createElement("button");
      slotBtn.type = "button";
      slotBtn.className = `quick-wheel-slot${entry ? "" : " is-empty"}`;
      slotBtn.style.setProperty("--ox", `${ox}px`);
      slotBtn.style.setProperty("--oy", `${oy}px`);

      if (!entry) {
        slotBtn.disabled = true;
        slotBtn.textContent = `${i + 1}. Trống`;
      } else {
        const img = document.createElement("img");
        img.src = entry.itemDef.iconSrc;
        img.alt = "";

        const name = document.createElement("div");
        name.className = "quick-wheel-name";
        name.textContent = entry.consumable.name;

        const sub = document.createElement("div");
        sub.className = "quick-wheel-sub";
        const c = entry.consumable;
        sub.textContent = c.isFullRestore
          ? `Full • ${(c.useDurationMs / 1000).toFixed(1)}s`
          : c.staminaBoostPct
            ? `+${c.staminaBoostPct}%⚡ • ${(c.useDurationMs / 1000).toFixed(1)}s`
            : `+${c.hungerRestore}🍗 +${c.staminaRestore}⚡`;

        const qty = document.createElement("span");
        qty.className = "quick-wheel-qty";
        qty.textContent = `×${entry.count}`;

        slotBtn.append(img, name, sub, qty);
        slotBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const res = this.scene.useBackpackFood(entry.uid);
          if (!res.ok) {
            this.showDiscoveryToast("Không thể dùng", res.message);
            return;
          }
          this.closeAllModals();
          this.updateConsumeProgressToast();
        });
      }

      this.quickWheelRingEl.appendChild(slotBtn);
    }
  }

  private formatGarmentStatsText(g: GarmentDef): string {
    const parts: string[] = [`⚖️ ${g.weightKg} kg (${g.gridW}×${g.gridH})`];
    if (g.warmth !== 0) {
      parts.push(g.warmth > 0 ? `🔥 Giữ ấm +${g.warmth}` : `❄️ Thoáng mát ${Math.abs(g.warmth)}`);
    }
    if (g.heatResist > 0) parts.push(`☀️ Chống nắng ${Math.round(g.heatResist * 100)}%`);
    if (g.windRainResist > 0) parts.push(`☔ Chống mưa gió ${Math.round(g.windRainResist * 100)}%`);
    if (g.staminaSave > 0) parts.push(`⚡ Đỡ mệt ${Math.round(g.staminaSave * 100)}%`);
    if ((g.blendChance ?? 0) > 0) parts.push(`🕵️ Hòa nhập +${Math.round((g.blendChance ?? 0) * 100)}%`);
    return parts.join(" • ");
  }

  private renderGearSummaryBox(targetEl: HTMLElement, previewGear?: EquippedGear | null): void {
    const { state, result, equipStats, totalWeightKg } = this.scene.getSurvivalSnapshot();
    const isTrying = Boolean(previewGear);
    const activeStats = previewGear ? computeEquipmentStats(previewGear) : equipStats;
    targetEl.replaceChildren();
    const lines = [
      isTrying ? "👁️ ĐANG XEM TRƯỚC ĐỒ THỬ (chưa trừ Vàng)" : `🌡️ Thân nhiệt: ${state.bodyTempC.toFixed(1)}°C (Cảm nhận ${result.thermal.feelsLikeC}°C)`,
      `⚖️ Trọng lượng đồ mặc: ${activeStats.weightKg.toFixed(2)} kg (Mang theo: ${totalWeightKg.toFixed(2)} kg)`,
      `🔥 Giữ ấm tổng: ${activeStats.warmth >= 0 ? "+" : ""}${activeStats.warmth.toFixed(1)}`,
      `☀️ Chống nắng: ${Math.round(activeStats.heatResist * 100)}% • ☔ Cản mưa gió: ${Math.round(activeStats.windRainResist * 100)}%`,
      `⚡ Giảm hao thể lực: ${Math.round(activeStats.staminaSave * 100)}% • 🕵️ Hòa nhập: ${Math.round(activeStats.blendChance * 100)}%`,
    ];
    for (const line of lines) {
      const div = document.createElement("div");
      div.textContent = line;
      targetEl.appendChild(div);
    }
    if (isTrying) {
      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.className = "cloth-try-reset-btn";
      resetBtn.textContent = "🔄 Hoàn tác đồ đang thử";
      resetBtn.addEventListener("click", () => {
        this.clothShopPreviewGear = null;
        this.renderClothingShopModal();
      });
      targetEl.appendChild(resetBtn);
    }
  }

  private renderWardrobeModal(): void {
    const sum = this.scene.inventory.getSummary();
    const { totalWeightKg } = this.scene.getSurvivalSnapshot();
    const equipped = this.scene.getEquippedGear();
    const activeHair = this.scene.getHairId();
    const ownedHairIds = new Set(this.scene.getOwnedHairIds());
    const gender = this.scene.getGender();

    this.wardrobeStatsEl.replaceChildren();
    for (const txt of [
      gender === "female" ? "👩 Nhân Vật: Nữ" : "👨 Nhân Vật: Nam",
      `🪙 Ví: ${sum.walletGold.toLocaleString("vi-VN")} Vàng`,
      `📦 Balo: ${sum.usedCells}/${sum.totalCells} ô`,
      `⚖️ Mang theo: ${totalWeightKg.toFixed(1)} kg`,
    ]) {
      const s = document.createElement("span");
      s.className = "bag-stat-pill";
      s.textContent = txt;
      this.wardrobeStatsEl.appendChild(s);
    }

    this.renderGearSummaryBox(this.wardrobeThermalEl);
    void this.drawDollPreviewCanvas(this.wardrobePreviewCanvas);

    this.wardrobeHairListEl.replaceChildren();
    for (const h of HAIR_OPTIONS) {
      if (!ownedHairIds.has(h.id)) continue;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `hair-chip${h.id === activeHair ? " is-active" : ""}`;
      chip.textContent = h.name;
      chip.addEventListener("click", () => {
        const res = this.scene.setHairId(h.id);
        if (!res.ok) this.showDiscoveryToast("Tiệm Tóc", res.message);
        this.renderWardrobeModal();
      });
      this.wardrobeHairListEl.appendChild(chip);
    }

    this.wardrobeSlotsEl.replaceChildren();
    const slotDefs: Array<[EquipmentSlot, string]> = [
      ["hat", "Mũ"],
      ["accessory", "Phụ kiện"],
      ["torso", "Áo"],
      ["legs", "Quần"],
      ["feet", "Giày"],
    ];
    for (const [slot, label] of slotDefs) {
      const gId = equipped[slot];
      const def = gId ? GARMENT_BY_ID[gId] : null;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slot-pill-btn";
      btn.textContent = `${label}: ${def ? `${def.badge} ${def.name}` : "Trống"}`;
      btn.disabled = !def;
      if (def) {
        btn.addEventListener("click", () => {
          const destZone = this.scene.inventory.getBackpackTier() ? "backpack" : "safebox";
          const res = this.scene.unequipSlotTo(slot, destZone);
          this.showDiscoveryToast(
            res.ok ? (destZone === "safebox" ? "🔐 Đã tháo cất Safebox" : "🎒 Đã tháo cất vào Balo") : "Không đủ ô trống",
            res.message,
          );
          this.refreshBagBadge();
          this.updateSurvivalHud();
          this.renderWardrobeModal();
        });
      }
      this.wardrobeSlotsEl.appendChild(btn);
    }

    const wornBp = this.scene.inventory.getBackpackTier();
    const bpPill = document.createElement("button");
    bpPill.type = "button";
    bpPill.className = "slot-pill-btn";
    bpPill.textContent = wornBp
      ? `Balo: 🎒 ${wornBp.name} (${wornBp.cols}×${wornBp.rows})`
      : "Balo: Chưa đeo";
    bpPill.disabled = !wornBp;
    if (wornBp) {
      bpPill.addEventListener("click", () => {
        const res = this.scene.unequipEquippedBackpackTo("safebox");
        this.showDiscoveryToast(res.ok ? "🔐 Đã cất Balo vào Safebox" : "Không thể tháo Balo", res.message);
        this.refreshBagBadge();
        this.updateSurvivalHud();
        this.renderWardrobeModal();
      });
    }
    this.wardrobeSlotsEl.appendChild(bpPill);

    this.wardrobeOwnedListEl.replaceChildren();
    const spareEntries: Array<{
      zone: "backpack" | "safebox";
      inst: GridItemInstance;
      iDef: CollectibleItemDef;
      gDef: GarmentDef | null;
      isBackpack: boolean;
    }> = [];
    for (const [zone, list] of [
      ["backpack", this.scene.inventory.getBackpackItems()],
      ["safebox", this.scene.inventory.getSafeboxItems()],
    ] as const) {
      for (const inst of list) {
        const iDef = ITEM_BY_ID[inst.itemId];
        if (!iDef) continue;
        const gDef = iDef.garmentId ? GARMENT_BY_ID[iDef.garmentId] ?? null : null;
        const isBackpack = Boolean(iDef.backpackId);
        if (gDef || isBackpack) {
          spareEntries.push({ zone, inst, iDef, gDef, isBackpack });
        }
      }
    }

    if (spareEntries.length === 0) {
      const empty = document.createElement("div");
      empty.className = "inspector-placeholder";
      empty.textContent = "Trống.";
      this.wardrobeOwnedListEl.appendChild(empty);
      return;
    }

    for (const { zone, inst, iDef, gDef, isBackpack } of spareEntries) {
      const card = document.createElement("div");
      card.className = "shop-item-card";

      const head = document.createElement("div");
      head.className = "shop-item-head";
      const title = document.createElement("div");
      title.className = "shop-item-title";
      title.textContent = gDef ? `${gDef.badge} ${gDef.name}` : `🎒 ${iDef.name}`;
      const tag = document.createElement("span");
      tag.className = "shop-item-tag";
      tag.textContent = `${zone === "safebox" ? "Safebox" : "Balo"} • ⚖️ ${iDef.weightKg}kg`;
      head.append(title, tag);

      const stats = document.createElement("div");
      stats.className = "shop-item-stats";
      stats.textContent = gDef ? this.formatGarmentStatsText(gDef) : iDef.description;

      const actions = document.createElement("div");
      actions.className = "shop-item-actions";
      const equipBtn = document.createElement("button");
      equipBtn.type = "button";
      equipBtn.className = "btn-card-primary";
      equipBtn.textContent = isBackpack ? "🎒 Đeo Balo này" : "👕 Mặc lên người";
      equipBtn.addEventListener("click", () => {
        if (isBackpack) {
          const res = this.scene.equipBackpackFromInventory(zone, inst.uid);
          this.showDiscoveryToast(res.ok ? "🎒 Đã thay Balo" : "Không thể đeo Balo", res.message);
        } else {
          const res = this.scene.equipGarmentFromInventory(zone, inst.uid);
          this.showDiscoveryToast(res.ok ? "👕 Thay trang phục" : "Không thể mặc", res.message);
        }
        this.refreshBagBadge();
        this.updateSurvivalHud();
        this.renderWardrobeModal();
      });
      actions.appendChild(equipBtn);
      card.append(head, stats, actions);
      this.wardrobeOwnedListEl.appendChild(card);
    }
  }

  private renderClothingShopModal(): void {
    const sum = this.scene.inventory.getSummary();
    const equipped = this.scene.getEquippedGear();
    const activeMap = this.scene.getActiveMapId();

    this.clothShopStatsEl.replaceChildren();
    for (const txt of [
      `🗺️ ${MAP_LABELS[activeMap]}`,
      `🪙 Ví: ${sum.walletGold.toLocaleString("vi-VN")} Vàng`,
      `📦 Balo: ${sum.usedCells}/${sum.totalCells} ô`,
    ]) {
      const s = document.createElement("span");
      s.className = "bag-stat-pill";
      s.textContent = txt;
      this.clothShopStatsEl.appendChild(s);
    }

    const activePreviewGear = this.clothShopPreviewGear ?? equipped;
    this.renderGearSummaryBox(this.clothShopEquipSummaryEl, this.clothShopPreviewGear);
    void this.drawDollPreviewCanvas(this.clothShopPreviewCanvas, { equipped: activePreviewGear });

    const slotNames: Record<EquipmentSlot, string> = {
      hat: "Mũ",
      torso: "Áo",
      legs: "Quần",
      feet: "Giày",
      accessory: "Phụ kiện",
    };

    // Render saved outfit presets ("Lưu bộ ngoại trang / Mua nhanh cả bộ")
    this.clothShopPresetsListEl.replaceChildren();
    const presets = this.scene.getSavedOutfits();
    if (presets.length === 0) {
      const ph = document.createElement("div");
      ph.className = "shop-item-desc";
      ph.textContent = "Chưa lưu bộ nào.";
      this.clothShopPresetsListEl.appendChild(ph);
    } else {
      for (const preset of presets) {
        const plan = this.scene.previewOutfitPresetPurchase(preset.id);
        const pCard = document.createElement("div");
        pCard.className = "cloth-preset-card";

        const pHead = document.createElement("div");
        pHead.className = "cloth-preset-head";
        const pName = document.createElement("span");
        pName.className = "cloth-preset-name";
        pName.textContent = preset.name;
        const pDel = document.createElement("button");
        pDel.type = "button";
        pDel.className = "btn-preset-del";
        pDel.textContent = "🗑️ Xóa";
        pDel.addEventListener("click", () => {
          this.scene.deleteSavedOutfitPreset(preset.id);
          this.showDiscoveryToast("🗑️ Đã xóa bộ", preset.name);
          this.renderClothingShopModal();
        });
        pHead.append(pName, pDel);

        const itemNames: string[] = [];
        for (const sl of ["hat", "torso", "legs", "feet", "accessory"] as const) {
          const gid = preset.gear[sl];
          const gdef = gid ? GARMENT_BY_ID[gid] : null;
          if (gdef) itemNames.push(`${gdef.badge} ${gdef.name}`);
        }
        const pItems = document.createElement("div");
        pItems.className = "cloth-preset-items";
        pItems.textContent = itemNames.join(" • ");

        const pActions = document.createElement("div");
        pActions.className = "cloth-preset-actions";

        const trySetBtn = document.createElement("button");
        trySetBtn.type = "button";
        trySetBtn.className = "btn-card-try";
        trySetBtn.textContent = "👁️ Thử cả bộ";
        trySetBtn.addEventListener("click", () => {
          const next = { ...equipped };
          for (const sl of ["hat", "torso", "legs", "feet", "accessory"] as const) {
            if (preset.gear[sl]) next[sl] = preset.gear[sl];
          }
          this.clothShopPreviewGear = next;
          this.renderClothingShopModal();
        });

        const quickBuyBtn = document.createElement("button");
        quickBuyBtn.type = "button";
        quickBuyBtn.className = "btn-card-primary";
        const alreadyAll =
          plan.ok && plan.equipFromOwned.length === 0 && plan.missingBuy.length === 0;
        quickBuyBtn.textContent = alreadyAll
          ? "✓ Đang mặc đủ bộ"
          : plan.totalCost > 0
            ? `⚡ Mua & Mặc (${plan.totalCost.toLocaleString("vi-VN")})`
            : "👕 Mặc từ đồ sẵn (0đ)";
        quickBuyBtn.disabled = alreadyAll;
        quickBuyBtn.addEventListener("click", () => {
          const detailParts: string[] = [];
          if (plan.missingBuy.length > 0) {
            detailParts.push(
              `Mua mới (${plan.missingBuy.length}): ${plan.missingBuy.map((m) => `${m.def.name} (${m.def.priceGold})`).join(", ")}`,
            );
          }
          if (plan.equipFromOwned.length > 0) {
            detailParts.push(
              `Lấy từ túi (${plan.equipFromOwned.length}): ${plan.equipFromOwned.map((o) => o.def.name).join(", ")}`,
            );
          }
          if (plan.alreadyWorn.length > 0) {
            detailParts.push(`Đang mặc sẵn: ${plan.alreadyWorn.length} món`);
          }
          this.openPurchaseConfirm({
            subtitle: "👔 Mua Nhanh Cả Bộ Trang Phục",
            itemTitle: `⚡ ${preset.name}`,
            itemDesc: detailParts.join(" • ") || itemNames.join(" • "),
            priceGold: plan.totalCost,
            bagLine:
              plan.displacedSlots.length > 0
                ? `Cất ${plan.displacedSlots.length} đồ cũ vào Balo/Safebox`
                : "Thay trực tiếp không tốn thêm ô Balo",
            blockedReason: plan.blockedReason ?? null,
            altAction: plan.blockedReason
              ? { label: "🎒 Mở Balo dọn chỗ", onSelect: () => this.openBagDirect() }
              : undefined,
            onConfirm: () => {
              const res = this.scene.buyAndEquipOutfitPreset(preset.id);
              this.showDiscoveryToast(res.ok ? "⚡ Hoàn tất mặc cả bộ" : "Không thể mua bộ", res.message);
              if (res.ok) {
                this.clothShopPreviewGear = null;
                this.refreshBagBadge();
                this.updateSurvivalHud();
                this.renderClothingShopModal();
              }
            },
          });
        });

        pActions.append(trySetBtn, quickBuyBtn);
        pCard.append(pHead, pItems, pActions);
        this.clothShopPresetsListEl.appendChild(pCard);
      }
    }

    this.clothShopListEl.replaceChildren();
    for (const g of GARMENT_CATALOG) {
      if (g.priceGold === 0 || g.excludeFromShop) continue;
      if ((g.mapOrigin ?? "vietnam") !== activeMap) continue;
      const isEquipped = equipped[g.slot] === g.id;
      const isTrying = this.clothShopPreviewGear?.[g.slot] === g.id;

      const card = document.createElement("div");
      card.className = `shop-item-card${isEquipped ? " is-equipped" : ""}`;

      const head = document.createElement("div");
      head.className = "shop-item-head";
      const title = document.createElement("div");
      title.className = "shop-item-title";
      title.textContent = `${g.badge} ${g.name}`;
      const tag = document.createElement("span");
      tag.className = "shop-item-tag";
      tag.textContent = slotNames[g.slot];
      head.append(title, tag);

      const stats = document.createElement("div");
      stats.className = "shop-item-stats";
      stats.textContent = this.formatGarmentStatsText(g);

      const desc = document.createElement("div");
      desc.className = "shop-item-desc";
      desc.textContent = g.description;

      const actions = document.createElement("div");
      actions.className = "shop-item-actions";

      const tryBtn = document.createElement("button");
      tryBtn.type = "button";
      tryBtn.className = `btn-card-try${isTrying ? " is-trying" : ""}`;
      tryBtn.textContent = isTrying ? "👁️ Đang thử" : "👁️ Thử";
      tryBtn.addEventListener("click", () => {
        const nextPreview = { ...(this.clothShopPreviewGear ?? equipped) };
        nextPreview[g.slot] = g.id;
        this.clothShopPreviewGear = nextPreview;
        this.renderClothingShopModal();
      });

      const buyEquipBtn = document.createElement("button");
      buyEquipBtn.type = "button";
      buyEquipBtn.className = "btn-card-primary";
      buyEquipBtn.textContent = `🪙 Mua & Mặc (${g.priceGold})`;
      buyEquipBtn.addEventListener("click", () => {
        const prevId = equipped[g.slot];
        const prevDef = prevId ? GARMENT_BY_ID[prevId] : null;
        const swapFits =
          !prevDef ||
          Boolean(prevDef.excludeFromShop) ||
          Boolean(this.scene.inventory.canFitItemInZone("backpack", prevDef.inventoryItemId));
        this.openPurchaseConfirm({
          subtitle: "👔 Shop Quần Áo • Mua & Mặc lên người",
          itemTitle: `${g.badge} ${g.name}`,
          itemDesc: `${this.formatGarmentStatsText(g)} • ${g.description}`,
          priceGold: g.priceGold,
          bagLine: prevDef
            ? prevDef.excludeFromShop
              ? `Thay trực tiếp ${prevDef.name} (đồ tù nhân 0đ)`
              : swapFits
                ? `Đủ chỗ cất ${prevDef.name} cũ (${sum.usedCells}/${sum.totalCells} ô)`
                : `Đầy (${sum.usedCells}/${sum.totalCells} ô — thiếu ${prevDef.gridW}×${prevDef.gridH} ô)`
            : `Ô ${slotNames[g.slot]} đang trống (không tốn chỗ Balo)`,
          blockedReason:
            prevDef && !prevDef.excludeFromShop && !swapFits
              ? `⚠️ Balo đã đầy hoặc thiếu ${prevDef.gridW}×${prevDef.gridH} ô để cất ${prevDef.name} đang mặc!`
              : null,
          altAction:
            prevDef && !prevDef.excludeFromShop && !swapFits
              ? { label: "🎒 Mở Balo dọn chỗ", onSelect: () => this.openBagDirect() }
              : undefined,
          onConfirm: () => {
            const res = this.scene.buyOrEquipGarment(g.id, "equip");
            this.showDiscoveryToast(res.ok ? "🛍️ Mua & Mặc" : "Không thể mua", res.message);
            if (res.ok) {
              this.clothShopPreviewGear = null;
              this.refreshBagBadge();
              this.updateSurvivalHud();
              this.renderClothingShopModal();
            }
          },
        });
      });

      const fitsInBag = Boolean(this.scene.inventory.canFitItemInZone("backpack", g.inventoryItemId));
      const buyPackBtn = document.createElement("button");
      buyPackBtn.type = "button";
      buyPackBtn.className = "btn-card-secondary";
      buyPackBtn.textContent = fitsInBag ? "🎒 Bỏ Balo" : "🎒 Balo đầy";
      buyPackBtn.addEventListener("click", () => {
        const canFit = Boolean(this.scene.inventory.canFitItemInZone("backpack", g.inventoryItemId));
        const emptyBodySlot = !equipped[g.slot];
        this.openPurchaseConfirm({
          subtitle: "👔 Shop Quần Áo • Mua cất Balo",
          itemTitle: `${g.badge} ${g.name}`,
          itemDesc: `${this.formatGarmentStatsText(g)} • ${g.description}`,
          priceGold: g.priceGold,
          bagLine: canFit
            ? `Còn chỗ trống vừa ${g.gridW}×${g.gridH} ô (${sum.usedCells}/${sum.totalCells} ô)`
            : `Đầy (${sum.usedCells}/${sum.totalCells} ô — cần ${g.gridW}×${g.gridH} ô)`,
          blockedReason: canFit
            ? null
            : `⚠️ Balo đã đầy hoặc không còn chỗ trống ${g.gridW}×${g.gridH} ô! Hãy dọn Balo, bán bớt đồ hoặc mặc trực tiếp.`,
          altAction: canFit
            ? undefined
            : emptyBodySlot
              ? {
                  label: `👕 Mua & Mặc ngay (${g.priceGold})`,
                  onSelect: () => {
                    const res = this.scene.buyOrEquipGarment(g.id, "equip");
                    this.showDiscoveryToast(res.ok ? "🛍️ Mua & Mặc" : "Không thể mua", res.message);
                    if (res.ok) {
                      this.clothShopPreviewGear = null;
                      this.refreshBagBadge();
                      this.updateSurvivalHud();
                      this.renderClothingShopModal();
                    }
                  },
                }
              : { label: "🎒 Mở Balo dọn chỗ", onSelect: () => this.openBagDirect() },
          onConfirm: () => {
            const res = this.scene.buyOrEquipGarment(g.id, "pack");
            this.showDiscoveryToast(res.ok ? "🎒 Đã mua cất Balo" : "Không thể cất Balo", res.message);
            if (res.ok) {
              this.refreshBagBadge();
              this.updateSurvivalHud();
              this.renderClothingShopModal();
            }
          },
        });
      });

      actions.append(tryBtn, buyEquipBtn, buyPackBtn);
      card.append(head, stats, desc, actions);
      this.clothShopListEl.appendChild(card);
    }
  }

  private renderFoodShopModal(): void {
    const sum = this.scene.inventory.getSummary();
    const { state } = this.scene.getSurvivalSnapshot();
    const isPharmacy = this.foodShopMode === "pharmacy";
    const activeMap = this.scene.getActiveMapId();

    this.foodShopTitleEl.textContent = isPharmacy
      ? "💊 Hiệu Thuốc & Dược Phẩm Tăng Lực"
      : activeMap === "japan"
        ? "🍜 Quán Ramen & Trà Đạo Nhật Bản"
        : "🍜 Quán Ăn & Giải Khát Việt Nam";

    this.foodShopStatsEl.replaceChildren();
    for (const txt of [
      `🪙 Ví: ${sum.walletGold.toLocaleString("vi-VN")} Vàng`,
      `❤️ Máu: ${Math.round(state.hp)}%`,
      `🍗 Đói: ${Math.round(state.hunger)}%`,
      `⚡ Thể lực: ${Math.round(state.stamina)}%`,
    ]) {
      const s = document.createElement("span");
      s.className = "bag-stat-pill";
      s.textContent = txt;
      this.foodShopStatsEl.appendChild(s);
    }

    this.foodShopListEl.replaceChildren();
    for (const f of CONSUMABLE_CATALOG) {
      if (f.shopCategory !== this.foodShopMode) continue;
      if (!isPharmacy && (f.mapOrigin ?? "vietnam") !== activeMap) continue;
      const singlePrice = getConsumableSingleUsePrice(f);
      const card = document.createElement("div");
      card.className = "shop-item-card";

      const head = document.createElement("div");
      head.className = "shop-item-head";
      const title = document.createElement("div");
      title.className = "shop-item-title";
      title.textContent = `${f.emoji} ${f.name}`;
      const tag = document.createElement("span");
      tag.className = "shop-item-tag";
      tag.textContent = `🪙 ${f.priceGold} (${f.maxUses} lần) • 📦 ${f.gridW}×${f.gridH} ô`;
      head.append(title, tag);

      const statParts: string[] = [`🔄 Dùng ${f.maxUses} lần`, `📦 ${f.gridW}×${f.gridH} ô`];
      if (f.hungerRestore > 0) statParts.push(`🍗 +${f.hungerRestore} Đói`);
      if (f.staminaRestore > 0) statParts.push(`⚡ +${f.staminaRestore} Thể lực`);
      if (f.hpRestore > 0) statParts.push(`❤️ +${f.hpRestore} Máu`);
      if (f.tempDeltaC > 0) statParts.push(`🔥 Ấm +${f.tempDeltaC}°C`);
      else if (f.tempDeltaC < 0) statParts.push(`❄️ Mát ${f.tempDeltaC}°C`);
      if (f.staminaBoostPct) {
        statParts.push(`💊 +${f.staminaBoostPct}% Thể lực (${Math.round((f.staminaBoostDurationMs ?? 0) / 60_000)} phút)`);
      }
      const stats = document.createElement("div");
      stats.className = "shop-item-stats";
      stats.textContent = f.isFullRestore
        ? `🔄 Dùng ${f.maxUses} lần • 📦 ${f.gridW}×${f.gridH} ô • ❤️‍🩹 Hồi đầy 100% Máu + Đói + Thể lực`
        : statParts.join(" • ");

      const desc = document.createElement("div");
      desc.className = "shop-item-desc";
      desc.textContent = f.description;

      const actions = document.createElement("div");
      actions.className = "shop-item-actions";

      const eatBtn = document.createElement("button");
      eatBtn.type = "button";
      eatBtn.className = "btn-card-primary";
      eatBtn.textContent = isPharmacy
        ? `💊 Dùng 1 liều (🪙 ${singlePrice} • ${(f.useDurationMs / 1000).toFixed(1)}s)`
        : `🍽️ Ăn 1 phần (🪙 ${singlePrice} • ${(f.useDurationMs / 1000).toFixed(1)}s)`;
      eatBtn.addEventListener("click", () => {
        this.openPurchaseConfirm({
          subtitle: isPharmacy ? "💊 Hiệu Thuốc & Dược Phẩm" : "🍜 Quán Ăn & Giải Khát",
          itemTitle: `${f.emoji} ${f.name} (1 lần)`,
          itemDesc: `${stats.textContent} • ${f.description}`,
          priceGold: singlePrice,
          onConfirm: () => {
            const res = this.scene.buyConsumable(f.id, "eat");
            if (!res.ok) {
              this.showDiscoveryToast("Không thể dùng", res.message);
            } else {
              this.updateConsumeProgressToast();
            }
          },
        });
      });

      const foodFits = Boolean(this.scene.inventory.canFitItemInZone("backpack", f.inventoryItemId));
      const packBtn = document.createElement("button");
      packBtn.type = "button";
      packBtn.className = "btn-card-secondary";
      packBtn.textContent = foodFits
        ? `🎒 Mua mang theo (${f.maxUses} lần • 🪙 ${f.priceGold})`
        : `🎒 Không đủ ${f.gridW}×${f.gridH} ô`;
      packBtn.addEventListener("click", () => {
        const curSum = this.scene.inventory.getSummary();
        const canFit = Boolean(this.scene.inventory.canFitItemInZone("backpack", f.inventoryItemId));
        this.openPurchaseConfirm({
          subtitle: isPharmacy ? "💊 Hiệu Thuốc • Mua bỏ Balo" : "🍜 Quán Ăn • Mua bỏ Balo",
          itemTitle: `${f.emoji} ${f.name}`,
          itemDesc: `⚖️ ${f.weightKg} kg (${f.gridW}×${f.gridH} ô • Dùng ${f.maxUses} lần) • ${stats.textContent}`,
          priceGold: f.priceGold,
          bagLine: canFit
            ? `Đủ chỗ ${f.gridW}×${f.gridH} ô (${curSum.usedCells}/${curSum.totalCells} ô)`
            : `Không đủ ${f.gridW}×${f.gridH} ô (${curSum.usedCells}/${curSum.totalCells} ô)`,
          blockedReason: canFit
            ? null
            : `⚠️ Balo không đủ ${f.gridW}×${f.gridH} ô trống (${curSum.usedCells}/${curSum.totalCells} ô)! Bạn có thể dùng 1 phần tại chỗ hoặc dọn Balo.`,
          altAction: canFit
            ? undefined
            : {
                label: isPharmacy ? `💊 Dùng 1 liều (${singlePrice})` : `🍽️ Ăn 1 phần (${singlePrice})`,
                onSelect: () => {
                  const res = this.scene.buyConsumable(f.id, "eat");
                  if (!res.ok) {
                    this.showDiscoveryToast("Không thể dùng", res.message);
                  } else {
                    this.updateConsumeProgressToast();
                  }
                },
              },
          onConfirm: () => {
            const res = this.scene.buyConsumable(f.id, "pack");
            this.showDiscoveryToast(res.ok ? "🎒 Đã mua mang theo" : "Không thể cất", res.message);
            if (res.ok) {
              this.refreshBagBadge();
              this.renderFoodShopModal();
            }
          },
        });
      });

      actions.append(eatBtn, packBtn);
      card.append(head, stats, desc, actions);
      this.foodShopListEl.appendChild(card);
    }
  }

  private renderHairShopModal(): void {
    const sum = this.scene.inventory.getSummary();
    const activeHairId = this.scene.getHairId();
    const ownedSet = new Set(this.scene.getOwnedHairIds());
    const previewHairId = this.hairShopPreviewId ?? activeHairId;
    const previewHair = HAIR_BY_ID[previewHairId] ?? HAIR_OPTIONS[0];
    const activeHair = HAIR_BY_ID[activeHairId] ?? HAIR_OPTIONS[0];

    this.hairShopStatsEl.replaceChildren();
    for (const txt of [
      `🪙 Ví: ${sum.walletGold.toLocaleString("vi-VN")} Vàng`,
      `💇 Tóc đang để: ${activeHair.name}`,
    ]) {
      const s = document.createElement("span");
      s.className = "bag-stat-pill";
      s.textContent = txt;
      this.hairShopStatsEl.appendChild(s);
    }

    this.hairShopSummaryEl.replaceChildren();
    const summaryLines = [
      this.hairShopPreviewId && this.hairShopPreviewId !== activeHairId
        ? `👁️ Đang thử: ${previewHair.name}`
        : `✨ Hiện tại: ${activeHair.name}`,
      "Kiểu tóc đã mua sẽ được lưu vĩnh viễn để đổi lại trong mục 👤 Trang bị.",
    ];
    for (const line of summaryLines) {
      const div = document.createElement("div");
      div.textContent = line;
      this.hairShopSummaryEl.appendChild(div);
    }

    void this.drawDollPreviewCanvas(this.hairShopPreviewCanvas, { hairId: previewHairId });

    this.hairShopListEl.replaceChildren();
    for (const h of HAIR_OPTIONS) {
      const isOwned = ownedSet.has(h.id);
      const isCurrent = h.id === activeHairId;
      const isTrying = previewHairId === h.id && h.id !== activeHairId;

      const card = document.createElement("div");
      card.className = `shop-item-card${isCurrent ? " is-equipped" : ""}`;

      const head = document.createElement("div");
      head.className = "shop-item-head";
      const title = document.createElement("div");
      title.className = "shop-item-title";
      title.textContent = `${h.badge} ${h.name}`;
      const tag = document.createElement("span");
      tag.className = "shop-item-tag";
      tag.textContent = isCurrent ? "Đang để" : isOwned ? "Đã sở hữu" : `🪙 ${h.priceGold}`;
      head.append(title, tag);

      const desc = document.createElement("div");
      desc.className = "shop-item-desc";
      desc.textContent = h.description;

      const actions = document.createElement("div");
      actions.className = "shop-item-actions";

      const tryBtn = document.createElement("button");
      tryBtn.type = "button";
      tryBtn.className = `btn-card-try${isTrying ? " is-trying" : ""}`;
      tryBtn.textContent = isTrying ? "👁️ Đang thử" : "👁️ Thử";
      tryBtn.addEventListener("click", () => {
        this.hairShopPreviewId = h.id;
        this.renderHairShopModal();
      });

      const buyBtn = document.createElement("button");
      buyBtn.type = "button";
      buyBtn.className = "btn-card-primary";
      if (isCurrent) {
        buyBtn.textContent = "✓ Đang dùng";
        buyBtn.disabled = true;
      } else if (isOwned) {
        buyBtn.textContent = "💇 Đổi sang kiểu này";
      } else {
        buyBtn.textContent = `✂️ Mua & Cắt (${h.priceGold})`;
      }
      buyBtn.addEventListener("click", () => {
        if (isOwned || h.priceGold === 0) {
          const res = this.scene.buyOrEquipHair(h.id);
          this.showDiscoveryToast(res.ok ? "💇 Tiệm Tóc" : "Không thể đổi tóc", res.message);
          if (res.ok) {
            this.hairShopPreviewId = null;
            this.refreshBagBadge();
            this.renderHairShopModal();
          }
          return;
        }
        this.openPurchaseConfirm({
          subtitle: "💇 Tiệm Tóc & Tạo Mẫu",
          itemTitle: `${h.badge} ${h.name}`,
          itemDesc: `${h.description} (Lưu vĩnh viễn để đổi lại sau này.)`,
          priceGold: h.priceGold,
          onConfirm: () => {
            const res = this.scene.buyOrEquipHair(h.id);
            this.showDiscoveryToast(res.ok ? "💇 Tiệm Tóc" : "Không thể đổi tóc", res.message);
            if (res.ok) {
              this.hairShopPreviewId = null;
              this.refreshBagBadge();
              this.renderHairShopModal();
            }
          },
        });
      });

      actions.append(tryBtn, buyBtn);
      card.append(head, desc, actions);
      this.hairShopListEl.appendChild(card);
    }
  }

  private renderAirportModal(): void {
    const sum = this.scene.inventory.getSummary();
    const activeMap = this.scene.getActiveMapId();
    const targetMap: MapId = activeMap === "vietnam" ? "japan" : "vietnam";
    const curGender = this.scene.getGender();
    const nextGender: CharacterGender = curGender === "male" ? "female" : "male";
    const env = this.scene.weatherService.getEnvironmentState();

    this.airportStatsEl.replaceChildren();
    for (const txt of [
      `🗺️ Đang ở: ${MAP_LABELS[activeMap]}`,
      `🪙 Ví: ${sum.walletGold.toLocaleString("vi-VN")} Vàng`,
      `🛫 Vé VN⇄Nhật: ${AIRPORT_JAPAN_FLIGHT_COST.toLocaleString("vi-VN")} Vàng`,
      `🇹🇭 Vé Thái Lan: ${AIRPORT_GENDER_CHANGE_COST.toLocaleString("vi-VN")} Vàng`,
    ]) {
      const s = document.createElement("span");
      s.className = "bag-stat-pill";
      s.textContent = txt;
      this.airportStatsEl.appendChild(s);
    }

    // Tab 1: Vietnam <-> Japan Map Flight
    this.airportFlightRouteEl.replaceChildren();
    const fromSpan = document.createElement("span");
    fromSpan.textContent = activeMap === "vietnam" ? "🛫 Hà Nội (HAN)" : "🛫 Tokyo Narita (NRT)";
    const arrowSpan = document.createElement("span");
    arrowSpan.className = "airport-route-arrow";
    arrowSpan.textContent = "────── ✈️ ──────▶";
    const toSpan = document.createElement("span");
    toSpan.textContent = targetMap === "japan" ? "🛬 Tokyo, Nhật Bản (NRT)" : "🛬 Hà Nội, Việt Nam (HAN)";
    this.airportFlightRouteEl.append(fromSpan, arrowSpan, toSpan);

    this.airportFlightInfoEl.replaceChildren();
    const makeMapCard = (label: string, title: string, desc: string, isTarget: boolean) => {
      const card = document.createElement("div");
      card.className = `airport-map-card${isTarget ? " is-target" : ""}`;
      const lblEl = document.createElement("div");
      lblEl.className = "airport-map-card-label";
      lblEl.textContent = label;
      const ttlEl = document.createElement("div");
      ttlEl.className = "airport-map-card-title";
      ttlEl.textContent = title;
      const dscEl = document.createElement("div");
      dscEl.className = "airport-map-card-desc";
      dscEl.textContent = desc;
      card.append(lblEl, ttlEl, dscEl);
      return card;
    };

    if (activeMap === "vietnam") {
      this.airportFlightInfoEl.append(
        makeMapCard(
          "Vị trí hiện tại",
          "🇻🇳 Việt Nam",
          `Giờ Hà Nội ${env.hanoiTimeText} • ${env.temperatureC}°C (${env.conditionLabel}). Có Nhà riêng, Phòng Sưu Tầm & Hoàng Thành.`,
          false,
        ),
        makeMapCard(
          "Điểm đến tiếp theo",
          "🇯🇵 Nhật Bản",
          "Đô thị Tokyo an toàn • Nông thôn Samurai • Núi tuyết Hokkaido giá rét (10 món ăn Nhật, 10 trang phục Nhật & thời tiết tuyết rơi/bão tuyết khắc nghiệt).",
          true,
        ),
      );
      this.airportFlightNoteEl.textContent =
        `Chuyến bay ${AIRPORT_JAPAN_FLIGHT_COST.toLocaleString("vi-VN")} Vàng đưa bạn sang Nhật Bản (Tokyo – Nông thôn Samurai – Núi tuyết) với đồng hồ thực Tokyo (UTC+9), cảnh sát gắt gao và băng tuyết gây hạ thân nhiệt. Balo, Safebox và Phòng Sưu Tầm đồng bộ xuyên bản đồ.`;
      this.airportFlyMapBtn.textContent = `🛫 Bay sang Nhật Bản (🪙 ${AIRPORT_JAPAN_FLIGHT_COST.toLocaleString("vi-VN")})`;
    } else {
      this.airportFlightInfoEl.append(
        makeMapCard(
          "Vị trí hiện tại",
          "🇯🇵 Nhật Bản",
          `Giờ thực Tokyo ${env.hanoiTimeText} • ${env.temperatureC}°C (${env.conditionLabel}). Đô thị Tokyo, Nông thôn Samurai & Núi tuyết Shogun.`,
          false,
        ),
        makeMapCard(
          "Điểm đến tiếp theo",
          "🇻🇳 Việt Nam",
          "Quay về Khu Phố An Toàn, Đồng Bằng Trù Phú & Khu Vực Hoang Dã / Hoàng Thành Cổ với thời tiết trực tiếp Hà Nội.",
          true,
        ),
      );
      this.airportFlightNoteEl.textContent =
        "Chuyến bay khứ hồi đưa bạn từ sân bay Tokyo Narita trở về Việt Nam. Toàn bộ báu vật Nhật Bản vừa săn được vẫn nằm an toàn trong balo và Phòng Sưu Tầm.";
      this.airportFlyMapBtn.textContent = `🛫 Bay về Việt Nam (🪙 ${AIRPORT_JAPAN_FLIGHT_COST.toLocaleString("vi-VN")})`;
    }

    // Tab 2: Preserved Thailand Gender Switch
    this.airportThailandOriginEl.textContent =
      activeMap === "japan" ? "🛫 Narita, Tokyo (NRT)" : "🛫 Nội Bài, Hà Nội (HAN)";

    this.airportCurLabelEl.textContent =
      curGender === "female" ? "Hiện tại: 👩 Nữ" : "Hiện tại: 👨 Nam";
    this.airportNextLabelEl.textContent =
      nextGender === "female" ? "Sau chuyến bay: 👩 Nữ" : "Sau chuyến bay: 👨 Nam";

    void this.drawDollPreviewCanvas(this.airportCurCanvas, { gender: curGender });
    void this.drawDollPreviewCanvas(this.airportNextCanvas, { gender: nextGender });

    this.airportNoteEl.textContent =
      `Chuyến bay chuyên biệt sang Bangkok (Thái Lan). Sau khi đổi sang nhân vật ${nextGender === "female" ? "Nữ" : "Nam"}, toàn bộ trang bị, balo, cân nặng, đồ sưu tầm và vị trí bản đồ vẫn giữ nguyên vẹn.`;

    this.airportFlyBtn.textContent =
      nextGender === "female"
        ? `✈️ Bay Thái Lan ➝ Chuyển sang Nữ (🪙 ${AIRPORT_GENDER_CHANGE_COST})`
        : `✈️ Bay Thái Lan ➝ Chuyển sang Nam (🪙 ${AIRPORT_GENDER_CHANGE_COST})`;
  }

  private loadLpcPreviewImage(layerKey: string): Promise<HTMLImageElement | null> {
    const cached = this.lpcImageCache.get(layerKey);
    if (cached) return Promise.resolve(cached);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.lpcImageCache.set(layerKey, img);
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = withAssetHash(`assets/world/lpc/${layerKey}.png`);
    });
  }

  private async drawDollPreviewCanvas(
    canvas: HTMLCanvasElement,
    overrides?: {
      equipped?: EquippedGear;
      hairId?: string;
      gender?: CharacterGender;
    },
  ): Promise<void> {
    const equipped = overrides?.equipped ?? this.scene.getEquippedGear();
    const hairId = overrides?.hairId ?? this.scene.getHairId();
    const gender = overrides?.gender ?? this.scene.getGender();
    const hairDef = HAIR_OPTIONS.find((h) => h.id === hairId) ?? HAIR_OPTIONS[0];
    const hatDef = equipped.hat ? GARMENT_BY_ID[equipped.hat] : null;
    const accDef = equipped.accessory ? GARMENT_BY_ID[equipped.accessory] : null;

    const orderedLayers: Array<{ key: string; tint: number }> = [];
    if (accDef?.bgLayerKey) orderedLayers.push({ key: accDef.bgLayerKey, tint: accDef.tint });
    orderedLayers.push({ key: gender === "female" ? "body_female" : "body_male", tint: 0xffffff });
    for (const slot of ["feet", "legs", "torso"] as const) {
      const id = equipped[slot];
      const def = id ? GARMENT_BY_ID[id] : null;
      if (def) orderedLayers.push({ key: resolveGarmentLayerKey(def, gender), tint: def.tint });
    }
    orderedLayers.push({ key: gender === "female" ? "head_female" : "head_male", tint: 0xffffff });
    if (!hatDef?.hidesHair) {
      orderedLayers.push({ key: hairDef.layerKey, tint: hairDef.tint });
    }
    if (accDef) orderedLayers.push({ key: accDef.layerKey, tint: accDef.tint });
    if (hatDef) orderedLayers.push({ key: resolveGarmentLayerKey(hatDef, gender), tint: hatDef.tint });

    await this.drawLpcLayersToCanvas(canvas, orderedLayers, getCharacterBodyScale(gender));
  }

  private async drawPolicePreviewCanvas(
    canvas: HTMLCanvasElement,
    isJapan: boolean,
    zone: SecurityZone,
  ): Promise<void> {
    const tints = isJapan
      ? zone === "red"
        ? { feet: 0x09090b, legs: 0x18181b, torso: 0xdc2626, hat: 0xfacc15 }
        : { feet: 0x1e293b, legs: 0x1e1b4b, torso: 0x38bdf8, hat: 0xfef08a }
      : { feet: 0x334155, legs: 0x1e293b, torso: 0xdbeafe, hat: 0x1d4ed8 };

    const orderedLayers: Array<{ key: string; tint: number }> = [
      { key: "body_male", tint: 0xffffff },
      { key: "feet_boots", tint: tints.feet },
      { key: "legs_formal", tint: tints.legs },
      { key: "torso_jacket_navy", tint: tints.torso },
      { key: "head_male", tint: 0xffffff },
      { key: "hat_cap", tint: tints.hat },
    ];
    await this.drawLpcLayersToCanvas(canvas, orderedLayers, { x: 1.05, y: 1.05 });
  }

  private async drawLpcLayersToCanvas(
    canvas: HTMLCanvasElement,
    orderedLayers: Array<{ key: string; tint: number }>,
    bodyScale: { x: number; y: number },
  ): Promise<void> {
    const loaded = await Promise.all(
      orderedLayers.map(async (entry) => ({
        img: await this.loadLpcPreviewImage(entry.key),
        tint: entry.tint,
      })),
    );

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    const tintCanvas = document.createElement("canvas");
    tintCanvas.width = 64;
    tintCanvas.height = 64;
    const tCtx = tintCanvas.getContext("2d")!;
    tCtx.imageSmoothingEnabled = false;

    const drawW = canvas.width * bodyScale.x;
    const drawH = canvas.height * bodyScale.y;
    const drawX = (canvas.width - drawW) / 2;
    const drawY = (canvas.height - drawH) * 0.94;

    for (const layer of loaded) {
      if (!layer.img) continue;
      // Row 2 (y=128), Col 0 (x=0) is standing front-facing frame
      if (layer.tint === 0xffffff) {
        ctx.drawImage(layer.img, 0, 128, 64, 64, drawX, drawY, drawW, drawH);
        continue;
      }
      tCtx.clearRect(0, 0, 64, 64);
      tCtx.globalCompositeOperation = "source-over";
      tCtx.drawImage(layer.img, 0, 128, 64, 64, 0, 0, 64, 64);
      tCtx.globalCompositeOperation = "multiply";
      tCtx.fillStyle = `#${layer.tint.toString(16).padStart(6, "0")}`;
      tCtx.fillRect(0, 0, 64, 64);
      tCtx.globalCompositeOperation = "destination-in";
      tCtx.drawImage(layer.img, 0, 128, 64, 64, 0, 0, 64, 64);
      ctx.drawImage(tintCanvas, 0, 0, 64, 64, drawX, drawY, drawW, drawH);
    }
  }

  private updateDetentionCountdown(remainingMs: number): void {
    const totalSec = Math.max(1, Math.ceil(remainingMs / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    this.detentionCountdownEl.textContent =
      mins > 0
        ? `⏳ Còn ${mins}:${String(secs).padStart(2, "0")}`
        : `⏳ Còn ${secs}s`;
  }

  private advancePoliceMinigame(dtSeconds: number): void {
    if (!this.isPoliceModalOpen || !this.policeGame) return;
    const g = this.policeGame;
    if (g.gameKind !== "police_4x4") return;
    const dtMs = Math.min(Math.max(dtSeconds, 0), 0.1) * 1000;

    if (g.phase === "preview") {
      g.flashTimerMs += dtMs;
      const stepDurMs = g.zone === "red" ? 550 : 560;
      const litDurMs = g.zone === "red" ? 410 : 420;
      const nextStep = Math.floor(g.flashTimerMs / stepDurMs);
      if (nextStep >= g.sequence.length) {
        g.phase = "input";
        g.flashIdx = -1;
        this.renderPoliceModal();
        return;
      }
      if (nextStep !== g.flashIdx || (g.flashTimerMs % stepDurMs >= litDurMs && g.flashIdx !== -1)) {
        const shouldLit = g.flashTimerMs % stepDurMs < litDurMs;
        const targetVal = shouldLit ? nextStep : -1;
        if (g.flashIdx !== targetVal) {
          g.flashIdx = targetVal;
          this.syncPoliceCellStates();
        }
      }
      return;
    }

    if (g.phase === "input") {
      g.inputRemainingMs = Math.max(0, g.inputRemainingMs - dtMs);
      this.policeTimerFillEl.style.width = `${((g.inputRemainingMs / g.inputMaxMs) * 100).toFixed(1)}%`;
      this.policeStatusEl.textContent = `⏱️ Bấm lại đúng thứ tự (${g.picked.length}/${g.sequence.length}) • Còn ${(g.inputRemainingMs / 1000).toFixed(1)}s`;
      if (g.inputRemainingMs <= 0) {
        this.handlePoliceRoundResult(false);
      }
    }
  }

  private syncPoliceCellStates(): void {
    const g = this.policeGame;
    if (!g) return;
    const cells = this.policeGridEl.querySelectorAll<HTMLButtonElement>(".police-cell");
    const activeFlashCell = g.phase === "preview" && g.flashIdx >= 0 ? g.sequence[g.flashIdx] : -1;

    cells.forEach((btn, idx) => {
      const pickedOrder = g.picked.indexOf(idx);
      btn.classList.toggle("is-flash", idx === activeFlashCell);
      btn.classList.toggle("is-picked", pickedOrder !== -1);
      btn.classList.remove("is-wrong");
      btn.disabled = g.phase !== "input" || pickedOrder !== -1;
      if (idx === activeFlashCell) {
        btn.textContent = String(g.flashIdx + 1);
      } else if (pickedOrder !== -1) {
        btn.textContent = String(pickedOrder + 1);
      } else {
        btn.textContent = "";
      }
    });
  }

  private renderPoliceModal(): void {
    const g = this.policeGame;
    if (!g) return;

    const zoneLabel = g.zone === "red" ? "🔴 Vùng Đỏ" : "🟡 Vùng Vàng";
    const gameTitleMap: Record<"police_4x4" | ArcadeMinigameKind, string> = {
      police_4x4: "🚓 Kiểm Tra — Ghi Nhớ 4×4",
      memory_cards: "🚓 Kiểm Tra — Lật Thẻ Cặp",
      lockpick: "🚓 Kiểm Tra — Bẻ Khóa 4 Chốt",
      timing_bar: "🚓 Kiểm Tra — Chặn Thanh Trượt",
    };
    this.policeTitleEl.textContent = gameTitleMap[g.gameKind];

    this.policeStatsEl.replaceChildren();
    for (const txt of [
      `👮 ${g.officerName}`,
      zoneLabel,
      `🎯 Lượt ${g.attempt}/${g.maxAttempts}`,
      `⚠️ Sai: ${g.fails}/${g.maxFails} (Đúng 1 là qua)`,
    ]) {
      const s = document.createElement("span");
      s.className = "bag-stat-pill";
      s.textContent = txt;
      this.policeStatsEl.appendChild(s);
    }

    const is4x4 = g.gameKind === "police_4x4";
    this.policeTimerTrackEl.classList.toggle("is-hidden", !is4x4);
    this.policeGridEl.classList.toggle("is-hidden", !is4x4);
    this.policeArcadeStageEl.classList.toggle("is-hidden", is4x4);

    if (!is4x4) {
      this.policeGridEl.replaceChildren();
      const arcadeKind = g.gameKind as ArcadeMinigameKind;
      this.policeArcadeCtrl = new ArcadeMinigameController({
        kind: arcadeKind,
        mode: "police",
        difficulty: g.difficulty,
        extraMisses: g.zone === "red" ? 1 : 0,
        boardEl: this.policeArcadeStageEl,
        statusEl: this.policeStatusEl,
        onWin: () => this.handlePoliceRoundResult(true),
        onFail: () => this.handlePoliceRoundResult(false),
      });
      return;
    }

    this.policeArcadeStageEl.replaceChildren();

    if (g.phase === "preview") {
      this.policeStatusEl.textContent = `👀 Quan sát kỹ ${g.sequence.length} ô sáng theo thứ tự 1 → ${g.sequence.length}...`;
      this.policeTimerFillEl.style.width = "100%";
    } else {
      this.policeStatusEl.textContent = `⏱️ Bấm lại đúng thứ tự (${g.picked.length}/${g.sequence.length}) • Còn ${(g.inputRemainingMs / 1000).toFixed(1)}s`;
    }

    if (this.policeGridEl.children.length !== 16) {
      this.policeGridEl.replaceChildren();
      for (let i = 0; i < 16; i++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "police-cell";
        cell.addEventListener("click", () => {
          const game = this.policeGame;
          if (!game || game.gameKind !== "police_4x4" || game.phase !== "input") return;
          const expected = game.sequence[game.picked.length];
          if (i === expected) {
            game.picked.push(i);
            this.syncPoliceCellStates();
            if (game.picked.length >= game.sequence.length) {
              this.handlePoliceRoundResult(true);
            }
          } else {
            cell.classList.add("is-wrong");
            this.handlePoliceRoundResult(false);
          }
        });
        this.policeGridEl.appendChild(cell);
      }
    }

    this.syncPoliceCellStates();
  }
}
