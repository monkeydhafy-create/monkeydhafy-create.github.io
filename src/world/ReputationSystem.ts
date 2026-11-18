import { CONSUMABLE_CATALOG } from "./EquipmentCatalog.ts";
import { ITEM_BY_ID } from "./LootSystem.ts";
import type { MapId } from "./types.ts";

export type ReputationCategory =
  | "all"
  | "wealth"
  | "quests_home"
  | "rare_loot"
  | "minigames"
  | "survival"
  | "shop";

export type ReputationStatKey =
  | "peakGold"
  | "dailyQuestsCompleted"
  | "homeUpgradesCompleted"
  | "rareItemsLooted"
  | "redItemsLooted"
  | "minigamesWon"
  | "consumablesUsed";

export interface ReputationState {
  points: number;
  peakGold: number;
  dailyQuestsCompleted: number;
  homeUpgradesCompleted: number;
  rareItemsLooted: number;
  redItemsLooted: number;
  minigamesWon: number;
  consumablesUsed: number;
  claimedIds: string[];
}

export interface ReputationRankDef {
  level: number;
  minPoints: number;
  title: string;
  badge: string;
  color: string;
}

export interface ReputationMilestoneReward {
  points: number;
  gold: number;
  bonusItemKind?: "food" | "med" | "red_s";
  bonusItemLabel?: string;
}

export interface ReputationMilestoneDef {
  id: string;
  category: Exclude<ReputationCategory, "all">;
  statKey: ReputationStatKey;
  target: number;
  icon: string;
  title: string;
  description: string;
  reward: ReputationMilestoneReward;
}

export interface ReputationMilestoneView extends ReputationMilestoneDef {
  current: number;
  completed: boolean;
  claimed: boolean;
  tierIndex: number;
  tierTotal: number;
  trackLabel: string;
}

export interface ReputationSummaryView {
  state: ReputationState;
  rank: ReputationRankDef;
  nextRank: ReputationRankDef | null;
  progressInRank01: number;
  claimableCount: number;
  totalClaimed: number;
  totalMilestones: number;
  milestones: ReputationMilestoneView[];
  activeMilestones: ReputationMilestoneView[];
}

export const REPUTATION_TRACK_LABELS: Record<ReputationStatKey, string> = {
  peakGold: "Dòng Tài Sản",
  dailyQuestsCompleted: "Dòng Nhiệm Vụ Hằng Ngày",
  homeUpgradesCompleted: "Dòng Công Trình Nhà Riêng",
  rareItemsLooted: "Dòng Săn Đồ Hiếm (A/S)",
  redItemsLooted: "Dòng Báu Vật Đỏ (S)",
  minigamesWon: "Dòng Cao Thủ Minigame",
  consumablesUsed: "Dòng Sinh Tồn & Ăn Uống",
};

export const REPUTATION_RANKS: readonly ReputationRankDef[] = [
  { level: 1, minPoints: 0, title: "Tân Binh Đường Phố", badge: "🌱", color: "#94a3b8" },
  { level: 2, minPoints: 150, title: "Người Thám Hiểm", badge: "🧭", color: "#38bdf8" },
  { level: 3, minPoints: 450, title: "Thợ Săn Kho Báu", badge: "🦊", color: "#4ade80" },
  { level: 4, minPoints: 950, title: "Cao Thủ Sinh Tồn", badge: "🦅", color: "#facc15" },
  { level: 5, minPoints: 1700, title: "Trùm Khu Phố", badge: "🦁", color: "#fb923c" },
  { level: 6, minPoints: 2800, title: "Huyền Thoại Đô Thị", badge: "👑", color: "#f43f5e" },
];

