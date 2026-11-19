export interface PlotTierDef {
  tier: number;
  name: string;
  cols: number;
  rows: number;
  costGold: number;
  minReputation: number;
  desc: string;
}

export interface HouseModelDef {
  id: string;
  tier: number;
  name: string;
  subtitle: string;
  spriteKind: string;
  assetSrc: string;
  blueprintCostGold: number;
  buildCostGold: number;
  demolishCostGold: number;
  demolishRefundGold: number;
  storageCols: number;
  storageRows: number;
  staminaRecoveryBonusPct: number;
  dailyDividendGold: number;
  glowColor: number;
  orbitRadiusX: number;
  orbitRadiusY: number;
  orbitCount: number;
  features: string[];
}

export interface PlayerEstateState {
  plotTier: number; // 0: chưa mua, 1: 1x1, 2: 2x2, 3: 3x3, 4: 4x4
  houseId: string | null; // null nếu là đất trống chưa xây hoặc đã phá dỡ
  purchasedAt: number;
  lastDividendDay?: number; // epoch day index Math.floor(Date.now() / 86400000)
  ownerName?: string; // Tên chủ sở hữu dinh thự (Bảo mật tuyệt đối, người khác không thể loot)
  ownedTileIndices: number[]; // Legacy 0..15 (giữ tương thích ngược)
  ownedWorldTiles?: string[]; // Tọa độ thế giới các ô 1x1 đã mua trong Khu Biệt Thự ("col,row")
  houseOrigin?: { c: number; r: number }; // Điểm neo góc trên-trái (tọa độ thế giới col, row) của ngôi nhà
}

export const TILE_PRICE_BASE_GOLD = 37_500;
export const TILE_DISCOUNT_PCT = 30; // Giảm giá thêm 30% cho mỗi ô đất
export const TILE_PRICE_GOLD = Math.round((TILE_PRICE_BASE_GOLD * (100 - TILE_DISCOUNT_PCT)) / 100); // 26.250🪙/ô
export const TILE_SELL_REFUND_PCT = 70; // Hoàn lại 70% giá mua hiện tại khi bán ô đất
export const TILE_SELL_REFUND_GOLD = Math.round((TILE_PRICE_GOLD * TILE_SELL_REFUND_PCT) / 100); // 18.375🪙/ô
export const PARCEL_COLS = 4;
export const PARCEL_ROWS = 4;
export const TOTAL_PARCEL_TILES = 16;

// Lô đất mặc định khi migrate từ save cũ (Lô mặt tiền hồ Nam: col 13..16, row 13..16)
export const LEGACY_DEFAULT_LOT_COL = 13;
export const LEGACY_DEFAULT_LOT_ROW = 13;

export interface EstateDistrictLot {
  id: string;
  name: string;
  col0: number;
  row0: number;
  cols: number;
  rows: number;
}

// Toàn bộ 15 lô 4x4 (240 ô đất 1x1) nằm trọn trong Khu Biệt Thự Vùng Xanh
export const ESTATE_DISTRICT_LOTS: EstateDistrictLot[] = [
  // 6 Lô Hàng Bắc (row 2..5)
  { id: "north_1", name: "Bắc Tây 1", col0: 3, row0: 2, cols: 4, rows: 4 },
  { id: "north_2", name: "Bắc Tây 2", col0: 8, row0: 2, cols: 4, rows: 4 },
  { id: "north_3", name: "Ven Hồ Bắc Tây", col0: 13, row0: 2, cols: 4, rows: 4 },
  { id: "north_4", name: "Ven Hồ Bắc Đông", col0: 17, row0: 2, cols: 4, rows: 4 },
  { id: "north_5", name: "Bắc Đông 1", col0: 22, row0: 2, cols: 4, rows: 4 },
  { id: "north_6", name: "Bắc Đông 2", col0: 27, row0: 2, cols: 4, rows: 4 },
  // 3 Lô Hàng Giữa (row 7..10, hai bên hồ & công viên)
  { id: "mid_west", name: "Công Viên Tây", col0: 8, row0: 7, cols: 4, rows: 4 },
  { id: "mid_east_1", name: "Công Viên Đông", col0: 22, row0: 7, cols: 4, rows: 4 },
  { id: "mid_east_2", name: "Biệt Thự Đông", col0: 27, row0: 7, cols: 4, rows: 4 },
  // 6 Lô Hàng Nam (row 13..16)
  { id: "south_1", name: "Nam Tây 1", col0: 3, row0: 13, cols: 4, rows: 4 },
  { id: "south_2", name: "Nam Tây 2", col0: 8, row0: 13, cols: 4, rows: 4 },
  { id: "south_3", name: "Ven Hồ Nam Tây", col0: 13, row0: 13, cols: 4, rows: 4 },
  { id: "south_4", name: "Ven Hồ Nam Đông", col0: 17, row0: 13, cols: 4, rows: 4 },
  { id: "south_5", name: "Nam Đông 1", col0: 22, row0: 13, cols: 4, rows: 4 },
  { id: "south_6", name: "Nam Đông 2", col0: 27, row0: 13, cols: 4, rows: 4 },
];

