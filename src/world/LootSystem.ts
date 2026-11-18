import {
  CONSUMABLE_BY_ID,
  CONSUMABLE_CATALOG,
  GARMENT_CATALOG,
  type ConsumableDef,
} from "./EquipmentCatalog.ts";
import type { BiomeId, ItemRarity, MapId, SecurityZone } from "./types.ts";

export type GridZone = "backpack" | "container" | "home" | "safebox";

export type LootSourceType =
  | "trash_bin"
  | "house_standard"
  | "house_landmark"
  | "house_vault"
  | "chest_wooden"
  | "chest_royal";

export interface CollectibleItemDef {
  id: string;
  name: string;
  rarity: ItemRarity;
  w: number;
  h: number;
  weightKg: number;
  valueGold: number;
  homeBiome: BiomeId;
  mapOrigin?: MapId;
  description: string;
  iconSrc: string;
  consumableId?: string;
  garmentId?: string;
  backpackId?: string;
  excludeFromRandomLoot?: boolean;
}

export interface RarityMetaInfo {
  code: ItemRarity;
  label: string;
  fullLabel: string;
  colorName: string;
  colorHex: string;
  colorInt: number;
}

export const RARITY_META: Record<ItemRarity, RarityMetaInfo> = {
  C: {
    code: "C",
    label: "Rác",
    fullLabel: "C • Rác",
    colorName: "Trắng",
    colorHex: "#f8fafc",
    colorInt: 0xf8fafc,
  },
  B: {
    code: "B",
    label: "Thường",
    fullLabel: "B • Thường",
    colorName: "Xanh dương",
    colorHex: "#38bdf8",
    colorInt: 0x38bdf8,
  },
  A: {
    code: "A",
    label: "Hiếm",
    fullLabel: "A • Hiếm",
    colorName: "Vàng",
    colorHex: "#eab308",
    colorInt: 0xeab308,
  },
  S: {
    code: "S",
    label: "Siêu phẩm",
    fullLabel: "S • Siêu phẩm",
    colorName: "Đỏ",
    colorHex: "#ef4444",
    colorInt: 0xef4444,
  },
};

export interface BackpackTierDef {
  id: string;
  inventoryItemId: string;
  name: string;
  cols: number;
  rows: number;
  itemW: number;
  itemH: number;
  weightKg: number;
  priceGold: number;
  valueGold: number;
  rarity: ItemRarity;
  description: string;
  iconSrc: string;
}

function makeBackpackSvgUrl(cols: number, rows: number, accent: string, bg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56"><rect x="3" y="3" width="50" height="50" rx="12" fill="${bg}" stroke="${accent}" stroke-width="3"/><text x="28" y="29" text-anchor="middle" font-size="22">🎒</text><text x="28" y="45" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="11" fill="#f8fafc">${cols}×${rows}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const BACKPACK_CATALOG: readonly BackpackTierDef[] = [
  {
    id: "starter_4x4",
    inventoryItemId: "bp_starter_4x4",
    name: "Balo Tân Thủ",
    cols: 4,
    rows: 4,
    itemW: 2,
    itemH: 2,
    weightKg: 0.7,
    priceGold: 80,
    valueGold: 40,
    rarity: "C",
    description: "Trang bị mặc định 16 ô (4×4) khi khởi hành.",
    iconSrc: makeBackpackSvgUrl(4, 4, "#94a3b8", "#1e293b"),
  },
  {
    id: "scout_5x4",
    inventoryItemId: "bp_scout_5x4",
    name: "Balo Dã Ngoại",
    cols: 5,
    rows: 4,
    itemW: 2,
    itemH: 2,
    weightKg: 1.2,
    priceGold: 350,
    valueGold: 175,
    rarity: "B",
    description: "Mở rộng lên 20 ô (5×4), dễ xếp đồ cỡ 2×3.",
    iconSrc: makeBackpackSvgUrl(5, 4, "#38bdf8", "#0c4a6e"),
  },
  {
    id: "tactical_5x5",
    inventoryItemId: "bp_tactical_5x5",
    name: "Balo Chiến Thuật",
    cols: 5,
    rows: 5,
    itemW: 2,
    itemH: 3,
    weightKg: 1.7,
    priceGold: 900,
    valueGold: 450,
    rarity: "A",
    description: "Khoang chứa 25 ô (5×5) cho chuyến thám hiểm dài.",
    iconSrc: makeBackpackSvgUrl(5, 5, "#eab308", "#713f12"),
  },
  {
    id: "delta_6x6",
    inventoryItemId: "bp_delta_6x6",
    name: "Balo Đặc Nhiệm Delta",
    cols: 6,
    rows: 6,
    itemW: 2,
    itemH: 3,
    weightKg: 2.2,
    priceGold: 2200,
    valueGold: 1100,
    rarity: "A",
    description: "Chuẩn đặc nhiệm 36 ô (6×6), mang được nhiều cổ vật 3×3 & 3×4.",
    iconSrc: makeBackpackSvgUrl(6, 6, "#f59e0b", "#78350f"),
  },
  {
    id: "royal_7x6",
    inventoryItemId: "bp_royal_7x6",
    name: "Balo Không Gian Hoàng Gia",
    cols: 7,
    rows: 6,
    itemW: 3,
    itemH: 3,
    weightKg: 2.8,
    priceGold: 4800,
    valueGold: 2400,
    rarity: "S",
    description: "Dung tích tối đa 42 ô (7×6) dành cho thợ săn Siêu phẩm.",
    iconSrc: makeBackpackSvgUrl(7, 6, "#ef4444", "#7f1d1d"),
  },
];

export interface SafeboxTierDef {
  id: string;
  name: string;
  cols: number;
  rows: number;
  bonusPct?: number;
  description: string;
}

export const SAFEBOX_CATALOG: readonly SafeboxTierDef[] = [
  {
    id: "safe_2x2",
    name: "Hộp An Toàn Tân Thủ",
    cols: 2,
    rows: 2,
    description: "Miễn phí mặc định 4 ô (2×2). Vật phẩm cất bên trong không bao giờ bị mất!",
  },
  {
    id: "safe_3x3",
    name: "Két Sắt Cá Nhân",
    cols: 3,
    rows: 3,
    description: "Mở rộng vĩnh viễn lên 9 ô (3×3), đổi bằng vật phẩm cơ bản & trung cấp.",
  },
  {
    id: "safe_4x4",
    name: "Két Bảo Mật Titan",
    cols: 4,
    rows: 4,
    description: "Mở rộng vĩnh viễn lên 16 ô (4×4), yêu cầu nhiều cổ vật hiếm Vàng/Đỏ.",
  },
  {
    id: "safe_5x5",
    name: "Khoang Bất Khả Xâm Phạm",
    cols: 5,
    rows: 5,
    description: "Mức tối đa 25 ô (5×5) — cần nhiều vật phẩm độ hiếm Vàng & Đỏ cực khó tìm.",
  },
];

export const SAFEBOX_BY_ID: Record<string, SafeboxTierDef> = Object.fromEntries(
  SAFEBOX_CATALOG.map((s) => [s.id, s]),
);

export const HOME_STORAGE_CATALOG: readonly SafeboxTierDef[] = [
  {
    id: "home_4x4",
    name: "Kho Nhà Tân Thủ",
    cols: 4,
    rows: 4,
    description: "Kho lưu trữ mặc định 16 ô (4×4) tại Nhà Riêng.",
  },
  {
    id: "home_7x7",
    name: "Kho Nhà Mở Rộng",
    cols: 7,
    rows: 7,
    description: "Mở rộng Kho Nhà lên 49 ô (7×7).",
  },
  {
    id: "home_9x9",
    name: "Kho Gia Đình Lớn",
    cols: 9,
    rows: 9,
    description: "Mở rộng Kho Nhà lên 81 ô (9×9).",
  },
  {
    id: "home_9x12",
    name: "Hầm Chứa Biệt Thự",
    cols: 9,
    rows: 12,
    description: "Mở rộng Kho Nhà lên 108 ô (9×12).",
  },
  {
    id: "home_9x16",
    name: "Tổng Kho Siêu Cấp",
    cols: 9,
    rows: 16,
    description: "Mức tối đa 144 ô (9×16) tại Nhà Riêng.",
  },
];

export const HOME_STORAGE_BY_ID: Record<string, SafeboxTierDef> = Object.fromEntries(
  HOME_STORAGE_CATALOG.map((h) => [h.id, h]),
);

export const GYM_CATALOG: readonly SafeboxTierDef[] = [
  {
    id: "gym_0",
    name: "Chưa Lắp Phòng Gym",
    cols: 0,
    rows: 0,
    bonusPct: 0,
    description: "Hoàn thành nhiệm vụ tại Nhà để tăng vĩnh viễn +5% / +10% / +15% Thể lực.",
  },
  {
    id: "gym_5",
    name: "Phòng Gym Cơ Bản (+5%)",
    cols: 0,
    rows: 0,
    bonusPct: 5,
    description: "Tăng +5% giới hạn & hiệu suất Thể lực vĩnh viễn.",
  },
  {
    id: "gym_10",
    name: "Phòng Gym Nâng Cao (+10%)",
    cols: 0,
    rows: 0,
    bonusPct: 10,
    description: "Tăng +10% giới hạn & hiệu suất Thể lực vĩnh viễn.",
  },
  {
    id: "gym_15",
    name: "Phòng Gym Chuyên Nghiệp (+15%)",
    cols: 0,
    rows: 0,
    bonusPct: 15,
    description: "Mức tối đa: tăng +15% giới hạn & hiệu suất Thể lực vĩnh viễn.",
  },
];

export const GYM_BY_ID: Record<string, SafeboxTierDef> = Object.fromEntries(
  GYM_CATALOG.map((g) => [g.id, g]),
);

export const TREADMILL_CATALOG: readonly SafeboxTierDef[] = [
  {
    id: "treadmill_0",
    name: "Chưa Lắp Máy Chạy Bộ",
    cols: 0,
    rows: 0,
    bonusPct: 0,
    description: "Giúp tăng +5% / +12% / +20% tốc độ chạy khi mang đồ ≥ 10kg & ≥ 20kg.",
  },
  {
    id: "treadmill_5",
    name: "Máy Chạy Bộ Cơ Bản (+5%)",
    cols: 0,
    rows: 0,
    bonusPct: 5,
    description: "Tăng +5% tốc độ di chuyển khi mang nặng ≥ 10kg & ≥ 20kg.",
  },
  {
    id: "treadmill_12",
    name: "Máy Chạy Bộ Thể Thao (+12%)",
    cols: 0,
    rows: 0,
    bonusPct: 12,
    description: "Tăng +12% tốc độ di chuyển khi mang nặng ≥ 10kg & ≥ 20kg.",
  },
  {
    id: "treadmill_20",
    name: "Máy Chạy Bộ Pro (+20%)",
    cols: 0,
    rows: 0,
    bonusPct: 20,
    description: "Mức tối đa: tăng +20% tốc độ di chuyển khi mang nặng ≥ 10kg & ≥ 20kg.",
  },
];

export const TREADMILL_BY_ID: Record<string, SafeboxTierDef> = Object.fromEntries(
  TREADMILL_CATALOG.map((t) => [t.id, t]),
);

export type UpgradeKind = "safebox" | "home" | "gym" | "treadmill";

export interface SafeboxQuestRequirement {
  itemId: string;
  requiredCount: number;
  deliveredCount: number;
}

export interface SafeboxUpgradeContract {
  targetSafeboxId: string;
  requirements: SafeboxQuestRequirement[];
}

export interface HomeUpgradeContract {
  targetHomeId: string;
  requirements: SafeboxQuestRequirement[];
}

export interface FacilityUpgradeContract {
  targetTierId: string;
  requirements: SafeboxQuestRequirement[];
}