export const REPUTATION_MILESTONES: readonly ReputationMilestoneDef[] = [
  // 1. Tài sản & Kinh tế
  {
    id: "wealth_5000",
    category: "wealth",
    statKey: "peakGold",
    target: 5000,
    icon: "💰",
    title: "Túi Tiền Rủng Rỉnh",
    description: "Sở hữu tổng tài sản đạt 5.000 Vàng.",
    reward: { points: 40, gold: 600 },
  },
  {
    id: "wealth_10000",
    category: "wealth",
    statKey: "peakGold",
    target: 10000,
    icon: "💵",
    title: "Thương Nhân Thành Đạt",
    description: "Sở hữu tổng tài sản đạt 10.000 Vàng.",
    reward: { points: 75, gold: 1200 },
  },
  {
    id: "wealth_25000",
    category: "wealth",
    statKey: "peakGold",
    target: 25000,
    icon: "🏦",
    title: "Đại Gia Phố Thị",
    description: "Sở hữu tổng tài sản đạt 25.000 Vàng.",
    reward: { points: 130, gold: 2500, bonusItemKind: "med", bonusItemLabel: "1× Thuốc cao cấp" },
  },
  {
    id: "wealth_60000",
    category: "wealth",
    statKey: "peakGold",
    target: 60000,
    icon: "💎",
    title: "Tài Phiệt Đô Thị",
    description: "Sở hữu tổng tài sản đạt 60.000 Vàng.",
    reward: { points: 220, gold: 5000, bonusItemKind: "red_s", bonusItemLabel: "1× Đồ Đỏ (S)" },
  },

  // 2. Nhiệm vụ hằng ngày & Công trình nhà
  {
    id: "daily_2",
    category: "quests_home",
    statKey: "dailyQuestsCompleted",
    target: 2,
    icon: "📜",
    title: "Người Giao Hàng Tập Sự",
    description: "Hoàn thành 2 nhiệm vụ hằng ngày tại Hội Sở.",
    reward: { points: 35, gold: 450 },
  },
  {
    id: "daily_5",
    category: "quests_home",
    statKey: "dailyQuestsCompleted",
    target: 5,
    icon: "📋",
    title: "Đặc Vụ Tin Cậy",
    description: "Hoàn thành 5 nhiệm vụ hằng ngày tại Hội Sở.",
    reward: { points: 70, gold: 900, bonusItemKind: "food", bonusItemLabel: "1× Đồ ăn ngon" },
  },
  {
    id: "daily_10",
    category: "quests_home",
    statKey: "dailyQuestsCompleted",
    target: 10,
    icon: "🎖️",
    title: "Cánh Tay Phải Hội Sở",
    description: "Hoàn thành 10 nhiệm vụ hằng ngày tại Hội Sở.",
    reward: { points: 120, gold: 1800, bonusItemKind: "med", bonusItemLabel: "1× Thuốc hồi phục" },
  },
  {
    id: "daily_20",
    category: "quests_home",
    statKey: "dailyQuestsCompleted",
    target: 20,
    icon: "🏅",
    title: "Huyền Thoại Ủy Thác",
    description: "Hoàn thành 20 nhiệm vụ hằng ngày tại Hội Sở.",
    reward: { points: 200, gold: 3500, bonusItemKind: "red_s", bonusItemLabel: "1× Đồ Đỏ (S)" },
  },
  {
    id: "home_1",
    category: "quests_home",
    statKey: "homeUpgradesCompleted",
    target: 1,
    icon: "🏠",
    title: "An Cư Lạc Nghiệp",
    description: "Hoàn thành 1 lần nâng cấp trong nhà (Safebox, Kho, Gym hoặc Máy chạy).",
    reward: { points: 40, gold: 500 },
  },
  {
    id: "home_3",
    category: "quests_home",
    statKey: "homeUpgradesCompleted",
    target: 3,
    icon: "🛠️",
    title: "Gia Chủ Tiện Nghi",
    description: "Hoàn thành 3 lần nâng cấp công trình trong nhà.",
    reward: { points: 90, gold: 1200 },
  },
  {
    id: "home_6",
    category: "quests_home",
    statKey: "homeUpgradesCompleted",
    target: 6,
    icon: "🏰",
    title: "Pháo Đài Kiên Cố",
    description: "Hoàn thành 6 lần nâng cấp công trình trong nhà.",
    reward: { points: 150, gold: 2400, bonusItemKind: "med", bonusItemLabel: "1× Thuốc cao cấp" },
  },
  {
    id: "home_10",
    category: "quests_home",
    statKey: "homeUpgradesCompleted",
    target: 10,
    icon: "👑",
    title: "Biệt Phủ Đỉnh Cao",
    description: "Hoàn thành 10 lần nâng cấp công trình trong nhà.",
    reward: { points: 240, gold: 4500, bonusItemKind: "red_s", bonusItemLabel: "1× Đồ Đỏ (S)" },
  },

  // 3. Săn đồ hiếm (Vàng A & Đỏ S)
  {
    id: "rare_3",
    category: "rare_loot",
    statKey: "rareItemsLooted",
    target: 3,
    icon: "🟡",
    title: "Mắt Tinh Nhặt Báu",
    description: "Loot 3 vật phẩm hiếm hạng Vàng (A) hoặc Đỏ (S) từ rương/két.",
    reward: { points: 35, gold: 500 },
  },
  {
    id: "rare_10",
    category: "rare_loot",
    statKey: "rareItemsLooted",
    target: 10,
    icon: "✨",
    title: "Thợ Săn Cổ Vật",
    description: "Loot 10 vật phẩm hiếm hạng Vàng (A) hoặc Đỏ (S) từ rương/két.",
    reward: { points: 80, gold: 1100 },
  },
  {
    id: "rare_25",
    category: "rare_loot",
    statKey: "rareItemsLooted",
    target: 25,
    icon: "👑",
    title: "Nhà Sưu Tầm Tinh Anh",
    description: "Loot 25 vật phẩm hiếm hạng Vàng (A) hoặc Đỏ (S) từ rương/két.",
    reward: { points: 140, gold: 2200, bonusItemKind: "med", bonusItemLabel: "1× Thuốc hồi phục" },
  },
  {
    id: "red_1",
    category: "rare_loot",
    statKey: "redItemsLooted",
    target: 1,
    icon: "🔴",
    title: "Ánh Đỏ Đầu Tiên",
    description: "Loot thành công 1 báu vật Đỏ (S) từ rương/két.",
    reward: { points: 55, gold: 800 },
  },
  {
    id: "red_3",
    category: "rare_loot",
    statKey: "redItemsLooted",
    target: 3,
    icon: "❤️‍🔥",
    title: "Kẻ Được Chọn",
    description: "Loot thành công 3 báu vật Đỏ (S) từ rương/két.",
    reward: { points: 110, gold: 1700 },
  },
  {
    id: "red_7",
    category: "rare_loot",
    statKey: "redItemsLooted",
    target: 7,
    icon: "🐉",
    title: "Bá Chủ Kho Báu Đỏ",
    description: "Loot thành công 7 báu vật Đỏ (S) từ rương/két.",
    reward: { points: 200, gold: 3500, bonusItemKind: "red_s", bonusItemLabel: "1× Đồ Đỏ (S)" },
  },

  // 4. Minigame
  {
    id: "mini_3",
    category: "minigames",
    statKey: "minigamesWon",
    target: 3,
    icon: "🎮",
    title: "Bàn Tay Khéo Léo",
    description: "Thắng 3 minigame (Mở két, Rương Hoàng Gia, Cảnh sát hoặc Phòng giam).",
    reward: { points: 30, gold: 400 },
  },
  {
    id: "mini_10",
    category: "minigames",
    statKey: "minigamesWon",
    target: 10,
    icon: "🔓",
    title: "Chuyên Gia Phá Khóa",
    description: "Thắng 10 minigame bất kỳ.",
    reward: { points: 70, gold: 950 },
  },
  {
    id: "mini_25",
    category: "minigames",
    statKey: "minigamesWon",
    target: 25,
    icon: "⚡",
    title: "Phản Xạ Siêu Phàm",
    description: "Thắng 25 minigame bất kỳ.",
    reward: { points: 130, gold: 2000, bonusItemKind: "med", bonusItemLabel: "1× Thuốc cao cấp" },
  },
  {
    id: "mini_50",
    category: "minigames",
    statKey: "minigamesWon",
    target: 50,
    icon: "🏆",
    title: "Bậc Thầy Giải Mã",
    description: "Thắng 50 minigame bất kỳ.",
    reward: { points: 210, gold: 4000, bonusItemKind: "red_s", bonusItemLabel: "1× Đồ Đỏ (S)" },
  },

  // 5. Sinh tồn & Ăn uống
  {
    id: "eat_5",
    category: "survival",
    statKey: "consumablesUsed",
    target: 5,
    icon: "🍔",
    title: "Bụng No Sức Khỏe",
    description: "Ăn uống hoặc sử dụng thuốc 5 lần.",
    reward: { points: 25, gold: 350, bonusItemKind: "food", bonusItemLabel: "1× Đồ ăn" },
  },
  {
    id: "eat_15",
    category: "survival",
    statKey: "consumablesUsed",
    target: 15,
    icon: "🍜",
    title: "Thực Khách Sành Ăn",
    description: "Ăn uống hoặc sử dụng thuốc 15 lần.",
    reward: { points: 60, gold: 800, bonusItemKind: "med", bonusItemLabel: "1× Thuốc hồi phục" },
  },
  {
    id: "eat_35",
    category: "survival",
    statKey: "consumablesUsed",
    target: 35,
    icon: "💊",
    title: "Bậc Thầy Sinh Tồn",
    description: "Ăn uống hoặc sử dụng thuốc 35 lần.",
    reward: { points: 110, gold: 1600, bonusItemKind: "med", bonusItemLabel: "1× Thuốc cao cấp" },
  },
  {
    id: "eat_75",
    category: "survival",
    statKey: "consumablesUsed",
    target: 75,
    icon: "🩺",
    title: "Thể Chất Bất Bại",
    description: "Ăn uống hoặc sử dụng thuốc 75 lần.",
    reward: { points: 180, gold: 3200, bonusItemKind: "red_s", bonusItemLabel: "1× Đồ Đỏ (S)" },
  },
];