export const TOTAL_DISTRICT_TILES = 240;

export interface HouseTierAuraConfig {
  tier: number;
  name: string;
  primaryColor: number;
  secondaryColor: number;
  highlightColor: number;
  radiusX: number;
  radiusY: number;
  pulseSpeed: number;
  sparkCount: number;
  description: string;
}

export const HOUSE_TIER_AURA_CONFIG: Record<number, HouseTierAuraConfig> = {
  1: {
    tier: 1,
    name: "Ánh Đèn Hiên Ấm Áp",
    primaryColor: 0xf59e0b,
    secondaryColor: 0xd97706,
    highlightColor: 0xfef3c7,
    radiusX: 26,
    radiusY: 11,
    pulseSpeed: 1.5,
    sparkCount: 2,
    description: "Ánh đèn hiên nhà vàng nến rất nhẹ, ấm cúng tự nhiên.",
  },
  2: {
    tier: 2,
    name: "Ánh Sáng Sân Vườn Dịu",
    primaryColor: 0x10b981,
    secondaryColor: 0x059669,
    highlightColor: 0xa7f3d0,
    radiusX: 54,
    radiusY: 22,
    pulseSpeed: 2.0,
    sparkCount: 4,
    description: "Quầng sáng xanh ngọc dịu mát ôm quanh sân vườn cùng đom đóm nhẹ.",
  },
  3: {
    tier: 3,
    name: "Hào Quang Lam Ngọc Bạch Kim",
    primaryColor: 0x38bdf8,
    secondaryColor: 0x0284c7,
    highlightColor: 0xe0f2fe,
    radiusX: 88,
    radiusY: 34,
    pulseSpeed: 2.5,
    sparkCount: 6,
    description: "Vòng ánh sáng lam ngọc & bạch kim tinh tế, sang trọng chuẩn dinh thự.",
  },
  4: {
    tier: 4,
    name: "Hào Quang Hoàng Kim Đế Vương",
    primaryColor: 0xf59e0b,
    secondaryColor: 0xd97706,
    highlightColor: 0xfde047,
    radiusX: 122,
    radiusY: 46,
    pulseSpeed: 3.0,
    sparkCount: 10,
    description: "Vòng hào quang vàng kim hoàng gia rực rỡ cùng bụi sao vàng bay lên.",
  },
};

export function createDefaultPlayerEstateState(): PlayerEstateState {
  return {
    plotTier: 0,
    houseId: null,
    purchasedAt: 0,
    lastDividendDay: 0,
    ownedTileIndices: [],
    ownedWorldTiles: [],
    houseOrigin: { c: LEGACY_DEFAULT_LOT_COL, r: LEGACY_DEFAULT_LOT_ROW },
  };
}

export const PLOT_TIERS: Record<number, PlotTierDef> = {
  1: {
    tier: 1,
    name: "Lô Đất Tân Thủ (1×1)",
    cols: 1,
    rows: 1,
    costGold: 15_000,
    minReputation: 200,
    desc: "Ô đất diện tích 1×1 (48×48 px) ven hồ, thích hợp xây dựng nhà gỗ nhỏ và nhà tranh ấm cúng.",
  },
  2: {
    tier: 2,
    name: "Lô Đất Biệt Thự Vườn (2×2)",
    cols: 2,
    rows: 2,
    costGold: 60_000,
    minReputation: 800,
    desc: "Ô đất diện tích 2×2 (96×96 px), không gian thoáng đãng cho biệt thự 2 tầng và sân vườn phong thủy.",
  },
  3: {
    tier: 3,
    name: "Lô Đất Đại Dinh Thự (3×3)",
    cols: 3,
    rows: 3,
    costGold: 200_000,
    minReputation: 2_500,
    desc: "Ô đất diện tích 3×3 (144×144 px) đắc địa, xứng tầm đại dinh thự hoàng gia và cung điện cẩm thạch.",
  },
  4: {
    tier: 4,
    name: "Lô Đất Kỳ Quan Lâu Đài (4×4)",
    cols: 4,
    rows: 4,
    costGold: 600_000,
    minReputation: 6_000,
    desc: "Ô đất diện tích 4×4 (192×192 px) tối thượng, vị trí vương giả cho đại pháo đài và lâu đài huyền thoại.",
  },
};

