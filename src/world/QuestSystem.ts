import { CONSUMABLE_CATALOG, type ConsumableDef } from "./EquipmentCatalog.ts";
import { ITEM_BY_ID, type CollectibleItemDef } from "./LootSystem.ts";
import type { MapId } from "./types.ts";

export const QUEST_REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
export const QUEST_MANUAL_REROLL_COST_GOLD = 250;

export type DailyQuestKind = "deliver" | "explore" | "minigame";
export type ExploreTargetKind =
  | "visit_yellow"
  | "visit_red"
  | "visit_snow"
  | "loot_containers"
  | "discover_landmarks";

export interface DailyQuestReward {
  gold: number;
  itemId: string | null;
  itemQty: number;
  categoryLabel: "Tiền" | "Đồ ăn" | "Thuốc" | "Đồ Đỏ (S)";
}

export interface DailyQuestEntry {
  id: string;
  kind: DailyQuestKind;
  title: string;
  description: string;
  difficultyScore: number;
  targetItemId?: string;
  exploreTarget?: ExploreTargetKind;
  targetCount: number;
  progress: number;
  claimed: boolean;
  reward: DailyQuestReward;
}

export interface DailyQuestBoardState {
  epochIndex: number;
  nextRefreshAt: number;
  rerollCount: number;
  mapId: MapId;
  quests: DailyQuestEntry[];
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function createSeededRng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickFrom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function getQuestEpochIndex(nowMs = Date.now()): number {
  return Math.floor(Math.max(0, nowMs) / QUEST_REFRESH_INTERVAL_MS);
}

export function getNextQuestRefreshAt(epochIndex: number): number {
  return (epochIndex + 1) * QUEST_REFRESH_INTERVAL_MS;
}

export function formatQuestCountdown(remainingMs: number): string {
  const sec = Math.max(0, Math.ceil(remainingMs / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}g ${String(m).padStart(2, "0")}p ${String(s).padStart(2, "0")}s`;
}

function getEligibleDeliverPool(rarity: "C" | "B" | "A"): CollectibleItemDef[] {
  return Object.values(ITEM_BY_ID).filter(
    (it) => it.rarity === rarity && !it.consumableId && !it.garmentId && !it.backpackId,
  );
}

function buildBalancedReward(
  kind: DailyQuestKind,
  difficultyScore: number,
  deliveredMarketGold: number,
  mapId: MapId,
  rng: () => number,
): DailyQuestReward {
  // Value-budget parity:
  // - Base difficulty budget scales linearly with difficultyScore (1..10)
  // - Deliver quests reimburse 1.25x item market value + difficulty margin so handing in items is net-positive
  const baseDifficultyBudget = 140 + difficultyScore * 95;
  const reimbursement = kind === "deliver" ? Math.round(deliveredMarketGold * 1.25) : 0;
  const totalBudgetGold = Math.round(baseDifficultyBudget + reimbursement);

  // High-difficulty quests (>= 6.0) have a controlled 12%..42% chance to award a rare S-tier Red Item
  const sPool = Object.values(ITEM_BY_ID).filter(
    (it) => it.rarity === "S" && !it.backpackId && !it.excludeFromRandomLoot,
  );
  if (difficultyScore >= 6.0 && sPool.length > 0) {
    const redChance = clamp((difficultyScore - 5.5) * 0.14, 0.12, 0.42);
    if (rng() < redChance) {
      const pickedRed = pickFrom(sPool, rng);
      return {
        gold: Math.max(120, Math.round(totalBudgetGold * 0.3)),
        itemId: pickedRed.id,
        itemQty: 1,
        categoryLabel: "Đồ Đỏ (S)",
      };
    }
  }

  // Medicine rewards for medium+ difficulty quests
  const meds = CONSUMABLE_CATALOG.filter(
    (c) => c.shopCategory === "pharmacy" && c.priceGold <= totalBudgetGold * 0.9,
  );
  const foods = CONSUMABLE_CATALOG.filter(
    (c) =>
      c.shopCategory === "food" &&
      (!c.mapOrigin || c.mapOrigin === mapId) &&
      c.priceGold <= totalBudgetGold * 0.85,
  );

  const roll = rng();
  if (difficultyScore >= 3.2 && meds.length > 0 && roll < 0.38) {
    const chosen: ConsumableDef = pickFrom(meds, rng);
    const goldRemainder = Math.max(80, Math.round(totalBudgetGold - chosen.priceGold * 0.65));
    return {
      gold: goldRemainder,
      itemId: chosen.inventoryItemId,
      itemQty: 1,
      categoryLabel: "Thuốc",
    };
  }

  if (foods.length > 0 && roll < 0.78) {
    const chosen: ConsumableDef = pickFrom(foods, rng);
    const maxAffordableQty = chosen.priceGold <= 110 && totalBudgetGold >= chosen.priceGold * 2.4 ? 2 : 1;
    const qty = maxAffordableQty === 2 && rng() < 0.45 ? 2 : 1;
    const goldRemainder = Math.max(70, Math.round(totalBudgetGold - chosen.priceGold * qty * 0.65));
    return {
      gold: goldRemainder,
      itemId: chosen.inventoryItemId,
      itemQty: qty,
      categoryLabel: "Đồ ăn",
    };
  }

  // Pure Gold reward
  return {
    gold: totalBudgetGold,
    itemId: null,
    itemQty: 0,
    categoryLabel: "Tiền",
  };
}

function createDeliverQuest(
  idx: number,
  mapId: MapId,
  rng: () => number,
): DailyQuestEntry {
  const tierRoll = rng();
  const rarity: "C" | "B" | "A" = tierRoll < 0.42 ? "C" : tierRoll < 0.82 ? "B" : "A";
  const pool = getEligibleDeliverPool(rarity);
  const item = pickFrom(pool, rng);
  const targetCount =
    rarity === "C"
      ? 2 + Math.floor(rng() * 3)
      : rarity === "B"
        ? 1 + Math.floor(rng() * 3)
        : 1 + Math.floor(rng() * 2);

  const difficultyScore =
    rarity === "C"
      ? Number((1.6 + targetCount * 0.55 + item.valueGold / 45).toFixed(2))
      : rarity === "B"
        ? Number((2.8 + targetCount * 1.05 + item.valueGold / 65).toFixed(2))
        : Number((4.8 + targetCount * 1.9 + item.valueGold / 120).toFixed(2));

  const marketValue = item.valueGold * targetCount;
  const reward = buildBalancedReward("deliver", clamp(difficultyScore, 1, 10), marketValue, mapId, rng);

  return {
    id: `q-${idx}-deliver-${item.id}`,
    kind: "deliver",
    title: `📦 Giao ${targetCount}× ${item.name}`,
    description: `Thu thập và giao nộp ${targetCount} ${item.name} (Hạng ${rarity}) tại Hội Sở Nhiệm Vụ.`,
    difficultyScore: clamp(difficultyScore, 1, 10),
    targetItemId: item.id,
    targetCount,
    progress: 0,
    claimed: false,
    reward,
  };
}

function createExploreQuest(
  idx: number,
  mapId: MapId,
  rng: () => number,
): DailyQuestEntry {
  const candidates: Array<{
    target: ExploreTargetKind;
    title: string;
    description: string;
    targetCount: number;
    difficultyScore: number;
  }> = [
    {
      target: "visit_yellow",
      title: "🟡 Thám Hiểm Vùng Vàng",
      description: "Di chuyển vào khu vực Vùng Vàng để trinh sát địa bàn.",
      targetCount: 1,
      difficultyScore: 2.4,
    },
    {
      target: "visit_red",
      title: "🔴 Đột Kích Vùng Đỏ",
      description: "Thâm nhập vào Vùng Đỏ nguy hiểm nơi tập trung cảnh sát tinh nhuệ.",
      targetCount: 1,
      difficultyScore: 5.2,
    },
    {
      target: "loot_containers",
      title: "🧰 Lục Soát Khu Nguy Hiểm",
      description: "Mở hoặc lục soát các rương / tòa nhà ngoài Vùng Xanh.",
      targetCount: 2 + Math.floor(rng() * 3),
      difficultyScore: 0, // computed below
    },
    {
      target: "discover_landmarks",
      title: "🧭 Khám Phá Địa Danh Mới",
      description: "Tiếp cận điểm mốc (Landmark) trên bản đồ để mở khóa địa danh.",
      targetCount: 1 + Math.floor(rng() * 2),
      difficultyScore: 0, // computed below
    },
  ];
  if (mapId === "japan") {
    candidates.push({
      target: "visit_snow",
      title: "❄️ Chinh Phục Núi Tuyết Hokkaido",
      description: "Tiến vào vùng núi tuyết giá rét phía Đông Nhật Bản.",
      targetCount: 1,
      difficultyScore: 6.2,
    });
  }

  const picked = pickFrom(candidates, rng);
  const difficultyScore =
    picked.target === "loot_containers"
      ? 2.2 + picked.targetCount * 1.15
      : picked.target === "discover_landmarks"
        ? 3.2 + picked.targetCount * 1.7
        : picked.difficultyScore;

  const reward = buildBalancedReward("explore", clamp(difficultyScore, 1, 10), 0, mapId, rng);
  return {
    id: `q-${idx}-explore-${picked.target}`,
    kind: "explore",
    title: `${picked.title}${picked.targetCount > 1 ? ` (${picked.targetCount})` : ""}`,
    description: picked.description,
    difficultyScore: clamp(difficultyScore, 1, 10),
    exploreTarget: picked.target,
    targetCount: picked.targetCount,
    progress: 0,
    claimed: false,
    reward,
  };
}

function createMinigameQuest(
  idx: number,
  mapId: MapId,
  rng: () => number,
): DailyQuestEntry {
  const targetCount = 1 + Math.floor(rng() * 3); // 1..3 minigames
  const difficultyScore = targetCount === 1 ? 3.4 : targetCount === 2 ? 5.8 : 8.1;
  const reward = buildBalancedReward("minigame", difficultyScore, 0, mapId, rng);

  return {
    id: `q-${idx}-minigame-${targetCount}`,
    kind: "minigame",
    title: `🎮 Phá Khóa & Vượt Kiểm Tra (${targetCount} lần)`,
    description: `Hoàn thành ${targetCount} minigame bất kỳ (Mở két/rương Hoàng Gia, vượt kiểm tra Cảnh sát hoặc minigame Phòng giam).`,
    difficultyScore,
    targetCount,
    progress: 0,
    claimed: false,
    reward,
  };
}

export function generateDailyQuestBoard(
  mapId: MapId,
  nowMs = Date.now(),
  rerollCount = 0,
): DailyQuestBoardState {
  const epochIndex = getQuestEpochIndex(nowMs);
  const nextRefreshAt = getNextQuestRefreshAt(epochIndex);
  const seed = ((epochIndex * 73856093) ^ (rerollCount * 19349663) ^ (mapId === "japan" ? 0x9e3779b9 : 0x517cc1b7)) >>> 0;
  const rng = createSeededRng(seed);

  const count = 3 + Math.floor(rng() * 3); // 3..5 quests
  const kinds: DailyQuestKind[] = ["deliver", "explore", "minigame"];
  while (kinds.length < count) {
    kinds.push(pickFrom(["deliver", "explore", "minigame"] as const, rng));
  }
  // Shuffle order deterministically
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }

  const usedDeliverIds = new Set<string>();
  const usedExploreTargets = new Set<ExploreTargetKind>();
  const quests: DailyQuestEntry[] = [];

  for (let i = 0; i < count; i++) {
    const kind = kinds[i];
    if (kind === "deliver") {
      let q = createDeliverQuest(i, mapId, rng);
      for (let retry = 0; retry < 6 && q.targetItemId && usedDeliverIds.has(q.targetItemId); retry++) {
        q = createDeliverQuest(i, mapId, rng);
      }
      if (q.targetItemId) usedDeliverIds.add(q.targetItemId);
      quests.push(q);
    } else if (kind === "explore") {
      let q = createExploreQuest(i, mapId, rng);
      for (let retry = 0; retry < 5 && q.exploreTarget && usedExploreTargets.has(q.exploreTarget); retry++) {
        q = createExploreQuest(i, mapId, rng);
      }
      if (q.exploreTarget) usedExploreTargets.add(q.exploreTarget);
      quests.push(q);
    } else {
      quests.push(createMinigameQuest(i, mapId, rng));
    }
  }

  // Ensure every generated itemId is valid in ITEM_BY_ID
  sanitizeQuestRewards(quests);

  return {
    epochIndex,
    nextRefreshAt,
    rerollCount,
    mapId,
    quests,
  };
}

function sanitizeQuestRewards(quests: DailyQuestEntry[]): void {
  for (const q of quests) {
    if (q.reward.itemId && !ITEM_BY_ID[q.reward.itemId]) {
      q.reward.itemId = null;
      q.reward.itemQty = 0;
      q.reward.categoryLabel = "Tiền";
    }
  }
}

export function rerollPendingQuests(board: DailyQuestBoardState): DailyQuestBoardState {
  const nextRerollCount = board.rerollCount + 1;
  const seed =
    ((board.epochIndex * 73856093) ^
      (nextRerollCount * 19349663) ^
      (board.mapId === "japan" ? 0x9e3779b9 : 0x517cc1b7)) >>>
    0;
  const rng = createSeededRng(seed);

  const usedDeliverIds = new Set<string>();
  const usedExploreTargets = new Set<ExploreTargetKind>();
  for (const q of board.quests) {
    if (q.claimed) {
      if (q.targetItemId) usedDeliverIds.add(q.targetItemId);
      if (q.exploreTarget) usedExploreTargets.add(q.exploreTarget);
    }
  }

  const kinds: readonly DailyQuestKind[] = ["deliver", "explore", "minigame"];
  const quests: DailyQuestEntry[] = board.quests.map((oldQ, i) => {
    if (oldQ.claimed) return { ...oldQ, reward: { ...oldQ.reward } };

    // Generate candidates across kinds and pick a different quest with similar difficulty & reward tier
    let best: DailyQuestEntry | null = null;
    let bestScore = Infinity;
    for (let attempt = 0; attempt < 8; attempt++) {
      const k = kinds[Math.floor(rng() * kinds.length)];
      const cand =
        k === "deliver"
          ? createDeliverQuest(i, board.mapId, rng)
          : k === "explore"
            ? createExploreQuest(i, board.mapId, rng)
            : createMinigameQuest(i, board.mapId, rng);

      const isDuplicate =
        (cand.targetItemId && (usedDeliverIds.has(cand.targetItemId) || cand.targetItemId === oldQ.targetItemId)) ||
        (cand.exploreTarget &&
          (usedExploreTargets.has(cand.exploreTarget) || cand.exploreTarget === oldQ.exploreTarget)) ||
        cand.title === oldQ.title;

      const diffDelta = Math.abs(cand.difficultyScore - oldQ.difficultyScore);
      const score = diffDelta + (isDuplicate ? 100 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = cand;
      }
    }

    const chosen = best ?? createDeliverQuest(i, board.mapId, rng);
    if (chosen.targetItemId) usedDeliverIds.add(chosen.targetItemId);
    if (chosen.exploreTarget) usedExploreTargets.add(chosen.exploreTarget);
    return chosen;
  });

  sanitizeQuestRewards(quests);

  return {
    epochIndex: board.epochIndex,
    nextRefreshAt: board.nextRefreshAt,
    rerollCount: nextRerollCount,
    mapId: board.mapId,
    quests,
  };
}