export const ITEM_CATALOG: readonly CollectibleItemDef[] = [
  // C - Rác (Màu Trắng) -> Sizes 1x1, 2x1, 2x2
  {
    id: "c_old_tire",
    name: "Lốp xe cũ mòn",
    rarity: "C",
    w: 1,
    h: 1,
    weightKg: 1.4,
    valueGold: 12,
    homeBiome: "city",
    description: "Vòng cao su mòn vẹt nhặt được gần ngã tư.",
    iconSrc: "assets/world/items/c_old_tire.png",
  },
  {
    id: "c_empty_bottle",
    name: "Vỏ chai rỗng",
    rarity: "C",
    w: 1,
    h: 1,
    weightKg: 0.25,
    valueGold: 10,
    homeBiome: "plains",
    description: "Chai thủy tinh xanh không còn giọt nào bên trong.",
    iconSrc: "assets/world/items/c_empty_bottle.png",
  },
  {
    id: "c_dry_bone",
    name: "Xương khô ven rừng",
    rarity: "C",
    w: 2,
    h: 1,
    weightKg: 0.65,
    valueGold: 16,
    homeBiome: "countryside",
    description: "Mẩu xương trắng sót lại gần bụi rậm nông thôn.",
    iconSrc: "assets/world/items/c_dry_bone.png",
  },
  {
    id: "c_trash_bag",
    name: "Túi rác phố",
    rarity: "C",
    w: 2,
    h: 2,
    weightKg: 1.8,
    valueGold: 18,
    homeBiome: "city",
    description: "Túi ni-lông ai đó bỏ quên bên lề đường thành phố.",
    iconSrc: "assets/world/items/c_trash_bag.png",
  },
  {
    id: "c_broken_box",
    name: "Thùng giấy bẹp",
    rarity: "C",
    w: 2,
    h: 2,
    weightKg: 1.1,
    valueGold: 22,
    homeBiome: "city",
    description: "Hộp các-tông ẩm sương đêm ngoài hiên tiệm.",
    iconSrc: "assets/world/items/c_broken_box.png",
  },

  // B - Thường (Màu Xanh Dương) -> Sizes 1x1, 2x1, 2x2
  {
    id: "b_coffee_cup",
    name: "Ly cà phê phố",
    rarity: "B",
    w: 1,
    h: 1,
    weightKg: 0.35,
    valueGold: 48,
    homeBiome: "city",
    description: "Tách cà phê nóng thơm lừng đặc trưng góc phố Hà Nội.",
    iconSrc: "assets/world/items/b_coffee_cup.png",
  },
  {
    id: "b_silver_coin",
    name: "Thỏi bạc lưu thông",
    rarity: "B",
    w: 1,
    h: 1,
    weightKg: 0.45,
    valueGold: 75,
    homeBiome: "city",
    description: "Những miếng bạc nhỏ dùng trao đổi ngoài chợ.",
    iconSrc: "assets/world/items/b_silver_coin.png",
  },
  {
    id: "b_wood_axe",
    name: "Rìu tiều phu",
    rarity: "B",
    w: 2,
    h: 1,
    weightKg: 1.9,
    valueGold: 85,
    homeBiome: "countryside",
    description: "Chiếc rìu cán gỗ cứng cáp quen thuộc vùng thôn quê.",
    iconSrc: "assets/world/items/b_wood_axe.png",
  },
  {
    id: "b_green_herb",
    name: "Thảo mộc đồng bằng",
    rarity: "B",
    w: 2,
    h: 2,
    weightKg: 0.5,
    valueGold: 95,
    homeBiome: "plains",
    description: "Cụm lá thuốc tươi mát mọc ven hồ và bờ ruộng.",
    iconSrc: "assets/world/items/b_green_herb.png",
  },
  {
    id: "b_travel_pack",
    name: "Ba lô dã ngoại",
    rarity: "B",
    w: 2,
    h: 2,
    weightKg: 1.5,
    valueGold: 110,
    homeBiome: "plains",
    description: "Túi vải bền chắc đựng vật dụng của lữ khách.",
    iconSrc: "assets/world/items/b_travel_pack.png",
  },

  // A - Hiếm (Màu Vàng) -> Sizes 1x1, 2x1, 2x2, 2x3
  {
    id: "a_sapphire_gem",
    name: "Lam bảo thạch",
    rarity: "A",
    w: 1,
    h: 1,
    weightKg: 0.3,
    valueGold: 210,
    homeBiome: "city",
    description: "Cụm đá quý đa sắc lấp lánh rất gọn nhẹ và giá trị cao.",
    iconSrc: "assets/world/items/a_sapphire_gem.png",
  },
  {
    id: "a_azure_potion",
    name: "Thuốc hồi phục Lam",
    rarity: "A",
    w: 2,
    h: 1,
    weightKg: 0.75,
    valueGold: 180,
    homeBiome: "plains",
    description: "Lọ linh dịch phát sáng xanh biếc rất khó điều chế.",
    iconSrc: "assets/world/items/a_azure_potion.png",
  },
  {
    id: "a_ancient_scroll",
    name: "Cuộn thư cổ",
    rarity: "A",
    w: 2,
    h: 1,
    weightKg: 0.6,
    valueGold: 195,
    homeBiome: "plains",
    description: "Bản đồ ghi chép dấu tích kho báu trên giấy da cổ.",
    iconSrc: "assets/world/items/a_ancient_scroll.png",
  },
  {
    id: "a_spirit_lantern",
    name: "Đèn lồng dẫn hồn",
    rarity: "A",
    w: 2,
    h: 2,
    weightKg: 1.75,
    valueGold: 250,
    homeBiome: "countryside",
    description: "Ngọn đèn đồng tỏa ánh sáng ấm xuyên màn đêm.",
    iconSrc: "assets/world/items/a_spirit_lantern.png",
  },
  {
    id: "a_jade_book",
    name: "Mật tịch Ninja",
    rarity: "A",
    w: 2,
    h: 3,
    weightKg: 2.4,
    valueGold: 310,
    homeBiome: "countryside",
    description: "Bộ bí kíp cổ cỡ lớn lưu giữ thuật ẩn thân và kiếm pháp.",
    iconSrc: "assets/world/items/a_jade_book.png",
  },

  // S - Siêu phẩm (Màu Đỏ) -> Sizes 2x3, 3x3, 3x4
  {
    id: "s_royal_chest_pack",
    name: "Túi báu Hoàng Kim",
    rarity: "S",
    w: 2,
    h: 3,
    weightKg: 4.2,
    valueGold: 980,
    homeBiome: "city",
    description: "Hành trang dát vàng chứa đầy châu báu thượng hạng.",
    iconSrc: "assets/world/items/s_royal_chest_pack.png",
  },
  {
    id: "s_gold_ingot",
    name: "Kim khối Hoàng Gia",
    rarity: "S",
    w: 2,
    h: 3,
    weightKg: 5.5,
    valueGold: 1280,
    homeBiome: "city",
    description: "Thỏi vàng ròng nguyên khối khắc quốc ấn cổ đại.",
    iconSrc: "assets/world/items/s_gold_ingot.png",
  },
  {
    id: "s_golden_lotus_leaf",
    name: "Kim Diệp Thần Thảo",
    rarity: "S",
    w: 3,
    h: 3,
    weightKg: 1.6,
    valueGold: 1550,
    homeBiome: "countryside",
    description: "Cụm kỳ thảo lá vàng ngàn năm chỉ kết tinh ở rừng thiêng.",
    iconSrc: "assets/world/items/s_golden_lotus_leaf.png",
  },
  {
    id: "s_crimson_grimoire",
    name: "Thiên Thư Thái Cổ",
    rarity: "S",
    w: 3,
    h: 3,
    weightKg: 3.4,
    valueGold: 1750,
    homeBiome: "plains",
    description: "Đại bộ kỳ thư vô giá chứa tinh hoa thuật số ngàn đời.",
    iconSrc: "assets/world/items/s_crimson_grimoire.png",
  },
  {
    id: "s_golden_sword",
    name: "Thần kiếm Hoàng Kim",
    rarity: "S",
    w: 3,
    h: 4,
    weightKg: 4.8,
    valueGold: 2600,
    homeBiome: "countryside",
    description: "Bảo kiếm khổng lồ (3×4 ô) sắc bén vô song rèn từ vàng cổ.",
    iconSrc: "assets/world/items/s_golden_sword.png",
  },
  // === JAPAN MAP EXCLUSIVE ITEMS (C, B, A & 3 New Collection S-Tier Items) ===
  {
    id: "c_jp_geta",
    name: "Guốc Gỗ Geta Cũ",
    rarity: "C",
    w: 1,
    h: 1,
    weightKg: 0.5,
    valueGold: 15,
    homeBiome: "city",
    mapOrigin: "japan",
    description: "Đôi guốc gỗ truyền thống bị mòn quai nhặt gần phố cổ Tokyo.",
    iconSrc: "assets/world/items/c_jp_geta.png",
  },
  {
    id: "c_jp_wagasa",
    name: "Ô Giấy Wagasa Rách",
    rarity: "C",
    w: 2,
    h: 1,
    weightKg: 0.7,
    valueGold: 20,
    homeBiome: "plains",
    mapOrigin: "japan",
    description: "Chiếc ô giấy dầu tre bị gió tốc rách ngoài hiên đền Kyoto.",
    iconSrc: "assets/world/items/c_jp_wagasa.png",
  },
  {
    id: "c_jp_sake_bottle",
    name: "Bình Sake Gốm Rỗng",
    rarity: "C",
    w: 1,
    h: 2,
    weightKg: 0.6,
    valueGold: 24,
    homeBiome: "plains",
    mapOrigin: "japan",
    description: "Bình gốm đựng rượu Sake đã cạn sạch sau đêm lễ hội mùa thu.",
    iconSrc: "assets/world/items/c_jp_sake_bottle.png",
  },
  {
    id: "b_jp_sensu_fan",
    name: "Quạt Xếp Hoa Anh Đào",
    rarity: "B",
    w: 1,
    h: 1,
    weightKg: 0.25,
    valueGold: 65,
    homeBiome: "city",
    mapOrigin: "japan",
    description: "Quạt lụa vẽ tay họa tiết Sakura tinh xảo của nghệ nhân Kyoto.",
    iconSrc: "assets/world/items/b_jp_sensu_fan.png",
  },
  {
    id: "b_jp_maneki_neko",
    name: "Mèo Thần Tài Maneki-Neko",
    rarity: "B",
    w: 1,
    h: 2,
    weightKg: 0.9,
    valueGold: 95,
    homeBiome: "city",
    mapOrigin: "japan",
    description: "Tượng mèo sứ vẫy tay chiêu tài lộc đặt trong các cửa hiệu Tokyo.",
    iconSrc: "assets/world/items/b_jp_maneki_neko.png",
  },
  {
    id: "b_jp_bonsai",
    name: "Chậu Tùng Bonsai Cổ",
    rarity: "B",
    w: 2,
    h: 2,
    weightKg: 1.8,
    valueGold: 135,
    homeBiome: "plains",
    mapOrigin: "japan",
    description: "Thế cây tùng uốn lượn trăm năm được chăm sóc tỉ mỉ ở cố đô.",
    iconSrc: "assets/world/items/b_jp_bonsai.png",
  },
  {
    id: "a_jp_hannya_mask",
    name: "Mặt Nạ Hannya Sơn Mài",
    rarity: "A",
    w: 2,
    h: 2,
    weightKg: 1.1,
    valueGold: 245,
    homeBiome: "plains",
    mapOrigin: "japan",
    description: "Mặt nạ kịch Noh chạm khắc thủ công phủ sơn mài thếp vàng.",
    iconSrc: "assets/world/items/a_jp_hannya_mask.png",
  },
  {
    id: "a_jp_jade_netsuke",
    name: "Ấn Ngọc Bích Hoàng Gia",
    rarity: "A",
    w: 1,
    h: 2,
    weightKg: 0.45,
    valueGold: 280,
    homeBiome: "city",
    mapOrigin: "japan",
    description: "Khối ngọc bích chạm trổ tinh vi của quý tộc Kyoto.",
    iconSrc: "assets/world/items/a_jp_jade_netsuke.png",
  },
  {
    id: "a_jp_shogun_scroll",
    name: "Mật Chỉ Tướng Quân",
    rarity: "A",
    w: 2,
    h: 3,
    weightKg: 1.6,
    valueGold: 360,
    homeBiome: "countryside",
    mapOrigin: "japan",
    description: "Cuộn mật thư đóng ấn đỏ của Mạc phủ cất giữ bí thuật Ninja.",
    iconSrc: "assets/world/items/a_jp_shogun_scroll.png",
  },
  {
    id: "s_jp_muramasa",
    name: "Yêu Đao Muramasa",
    rarity: "S",
    w: 2,
    h: 3,
    weightKg: 3.6,
    valueGold: 1450,
    homeBiome: "countryside",
    mapOrigin: "japan",
    description: "Siêu phẩm Nhật Bản — Thanh danh đao rèn từ thép Tamahagane ánh đỏ rực.",
    iconSrc: "assets/world/items/s_jp_muramasa.png",
  },
  {
    id: "s_jp_shogun_kabuto",
    name: "Mũ Giáp Vàng Đại Tướng Quân",
    rarity: "S",
    w: 3,
    h: 3,
    weightKg: 4.5,
    valueGold: 1950,
    homeBiome: "countryside",
    mapOrigin: "japan",
    description: "Siêu phẩm Nhật Bản — Mũ chiến Kabuto sừng trăng khuyết dát vàng ròng.",
    iconSrc: "assets/world/items/s_jp_shogun_kabuto.png",
  },
  {
    id: "s_jp_yata_mirror",
    name: "Thần Kính Bát Chỉ Hoàng Gia",
    rarity: "S",
    w: 3,
    h: 3,
    weightKg: 3.8,
    valueGold: 2800,
    homeBiome: "plains",
    mapOrigin: "japan",
    description: "Siêu phẩm Nhật Bản — Bảo vật thần thoại phản chiếu hào quang mặt trời.",
    iconSrc: "assets/world/items/s_jp_yata_mirror.png",
  },
  ...CONSUMABLE_CATALOG.map((c): CollectibleItemDef => ({
    id: c.inventoryItemId,
    name: c.name,
    rarity: c.priceGold >= 240 ? "A" : "B",
    w: c.gridW,
    h: c.gridH,
    weightKg: c.weightKg,
    valueGold: Math.max(5, Math.round(c.priceGold * 0.6)),
    homeBiome: "city",
    description: c.description,
    iconSrc: c.iconSrc,
    consumableId: c.id,
    excludeFromRandomLoot: true,
  })),
  ...GARMENT_CATALOG.map((g): CollectibleItemDef => ({
    id: g.inventoryItemId,
    name: g.name,
    rarity: g.priceGold >= 350 ? "A" : "B",
    w: g.gridW,
    h: g.gridH,
    weightKg: g.weightKg,
    valueGold: g.valueGold !== undefined ? g.valueGold : Math.max(15, Math.round(g.priceGold * 0.5)),
    homeBiome: "city",
    description: g.description,
    iconSrc: g.iconSrc,
    garmentId: g.id,
    excludeFromRandomLoot: true,
  })),
  ...BACKPACK_CATALOG.map((b): CollectibleItemDef => ({
    id: b.inventoryItemId,
    name: `${b.name} (${b.cols}×${b.rows})`,
    rarity: b.rarity,
    w: b.itemW,
    h: b.itemH,
    weightKg: b.weightKg,
    valueGold: b.valueGold,
    homeBiome: "city",
    description: `${b.description} Chứa ${b.cols}×${b.rows} ô — có thể đeo lên người, cất vào balo khác hoặc bán.`,
    iconSrc: b.iconSrc,
    backpackId: b.id,
    excludeFromRandomLoot: b.id === "starter_4x4",
  })),
];