export const HOUSE_MODELS: Record<string, HouseModelDef> = {
  // === TIER 1 (Đất 1x1) ===
  tier1_01_gable_cottage: {
    id: "tier1_01_gable_cottage",
    tier: 1,
    name: "Nhà Gỗ Mái Dốc Hoa Cỏ",
    subtitle: "Mái ngói dốc đứng, ống khói đá và dàn hoa leo vách gỗ",
    spriteKind: "tier1_01_gable_cottage",
    assetSrc: "assets/world/estates/tier1_01_gable_cottage.png",
    blueprintCostGold: 33_000,
    buildCostGold: 5_000,
    demolishCostGold: 2_000,
    demolishRefundGold: 10_000,
    storageCols: 4,
    storageRows: 4,
    staminaRecoveryBonusPct: 30,
    dailyDividendGold: 1_000,
    glowColor: 0x34d399,
    orbitRadiusX: 68,
    orbitRadiusY: 26,
    orbitCount: 3,
    features: ["Kho đồ vĩnh viễn 4×4 (16 ô)", "Hồi thể lực +30% khi ở nhà", "Cổ tức hoàng gia +1.000🪙 / ngày", "3 bảo vật đỏ bay quanh nóc"],
  },
  tier1_02_thatched_cottage: {
    id: "tier1_02_thatched_cottage",
    tier: 1,
    name: "Nhà Tranh Nông Thôn Cổ Điển",
    subtitle: "Mái rơm ấm áp phong cách đồng quê Bắc Âu mộc mạc",
    spriteKind: "tier1_02_thatched_cottage",
    assetSrc: "assets/world/estates/tier1_02_thatched_cottage.png",
    blueprintCostGold: 36_000,
    buildCostGold: 5_000,
    demolishCostGold: 2_000,
    demolishRefundGold: 11_000,
    storageCols: 4,
    storageRows: 4,
    staminaRecoveryBonusPct: 35,
    dailyDividendGold: 1_200,
    glowColor: 0x34d399,
    orbitRadiusX: 66,
    orbitRadiusY: 25,
    orbitCount: 3,
    features: ["Kho đồ vĩnh viễn 4×4 (16 ô)", "Hồi thể lực +35% khi ở nhà", "Cổ tức hoàng gia +1.200🪙 / ngày", "3 bảo vật đỏ bay quanh nóc"],
  },
  tier1_03_town_house_mini: {
    id: "tier1_03_town_house_mini",
    tier: 1,
    name: "Nhà Phố Châu Âu Cổ Kính",
    subtitle: "2 tầng gạch nung thanh lịch, ban công hoa kiểu Pháp",
    spriteKind: "tier1_03_town_house_mini",
    assetSrc: "assets/world/estates/tier1_03_town_house_mini.png",
    blueprintCostGold: 37_000,
    buildCostGold: 5_000,
    demolishCostGold: 2_000,
    demolishRefundGold: 11_500,
    storageCols: 4,
    storageRows: 4,
    staminaRecoveryBonusPct: 38,
    dailyDividendGold: 1_300,
    glowColor: 0x34d399,
    orbitRadiusX: 64,
    orbitRadiusY: 24,
    orbitCount: 3,
    features: ["Kho đồ vĩnh viễn 4×4 (16 ô)", "Hồi thể lực +38% khi ở nhà", "Cổ tức hoàng gia +1.300🪙 / ngày", "3 bảo vật đỏ bay quanh nóc"],
  },
  tier1_04_bakery_cozy: {
    id: "tier1_04_bakery_cozy",
    tier: 1,
    name: "Tiệm Mái Ngói Đỏ Ấm Áp",
    subtitle: "Mái vòm sọc cổ điển, lò sưởi ấm cúng và đèn lồng trước hiên",
    spriteKind: "tier1_04_bakery_cozy",
    assetSrc: "assets/world/estates/tier1_04_bakery_cozy.png",
    blueprintCostGold: 38_000,
    buildCostGold: 5_000,
    demolishCostGold: 2_000,
    demolishRefundGold: 12_000,
    storageCols: 4,
    storageRows: 4,
    staminaRecoveryBonusPct: 40,
    dailyDividendGold: 1_500,
    glowColor: 0x34d399,
    orbitRadiusX: 66,
    orbitRadiusY: 25,
    orbitCount: 3,
    features: ["Kho đồ vĩnh viễn 4×4 (16 ô)", "Hồi thể lực +40% khi ở nhà", "Cổ tức hoàng gia +1.500🪙 / ngày", "3 bảo vật đỏ bay quanh nóc"],
  },

  // === TIER 2 (Đất 2x2) ===
  tier2_01_courtyard_tree: {
    id: "tier2_01_courtyard_tree",
    tier: 2,
    name: "Biệt Viện Cổ Thụ Nở Hoa",
    subtitle: "Dinh thự 2 tầng mái ngói xanh với sân trong trồng hoa tím rực rỡ",
    spriteKind: "tier2_01_courtyard_tree",
    assetSrc: "assets/world/estates/tier2_01_courtyard_tree.png",
    blueprintCostGold: 110_000,
    buildCostGold: 15_000,
    demolishCostGold: 8_000,
    demolishRefundGold: 33_000,
    storageCols: 5,
    storageRows: 5,
    staminaRecoveryBonusPct: 75,
    dailyDividendGold: 3_000,
    glowColor: 0x38bdf8,
    orbitRadiusX: 92,
    orbitRadiusY: 34,
    orbitCount: 5,
    features: ["Kho đồ vĩnh viễn 5×5 (25 ô)", "Hồi thể lực +75%", "Cổ tức hoàng gia +3.000🪙 / ngày", "5 bảo vật đỏ bay quanh sân hoa"],
  },
  tier2_02_balcony_villa: {
    id: "tier2_02_balcony_villa",
    tier: 2,
    name: "Biệt Thự Ban Công Sắt Mỹ Thuật",
    subtitle: "Lan can sắt rèn nghệ thuật, hoa leo rủ quanh cửa kính lớn",
    spriteKind: "tier2_02_balcony_villa",
    assetSrc: "assets/world/estates/tier2_02_balcony_villa.png",
    blueprintCostGold: 120_000,
    buildCostGold: 15_000,
    demolishCostGold: 8_000,
    demolishRefundGold: 36_000,
    storageCols: 5,
    storageRows: 5,
    staminaRecoveryBonusPct: 80,
    dailyDividendGold: 3_500,
    glowColor: 0x38bdf8,
    orbitRadiusX: 90,
    orbitRadiusY: 33,
    orbitCount: 5,
    features: ["Kho đồ vĩnh viễn 5×5 (25 ô)", "Hồi thể lực +80%", "Cổ tức hoàng gia +3.500🪙 / ngày", "5 bảo vật đỏ bay quanh ban công"],
  },
  tier2_03_corner_tower_manor: {
    id: "tier2_03_corner_tower_manor",
    tier: 2,
    name: "Dinh Thự Tháp Nhọn Cổ Kính",
    subtitle: "Tháp canh nón đá xám phong cách lâu đài mini Châu Âu",
    spriteKind: "tier2_03_corner_tower_manor",
    assetSrc: "assets/world/estates/tier2_03_corner_tower_manor.png",
    blueprintCostGold: 125_000,
    buildCostGold: 15_000,
    demolishCostGold: 8_000,
    demolishRefundGold: 37_500,
    storageCols: 5,
    storageRows: 5,
    staminaRecoveryBonusPct: 85,
    dailyDividendGold: 3_800,
    glowColor: 0x38bdf8,
    orbitRadiusX: 94,
    orbitRadiusY: 35,
    orbitCount: 5,
    features: ["Kho đồ vĩnh viễn 5×5 (25 ô)", "Hồi thể lực +85%", "Cổ tức hoàng gia +3.800🪙 / ngày", "5 bảo vật đỏ bay quanh đỉnh tháp"],
  },
  tier2_04_observatory_villa: {
    id: "tier2_04_observatory_villa",
    tier: 2,
    name: "Biệt Thự Mái Vòm Thiên Văn",
    subtitle: "Đài thiên văn ngắm sao đêm kết hợp sân vườn thư giãn",
    spriteKind: "tier2_04_observatory_villa",
    assetSrc: "assets/world/estates/tier2_04_observatory_villa.png",
    blueprintCostGold: 130_000,
    buildCostGold: 15_000,
    demolishCostGold: 8_000,
    demolishRefundGold: 39_000,
    storageCols: 5,
    storageRows: 5,
    staminaRecoveryBonusPct: 90,
    dailyDividendGold: 4_000,
    glowColor: 0x38bdf8,
    orbitRadiusX: 96,
    orbitRadiusY: 36,
    orbitCount: 5,
    features: ["Kho đồ vĩnh viễn 5×5 (25 ô)", "Hồi thể lực +90%", "Cổ tức hoàng gia +4.000🪙 / ngày", "5 bảo vật đỏ bay quanh đài sao"],
  },

  // === TIER 3 (Đất 3x3) ===
  tier3_01_grand_mansion_u: {
    id: "tier3_01_grand_mansion_u",
    tier: 3,
    name: "Đại Dinh Thự Chữ U Quý Tộc",
    subtitle: "Kiến trúc chữ U đồ sộ, sân cẩm thạch, nhiều gian mái dốc nguy nga",
    spriteKind: "tier3_01_grand_mansion_u",
    assetSrc: "assets/world/estates/tier3_01_grand_mansion_u.png",
    blueprintCostGold: 350_000,
    buildCostGold: 50_000,
    demolishCostGold: 25_000,
    demolishRefundGold: 105_000,
    storageCols: 7,
    storageRows: 6,
    staminaRecoveryBonusPct: 150,
    dailyDividendGold: 8_000,
    glowColor: 0xf59e0b,
    orbitRadiusX: 125,
    orbitRadiusY: 45,
    orbitCount: 8,
    features: ["Kho đồ vĩnh viễn 7×6 (42 ô)", "Hồi thể lực +150%", "Cổ tức hoàng gia +8.000🪙 / ngày", "8 bảo vật đỏ phát kim quang 360°"],
  },
  tier3_02_clock_tower_hall: {
    id: "tier3_02_clock_tower_hall",
    tier: 3,
    name: "Dinh Thự Tháp Chuông Hoàng Đế",
    subtitle: "Tháp đồng hồ kim sắc vút cao, mái vòm đồng và cửa sổ phù điêu",
    spriteKind: "tier3_02_clock_tower_hall",
    assetSrc: "assets/world/estates/tier3_02_clock_tower_hall.png",
    blueprintCostGold: 380_000,
    buildCostGold: 50_000,
    demolishCostGold: 25_000,
    demolishRefundGold: 114_000,
    storageCols: 7,
    storageRows: 6,
    staminaRecoveryBonusPct: 160,
    dailyDividendGold: 9_000,
    glowColor: 0xf59e0b,
    orbitRadiusX: 128,
    orbitRadiusY: 46,
    orbitCount: 8,
    features: ["Kho đồ vĩnh viễn 7×6 (42 ô)", "Hồi thể lực +160%", "Cổ tức hoàng gia +9.000🪙 / ngày", "8 bảo vật đỏ bay quanh tháp chuông"],
  },
  tier3_03_marble_palace: {
    id: "tier3_03_marble_palace",
    tier: 3,
    name: "Cung Điện Bậc Thang Cẩm Thạch",
    subtitle: "Hàng cột La Mã uy nghi với bậc tam cấp trải rộng quyền quý",
    spriteKind: "tier3_03_marble_palace",
    assetSrc: "assets/world/estates/tier3_03_marble_palace.png",
    blueprintCostGold: 400_000,
    buildCostGold: 50_000,
    demolishCostGold: 25_000,
    demolishRefundGold: 120_000,
    storageCols: 7,
    storageRows: 6,
    staminaRecoveryBonusPct: 170,
    dailyDividendGold: 10_000,
    glowColor: 0xf59e0b,
    orbitRadiusX: 130,
    orbitRadiusY: 47,
    orbitCount: 8,
    features: ["Kho đồ vĩnh viễn 7×6 (42 ô)", "Hồi thể lực +170%", "Cổ tức hoàng gia +10.000🪙 / ngày", "8 bảo vật đỏ bay quanh hàng cột"],
  },
  tier3_04_crystal_glasshouse: {
    id: "tier3_04_crystal_glasshouse",
    tier: 3,
    name: "Cung Điện Pha Lê Mái Vòm",
    subtitle: "Nhà kính hoàng gia với vòm pha lê khổng lồ phát quang lấp lánh",
    spriteKind: "tier3_04_crystal_glasshouse",
    assetSrc: "assets/world/estates/tier3_04_crystal_glasshouse.png",
    blueprintCostGold: 420_000,
    buildCostGold: 50_000,
    demolishCostGold: 25_000,
    demolishRefundGold: 126_000,
    storageCols: 7,
    storageRows: 6,
    staminaRecoveryBonusPct: 180,
    dailyDividendGold: 12_000,
    glowColor: 0xf59e0b,
    orbitRadiusX: 132,
    orbitRadiusY: 48,
    orbitCount: 8,
    features: ["Kho đồ vĩnh viễn 7×6 (42 ô)", "Hồi thể lực +180%", "Cổ tức hoàng gia +12.000🪙 / ngày", "8 bảo vật đỏ bay quanh vòm pha lê"],
  },

  // === TIER 4 (Đất 4x4) ===
  tier4_01_concentric_castle: {
    id: "tier4_01_concentric_castle",
    tier: 4,
    name: "Đại Pháo Đài Đồng Tâm 4 Tháp",
    subtitle: "Siêu lâu đài thành lũy kiên cố, 4 tháp canh góc, cổng vòm cẩu đá",
    spriteKind: "tier4_01_concentric_castle",
    assetSrc: "assets/world/estates/tier4_01_concentric_castle.png",
    blueprintCostGold: 1_000_000,
    buildCostGold: 150_000,
    demolishCostGold: 70_000,
    demolishRefundGold: 300_000,
    storageCols: 10,
    storageRows: 8,
    staminaRecoveryBonusPct: 250,
    dailyDividendGold: 20_000,
    glowColor: 0xd946ef,
    orbitRadiusX: 160,
    orbitRadiusY: 55,
    orbitCount: 12,
    features: ["Kho Vô Cực 10×8 (80 ô)", "Hồi thể lực +250%", "Cổ tức hoàng gia +20.000🪙 / ngày", "12 bảo vật đỏ bay quanh thành lũy kèm vệt sao rơi"],
  },
  tier4_02_octagon_castle: {
    id: "tier4_02_octagon_castle",
    tier: 4,
    name: "Lâu Đài Bát Giác Hoàng Quyền",
    subtitle: "Pháo đài bát giác bề thế với tháp trung tâm đồ sộ và hào nước",
    spriteKind: "tier4_02_octagon_castle",
    assetSrc: "assets/world/estates/tier4_02_octagon_castle.png",
    blueprintCostGold: 1_100_000,
    buildCostGold: 150_000,
    demolishCostGold: 70_000,
    demolishRefundGold: 330_000,
    storageCols: 10,
    storageRows: 8,
    staminaRecoveryBonusPct: 260,
    dailyDividendGold: 22_000,
    glowColor: 0xd946ef,
    orbitRadiusX: 162,
    orbitRadiusY: 56,
    orbitCount: 12,
    features: ["Kho Vô Cực 10×8 (80 ô)", "Hồi thể lực +260%", "Cổ tức hoàng gia +22.000🪙 / ngày", "12 bảo vật đỏ bay quanh hào nước"],
  },
  tier4_03_cathedral_spire_palace: {
    id: "tier4_03_cathedral_spire_palace",
    tier: 4,
    name: "Cung Điện Thánh Đường Gothic",
    subtitle: "Đỉnh tháp chọc trời, cửa sổ kính màu hoa hồng phát quang đa sắc",
    spriteKind: "tier4_03_cathedral_spire_palace",
    assetSrc: "assets/world/estates/tier4_03_cathedral_spire_palace.png",
    blueprintCostGold: 1_150_000,
    buildCostGold: 150_000,
    demolishCostGold: 70_000,
    demolishRefundGold: 345_000,
    storageCols: 10,
    storageRows: 8,
    staminaRecoveryBonusPct: 280,
    dailyDividendGold: 25_000,
    glowColor: 0xd946ef,
    orbitRadiusX: 165,
    orbitRadiusY: 58,
    orbitCount: 12,
    features: ["Kho Vô Cực 10×8 (80 ô)", "Hồi thể lực +280%", "Cổ tức hoàng gia +25.000🪙 / ngày", "12 bảo vật đỏ bay quanh đỉnh tháp chọc trời"],
  },
  tier4_04_twin_spired_abbey: {
    id: "tier4_04_twin_spired_abbey",
    tier: 4,
    name: "Đế Vương Cung Tháp Đôi",
    subtitle: "Kỳ quan cao nhất bản đồ với 2 tháp nhọn song sinh dát vàng kiêu hãnh",
    spriteKind: "tier4_04_twin_spired_abbey",
    assetSrc: "assets/world/estates/tier4_04_twin_spired_abbey.png",
    blueprintCostGold: 1_200_000,
    buildCostGold: 150_000,
    demolishCostGold: 70_000,
    demolishRefundGold: 360_000,
    storageCols: 10,
    storageRows: 8,
    staminaRecoveryBonusPct: 300,
    dailyDividendGold: 30_000,
    glowColor: 0xd946ef,
    orbitRadiusX: 168,
    orbitRadiusY: 60,
    orbitCount: 12,
    features: ["Kho Vô Cực 10×8 (80 ô)", "Hồi thể lực +300%", "Cổ tức hoàng gia +30.000🪙 / ngày", "12 bảo vật đỏ bay quanh tháp đôi hoàng tộc"],
  },
};

