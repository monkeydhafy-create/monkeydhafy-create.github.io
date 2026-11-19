// Exact 3x integer scale of 16x16 pixel art tiles -> zero blur on Retina & mobile
export const PIXEL_SCALE = 3;
// High-detail pixel-buildings (110..170px native) render at clean 2x integer scale (~220..340px)
export const BUILDING_PIXEL_SCALE = 2;
export const TILE_SIZE = 16 * PIXEL_SCALE; // 48px
export const MAP_COLS = 204;
export const MAP_ROWS = 84;
export const GREEN_END_COL = 31;
export const YELLOW_END_COL = 141;
export const JAPAN_SNOW_START_COL = YELLOW_END_COL - 6;
export const WORLD_WIDTH = MAP_COLS * TILE_SIZE;
export const WORLD_HEIGHT = MAP_ROWS * TILE_SIZE;
export const CHUNK_TILES = 21;

export type TileType =
  | "grass"
  | "meadow"
  | "forest"
  | "sand"
  | "puddle"
  | "shallow"
  | "water"
  | "dirt"
  | "stone"
  | "bridge"
  | "road"
  | "sidewalk";

export type SurfaceState = "dry" | "wade" | "swim";

export type MapId = "vietnam" | "japan";

export const MAP_LABELS: Record<MapId, string> = {
  vietnam: "🇻🇳 Việt Nam",
  japan: "🇯🇵 Nhật Bản",
};

export type BiomeId = "city" | "plains" | "countryside";

export type SecurityZone = "green" | "yellow" | "red";

export const SECURITY_ZONE_META: Record<
  SecurityZone,
  { label: string; emoji: string; colorHex: string; colorInt: number; desc: string }
> = {
  green: {
    label: "Vùng Xanh (An Toàn)",
    emoji: "🟢",
    colorHex: "#10b981",
    colorInt: 0x10b981,
    desc: "Khu dân cư & dịch vụ an toàn — Cảnh sát không hỏi, chỉ có thùng rác ít đồ.",
  },
  yellow: {
    label: "Vùng Vàng (Trung Bình)",
    emoji: "🟡",
    colorHex: "#eab308",
    colorInt: 0xeab308,
    desc: "Chiếm phần lớn bản đồ — Đồ vừa phải, cảnh sát hỏi tối đa 5 lượt (sai 3 bắt).",
  },
  red: {
    label: "Vùng Đỏ (Nguy Hiểm)",
    emoji: "🔴",
    colorHex: "#ef4444",
    colorInt: 0xef4444,
    desc: "Nhiều nhà loot đậm đồ Vàng/Đỏ — Cảnh sát gắt (hỏi 2 lượt, sai 2 bắt).",
  },
};

export type CharacterGender = "male" | "female";

export type CharacterSkinId = "samurai_blue" | "ninja_blue" | "samurai_green";

export type FacingDir = "down" | "up" | "left" | "right";

export interface Point {
  x: number;
  y: number;
}

export const BUILDING_KEYS = [
  "city_twin_towers",
  "city_green_terrace",
  "city_courtyard_apt",
  "city_mansion_block",
  "city_hospital",
  "city_museum",
  "city_fire_station",
  "city_terrace_houses",
  "city_arcade_house",
  "city_flower_shop",
  "city_post_office",
  "city_butcher_shop",
  "city_backpack_shop",
  "city_clothing_shop",
  "city_hair_salon",
  "city_pharmacy",
  "city_police_station",
  "city_home_house",
  "city_collection_hall",
  "city_auction_house",
  "city_airport",
  "city_quest_guild",
  "city_reputation_hall",
  "city_pet_gacha",
  "city_real_estate_center",
  "city_player_estate",
  "estate_flower_garden",
  "jp_shogun_castle",
  "jp_shinto_shrine",
  "jp_ninja_dojo",
  "jp_ryokan_inn",
  "jp_tokyo_tower",
  "jp_shinkansen_station",
  "jp_akihabara_arcade",
  "jp_samurai_manor",
  "jp_village_machiya",
  "jp_snow_onsen_temple",
  "plains_tea_house",
  "plains_garden_inn",
  "plains_riverside_tavern",
  "plains_pagoda",
  "plains_archway",
  "plains_parasol_market",
  "rural_twin_cottage",
  "rural_stilt_hut",
  "rural_orchard_farm",
  "rural_dutch_barn",
  "rural_log_cabin",
] as const;

export type BuildingKind = (typeof BUILDING_KEYS)[number];