export const ITEM_BY_ID: Record<string, CollectibleItemDef> = Object.fromEntries(
  ITEM_CATALOG.map((item) => [item.id, item]),
);

export const COLLECTION_RED_ITEMS: readonly CollectibleItemDef[] = ITEM_CATALOG.filter(
  (item) =>
    item.rarity === "S" &&
    !item.excludeFromRandomLoot &&
    !item.backpackId &&
    !item.garmentId &&
    !item.consumableId,
);

export const COLLECTION_RED_BY_ID: Record<string, CollectibleItemDef> = Object.fromEntries(
  COLLECTION_RED_ITEMS.map((item) => [item.id, item]),
);

export const GOLD_LAMP_REQUIRED_COUNT = 3;

export interface CollectionSlotState {
  displayed: boolean;
  /** 0 = Tắt đèn, 1 = Đèn Trắng (nộp 1 đồ đỏ), 2 = Đèn Vàng (nộp thêm 3 đồ đỏ) */
  lightLevel: 0 | 1 | 2;
  /** Tiến độ nộp 0..2 món hướng tới Đèn Vàng (khi lightLevel === 1) */
  goldLampProgress: number;
}

export interface CollectionActionResult {
  ok: boolean;
  slot?: CollectionSlotState;
  message: string;
  sourceZone?: "backpack" | "safebox" | "home";
  destZone?: "backpack" | "safebox" | "home";
}

export const BACKPACK_BY_ID: Record<string, BackpackTierDef> = Object.fromEntries(
  BACKPACK_CATALOG.map((bp) => [bp.id, bp]),
);

function pickRandomDistinctItems(rarity: ItemRarity, count: number): CollectibleItemDef[] {
  const pool = ITEM_CATALOG.filter(
    (it) =>
      it.rarity === rarity &&
      !it.excludeFromRandomLoot &&
      !it.backpackId &&
      !it.garmentId &&
      !it.consumableId,
  );
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

interface UpgradeRecipeStep {
  rarity: ItemRarity;
  count: number;
  qty: number | readonly number[];
}

const UPGRADE_CONTRACT_RECIPES: Record<string, readonly UpgradeRecipeStep[]> = {
  safe_3x3: [
    { rarity: "C", count: 2, qty: 2 },
    { rarity: "B", count: 1, qty: 1 },
  ],
  safe_4x4: [
    { rarity: "B", count: 1, qty: 2 },
    { rarity: "A", count: 2, qty: [2, 1] },
    { rarity: "S", count: 1, qty: 1 },
  ],
  safe_5x5: [
    { rarity: "A", count: 2, qty: 2 },
    { rarity: "S", count: 2, qty: [2, 1] },
  ],
  home_7x7: [
    { rarity: "C", count: 2, qty: 2 },
    { rarity: "B", count: 2, qty: 1 },
  ],
  home_9x9: [
    { rarity: "B", count: 2, qty: 2 },
    { rarity: "A", count: 2, qty: 1 },
  ],
  home_9x12: [
    { rarity: "B", count: 1, qty: 2 },
    { rarity: "A", count: 2, qty: 2 },
    { rarity: "S", count: 1, qty: 1 },
  ],
  home_9x16: [
    { rarity: "A", count: 2, qty: [3, 2] },
    { rarity: "S", count: 2, qty: [2, 1] },
  ],
  gym_5: [
    { rarity: "C", count: 2, qty: 2 },
    { rarity: "B", count: 1, qty: 2 },
  ],
  gym_10: [
    { rarity: "B", count: 2, qty: 2 },
    { rarity: "A", count: 2, qty: 1 },
  ],
  gym_15: [
    { rarity: "A", count: 2, qty: 2 },
    { rarity: "S", count: 1, qty: 2 },
  ],
  treadmill_5: [
    { rarity: "C", count: 2, qty: 2 },
    { rarity: "B", count: 1, qty: 2 },
  ],
  treadmill_12: [
    { rarity: "B", count: 2, qty: 2 },
    { rarity: "A", count: 2, qty: 1 },
  ],
  treadmill_20: [
    { rarity: "A", count: 2, qty: 2 },
    { rarity: "S", count: 1, qty: 2 },
  ],
};

function buildUpgradeRequirements(targetId: string): SafeboxQuestRequirement[] | null {
  const recipe = UPGRADE_CONTRACT_RECIPES[targetId];
  if (!recipe) return null;
  const reqs: SafeboxQuestRequirement[] = [];
  for (const step of recipe) {
    const picked = pickRandomDistinctItems(step.rarity, step.count);
    picked.forEach((item, idx) => {
      const requiredCount = Array.isArray(step.qty)
        ? (step.qty[idx] ?? step.qty[step.qty.length - 1] ?? 1)
        : step.qty;
      reqs.push({ itemId: item.id, requiredCount, deliveredCount: 0 });
    });
  }
  return reqs;
}

function getNextCatalogTier(
  catalog: readonly SafeboxTierDef[],
  curId: string,
): SafeboxTierDef | null {
  const idx = catalog.findIndex((s) => s.id === curId);
  if (idx === -1 || idx + 1 >= catalog.length) return null;
  return catalog[idx + 1];
}

export function generateSafeboxContract(targetSafeboxId: string): SafeboxUpgradeContract | null {
  if (!SAFEBOX_BY_ID[targetSafeboxId]) return null;
  const requirements = buildUpgradeRequirements(targetSafeboxId);
  return requirements ? { targetSafeboxId, requirements } : null;
}

export function generateHomeContract(targetHomeId: string): HomeUpgradeContract | null {
  if (!HOME_STORAGE_BY_ID[targetHomeId]) return null;
  const requirements = buildUpgradeRequirements(targetHomeId);
  return requirements ? { targetHomeId, requirements } : null;
}

export function generateGymContract(targetTierId: string): FacilityUpgradeContract | null {
  if (!GYM_BY_ID[targetTierId]) return null;
  const requirements = buildUpgradeRequirements(targetTierId);
  return requirements ? { targetTierId, requirements } : null;
}

export function generateTreadmillContract(targetTierId: string): FacilityUpgradeContract | null {
  if (!TREADMILL_BY_ID[targetTierId]) return null;
  const requirements = buildUpgradeRequirements(targetTierId);
  return requirements ? { targetTierId, requirements } : null;
}

export function getNextSafeboxTier(curSafeboxId: string): SafeboxTierDef | null {
  return getNextCatalogTier(SAFEBOX_CATALOG, curSafeboxId);
}

export function getNextHomeTier(curHomeId: string): SafeboxTierDef | null {
  return getNextCatalogTier(HOME_STORAGE_CATALOG, curHomeId);
}

export function getNextGymTier(curGymId: string): SafeboxTierDef | null {
  return getNextCatalogTier(GYM_CATALOG, curGymId);
}

export function getNextTreadmillTier(curTreadmillId: string): SafeboxTierDef | null {
  return getNextCatalogTier(TREADMILL_CATALOG, curTreadmillId);
}

const BASE_RARITY_TABLE: Record<LootSourceType, Record<ItemRarity, number>> = {
  trash_bin: { C: 62, B: 28.75, A: 8.5, S: 0.75 },
  house_standard: { C: 42, B: 38, A: 18, S: 2 },
  house_landmark: { C: 20, B: 42, A: 33, S: 5 },
  house_vault: { C: 0, B: 22, A: 70, S: 8 },
  chest_wooden: { C: 10, B: 44, A: 40, S: 6 },
  chest_royal: { C: 0, B: 20, A: 70, S: 10 },
};

const COUNT_WEIGHT_TABLE: Record<LootSourceType, ReadonlyArray<{ count: number; w: number }>> = {
  trash_bin: [
    { count: 1, w: 62 },
    { count: 2, w: 30 },
    { count: 3, w: 8 },
  ],
  house_standard: [
    { count: 1, w: 38 },
    { count: 2, w: 42 },
    { count: 3, w: 16 },
    { count: 4, w: 4 },
  ],
  house_landmark: [
    { count: 1, w: 16 },
    { count: 2, w: 48 },
    { count: 3, w: 28 },
    { count: 4, w: 8 },
  ],
  house_vault: [
    { count: 2, w: 46 },
    { count: 3, w: 40 },
    { count: 4, w: 14 },
  ],
  chest_wooden: [
    { count: 1, w: 22 },
    { count: 2, w: 48 },
    { count: 3, w: 24 },
    { count: 4, w: 6 },
  ],
  chest_royal: [
    { count: 2, w: 40 },
    { count: 3, w: 44 },
    { count: 4, w: 16 },
  ],
};

export interface GridItemInstance {
  uid: string;
  itemId: string;
  x: number;
  y: number;
  rotated: boolean;
  originBiome: BiomeId;
  /** False while container item is still hidden/scanning for the first time */
  revealed?: boolean;
  /** Remaining uses for multi-use consumables */
  usesLeft?: number;
}

export function getItemMaxUses(def: CollectibleItemDef | null | undefined): number {
  if (!def?.consumableId) return 1;
  return Math.max(1, CONSUMABLE_BY_ID[def.consumableId]?.maxUses ?? 1);
}

export function getItemRemainingUses(
  item: GridItemInstance,
  def?: CollectibleItemDef | null,
): number {
  const resolved = def ?? ITEM_BY_ID[item.itemId];
  const maxUses = getItemMaxUses(resolved);
  if (maxUses <= 1) return 1;
  if (typeof item.usesLeft === "number" && Number.isInteger(item.usesLeft)) {
    return Math.max(1, Math.min(maxUses, item.usesLeft));
  }
  return maxUses;
}

export function getItemEffectiveValueGold(
  item: GridItemInstance,
  def?: CollectibleItemDef | null,
): number {
  const resolved = def ?? ITEM_BY_ID[item.itemId];
  if (!resolved) return 0;
  const maxUses = getItemMaxUses(resolved);
  if (maxUses <= 1) return resolved.valueGold;
  const usesLeft = getItemRemainingUses(item, resolved);
  return Math.max(1, Math.round((resolved.valueGold * usesLeft) / maxUses));
}

const RARITY_SCAN_BASE_MS: Record<ItemRarity, number> = {
  C: 500,
  B: 1000,
  A: 1500,
  S: 3000,
};

/**
 * Computes item reveal duration in ms:
 * Rarity base (C: 0.5s, B: 1.0s, A: 1.5s, S: 3.0s) + extra time for larger grid area.
 */
export function getItemSearchDurationMs(def: CollectibleItemDef): number {
  const areaBonus = Math.max(0, def.w * def.h - 1) * 140;
  return RARITY_SCAN_BASE_MS[def.rarity] + areaBonus;
}

export interface ContainerLootState {
  containerId: string;
  title: string;
  sourceType: LootSourceType;
  biome: BiomeId;
  cols: number;
  rows: number;
  items: GridItemInstance[];
  generatedAt: number;
  refreshAt: number;
}

/**
 * Respawn/refresh intervals per lootable container type:
 * - Trash bins: 30 minutes
 * - Chests (wooden & royal): 45 minutes
 * - Buildings / houses: 1 - 2 hours
 */
export const CONTAINER_REFRESH_RULES: Record<LootSourceType, { minMs: number; maxMs: number }> = {
  trash_bin: { minMs: 30 * 60_000, maxMs: 30 * 60_000 },
  chest_wooden: { minMs: 45 * 60_000, maxMs: 45 * 60_000 },
  chest_royal: { minMs: 45 * 60_000, maxMs: 45 * 60_000 },
  house_standard: { minMs: 60 * 60_000, maxMs: 95 * 60_000 },
  house_landmark: { minMs: 90 * 60_000, maxMs: 120 * 60_000 },
  house_vault: { minMs: 90 * 60_000, maxMs: 120 * 60_000 },
};

export function rollContainerRefreshMs(sourceType: LootSourceType): number {
  const { minMs, maxMs } = CONTAINER_REFRESH_RULES[sourceType];
  if (minMs >= maxMs) return minMs;
  return Math.round(minMs + Math.random() * (maxMs - minMs));
}

export function formatContainerCooldown(remainingMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hours > 0) {
    return `${hours}g ${String(mins).padStart(2, "0")}p`;
  }
  if (mins > 0) {
    return `${mins}p ${String(secs).padStart(2, "0")}s`;
  }
  return `${secs}s`;
}