// Giảm giá thêm 30% trên mức đã giảm 70% (0.30 * 0.70 = 0.21 => tổng giảm 79% toàn bộ 16 mẫu nhà)
export const HOUSE_DISCOUNT_PCT = 79;
const HOUSE_PRICE_MULTIPLIER = (100 - HOUSE_DISCOUNT_PCT) / 100;
for (const model of Object.values(HOUSE_MODELS)) {
  model.blueprintCostGold = Math.round(model.blueprintCostGold * HOUSE_PRICE_MULTIPLIER);
  model.buildCostGold = Math.round(model.buildCostGold * HOUSE_PRICE_MULTIPLIER);
  model.demolishCostGold = Math.round(model.demolishCostGold * HOUSE_PRICE_MULTIPLIER);
  model.demolishRefundGold = Math.round(model.demolishRefundGold * HOUSE_PRICE_MULTIPLIER);
}

export function canClaimDailyDividend(estate: PlayerEstateState): boolean {
  if (!estate.houseId) return false;
  const currentDay = Math.floor(Date.now() / 86_400_000);
  return (estate.lastDividendDay ?? 0) < currentDay;
}

export function getPlotTierDef(tier: number): PlotTierDef | null {
  return PLOT_TIERS[tier] ?? null;
}

export function getHouseModelDef(id: string | null): HouseModelDef | null {
  if (!id) return null;
  return HOUSE_MODELS[id] ?? null;
}