export type PropKind =
  | "oak_warm"
  | "oak_moss"
  | "tree_small_warm"
  | "tree_small_moss"
  | "bush_a"
  | "bush_b"
  | "boulder"
  | "frog_statue"
  | "golem_statue"
  | "ruin_pillar"
  | "shrine_ruin"
  | "hut"
  | "watchtower"
  | "lodge"
  | "stump"
  | "stone_small"
  | "city_tree"
  | "city_tree_warm"
  | "sakura_tree"
  | "sakura_small"
  | "momiji_tree"
  | "momiji_small"
  | "jp_torii_gate"
  | "jp_stone_lantern"
  | "jp_bamboo_cluster"
  | "jp_vending_machine"
  | "jp_snow_pine"
  | "jp_snowman_jizo"
  | "park_lantern"
  | "street_lamp"
  | "traffic_light"
  | "bench"
  | "hydrant"
  | "trash_bin"
  | "food_cart"
  | BuildingKind;

export function isBuildingProp(kind: PropKind): kind is BuildingKind {
  return (BUILDING_KEYS as readonly string[]).includes(kind);
}

export interface WorldProp {
  id: number;
  kind: PropKind;
  x: number;
  y: number;
  blocking: boolean;
}

export interface WorldLandmark {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  y: number;
  radius: number;
  accentColor: number;
  discovered: boolean;
}

export type ItemRarity = "C" | "B" | "A" | "S";
export type ChestKind = "wooden" | "royal" | "trash";

export interface WorldChest {
  id: string;
  name: string;
  kind: ChestKind;
  x: number;
  y: number;
  biome: BiomeId;
  opened: boolean;
}

export const BUILDING_META: Record<
  BuildingKind,
  {
    name: string;
    tier: "standard" | "landmark" | "shop" | "home" | "collection" | "auction" | "airport" | "police" | "quest" | "reputation" | "gacha" | "real_estate";
    isVault?: boolean;
    shopKind?: "backpack" | "clothing" | "food" | "hair" | "pharmacy";
  }