export const REPUTATION_MILESTONE_BY_ID: Record<string, ReputationMilestoneDef> = Object.fromEntries(
  REPUTATION_MILESTONES.map((m) => [m.id, m]),
);

export function createDefaultReputationState(): ReputationState {
  return {
    points: 0,
    peakGold: 0,
    dailyQuestsCompleted: 0,
    homeUpgradesCompleted: 0,
    rareItemsLooted: 0,
    redItemsLooted: 0,
    minigamesWon: 0,
    consumablesUsed: 0,
    claimedIds: [],
  };
}

export function getReputationRank(points: number): {
  rank: ReputationRankDef;
  nextRank: ReputationRankDef | null;
  progressInRank01: number;
} {
  let rank = REPUTATION_RANKS[0];
  let nextRank: ReputationRankDef | null = REPUTATION_RANKS[1] ?? null;
  for (let i = 0; i < REPUTATION_RANKS.length; i++) {
    if (points >= REPUTATION_RANKS[i].minPoints) {
      rank = REPUTATION_RANKS[i];
      nextRank = REPUTATION_RANKS[i + 1] ?? null;
    }
  }
  const progressInRank01 = nextRank
    ? Math.min(1, Math.max(0, (points - rank.minPoints) / Math.max(1, nextRank.minPoints - rank.minPoints)))
    : 1;
  return { rank, nextRank, progressInRank01 };
}