export function getModelsForTier(tier: number): HouseModelDef[] {
  return Object.values(HOUSE_MODELS).filter((m) => m.tier === tier);
}

export function getTileIndex(c: number, r: number): number {
  return r * PARCEL_COLS + c;
}

export function getTileCoord(index: number): { c: number; r: number } {
  return {
    c: index % PARCEL_COLS,
    r: Math.floor(index / PARCEL_COLS),
  };
}

export function getRequiredTilesForHouse(tier: number, anchorC: number, anchorR: number): number[] {
  const result: number[] = [];
  for (let r = 0; r < tier; r++) {
    for (let c = 0; c < tier; c++) {
      const curC = anchorC + c;
      const curR = anchorR + r;
      if (curC < PARCEL_COLS && curR < PARCEL_ROWS) {
        result.push(getTileIndex(curC, curR));
      }
    }
  }
  return result;
}

export function canBuildHouseAt(
  ownedTiles: number[],
  tier: number,
  anchorC: number,
  anchorR: number,
): { ok: boolean; requiredTiles: number[]; missingTiles: number[] } {
  if (anchorC < 0 || anchorR < 0 || anchorC + tier > PARCEL_COLS || anchorR + tier > PARCEL_ROWS) {
    return { ok: false, requiredTiles: [], missingTiles: [] };
  }
  const ownedSet = new Set(ownedTiles);
  const requiredTiles = getRequiredTilesForHouse(tier, anchorC, anchorR);
  const missingTiles = requiredTiles.filter((t) => !ownedSet.has(t));
  return {
    ok: missingTiles.length === 0,
    requiredTiles,
    missingTiles,
  };
}