> = {
  city_twin_towers: { name: "Tháp Đôi Hiện Đại", tier: "landmark", isVault: true },
  city_green_terrace: { name: "Chung Cư Vườn Xanh", tier: "landmark" },
  city_courtyard_apt: { name: "Khu Tập Thể Chữ U", tier: "standard" },
  city_mansion_block: { name: "Cao Ốc Cửa Kính", tier: "landmark", isVault: true },
  city_hospital: { name: "Bệnh Viện Thành Phố", tier: "landmark" },
  city_museum: { name: "Bảo Tàng Nghệ Thuật", tier: "landmark", isVault: true },
  city_fire_station: { name: "Trạm Cứu Hỏa", tier: "standard" },
  city_terrace_houses: { name: "Dãy Nhà Phố Cổ", tier: "standard" },
  city_arcade_house: { name: "Nhà Phố Mái Vòm", tier: "standard" },
  city_flower_shop: { name: "Tiệm Hoa Nhà Kính", tier: "standard" },
  city_post_office: { name: "Bưu Điện Đồng Hồ", tier: "standard" },
  city_butcher_shop: { name: "Quán Ăn Phố Cổ", tier: "shop", shopKind: "food" },
  city_backpack_shop: { name: "Shop Balo & Thu Mua", tier: "shop", shopKind: "backpack" },
  city_clothing_shop: { name: "Shop Quần Áo & Trang Bị", tier: "shop", shopKind: "clothing" },
  city_hair_salon: { name: "Tiệm Tóc & Tạo Mẫu", tier: "shop", shopKind: "hair" },
  city_pharmacy: { name: "Hiệu Thuốc & Dược Phẩm", tier: "shop", shopKind: "pharmacy" },
  city_police_station: { name: "Công An Phường", tier: "police" },
  city_home_house: { name: "Nhà Riêng (Kho Vĩnh Viễn)", tier: "home" },
  city_collection_hall: { name: "Phòng Sưu Tầm Đồ Đỏ", tier: "collection" },
  city_auction_house: { name: "Nhà Đấu Giá (Treo Bán 24h)", tier: "auction" },
  city_airport: { name: "Sân Bay Quốc Tế", tier: "airport" },
  city_quest_guild: { name: "Hội Sở Nhiệm Vụ (4 Giờ)", tier: "quest" },
  city_reputation_hall: { name: "Sảnh Danh Vọng (Đổi Đồ Đỏ)", tier: "reputation" },
  city_pet_gacha: { name: "Nhà Nhận Nuôi Thú Cưng", tier: "gacha" },
  city_real_estate_center: { name: "Sàn Giao Dịch Bất Động Sản", tier: "real_estate" },
  city_player_estate: { name: "Dinh Thự Người Chơi", tier: "home" },
  estate_flower_garden: { name: "Vườn Hoa Hoàng Gia", tier: "standard" },
  jp_shogun_castle: { name: "Lâu Đài Shogun Osaka", tier: "landmark", isVault: true },
  jp_shinto_shrine: { name: "Đền Thần Đạo Inari", tier: "landmark", isVault: true },
  jp_ninja_dojo: { name: "Võ Đường Ninja Iga", tier: "landmark", isVault: true },
  jp_ryokan_inn: { name: "Lữ Quán Suối Khoáng Ryokan", tier: "standard" },
  jp_tokyo_tower: { name: "Tháp Tokyo SkyTree", tier: "landmark", isVault: true },
  jp_shinkansen_station: { name: "Ga Tàu Cao Tốc Shinkansen", tier: "landmark", isVault: true },
  jp_akihabara_arcade: { name: "Cao Ốc Neon Akihabara", tier: "landmark" },
  jp_samurai_manor: { name: "Dinh Thự Võ Sĩ Samurai", tier: "landmark", isVault: true },
  jp_village_machiya: { name: "Làng Cổ Thợ Rèn Samurai", tier: "standard" },
  jp_snow_onsen_temple: { name: "Đền Tuyết Sơn Onsen", tier: "landmark", isVault: true },
  plains_tea_house: { name: "Quán Trà Ven Hồ", tier: "standard" },
  plains_garden_inn: { name: "Nhà Hàng Sân Vườn", tier: "shop", shopKind: "food" },
  plains_riverside_tavern: { name: "Quán Thủy Tạ Ven Sông", tier: "standard" },
  plains_pagoda: { name: "Chùa Cổ 5 Tầng", tier: "landmark", isVault: true },
  plains_archway: { name: "Cổng Làng Thái Cổ", tier: "landmark" },
  plains_parasol_market: { name: "Khu Chợ Dù Đồng Bằng", tier: "standard" },
  rural_twin_cottage: { name: "Nhà Tranh Đôi", tier: "standard" },
  rural_stilt_hut: { name: "Chòi Sàn Ao Làng", tier: "landmark", isVault: true },
  rural_orchard_farm: { name: "Nhà Vườn Cây Ăn Trái", tier: "standard" },
  rural_dutch_barn: { name: "Nhà Kho Nông Trại", tier: "landmark", isVault: true },
  rural_log_cabin: { name: "Nhà Gỗ Rừng Sâu", tier: "standard" },
};

export interface RoadNetworkMeta {
  /** Top tile row of each 2-lane horizontal asphalt avenue (lane row = west, row+1 = east) */
  horizontalRoads: Array<{ row: number; startCol: number; endCol: number }>;
  /** Left tile col of each 2-lane vertical asphalt street (col = south, col+1 = north) */
  verticalRoads: Array<{ col: number; startRow: number; endRow: number }>;
}

export interface WorldData {
  mapId: MapId;
  cols: number;
  rows: number;
  tileSize: number;
  tiles: TileType[];
  puddleUnderlay: TileType[];
  biomes: BiomeId[];
  securityZones: SecurityZone[];
  collision: Uint8Array;
  props: WorldProp[];
  chests: WorldChest[];
  landmarks: WorldLandmark[];
  lilypads: Point[];
  roadNetwork: RoadNetworkMeta;
  spawn: Point;
  hospitalRespawn: Point;
  policeDetainRespawn: Point;
}

export const BIOME_LABELS: Record<BiomeId, string> = {
  city: "Khu Thành Phố",
  plains: "Khu Đồng Bằng",
  countryside: "Khu Nông Thôn",
};

export const CHARACTER_SKINS: ReadonlyArray<{
  id: CharacterSkinId;
  label: string;
  role: string;
  src: string;
}> = [
  {
    id: "samurai_blue",
    label: "Samurai Xanh",
    role: "Lữ khách Thành Phố",
    src: "assets/world/char_samurai_blue.png",
  },
  {
    id: "ninja_blue",
    label: "Ninja Lam",
    role: "Ảnh giả Đồng Bằng",
    src: "assets/world/char_ninja_blue.png",
  },
  {
    id: "samurai_green",
    label: "Ronin Lục",
    role: "Hộ vệ Nông Thôn",
    src: "assets/world/char_samurai_green.png",
  },
];