export function buildReputationSummary(state: ReputationState): ReputationSummaryView {
  const claimedSet = new Set(state.claimedIds);
  const { rank, nextRank, progressInRank01 } = getReputationRank(state.points);
  let claimableCount = 0;
  let totalClaimed = 0;

  const trackGroups = new Map<ReputationStatKey, ReputationMilestoneDef[]>();
  for (const def of REPUTATION_MILESTONES) {
    const arr = trackGroups.get(def.statKey) ?? [];
    arr.push(def);
    trackGroups.set(def.statKey, arr);
  }

  const milestones: ReputationMilestoneView[] = REPUTATION_MILESTONES.map((def) => {
    const group = trackGroups.get(def.statKey) ?? [def];
    const tierIndex = group.indexOf(def) + 1;
    const tierTotal = group.length;
    const current = state[def.statKey];
    const completed = current >= def.target;
    const claimed = claimedSet.has(def.id);
    if (claimed) totalClaimed += 1;
    else if (completed) claimableCount += 1;
    return {
      ...def,
      current,
      completed,
      claimed,
      tierIndex,
      tierTotal,
      trackLabel: REPUTATION_TRACK_LABELS[def.statKey],
    };
  });

  // One active milestone per track: first unclaimed milestone, or last milestone if track is maxed
  const activeMilestones: ReputationMilestoneView[] = [];
  for (const [, group] of trackGroups) {
    const groupViews = milestones.filter((m) => m.statKey === group[0].statKey);
    const nextUnclaimed = groupViews.find((m) => !m.claimed) ?? groupViews[groupViews.length - 1];
    if (nextUnclaimed) activeMilestones.push(nextUnclaimed);
  }

  return {
    state,
    rank,
    nextRank,
    progressInRank01,
    claimableCount,
    totalClaimed,
    totalMilestones: REPUTATION_MILESTONES.length,
    milestones,
    activeMilestones,
  };
}