export function findFirstValidHouseAnchor(
  ownedTiles: number[],
  tier: number,
): { c: number; r: number } | null {
  const maxAnchor = PARCEL_COLS - tier;
  for (let r = 0; r <= maxAnchor; r++) {
    for (let c = 0; c <= maxAnchor; c++) {
      const check = canBuildHouseAt(ownedTiles, tier, c, r);
      if (check.ok) return { c, r };
    }
  }
  return null;
}

export function computeMaxOwnedTier(ownedTiles: number[]): number {
  const count = ownedTiles.length;
  if (count >= 16) return 4;
  for (let tier = 3; tier >= 1; tier--) {
    if (findFirstValidHouseAnchor(ownedTiles, tier) !== null) {
      return tier;
    }
  }
  return 0;
}

export function makeWorldTileKey(col: number, row: number): string {
  return `${col},${row}`;
}

export function parseWorldTileKey(key: string): { c: number; r: number } | null {
  const parts = key.split(",");
  if (parts.length !== 2) return null;
  const c = Number(parts[0]);
  const r = Number(parts[1]);
  if (!Number.isInteger(c) || !Number.isInteger(r)) return null;
  return { c, r };
}

export interface WorldTileCoord {
  c: number;
  r: number;
  key: string;
  lotId: string;
  lotName: string;
}