export interface PersistedInventoryState {
  gold: number;
  backpackId: string | null;
  ownedBackpackIds?: string[];
  backpackItems: GridItemInstance[];
  homeStorageId?: string;
  homeItems: GridItemInstance[];
  homeContract?: HomeUpgradeContract | null;
  homeGymId?: string;
  homeGymContract?: FacilityUpgradeContract | null;
  homeTreadmillId?: string;
  homeTreadmillContract?: FacilityUpgradeContract | null;
  safeboxId: string;
  safeboxItems: GridItemInstance[];
  safeboxContract: SafeboxUpgradeContract | null;
  collectionHall?: Record<string, CollectionSlotState>;
  containers: Record<string, ContainerLootState>;
  mythicPity: number;
  consecutiveJunk: number;
  nextUid: number;
}

export const CONTAINER_COLS = 6;
export const CONTAINER_ROWS = 6;
export const DEFAULT_HOME_COLS = 4;
export const DEFAULT_HOME_ROWS = 4;
export const MYTHIC_HARD_PITY = 36;

export const STARTER_HUNGER_CONSUMABLE_ID =
  CONSUMABLE_CATALOG.filter((c) => c.hungerRestore > 0 && c.hpRestore === 0 && c.tempDeltaC === 0)
    .sort((a, b) => a.priceGold - b.priceGold)[0]?.id ?? "food_energy_bar";

export const STARTER_STAMINA_CONSUMABLE_ID =
  CONSUMABLE_CATALOG.filter(
    (c) => c.staminaRestore > 0 && c.hungerRestore === 0 && c.hpRestore === 0 && !c.staminaBoostPct,
  ).sort((a, b) => a.priceGold - b.priceGold)[0]?.id ?? "food_electrolyte_water";

export const STARTER_CONSUMABLE_IDS: readonly string[] = [
  STARTER_HUNGER_CONSUMABLE_ID,
  STARTER_STAMINA_CONSUMABLE_ID,
];

export function createDefaultInventoryState(): PersistedInventoryState {
  const starterItems: GridItemInstance[] = STARTER_CONSUMABLE_IDS.map((itemId, idx) => {
    const def = ITEM_BY_ID[itemId];
    return {
      uid: `it_${idx + 1}`,
      itemId,
      x: idx,
      y: 0,
      rotated: false,
      originBiome: "city",
      revealed: true,
      ...(def?.consumableId ? { usesLeft: getItemMaxUses(def) } : {}),
    };
  });
  return {
    gold: 0,
    backpackId: "starter_4x4",
    ownedBackpackIds: [],
    backpackItems: starterItems,
    homeStorageId: "home_4x4",
    homeItems: [],
    homeContract: generateHomeContract("home_7x7"),
    homeGymId: "gym_0",
    homeGymContract: generateGymContract("gym_5"),
    homeTreadmillId: "treadmill_0",
    homeTreadmillContract: generateTreadmillContract("treadmill_5"),
    safeboxId: "safe_2x2",
    safeboxItems: [],
    safeboxContract: generateSafeboxContract("safe_3x3"),
    collectionHall: {},
    containers: {},
    mythicPity: 0,
    consecutiveJunk: 0,
    nextUid: starterItems.length + 1,
  };
}

function cloneFacilityContract(
  raw: FacilityUpgradeContract | null | undefined,
  nextId: string | undefined,
  generator: (id: string) => FacilityUpgradeContract | null,
): FacilityUpgradeContract | null {
  if (raw !== undefined) {
    return raw
      ? {
          targetTierId: raw.targetTierId,
          requirements: raw.requirements.map((r) => ({ ...r })),
        }
      : null;
  }
  return nextId ? generator(nextId) : null;
}

function cloneCollectionHall(
  raw: Record<string, CollectionSlotState> | undefined,
): Record<string, CollectionSlotState> {
  if (!raw) return {};
  const out: Record<string, CollectionSlotState> = {};
  for (const [id, slot] of Object.entries(raw)) {
    if (!COLLECTION_RED_BY_ID[id] || !slot) continue;
    const lightLevel: 0 | 1 | 2 = slot.lightLevel === 2 ? 2 : slot.lightLevel === 1 ? 1 : 0;
    const goldLampProgress =
      lightLevel === 1 && Number.isInteger(slot.goldLampProgress)
        ? Math.max(0, Math.min(GOLD_LAMP_REQUIRED_COUNT - 1, slot.goldLampProgress))
        : 0;
    if (slot.displayed || lightLevel > 0 || goldLampProgress > 0) {
      out[id] = {
        displayed: Boolean(slot.displayed),
        lightLevel,
        goldLampProgress,
      };
    }
  }
  return out;
}

function cloneInventoryState(state: PersistedInventoryState): PersistedInventoryState {
  const safeboxId = state.safeboxId && SAFEBOX_BY_ID[state.safeboxId] ? state.safeboxId : "safe_2x2";
  const nextSb = getNextSafeboxTier(safeboxId);
  const contract = state.safeboxContract
    ? {
        targetSafeboxId: state.safeboxContract.targetSafeboxId,
        requirements: state.safeboxContract.requirements.map((r) => ({ ...r })),
      }
    : nextSb
      ? generateSafeboxContract(nextSb.id)
      : null;

  const homeStorageId =
    state.homeStorageId && HOME_STORAGE_BY_ID[state.homeStorageId] ? state.homeStorageId : "home_4x4";
  const nextHome = getNextHomeTier(homeStorageId);
  const homeContract =
    state.homeContract !== undefined
      ? state.homeContract
        ? {
            targetHomeId: state.homeContract.targetHomeId,
            requirements: state.homeContract.requirements.map((r) => ({ ...r })),
          }
        : null
      : nextHome
        ? generateHomeContract(nextHome.id)
        : null;

  const homeGymId = state.homeGymId && GYM_BY_ID[state.homeGymId] ? state.homeGymId : "gym_0";
  const nextGym = getNextGymTier(homeGymId);
  const homeGymContract = cloneFacilityContract(
    state.homeGymContract,
    nextGym?.id,
    generateGymContract,
  );

  const homeTreadmillId =
    state.homeTreadmillId && TREADMILL_BY_ID[state.homeTreadmillId]
      ? state.homeTreadmillId
      : "treadmill_0";
  const nextTreadmill = getNextTreadmillTier(homeTreadmillId);
  const homeTreadmillContract = cloneFacilityContract(
    state.homeTreadmillContract,
    nextTreadmill?.id,
    generateTreadmillContract,
  );

  return {
    gold: state.gold,
    backpackId: state.backpackId !== undefined ? state.backpackId : "starter_4x4",
    ownedBackpackIds: state.ownedBackpackIds ? [...state.ownedBackpackIds] : [],
    backpackItems: state.backpackItems.map((it) => ({ ...it })),
    homeStorageId,
    homeItems: (state.homeItems ?? []).map((it) => ({ ...it })),
    homeContract,
    homeGymId,
    homeGymContract,
    homeTreadmillId,
    homeTreadmillContract,
    safeboxId,
    safeboxItems: (state.safeboxItems ?? []).map((it) => ({ ...it })),
    safeboxContract: contract,
    collectionHall: cloneCollectionHall(state.collectionHall),
    containers: Object.fromEntries(
      Object.entries(state.containers).map(([k, c]) => [
        k,
        { ...c, items: c.items.map((it) => ({ ...it })) },
      ]),
    ),
    mythicPity: state.mythicPity,
    consecutiveJunk: state.consecutiveJunk,
    nextUid: state.nextUid,
  };
}

export function getEffectiveSize(def: CollectibleItemDef, rotated: boolean): { w: number; h: number } {
  return rotated ? { w: def.h, h: def.w } : { w: def.w, h: def.h };
}

export function canPlaceOnGrid(
  gridCols: number,
  gridRows: number,
  items: readonly GridItemInstance[],
  x: number,
  y: number,
  w: number,
  h: number,
  ignoreUid?: string,
): boolean {
  if (x < 0 || y < 0 || x + w > gridCols || y + h > gridRows) {
    return false;
  }

  for (const other of items) {
    if (ignoreUid && other.uid === ignoreUid) continue;
    const oDef = ITEM_BY_ID[other.itemId];
    if (!oDef) continue;
    const oSize = getEffectiveSize(oDef, other.rotated);
    const overlaps =
      x < other.x + oSize.w &&
      x + w > other.x &&
      y < other.y + oSize.h &&
      y + h > other.y;
    if (overlaps) return false;
  }

  return true;
}

export function findFirstFitOnGrid(
  gridCols: number,
  gridRows: number,
  items: readonly GridItemInstance[],
  def: CollectibleItemDef,
  preferRotated = false,
): { x: number; y: number; rotated: boolean } | null {
  const orientations =
    def.w === def.h
      ? [false]
      : preferRotated
        ? [true, false]
        : [false, true];

  for (const rot of orientations) {
    const { w, h } = getEffectiveSize(def, rot);
    for (let y = 0; y <= gridRows - h; y++) {
      for (let x = 0; x <= gridCols - w; x++) {
        if (canPlaceOnGrid(gridCols, gridRows, items, x, y, w, h)) {
          return { x, y, rotated: rot };
        }
      }
    }
  }
  return null;
}

function findRandomFitOnGrid(
  gridCols: number,
  gridRows: number,
  items: readonly GridItemInstance[],
  def: CollectibleItemDef,
): { x: number; y: number; rotated: boolean } | null {
  const orientations = def.w === def.h ? [false] : [false, true];
  const validSlots: Array<{ x: number; y: number; rotated: boolean }> = [];

  for (const rot of orientations) {
    const { w, h } = getEffectiveSize(def, rot);
    for (let y = 0; y <= gridRows - h; y++) {
      for (let x = 0; x <= gridCols - w; x++) {
        if (canPlaceOnGrid(gridCols, gridRows, items, x, y, w, h)) {
          validSlots.push({ x, y, rotated: rot });
        }
      }
    }
  }

  if (validSlots.length === 0) return null;
  return validSlots[Math.floor(Math.random() * validSlots.length)];
}