export interface ReputationShopItemDef {
  itemId: string;
  costPoints: number;
  linkedUpgradeLabel: string;
}

export const REPUTATION_SHOP_ITEMS: readonly ReputationShopItemDef[] = [
  {
    itemId: "rep_gym_license",
    costPoints: 300,
    linkedUpgradeLabel: "🏋️ Phòng Gym Cấp Cuối (+15% Stamina)",
  },
  {
    itemId: "rep_treadmill_core",
    costPoints: 350,
    linkedUpgradeLabel: "🏃 Máy Chạy Bộ Cấp Cuối (+20% Tốc độ)",
  },
  {
    itemId: "rep_safebox_core",
    costPoints: 450,
    linkedUpgradeLabel: "🔐 Safebox Cấp Cuối (5×5)",
  },
  {
    itemId: "rep_mansion_blueprint",
    costPoints: 500,
    linkedUpgradeLabel: "🏠 Kho Nhà Cấp Cuối (9×16)",
  },
];

export const REPUTATION_SHOP_BY_ID: Record<string, ReputationShopItemDef> = Object.fromEntries(
  REPUTATION_SHOP_ITEMS.map((entry) => [entry.itemId, entry]),
);

export function pickReputationBonusItemId(
  kind: "food" | "med" | "red_s",
  _mapId: MapId,
): string | null {
  if (kind === "red_s") {
    const sPool = Object.values(ITEM_BY_ID).filter(
      (it) => it.rarity === "S" && !it.backpackId && !it.excludeFromRandomLoot,
    );
    if (sPool.length === 0) return null;
    return sPool[Math.floor(Math.random() * sPool.length)].id;
  }
  const shopCat = kind === "med" ? "pharmacy" : "food";
  const pool = CONSUMABLE_CATALOG.filter(
    (c) => c.shopCategory === shopCat && Boolean(ITEM_BY_ID[c.inventoryItemId]),
  );
  if (pool.length === 0) return null;
  const sorted = [...pool].sort((a, b) => b.priceGold - a.priceGold);
  const topSlice = sorted.slice(0, Math.min(4, sorted.length));
  return topSlice[Math.floor(Math.random() * topSlice.length)].inventoryItemId;
}