const PURCHASABLE_TILE_MAP = new Map<string, WorldTileCoord>();
export const ALL_PURCHASABLE_ESTATE_TILES: WorldTileCoord[] = [];

for (const lot of ESTATE_DISTRICT_LOTS) {
  for (let r = lot.row0; r < lot.row0 + lot.rows; r++) {
    for (let c = lot.col0; c < lot.col0 + lot.cols; c++) {
      const key = makeWorldTileKey(c, r);
      if (!PURCHASABLE_TILE_MAP.has(key)) {
        const entry: WorldTileCoord = { c, r, key, lotId: lot.id, lotName: lot.name };
        PURCHASABLE_TILE_MAP.set(key, entry);
        ALL_PURCHASABLE_ESTATE_TILES.push(entry);
      }
    }
  }
}

export function isPurchasableEstateTile(col: number, row: number): boolean {
  return PURCHASABLE_TILE_MAP.has(makeWorldTileKey(col, row));
}

export function getEstateTileInfo(col: number, row: number): WorldTileCoord | null {
  return PURCHASABLE_TILE_MAP.get(makeWorldTileKey(col, row)) ?? null;
}

export function canBuildHouseAtWorld(
  ownedWorldTiles: string[],
  tier: number,
  originC: number,
  originR: number,
): {
  ok: boolean;
  requiredKeys: string[];
  missingKeys: string[];
  blockedKeys: string[];
} {
  const ownedSet = new Set(ownedWorldTiles);
  const requiredKeys: string[] = [];
  const missingKeys: string[] = [];
  const blockedKeys: string[] = [];

  for (let dr = 0; dr < tier; dr++) {
    for (let dc = 0; dc < tier; dc++) {
      const curC = originC + dc;
      const curR = originR + dr;
      const key = makeWorldTileKey(curC, curR);
      requiredKeys.push(key);
      if (!isPurchasableEstateTile(curC, curR)) {
        blockedKeys.push(key);
      } else if (!ownedSet.has(key)) {
        missingKeys.push(key);
      }
    }
  }

  return {
    ok: blockedKeys.length === 0 && missingKeys.length === 0 && requiredKeys.length === tier * tier,
    requiredKeys,
    missingKeys,
    blockedKeys,
  };
}