function shuffleArray<T>(list: T[]): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export class InventoryManager {
  private state: PersistedInventoryState;
  private readonly onPersist?: (state: PersistedInventoryState) => void;
  private cachedBackpackWeightKg: number | null = null;

  constructor(
    initialState?: PersistedInventoryState,
    onPersist?: (state: PersistedInventoryState) => void,
  ) {
    this.onPersist = onPersist;
    this.state = initialState ? cloneInventoryState(initialState) : createDefaultInventoryState();
    this.purgeExpiredContainers();
  }

  public getPersistedState(): PersistedInventoryState {
    return cloneInventoryState(this.state);
  }

  public getBackpackTier(): BackpackTierDef | null {
    return this.state.backpackId ? BACKPACK_BY_ID[this.state.backpackId] ?? null : null;
  }

  public getSafeboxTier(): SafeboxTierDef {
    return SAFEBOX_BY_ID[this.state.safeboxId] ?? SAFEBOX_CATALOG[0];
  }

  public getSafeboxItems(): readonly GridItemInstance[] {
    return this.state.safeboxItems;
  }

  public getSafeboxContract(): SafeboxUpgradeContract | null {
    return this.state.safeboxContract;
  }

  public getHomeTier(): SafeboxTierDef {
    const id = this.state.homeStorageId ?? "home_4x4";
    return HOME_STORAGE_BY_ID[id] ?? HOME_STORAGE_CATALOG[0];
  }

  public getHomeContract(): HomeUpgradeContract | null {
    return this.state.homeContract ?? null;
  }

  public getGymTier(): SafeboxTierDef {
    const id = this.state.homeGymId ?? "gym_0";
    return GYM_BY_ID[id] ?? GYM_CATALOG[0];
  }

  public getGymContract(): FacilityUpgradeContract | null {
    return this.state.homeGymContract ?? null;
  }

  public getPermanentStaminaBonusPct(): number {
    return this.getGymTier().bonusPct ?? 0;
  }

  public getTreadmillTier(): SafeboxTierDef {
    const id = this.state.homeTreadmillId ?? "treadmill_0";
    return TREADMILL_BY_ID[id] ?? TREADMILL_CATALOG[0];
  }

  public getTreadmillContract(): FacilityUpgradeContract | null {
    return this.state.homeTreadmillContract ?? null;
  }

  public getHeavySpeedBonusPct(): number {
    return this.getTreadmillTier().bonusPct ?? 0;
  }

  public getGold(): number {
    return this.state.gold;
  }

  public getMythicPity(): number {
    return this.state.mythicPity;
  }

  public getBackpackItems(): readonly GridItemInstance[] {
    return this.state.backpackItems;
  }

  public getHomeItems(): readonly GridItemInstance[] {
    return this.state.homeItems;
  }

  private getContainerExpiresAt(container: ContainerLootState): number {
    if (typeof container.refreshAt === "number" && Number.isFinite(container.refreshAt)) {
      return container.refreshAt;
    }
    const base = typeof container.generatedAt === "number" ? container.generatedAt : Date.now();
    return base + CONTAINER_REFRESH_RULES[container.sourceType].minMs;
  }

  public getContainerRemainingMs(containerId: string, now = Date.now()): number | null {
    const c = this.state.containers[containerId];
    if (!c) return null;
    const rem = this.getContainerExpiresAt(c) - now;
    if (rem <= 0) {
      delete this.state.containers[containerId];
      this.saveState();
      return null;
    }
    return rem;
  }

  public purgeExpiredContainers(now = Date.now()): string[] {
    const expiredIds: string[] = [];
    for (const [id, c] of Object.entries(this.state.containers)) {
      if (now >= this.getContainerExpiresAt(c)) {
        delete this.state.containers[id];
        expiredIds.push(id);
      }
    }
    if (expiredIds.length > 0) {
      this.saveState();
    }
    return expiredIds;
  }

  public isContainerSearched(containerId: string): boolean {
    return this.getContainer(containerId) !== null;
  }

  public isContainerLootedEmpty(containerId: string): boolean {
    const c = this.getContainer(containerId);
    return Boolean(c && c.items.length === 0);
  }

  public getContainer(containerId: string): ContainerLootState | null {
    const c = this.state.containers[containerId];
    if (!c) return null;
    if (Date.now() >= this.getContainerExpiresAt(c)) {
      delete this.state.containers[containerId];
      this.saveState();
      return null;
    }
    return c;
  }

  public markItemRevealed(containerId: string, uid: string): void {
    const c = this.state.containers[containerId];
    if (!c) return;
    const target = c.items.find((it) => it.uid === uid);
    if (target && target.revealed === false) {
      target.revealed = true;
      this.saveState();
    }
  }

  /**
   * Opens or initializes a lootable container (`trash_bin`, `house`, `chest`).
   * Automatically wipes and re-randomizes expired containers once their refresh window elapses.
   * Generates 1-5 items in random order & random positions inside the 6x6 grid,
   * starting masked (`revealed: false`) so they scan right-to-left on first inspection.
   */
  public openOrGenerateContainer(
    containerId: string,
    title: string,
    sourceType: LootSourceType,
    biome: BiomeId,
    securityZone: SecurityZone = "yellow",
    mapId?: MapId,
  ): ContainerLootState {
    const existing = this.getContainer(containerId);
    if (existing) {
      return existing;
    }

    const activeMapId: MapId = mapId ?? (containerId.startsWith("jp_") ? "japan" : "vietnam");
    const desiredCount = this.rollItemCount(sourceType, securityZone);
    const generatedDefs: CollectibleItemDef[] = [];

    let hasBackpack = false;
    for (let i = 0; i < desiredCount; i++) {
      const rarity = this.rollRarity(sourceType, securityZone);
      const allowBackpack = sourceType !== "trash_bin" && !hasBackpack;
      const def = this.pickItemByZoneAffinity(rarity, biome, allowBackpack, activeMapId);
      if (def.backpackId) hasBackpack = true;
      generatedDefs.push(def);

      if (securityZone !== "green") {
        if (rarity === "S") {
          this.state.mythicPity = 0;
          this.state.consecutiveJunk = 0;
        } else {
          this.state.mythicPity += 1;
          this.state.consecutiveJunk = rarity === "C" ? this.state.consecutiveJunk + 1 : 0;
        }
      }
    }

    // Randomize item order cleanly (no fixed big-to-small sorting rule)
    shuffleArray(generatedDefs);

    let packedItems: GridItemInstance[] = [];
    for (let attempt = 0; attempt < 8; attempt++) {
      const trial: GridItemInstance[] = [];
      let allFit = true;
      for (const def of generatedDefs) {
        const fit = findRandomFitOnGrid(CONTAINER_COLS, CONTAINER_ROWS, trial, def);
        if (!fit) {
          allFit = false;
          break;
        }
        trial.push({
          uid: `it_${this.state.nextUid++}`,
          itemId: def.id,
          x: fit.x,
          y: fit.y,
          rotated: fit.rotated,
          originBiome: biome,
          revealed: false,
        });
      }
      if (allFit) {
        packedItems = trial;
        break;
      }
    }

    // Fallback scatter if random middle clutter blocked a large item
    if (packedItems.length === 0) {
      for (const def of generatedDefs) {
        const fit =
          findRandomFitOnGrid(CONTAINER_COLS, CONTAINER_ROWS, packedItems, def) ??
          findFirstFitOnGrid(CONTAINER_COLS, CONTAINER_ROWS, packedItems, def);
        let chosenDef = def;
        let finalFit = fit;

        if (!finalFit) {
          const smaller = shuffleArray(
            ITEM_CATALOG.filter(
              (c) =>
                c.rarity === def.rarity &&
                !c.excludeFromRandomLoot &&
                !c.backpackId &&
                (activeMapId === "vietnam" ? !c.mapOrigin || c.mapOrigin === "vietnam" : true) &&
                c.w * c.h < def.w * def.h,
            ),
          );
          for (const alt of smaller) {
            const altFit =
              findRandomFitOnGrid(CONTAINER_COLS, CONTAINER_ROWS, packedItems, alt) ??
              findFirstFitOnGrid(CONTAINER_COLS, CONTAINER_ROWS, packedItems, alt);
            if (altFit) {
              chosenDef = alt;
              finalFit = altFit;
              break;
            }
          }
        }

        if (finalFit) {
          packedItems.push({
            uid: `it_${this.state.nextUid++}`,
            itemId: chosenDef.id,
            x: finalFit.x,
            y: finalFit.y,
            rotated: finalFit.rotated,
            originBiome: biome,
            revealed: false,
          });
        }
      }
    }

    const now = Date.now();
    const container: ContainerLootState = {
      containerId,
      title,
      sourceType,
      biome,
      cols: CONTAINER_COLS,
      rows: CONTAINER_ROWS,
      items: packedItems,
      generatedAt: now,
      refreshAt: now + rollContainerRefreshMs(sourceType),
    };

    this.state.containers[containerId] = container;
    this.saveState();
    return container;
  }

  private resolveZoneGrid(
    zone: GridZone,
    containerId: string | null,
  ): { cols: number; rows: number; items: GridItemInstance[] } | null {
    if (zone === "backpack") {
      const bp = this.getBackpackTier();
      return bp
        ? { cols: bp.cols, rows: bp.rows, items: this.state.backpackItems }
        : { cols: 0, rows: 0, items: this.state.backpackItems };
    }
    if (zone === "safebox") {
      const sb = this.getSafeboxTier();
      return { cols: sb.cols, rows: sb.rows, items: this.state.safeboxItems };
    }
    if (zone === "home") {
      const ht = this.getHomeTier();
      return { cols: ht.cols, rows: ht.rows, items: this.state.homeItems };
    }
    if (!containerId) return null;
    const container = this.state.containers[containerId];
    if (!container) return null;
    return { cols: container.cols, rows: container.rows, items: container.items };
  }

  /**
   * Moves an item strictly between Backpack <-> Active Container or Backpack <-> Home Storage
   * (or rearranges inside one grid). Dropping outside valid grids is rejected.
   */
  public placeMovedItem(
    fromZone: GridZone,
    toZone: GridZone,
    containerId: string | null,
    uid: string,
    targetX: number,
    targetY: number,
    targetRotated: boolean,
  ): boolean {
    const src = this.resolveZoneGrid(fromZone, containerId);
    const dest = this.resolveZoneGrid(toZone, containerId);
    if (!src || !dest) return false;

    const idx = src.items.findIndex((i) => i.uid === uid);
    if (idx === -1) return false;

    const item = src.items[idx];
    if (fromZone === "container" && item.revealed === false) return false;
    const def = ITEM_BY_ID[item.itemId];
    if (!def) return false;

    const { w, h } = getEffectiveSize(def, targetRotated);
    if (
      !canPlaceOnGrid(
        dest.cols,
        dest.rows,
        dest.items,
        targetX,
        targetY,
        w,
        h,
        fromZone === toZone ? uid : undefined,
      )
    ) {
      return false;
    }

    src.items.splice(idx, 1);
    dest.items.push({
      ...item,
      x: targetX,
      y: targetY,
      rotated: targetRotated,
      revealed: true,
    });

    this.saveState();
    return true;
  }

  /**
   * Quick-transfers an item to the opposite active grid using first available slot.
   */
  public quickTransfer(
    fromZone: GridZone,
    toZone: GridZone,
    containerId: string | null,
    uid: string,
  ): boolean {
    const src = this.resolveZoneGrid(fromZone, containerId);
    const dest = this.resolveZoneGrid(toZone, containerId);
    if (!src || !dest) return false;

    const item = src.items.find((i) => i.uid === uid);
    if (!item || (fromZone === "container" && item.revealed === false)) return false;

    const def = ITEM_BY_ID[item.itemId];
    if (!def) return false;

    const fit = findFirstFitOnGrid(dest.cols, dest.rows, dest.items, def, item.rotated);
    if (!fit) return false;

    return this.placeMovedItem(fromZone, toZone, containerId, uid, fit.x, fit.y, fit.rotated);
  }

  private repackItemsIntoDimensions(
    items: readonly GridItemInstance[],
    cols: number,
    rows: number,
  ): GridItemInstance[] | null {
    const sorted = [...items].sort((a, b) => {
      const da = ITEM_BY_ID[a.itemId];
      const db = ITEM_BY_ID[b.itemId];
      return (db ? db.w * db.h : 1) - (da ? da.w * da.h : 1);
    });
    const packed: GridItemInstance[] = [];
    for (const item of sorted) {
      const def = ITEM_BY_ID[item.itemId];
      if (!def) continue;
      const { w, h } = getEffectiveSize(def, item.rotated);
      if (canPlaceOnGrid(cols, rows, packed, item.x, item.y, w, h)) {
        packed.push({ ...item });
        continue;
      }
      const fit = findFirstFitOnGrid(cols, rows, packed, def, item.rotated);
      if (!fit) return null;
      packed.push({ ...item, x: fit.x, y: fit.y, rotated: fit.rotated });
    }
    return packed;
  }

  /**
   * Purchases a physical backpack either to wear immediately (`mode: "equip"`, packing the previous
   * worn backpack inside the new bag or Safebox if possible) or to store folded (`mode: "pack"`).
   */
  public buyBackpack(
    tierId: string,
    mode: "equip" | "pack" = "equip",
    packZone: "backpack" | "safebox" = "backpack",
  ): { ok: boolean; message: string } {
    const tier = BACKPACK_BY_ID[tierId];
    if (!tier) return { ok: false, message: "Loại balo không tồn tại." };
    if (this.state.gold < tier.priceGold) {
      return {
        ok: false,
        message: `Cần ${tier.priceGold.toLocaleString("vi-VN")} Vàng để mua ${tier.name}.`,
      };
    }

    if (mode === "pack") {
      const targetGrid = this.resolveZoneGrid(packZone, null);
      if (!targetGrid || targetGrid.cols === 0) {
        return {
          ok: false,
          message:
            packZone === "backpack"
              ? "Bạn đang không đeo Balo nào — hãy chọn 'Mua & Đeo' hoặc cất vào Safebox!"
              : "Safebox không khả dụng.",
        };
      }
      const itemDef = ITEM_BY_ID[tier.inventoryItemId];
      if (!itemDef) return { ok: false, message: "Dữ liệu balo không hợp lệ." };
      const fit = findFirstFitOnGrid(targetGrid.cols, targetGrid.rows, targetGrid.items, itemDef, false);
      if (!fit) {
        return {
          ok: false,
          message: `${packZone === "safebox" ? "Safebox" : "Balo"} không đủ ${itemDef.w}×${itemDef.h} ô trống để cất ${tier.name}!`,
        };
      }
      this.state.gold -= tier.priceGold;
      targetGrid.items.push({
        uid: `it_${this.state.nextUid++}`,
        itemId: itemDef.id,
        x: fit.x,
        y: fit.y,
        rotated: fit.rotated,
        originBiome: "city",
        revealed: true,
      });
      this.saveState();
      return {
        ok: true,
        message: `Đã mua ${tier.name} và cất vào ${packZone === "safebox" ? "Safebox" : "Balo"}!`,
      };
    }

    // mode === "equip": repack current worn items into new tier, and fold previous worn backpack inside
    const repacked = this.repackItemsIntoDimensions(this.state.backpackItems, tier.cols, tier.rows);
    if (!repacked) {
      return {
        ok: false,
        message: "Balo này nhỏ hơn số đồ đang mang — hãy cất bớt đồ hoặc chọn 'Bỏ Balo'!",
      };
    }

    let placedOldInSafebox = false;
    const prevTier = this.getBackpackTier();
    if (prevTier) {
      const prevDef = ITEM_BY_ID[prevTier.inventoryItemId];
      if (prevDef) {
        const fitInNewBag = findFirstFitOnGrid(tier.cols, tier.rows, repacked, prevDef, false);
        if (fitInNewBag) {
          repacked.push({
            uid: `it_${this.state.nextUid++}`,
            itemId: prevDef.id,
            x: fitInNewBag.x,
            y: fitInNewBag.y,
            rotated: fitInNewBag.rotated,
            originBiome: "city",
            revealed: true,
          });
        } else {
          const sb = this.getSafeboxTier();
          const fitInSb = findFirstFitOnGrid(sb.cols, sb.rows, this.state.safeboxItems, prevDef, false);
          if (!fitInSb) {
            return {
              ok: false,
              message: `${tier.name} (và Safebox) không đủ thêm ${prevDef.w}×${prevDef.h} ô để cất balo cũ (${prevTier.name}). Hãy cất bớt đồ, bán balo cũ trước, hoặc chọn 'Bỏ Balo'!`,
            };
          }
          this.state.safeboxItems.push({
            uid: `it_${this.state.nextUid++}`,
            itemId: prevDef.id,
            x: fitInSb.x,
            y: fitInSb.y,
            rotated: fitInSb.rotated,
            originBiome: "city",
            revealed: true,
          });
          placedOldInSafebox = true;
        }
      }
    }

    this.state.gold -= tier.priceGold;
    this.state.backpackId = tier.id;
    this.state.backpackItems = repacked;
    this.saveState();
    return {
      ok: true,
      message: prevTier
        ? `Đã mua & đeo ${tier.name} (${tier.cols}×${tier.rows}), cất ${prevTier.name} vào ${placedOldInSafebox ? "Safebox" : "Balo mới"}!`
        : `Đã mua & đeo ${tier.name} (${tier.cols}×${tier.rows})!`,
    };
  }

  /** Preview helper so UI can warn before confirming a backpack swap purchase. */
  public canBuyAndEquipBackpack(tierId: string): { ok: boolean; reason?: string } {
    const tier = BACKPACK_BY_ID[tierId];
    if (!tier) return { ok: false, reason: "Loại balo không tồn tại." };
    const repacked = this.repackItemsIntoDimensions(this.state.backpackItems, tier.cols, tier.rows);
    if (!repacked) {
      return {
        ok: false,
        reason: `Balo ${tier.name} (${tier.cols}×${tier.rows}) không đủ chỗ chứa toàn bộ đồ đang mang!`,
      };
    }
    const prevTier = this.getBackpackTier();
    if (prevTier) {
      const prevDef = ITEM_BY_ID[prevTier.inventoryItemId];
      if (prevDef) {
        const sb = this.getSafeboxTier();
        const fitsBag = findFirstFitOnGrid(tier.cols, tier.rows, repacked, prevDef, false);
        const fitsSb = findFirstFitOnGrid(sb.cols, sb.rows, this.state.safeboxItems, prevDef, false);
        if (!fitsBag && !fitsSb) {
          return {
            ok: false,
            reason: `Không đủ thêm ${prevDef.w}×${prevDef.h} ô để cất balo cũ (${prevTier.name}) vào ${tier.name} hoặc Safebox!`,
          };
        }
      }
    }
    return { ok: true };
  }

  /** Equips a physical backpack item directly from Backpack, Safebox, Home Storage, or an open Container. */
  public equipBackpackFromInventory(
    sourceZone: GridZone,
    uid: string,
    containerId: string | null = null,
  ): { ok: boolean; message: string } {
    const srcGrid = this.resolveZoneGrid(sourceZone, containerId);
    if (!srcGrid) return { ok: false, message: "Kho chứa không hợp lệ." };

    const idx = srcGrid.items.findIndex((i) => i.uid === uid);
    if (idx === -1) return { ok: false, message: "Không tìm thấy balo trong kho." };
    const inst = srcGrid.items[idx];
    if (sourceZone === "container" && inst.revealed === false) {
      return { ok: false, message: "Hãy chờ quét xong vật phẩm trước!" };
    }
    const targetDef = ITEM_BY_ID[inst.itemId];
    const targetTier = targetDef?.backpackId ? BACKPACK_BY_ID[targetDef.backpackId] : null;
    if (!targetTier) return { ok: false, message: "Vật phẩm này không phải là Balo." };

    const prevTier = this.getBackpackTier();
    const prevDef = prevTier ? ITEM_BY_ID[prevTier.inventoryItemId] : null;

    if (sourceZone === "backpack") {
      // Equipping a folded backpack stored inside the currently worn backpack
      const remainingBagItems = this.state.backpackItems.filter((i) => i.uid !== uid);
      const repacked = this.repackItemsIntoDimensions(remainingBagItems, targetTier.cols, targetTier.rows);
      if (!repacked) {
        return {
          ok: false,
          message: `${targetTier.name} (${targetTier.cols}×${targetTier.rows}) không đủ chỗ cho toàn bộ đồ đang mang!`,
        };
      }
      if (prevDef) {
        const fitPrev = findFirstFitOnGrid(targetTier.cols, targetTier.rows, repacked, prevDef, false);
        if (fitPrev) {
          repacked.push({
            uid: `it_${this.state.nextUid++}`,
            itemId: prevDef.id,
            x: fitPrev.x,
            y: fitPrev.y,
            rotated: fitPrev.rotated,
            originBiome: "city",
            revealed: true,
          });
        } else {
          const sb = this.getSafeboxTier();
          const fitSb = findFirstFitOnGrid(sb.cols, sb.rows, this.state.safeboxItems, prevDef, false);
          if (!fitSb) {
            return {
              ok: false,
              message: `Không đủ thêm ${prevDef.w}×${prevDef.h} ô để cất ${prevTier!.name} vào ${targetTier.name} hay Safebox!`,
            };
          }
          this.state.safeboxItems.push({
            uid: `it_${this.state.nextUid++}`,
            itemId: prevDef.id,
            x: fitSb.x,
            y: fitSb.y,
            rotated: fitSb.rotated,
            originBiome: "city",
            revealed: true,
          });
        }
      }
      this.state.backpackId = targetTier.id;
      this.state.backpackItems = repacked;
      this.saveState();
      return { ok: true, message: `Đã đeo ${targetTier.name} (${targetTier.cols}×${targetTier.rows})!` };
    }

    // sourceZone === "home" | "safebox" | "container"
    const repacked = this.repackItemsIntoDimensions(this.state.backpackItems, targetTier.cols, targetTier.rows);
    if (!repacked) {
      return {
        ok: false,
        message: `${targetTier.name} (${targetTier.cols}×${targetTier.rows}) không đủ chỗ chứa toàn bộ đồ đang có trong balo!`,
      };
    }

    const clonedSrcItems = srcGrid.items.filter((i) => i.uid !== uid).map((i) => ({ ...i }));
    let placedOld = !prevDef;
    let safeboxExtra: GridItemInstance | null = null;
    if (prevDef) {
      // 1) Try placing previous worn backpack back into the freed source grid
      const fitInSrc = findFirstFitOnGrid(srcGrid.cols, srcGrid.rows, clonedSrcItems, prevDef, false);
      if (fitInSrc) {
        clonedSrcItems.push({
          uid: `it_${this.state.nextUid++}`,
          itemId: prevDef.id,
          x: fitInSrc.x,
          y: fitInSrc.y,
          rotated: fitInSrc.rotated,
          originBiome: inst.originBiome,
          revealed: true,
        });
        placedOld = true;
      } else {
        // 2) Try packing previous worn backpack inside the newly equipped backpack
        const fitInNewBag = findFirstFitOnGrid(targetTier.cols, targetTier.rows, repacked, prevDef, false);
        if (fitInNewBag) {
          repacked.push({
            uid: `it_${this.state.nextUid++}`,
            itemId: prevDef.id,
            x: fitInNewBag.x,
            y: fitInNewBag.y,
            rotated: fitInNewBag.rotated,
            originBiome: "city",
            revealed: true,
          });
          placedOld = true;
        } else if (sourceZone !== "safebox") {
          // 3) Try tucking previous worn backpack into Safebox
          const sb = this.getSafeboxTier();
          const fitSb = findFirstFitOnGrid(sb.cols, sb.rows, this.state.safeboxItems, prevDef, false);
          if (fitSb) {
            safeboxExtra = {
              uid: `it_${this.state.nextUid++}`,
              itemId: prevDef.id,
              x: fitSb.x,
              y: fitSb.y,
              rotated: fitSb.rotated,
              originBiome: "city",
              revealed: true,
            };
            placedOld = true;
          }
        }
      }
    }

    if (!placedOld) {
      return {
        ok: false,
        message: `Không đủ chỗ để cất ${prevTier?.name ?? "balo cũ"} khi đổi sang ${targetTier.name}!`,
      };
    }

    if (sourceZone === "home") this.state.homeItems = clonedSrcItems;
    else if (sourceZone === "safebox") this.state.safeboxItems = clonedSrcItems;
    else if (containerId && this.state.containers[containerId]) {
      this.state.containers[containerId].items = clonedSrcItems;
    }

    if (safeboxExtra) {
      this.state.safeboxItems.push(safeboxExtra);
    }

    this.state.backpackId = targetTier.id;
    this.state.backpackItems = repacked;
    this.saveState();
    return { ok: true, message: `Đã đeo ${targetTier.name} (${targetTier.cols}×${targetTier.rows})!` };
  }

  /** Removes the currently worn backpack (must be empty) into Home Storage or Safebox. */
  public unequipBackpackTo(destZone: "home" | "safebox"): { ok: boolean; message: string } {
    const bp = this.getBackpackTier();
    if (!bp) return { ok: false, message: "Bạn đang không đeo Balo nào." };
    if (this.state.backpackItems.length > 0) {
      return { ok: false, message: "Hãy lấy toàn bộ đồ trong Balo ra trước khi tháo balo!" };
    }
    const def = ITEM_BY_ID[bp.inventoryItemId];
    if (!def) return { ok: false, message: "Dữ liệu balo không hợp lệ." };

    const addRes = this.addItemToZone(destZone, def.id, "city");
    if (!addRes.ok) return addRes;

    this.state.backpackId = null;
    this.saveState();
    return {
      ok: true,
      message: `Đã tháo ${bp.name} vào ${destZone === "home" ? "Kho Nhà" : "Safebox"}.`,
    };
  }

  /** Sells the currently worn backpack (must be empty) directly at Shop Balo. */
  public sellEquippedBackpack(): { ok: boolean; earnedGold: number; message: string } {
    const bp = this.getBackpackTier();
    if (!bp) return { ok: false, earnedGold: 0, message: "Bạn đang không đeo Balo nào để bán." };
    if (this.state.backpackItems.length > 0) {
      return { ok: false, earnedGold: 0, message: "Balo đang có đồ bên trong — hãy cất hoặc bán đồ trước khi bán Balo!" };
    }
    this.state.gold += bp.valueGold;
    this.state.backpackId = null;
    this.saveState();
    return {
      ok: true,
      earnedGold: bp.valueGold,
      message: `Đã bán ${bp.name} nhận +${bp.valueGold.toLocaleString("vi-VN")} Vàng!`,
    };
  }

  public sellItemInZone(zone: "backpack" | "safebox", uid: string): number {
    const list = zone === "safebox" ? this.state.safeboxItems : this.state.backpackItems;
    const idx = list.findIndex((i) => i.uid === uid);
    if (idx === -1) return 0;
    const item = list[idx];
    const def = ITEM_BY_ID[item.itemId];
    const value = getItemEffectiveValueGold(item, def);
    list.splice(idx, 1);
    this.state.gold += value;
    this.saveState();
    return value;
  }

  public sellAllInZone(
    zone: "backpack" | "safebox",
    onlyJunk = false,
  ): { soldCount: number; earnedGold: number } {
    const list = zone === "safebox" ? this.state.safeboxItems : this.state.backpackItems;
    let soldCount = 0;
    let earnedGold = 0;
    const keep: GridItemInstance[] = [];

    for (const item of list) {
      const def = ITEM_BY_ID[item.itemId];
      if (!def) continue;
      if (onlyJunk && def.rarity !== "C") {
        keep.push(item);
        continue;
      }
      soldCount += 1;
      earnedGold += getItemEffectiveValueGold(item, def);
    }

    if (soldCount > 0) {
      if (zone === "safebox") this.state.safeboxItems = keep;
      else this.state.backpackItems = keep;
      this.state.gold += earnedGold;
      this.saveState();
    }
    return { soldCount, earnedGold };
  }

  public sellBackpackItem(uid: string): number {
    return this.sellItemInZone("backpack", uid);
  }

  public sellAllInBackpack(onlyJunk = false): { soldCount: number; earnedGold: number } {
    return this.sellAllInZone("backpack", onlyJunk);
  }

  public trySpendGold(amount: number): boolean {
    if (!Number.isFinite(amount) || amount < 0) return false;
    const cost = Math.floor(amount);
    if (this.state.gold < cost) return false;
    this.state.gold -= cost;
    this.saveState();
    return true;
  }

  public canFitItemInZone(
    zone: "backpack" | "home" | "safebox",
    itemId: string,
    ignoreUid?: string,
  ): { x: number; y: number; rotated: boolean } | null {
    const def = ITEM_BY_ID[itemId];
    if (!def) return null;
    const dest = this.resolveZoneGrid(zone, null);
    if (!dest || dest.cols <= 0 || dest.rows <= 0) return null;
    const filtered = ignoreUid ? dest.items.filter((i) => i.uid !== ignoreUid) : dest.items;
    return findFirstFitOnGrid(dest.cols, dest.rows, filtered, def, false);
  }

  public addItemToZone(
    zone: "backpack" | "home" | "safebox",
    itemId: string,
    originBiome: BiomeId = "city",
  ): { ok: boolean; message: string } {
    const def = ITEM_BY_ID[itemId];
    if (!def) return { ok: false, message: "Vật phẩm không hợp lệ." };
    const dest = this.resolveZoneGrid(zone, null);
    if (!dest) return { ok: false, message: "Kho chứa không hợp lệ." };
    if (zone === "backpack" && !this.getBackpackTier()) {
      return {
        ok: false,
        message: "Bạn chưa đeo Balo nào! Hãy mua/đeo Balo hoặc cất tạm vào Safebox.",
      };
    }
    const fit = findFirstFitOnGrid(dest.cols, dest.rows, dest.items, def, false);
    if (!fit) {
      const label = zone === "home" ? "Kho Nhà" : zone === "safebox" ? "Safebox" : "Balo";
      return {
        ok: false,
        message:
          zone === "backpack"
            ? `Balo không đủ chỗ (cần ${def.w}×${def.h} ô) — hãy cất về Safebox/Kho Nhà hoặc bán bớt!`
            : `${label} không đủ chỗ trống (cần ${def.w}×${def.h} ô).`,
      };
    }
    dest.items.push({
      uid: `it_${this.state.nextUid++}`,
      itemId: def.id,
      x: fit.x,
      y: fit.y,
      rotated: fit.rotated,
      originBiome,
      revealed: true,
      ...(def.consumableId ? { usesLeft: getItemMaxUses(def) } : {}),
    });
    this.saveState();
    const label = zone === "home" ? "Kho Nhà" : zone === "safebox" ? "Safebox" : "Balo";
    return {
      ok: true,
      message: `Đã cất ${def.name} vào ${label}.`,
    };
  }

  public addItemToBackpack(
    itemId: string,
    originBiome: BiomeId = "city",
  ): { ok: boolean; message: string } {
    return this.addItemToZone("backpack", itemId, originBiome);
  }

  public removeItemFromZone(zone: "backpack" | "home" | "safebox", uid: string): GridItemInstance | null {
    const list =
      zone === "home"
        ? this.state.homeItems
        : zone === "safebox"
          ? this.state.safeboxItems
          : this.state.backpackItems;
    const idx = list.findIndex((i) => i.uid === uid);
    if (idx === -1) return null;
    const [removed] = list.splice(idx, 1);
    this.saveState();
    return removed;
  }

  /** Confiscates every carried item in backpack AND the worn backpack itself on arrest; Safebox & Home Storage remain untouched. */
  public confiscateOnArrest(): { lostItemCount: number; lostBackpack: boolean } {
    const lostItemCount = this.state.backpackItems.length;
    const lostBackpack = this.state.backpackId !== null;
    if (lostItemCount > 0 || lostBackpack) {
      this.state.backpackItems = [];
      this.state.backpackId = null;
      this.saveState();
    }
    return { lostItemCount, lostBackpack };
  }

  /** Legacy helper: confiscates backpack inventory on arrest. */
  public clearBackpackItems(): number {
    return this.confiscateOnArrest().lostItemCount;
  }

  public countItemAcrossZones(itemId: string): {
    total: number;
    backpack: number;
    safebox: number;
    home: number;
  } {
    const countIn = (arr: readonly GridItemInstance[]) =>
      arr.reduce((acc, it) => acc + (it.itemId === itemId ? 1 : 0), 0);
    const backpack = countIn(this.state.backpackItems);
    const safebox = countIn(this.state.safeboxItems);
    const home = countIn(this.state.homeItems);
    return { total: backpack + safebox + home, backpack, safebox, home };
  }

  private removeOneItemByIdPreferred(itemId: string): "backpack" | "safebox" | "home" | null {
    for (const [zone, list] of [
      ["backpack", this.state.backpackItems],
      ["safebox", this.state.safeboxItems],
      ["home", this.state.homeItems],
    ] as const) {
      const idx = list.findIndex((it) => it.itemId === itemId);
      if (idx !== -1) {
        list.splice(idx, 1);
        if (zone === "backpack") this.cachedBackpackWeightKg = null;
        return zone;
      }
    }
    return null;
  }

  private resolveUpgradeMeta(kind: UpgradeKind): {
    label: string;
    maxLabel: string;
    targetId: string | null;
    requirements: SafeboxQuestRequirement[] | null;
    applyUpgrade: (targetId: string) => SafeboxTierDef;
    formatTierSummary: (tier: SafeboxTierDef) => string;
  } {
    if (kind === "home") {
      return {
        label: "Kho Nhà",
        maxLabel: "9×16",
        targetId: this.state.homeContract?.targetHomeId ?? null,
        requirements: this.state.homeContract?.requirements ?? null,
        applyUpgrade: (id) => {
          this.state.homeStorageId = id;
          const nextTier = getNextHomeTier(id);
          this.state.homeContract = nextTier ? generateHomeContract(nextTier.id) : null;
          return this.getHomeTier();
        },
        formatTierSummary: (t) => `${t.name} (${t.cols}×${t.rows})`,
      };
    }
    if (kind === "gym") {
      return {
        label: "Phòng Gym",
        maxLabel: "+15% Thể lực",
        targetId: this.state.homeGymContract?.targetTierId ?? null,
        requirements: this.state.homeGymContract?.requirements ?? null,
        applyUpgrade: (id) => {
          this.state.homeGymId = id;
          const nextTier = getNextGymTier(id);
          this.state.homeGymContract = nextTier ? generateGymContract(nextTier.id) : null;
          return this.getGymTier();
        },
        formatTierSummary: (t) => t.name,
      };
    }
    if (kind === "treadmill") {
      return {
        label: "Máy Chạy Bộ",
        maxLabel: "+20% tốc độ",
        targetId: this.state.homeTreadmillContract?.targetTierId ?? null,
        requirements: this.state.homeTreadmillContract?.requirements ?? null,
        applyUpgrade: (id) => {
          this.state.homeTreadmillId = id;
          const nextTier = getNextTreadmillTier(id);
          this.state.homeTreadmillContract = nextTier
            ? generateTreadmillContract(nextTier.id)
            : null;
          return this.getTreadmillTier();
        },
        formatTierSummary: (t) => t.name,
      };
    }
    return {
      label: "Safebox",
      maxLabel: "5×5",
      targetId: this.state.safeboxContract?.targetSafeboxId ?? null,
      requirements: this.state.safeboxContract?.requirements ?? null,
      applyUpgrade: (id) => {
        this.state.safeboxId = id;
        const nextTier = getNextSafeboxTier(id);
        this.state.safeboxContract = nextTier ? generateSafeboxContract(nextTier.id) : null;
        return this.getSafeboxTier();
      },
      formatTierSummary: (t) => `${t.name} (${t.cols}×${t.rows})`,
    };
  }

  public deliverUpgradeItem(
    kind: UpgradeKind,
    itemId: string,
    atHome = false,
  ): {
    ok: boolean;
    upgraded: boolean;
    newTier?: SafeboxTierDef;
    removedFrom?: "backpack" | "safebox" | "home";
    message: string;
  } {
    const meta = this.resolveUpgradeMeta(kind);
    if (!atHome) {
      return {
        ok: false,
        upgraded: false,
        message: `🏠 Phải về Nhà Riêng mới có thể giao nộp vật phẩm & nâng cấp ${meta.label}!`,
      };
    }

    if (!meta.requirements || !meta.targetId) {
      return {
        ok: false,
        upgraded: false,
        message: `${meta.label} của bạn đã đạt cấp tối đa (${meta.maxLabel})!`,
      };
    }

    const req = meta.requirements.find((r) => r.itemId === itemId);
    if (!req) {
      return { ok: false, upgraded: false, message: `Vật phẩm không thuộc yêu cầu nâng cấp ${meta.label}.` };
    }
    if (req.deliveredCount >= req.requiredCount) {
      return { ok: false, upgraded: false, message: "Mục vật phẩm này đã nộp đủ số lượng." };
    }

    const removedFrom = this.removeOneItemByIdPreferred(itemId);
    if (!removedFrom) {
      return {
        ok: false,
        upgraded: false,
        message: "Không tìm thấy vật phẩm này trong Balo, Safebox hay Kho Nhà.",
      };
    }

    req.deliveredCount += 1;
    const def = ITEM_BY_ID[itemId];
    const completedAll = meta.requirements.every((r) => r.deliveredCount >= r.requiredCount);
    if (completedAll) {
      const newTier = meta.applyUpgrade(meta.targetId);
      this.saveState();
      return {
        ok: true,
        upgraded: true,
        newTier,
        removedFrom,
        message: `🎉 Nâng cấp ${meta.label} thành công lên ${meta.formatTierSummary(newTier)}!`,
      };
    }

    this.saveState();
    return {
      ok: true,
      upgraded: false,
      removedFrom,
      message: `Đã giao 1 ${def?.name ?? itemId} (${req.deliveredCount}/${req.requiredCount}).`,
    };
  }

  public deliverAllUpgradeItems(
    kind: UpgradeKind,
    atHome = false,
  ): {
    deliveredTotal: number;
    upgraded: boolean;
    newTier?: SafeboxTierDef;
    message: string;
  } {
    const meta = this.resolveUpgradeMeta(kind);
    if (!atHome) {
      return {
        deliveredTotal: 0,
        upgraded: false,
        message: `🏠 Phải về Nhà Riêng mới có thể giao nộp vật phẩm & nâng cấp ${meta.label}!`,
      };
    }
    if (!meta.requirements) {
      return {
        deliveredTotal: 0,
        upgraded: false,
        message: `${meta.label} đã đạt cấp tối đa (${meta.maxLabel})!`,
      };
    }

    let deliveredTotal = 0;
    for (const req of meta.requirements) {
      while (req.deliveredCount < req.requiredCount) {
        const res = this.deliverUpgradeItem(kind, req.itemId, atHome);
        if (!res.ok) break;
        deliveredTotal += 1;
        if (res.upgraded) {
          return {
            deliveredTotal,
            upgraded: true,
            newTier: res.newTier,
            message: res.message,
          };
        }
      }
    }

    if (deliveredTotal === 0) {
      return {
        deliveredTotal: 0,
        upgraded: false,
        message: "Chưa có vật phẩm phù hợp nào trong Balo / Safebox / Kho Nhà để giao.",
      };
    }

    return {
      deliveredTotal,
      upgraded: false,
      message: `Đã giao ${deliveredTotal} vật phẩm vào hợp đồng nâng cấp ${meta.label}!`,
    };
  }

  public deliverSafeboxRequirementItem(itemId: string, atHome = false) {
    return this.deliverUpgradeItem("safebox", itemId, atHome);
  }

  public deliverAllAvailableSafeboxItems(atHome = false) {
    return this.deliverAllUpgradeItems("safebox", atHome);
  }

  public deliverHomeRequirementItem(itemId: string, atHome = false) {
    return this.deliverUpgradeItem("home", itemId, atHome);
  }

  public deliverAllAvailableHomeItems(atHome = false) {
    return this.deliverAllUpgradeItems("home", atHome);
  }

  public deliverGymRequirementItem(itemId: string, atHome = false) {
    return this.deliverUpgradeItem("gym", itemId, atHome);
  }

  public deliverTreadmillRequirementItem(itemId: string, atHome = false) {
    return this.deliverUpgradeItem("treadmill", itemId, atHome);
  }

  public getCollectionSlot(itemId: string): CollectionSlotState {
    const raw = this.state.collectionHall?.[itemId];
    if (!raw) {
      return { displayed: false, lightLevel: 0, goldLampProgress: 0 };
    }
    return {
      displayed: Boolean(raw.displayed),
      lightLevel: raw.lightLevel,
      goldLampProgress: raw.lightLevel === 1 ? raw.goldLampProgress : 0,
    };
  }

  public getCollectionHallStates(): Record<string, CollectionSlotState> {
    const out: Record<string, CollectionSlotState> = {};
    for (const def of COLLECTION_RED_ITEMS) {
      out[def.id] = this.getCollectionSlot(def.id);
    }
    return out;
  }

  private writeCollectionSlot(itemId: string, slot: CollectionSlotState): void {
    if (!this.state.collectionHall) {
      this.state.collectionHall = {};
    }
    if (!slot.displayed && slot.lightLevel === 0 && slot.goldLampProgress === 0) {
      delete this.state.collectionHall[itemId];
    } else {
      this.state.collectionHall[itemId] = { ...slot };
    }
  }

  public depositCollectionDisplayItem(itemId: string): CollectionActionResult {
    const def = COLLECTION_RED_BY_ID[itemId];
    if (!def) {
      return { ok: false, message: "Chỉ có thể trưng bày các bảo vật Đỏ (S)." };
    }
    const slot = this.getCollectionSlot(itemId);
    if (slot.displayed) {
      return { ok: false, slot, message: `${def.name} đã được đặt vào khung trưng bày rồi.` };
    }
    const removedFrom = this.removeOneItemByIdPreferred(itemId);
    if (!removedFrom) {
      return {
        ok: false,
        slot,
        message: `Không tìm thấy ${def.name} trong Balo, Safebox hoặc Kho Nhà.`,
      };
    }
    const nextSlot: CollectionSlotState = { ...slot, displayed: true };
    this.writeCollectionSlot(itemId, nextSlot);
    this.saveState();
    const zoneLabel =
      removedFrom === "backpack" ? "Balo" : removedFrom === "safebox" ? "Safebox" : "Kho Nhà";
    return {
      ok: true,
      slot: { ...nextSlot },
      sourceZone: removedFrom,
      message: `🖼️ Đã lấy ${def.name} từ ${zoneLabel} đặt vào khung trưng bày!`,
    };
  }

  public withdrawCollectionDisplayItem(itemId: string): CollectionActionResult {
    const def = COLLECTION_RED_BY_ID[itemId];
    if (!def) {
      return { ok: false, message: "Vật phẩm trưng bày không hợp lệ." };
    }
    const slot = this.getCollectionSlot(itemId);
    if (!slot.displayed) {
      return { ok: false, slot, message: `${def.name} hiện chưa được đặt trong khung.` };
    }
    const zones: Array<"backpack" | "safebox" | "home"> = ["backpack", "safebox", "home"];
    const destZone = zones.find((z) => this.canFitItemInZone(z, itemId));
    if (!destZone) {
      return {
        ok: false,
        slot,
        message: `Balo, Safebox và Kho Nhà đều không đủ chỗ trống (${def.w}×${def.h} ô) để lấy ${def.name} ra!`,
      };
    }
    const nextSlot: CollectionSlotState = { ...slot, displayed: false };
    this.writeCollectionSlot(itemId, nextSlot);
    const added = this.addItemToZone(destZone, itemId, def.homeBiome);
    if (!added.ok) {
      // Revert if unexpected grid failure occurred
      this.writeCollectionSlot(itemId, slot);
      return { ok: false, slot, message: added.message };
    }
    const destLabel =
      destZone === "backpack" ? "Balo" : destZone === "safebox" ? "Safebox" : "Kho Nhà";
    return {
      ok: true,
      slot: { ...nextSlot },
      destZone,
      message: `📤 Đã lấy ${def.name} ra cất vào ${destLabel}${nextSlot.lightLevel > 0 ? " (khung đèn vẫn giữ nguyên!)" : ""}.`,
    };
  }

  public upgradeCollectionLight(itemId: string): CollectionActionResult {
    const def = COLLECTION_RED_BY_ID[itemId];
    if (!def) {
      return { ok: false, message: "Vật phẩm lên đèn không hợp lệ." };
    }
    const slot = this.getCollectionSlot(itemId);
    if (slot.lightLevel >= 2) {
      return { ok: false, slot, message: `${def.name} đã đạt Đèn Vàng (Level 2) tối đa!` };
    }
    const removedFrom = this.removeOneItemByIdPreferred(itemId);
    if (!removedFrom) {
      return {
        ok: false,
        slot,
        message: `Cần có 1 ${def.name} trong Balo, Safebox hoặc Kho Nhà để nộp lên đèn.`,
      };
    }

    if (slot.lightLevel === 0) {
      const nextSlot: CollectionSlotState = {
        displayed: slot.displayed,
        lightLevel: 1,
        goldLampProgress: 0,
      };
      this.writeCollectionSlot(itemId, nextSlot);
      this.saveState();
      return {
        ok: true,
        slot: { ...nextSlot },
        sourceZone: removedFrom,
        message: `⚪ Đã nộp 1 ${def.name} (mất vĩnh viễn) — mở Đèn Trắng Level 1 cho khung!`,
      };
    }

    // lightLevel === 1: accumulate toward GOLD_LAMP_REQUIRED_COUNT (3) items for Level 2 Gold Lamp
    const nextProgress = slot.goldLampProgress + 1;
    if (nextProgress >= GOLD_LAMP_REQUIRED_COUNT) {
      const nextSlot: CollectionSlotState = {
        displayed: slot.displayed,
        lightLevel: 2,
        goldLampProgress: 0,
      };
      this.writeCollectionSlot(itemId, nextSlot);
      this.saveState();
      return {
        ok: true,
        slot: { ...nextSlot },
        sourceZone: removedFrom,
        message: `🌟 Đã nộp đủ ${GOLD_LAMP_REQUIRED_COUNT}/${GOLD_LAMP_REQUIRED_COUNT} ${def.name} — thắp sáng Đèn Vàng Level 2 vĩnh viễn!`,
      };
    }

    const nextSlot: CollectionSlotState = {
      displayed: slot.displayed,
      lightLevel: 1,
      goldLampProgress: nextProgress,
    };
    this.writeCollectionSlot(itemId, nextSlot);
    this.saveState();
    return {
      ok: true,
      slot: { ...nextSlot },
      sourceZone: removedFrom,
      message: `✨ Đã nộp ${nextProgress}/${GOLD_LAMP_REQUIRED_COUNT} ${def.name} để lên Đèn Vàng!`,
    };
  }

  public consumeBackpackItem(uid: string): ConsumableDef | null {
    const idx = this.state.backpackItems.findIndex((i) => i.uid === uid);
    if (idx === -1) return null;
    const item = this.state.backpackItems[idx];
    const def = ITEM_BY_ID[item.itemId];
    if (!def?.consumableId) return null;
    const consumable = CONSUMABLE_BY_ID[def.consumableId];
    if (!consumable) return null;
    const curUses = getItemRemainingUses(item, def);
    if (curUses > 1) {
      item.usesLeft = curUses - 1;
    } else {
      this.state.backpackItems.splice(idx, 1);
    }
    this.saveState();
    return consumable;
  }

  private getBackpackItemsWeightKg(): number {
    if (this.cachedBackpackWeightKg !== null) {
      return this.cachedBackpackWeightKg;
    }
    let itemsKg = 0;
    for (const item of this.state.backpackItems) {
      const def = ITEM_BY_ID[item.itemId];
      if (def) itemsKg += def.weightKg;
    }
    this.cachedBackpackWeightKg = itemsKg;
    return itemsKg;
  }

  public getCarriedWeightKg(equippedWeightKg: number): number {
    const bp = this.getBackpackTier();
    const total = (bp?.weightKg ?? 0) + equippedWeightKg + this.getBackpackItemsWeightKg();
    return Number(total.toFixed(2));
  }

  public getSummary(): {
    totalItems: number;
    usedCells: number;
    totalCells: number;
    bagValue: number;
    walletGold: number;
    mythicPity: number;
    carriedItemsWeightKg: number;
    backpackWeightKg: number;
  } {
    const bp = this.getBackpackTier();
    let usedCells = 0;
    let bagValue = 0;

    for (const item of this.state.backpackItems) {
      const def = ITEM_BY_ID[item.itemId];
      if (!def) continue;
      usedCells += def.w * def.h;
      bagValue += getItemEffectiveValueGold(item, def);
    }

    const carriedItemsWeightKg = this.getBackpackItemsWeightKg();

    return {
      totalItems: this.state.backpackItems.length,
      usedCells,
      totalCells: bp ? bp.cols * bp.rows : 0,
      bagValue,
      walletGold: this.state.gold,
      mythicPity: this.state.mythicPity,
      carriedItemsWeightKg: Number(carriedItemsWeightKg.toFixed(2)),
      backpackWeightKg: bp?.weightKg ?? 0,
    };
  }

  private rollItemCount(sourceType: LootSourceType, securityZone: SecurityZone): number {
    if (securityZone === "green") {
      // Safe zone only has trash bins with very scarce items (mostly 1, rarely 2)
      return Math.random() < 0.88 ? 1 : 2;
    }
    const pool = COUNT_WEIGHT_TABLE[sourceType];
    const total = pool.reduce((acc, p) => acc + p.w, 0);
    let r = Math.random() * total;
    let baseCount = pool[0].count;
    for (const p of pool) {
      r -= p.w;
      if (r <= 0) {
        baseCount = p.count;
        break;
      }
    }
    if (securityZone === "red") {
      // Red zone still yields slightly more items than Yellow while capped compactly
      return Math.min(4, Math.max(2, baseCount + (Math.random() < 0.5 ? 1 : 0)));
    }
    return baseCount;
  }

  private rollRarity(sourceType: LootSourceType, securityZone: SecurityZone): ItemRarity {
    if (securityZone === "green") {
      // Safe zone trash bins rarely drop B, very rarely A, never S
      const roll = Math.random() * 100;
      if (roll < 2) return "A";
      if (roll < 24) return "B";
      return "C";
    }

    if (this.state.mythicPity >= MYTHIC_HARD_PITY - 1) {
      return "S";
    }

    const base = { ...BASE_RARITY_TABLE[sourceType] };
    if (securityZone === "red") {
      // Red zone boosts A (Gold) strongly and halves previous S (Red) bonus
      const shiftedC = Math.round(base.C * 0.55);
      const shiftedB = Math.round(base.B * 0.3);
      base.C -= shiftedC;
      base.B -= shiftedB;
      base.A += Math.round((shiftedC + shiftedB) * 0.81) + 12;
      base.S += Math.round((shiftedC + shiftedB) * 0.19) + 4;
    }

    if (this.state.consecutiveJunk >= 3 && base.C > 0) {
      base.B += base.C;
      base.C = 0;
    }

    if (this.state.mythicPity >= 26) {
      const bonusS = (this.state.mythicPity - 25) * 7;
      base.S += bonusS;
      base.C = Math.max(0, base.C - bonusS);
    }

    const totalWeight = base.C + base.B + base.A + base.S;
    let roll = Math.random() * totalWeight;
    for (const r of ["S", "A", "B", "C"] as const) {
      roll -= base[r];
      if (roll <= 0) return r;
    }
    return "B";
  }

  private pickItemByZoneAffinity(
    rarity: ItemRarity,
    biome: BiomeId,
    allowBackpack = true,
    mapId: MapId = "vietnam",
  ): CollectibleItemDef {
    const basePool = ITEM_CATALOG.filter(
      (item) =>
        item.rarity === rarity &&
        !item.excludeFromRandomLoot &&
        (allowBackpack || !item.backpackId) &&
        (mapId === "vietnam" ? !item.mapOrigin || item.mapOrigin === "vietnam" : true),
    );
    let pool = basePool;
    if (mapId === "japan" && rarity === "S") {
      const jpRed = basePool.filter((item) => item.mapOrigin === "japan");
      if (jpRed.length > 0 && Math.random() < 0.8) {
        pool = jpRed;
      }
    }
    const weighted = pool.map((item) => {
      if (item.backpackId) {
        // Keep physical backpacks rare in random loot (at most ~1-2% per item, never boosted by city biome)
        return { item, weight: 0.08 };
      }
      let weight = 0.85;
      if (mapId === "japan" && item.mapOrigin === "japan") {
        weight = item.homeBiome === biome ? 4.2 : 3.2;
      } else if (item.homeBiome === biome) {
        weight = 2.4;
      } else if (item.homeBiome === "plains") {
        weight = 1.15;
      }
      return { item, weight };
    });

    const total = weighted.reduce((acc, w) => acc + w.weight, 0);
    let r = Math.random() * total;
    for (const entry of weighted) {
      r -= entry.weight;
      if (r <= 0) return entry.item;
    }
    return pool[0];
  }

  private saveState(): void {
    this.cachedBackpackWeightKg = null;
    this.onPersist?.(this.getPersistedState());
  }
}