export function findFirstValidHouseAnchorWorld(
  ownedWorldTiles: string[],
  tier: number,
): { c: number; r: number } | null {
  if (ownedWorldTiles.length < tier * tier) return null;
  for (const key of ownedWorldTiles) {
    const pt = parseWorldTileKey(key);
    if (!pt) continue;
    const check = canBuildHouseAtWorld(ownedWorldTiles, tier, pt.c, pt.r);
    if (check.ok) return pt;
  }
  return null;
}

export function computeMaxOwnedTierWorld(ownedWorldTiles: string[]): number {
  if (ownedWorldTiles.length === 0) return 0;
  for (let tier = 4; tier >= 1; tier--) {
    if (findFirstValidHouseAnchorWorld(ownedWorldTiles, tier) !== null) {
      return tier;
    }
  }
  return 0;
}

export function normalizeEstateOwnedTiles(estate: PlayerEstateState): void {
  if (!Array.isArray(estate.ownedTileIndices)) {
    estate.ownedTileIndices = [];
  }
  if (!Array.isArray(estate.ownedWorldTiles) || estate.ownedWorldTiles.length === 0) {
    const migrated: string[] = [];
    if (estate.ownedTileIndices.length > 0) {
      for (const idx of estate.ownedTileIndices) {
        if (idx >= 0 && idx < 16) {
          const { c, r } = getTileCoord(idx);
          const wc = LEGACY_DEFAULT_LOT_COL + c;
          const wr = LEGACY_DEFAULT_LOT_ROW + r;
          if (isPurchasableEstateTile(wc, wr)) {
            migrated.push(makeWorldTileKey(wc, wr));
          }
        }
      }
    } else if (estate.plotTier > 0) {
      const legacyIndices =
        estate.plotTier === 1
          ? [0]
          : estate.plotTier === 2
            ? [0, 1, 4, 5]
            : estate.plotTier === 3
              ? [0, 1, 2, 4, 5, 6, 8, 9, 10]
              : Array.from({ length: 16 }, (_, i) => i);
      estate.ownedTileIndices = legacyIndices;
      for (const idx of legacyIndices) {
        const { c, r } = getTileCoord(idx);
        migrated.push(makeWorldTileKey(LEGACY_DEFAULT_LOT_COL + c, LEGACY_DEFAULT_LOT_ROW + r));
      }
    }
    estate.ownedWorldTiles = Array.from(new Set(migrated));
  }

  // Migrate legacy houseOrigin (0..3) to world coordinates (13..16)
  if (!estate.houseOrigin) {
    estate.houseOrigin = { c: LEGACY_DEFAULT_LOT_COL, r: LEGACY_DEFAULT_LOT_ROW };
  } else if (estate.houseOrigin.c <= 3 && estate.houseOrigin.r <= 3 && !isPurchasableEstateTile(estate.houseOrigin.c, estate.houseOrigin.r)) {
    estate.houseOrigin = {
      c: LEGACY_DEFAULT_LOT_COL + estate.houseOrigin.c,
      r: LEGACY_DEFAULT_LOT_ROW + estate.houseOrigin.r,
    };
  }

  estate.plotTier = computeMaxOwnedTierWorld(estate.ownedWorldTiles);
}

export function getHouseOccupiedWorldTileSet(estate: PlayerEstateState): Set<string> {
  const occupied = new Set<string>();
  if (!estate.houseId) return occupied;
  const model = getHouseModelDef(estate.houseId);
  if (!model) return occupied;
  const originC = estate.houseOrigin?.c ?? LEGACY_DEFAULT_LOT_COL;
  const originR = estate.houseOrigin?.r ?? LEGACY_DEFAULT_LOT_ROW;
  for (let dr = 0; dr < model.tier; dr++) {
    for (let dc = 0; dc < model.tier; dc++) {
      occupied.add(makeWorldTileKey(originC + dc, originR + dr));
    }
  }
  return occupied;
}
