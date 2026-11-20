import { withAssetHash } from "../assetUrl.ts";
import { ITEM_BY_ID, ITEM_CATALOG, type CollectibleItemDef } from "./LootSystem.ts";
import type { ItemRarity, MapId } from "./types.ts";

export const PET_GACHA_COST_GOLD = 999;

export interface PetBonusStats {
  speedPct: number;
  staminaPct: number;
  searchSpeedPct: number;
  sellBonusPct: number;
  hungerSlowPct: number;
  redLuckPct: number;
}

export interface PetSpriteSheetMeta {
  idleSrc: string;
  runSrc: string;
  playSrc?: string;
  iw: number;
  ih: number;
  ic: number;
  rw: number;
  rh: number;
  rc: number;
  pw?: number;
  ph?: number;
  pc?: number;
}

export interface PetDef {
  id: string;
  name: string;
  rarity: ItemRarity;
  emoji: string;
  description: string;
  smartTrait?: string;
  iconSrc: string;
  runIconSrc: string;
  playIconSrc?: string;
  spriteSheet: PetSpriteSheetMeta;
  bonuses: PetBonusStats;
}

export const PET_DUPLICATE_REFUND_GOLD: Record<ItemRarity, number> = {
  C: 450,
  B: 1200,
  A: 3500,
  S: 10000,
};

export const PET_CATALOG: readonly PetDef[] = [
  // === TIER C (5.00%) ===
  {
    id: "pet_c_tabby",
    name: "Gà Trắng Lon Ton",
    rarity: "C",
    emoji: "🐔",
    description: "Chú gà pixel lanh lợi luôn chạy lon ton theo sau giúp bước chân nhẹ nhàng hơn.",
    iconSrc: "assets/world/pets/pet_c_tabby.gif",
    runIconSrc: "assets/world/pets/pet_c_tabby_run.gif",
    spriteSheet: {
      idleSrc: "assets/world/pets/pet_c_tabby_idle.png",
      runSrc: "assets/world/pets/pet_c_tabby_run.png",
      iw: 64,
      ih: 58,
      ic: 4,
      rw: 64,
      rh: 58,
      rc: 8,
    },
    bonuses: {
      speedPct: 3,
      staminaPct: 0,
      searchSpeedPct: 0,
      sellBonusPct: 0,
      hungerSlowPct: 0,
      redLuckPct: 0,
    },
  },
  {
    id: "pet_c_corgi",
    name: "Cún Nâu Chân Ngắn",
    rarity: "C",
    emoji: "🐶",
    description: "Cậu bạn cún nâu trung thành tiếp thêm năng lượng bền bỉ trên mọi cung đường.",
    iconSrc: "assets/world/pets/pet_c_corgi.gif",
    runIconSrc: "assets/world/pets/pet_c_corgi_run.gif",
    spriteSheet: {
      idleSrc: "assets/world/pets/pet_c_corgi_idle.png",
      runSrc: "assets/world/pets/pet_c_corgi_run.png",
      iw: 64,
      ih: 50,
      ic: 4,
      rw: 64,
      rh: 43,
      rc: 6,
    },
    bonuses: {
      speedPct: 0,
      staminaPct: 4,
      searchSpeedPct: 0,
      sellBonusPct: 0,
      hungerSlowPct: 0,
      redLuckPct: 0,
    },
  },
  {
    id: "pet_c_duck",
    name: "Vịt Vàng Tinh Nghịch",
    rarity: "C",
    emoji: "🐥",
    description: "Chú vịt vàng pixel đáng yêu mang lại may mắn khi giao thương tại cửa hàng.",
    iconSrc: "assets/world/pets/pet_c_duck.gif",
    runIconSrc: "assets/world/pets/pet_c_duck_run.gif",
    spriteSheet: {
      idleSrc: "assets/world/pets/pet_c_duck_idle.png",
      runSrc: "assets/world/pets/pet_c_duck_run.png",
      iw: 64,
      ih: 57,
      ic: 8,
      rw: 64,
      rh: 57,
      rc: 4,
    },
    bonuses: {
      speedPct: 0,
      staminaPct: 0,
      searchSpeedPct: 0,
      sellBonusPct: 5,
      hungerSlowPct: 0,
      redLuckPct: 0,
    },
  },

  // === TIER B (2.00%) ===
  {
    id: "pet_b_fox",
    name: "Cáo Đỏ Nhanh Nhẹn",
    rarity: "B",
    emoji: "🦊",
    description: "Đôi tai thính và bước chạy thoăn thoắt giúp tăng tốc chạy và lục rương.",
    iconSrc: "assets/world/pets/pet_b_fox.gif",
    runIconSrc: "assets/world/pets/pet_b_fox_run.gif",
    spriteSheet: {
      idleSrc: "assets/world/pets/pet_b_fox_idle.png",
      runSrc: "assets/world/pets/pet_b_fox_run.png",
      iw: 64,
      ih: 52,
      ic: 5,
      rw: 64,
      rh: 52,
      rc: 6,
    },
    bonuses: {
      speedPct: 6,
      staminaPct: 0,
      searchSpeedPct: 5,
      sellBonusPct: 0,
      hungerSlowPct: 0,
      redLuckPct: 0,
    },
  },
  {
    id: "pet_b_panda",
    name: "Cáo Tuyết Băng Giá",
    rarity: "B",
    emoji: "❄️",
    description: "Cáo tuyết nhanh nhẹn với bộ lông trắng muốt, giữ ấm và tiết kiệm sức bền.",
    iconSrc: "assets/world/pets/pet_b_panda.gif",
    runIconSrc: "assets/world/pets/pet_b_panda_run.gif",
    spriteSheet: {
      idleSrc: "assets/world/pets/pet_b_panda_idle.png",
      runSrc: "assets/world/pets/pet_b_panda_run.png",
      iw: 64,
      ih: 52,
      ic: 5,
      rw: 64,
      rh: 52,
      rc: 6,
    },
    bonuses: {
      speedPct: 5,
      staminaPct: 6,
      searchSpeedPct: 0,
      sellBonusPct: 0,
      hungerSlowPct: 8,
      redLuckPct: 0,
    },
  },

  // === TIER A (0.50%) ===
  {
    id: "pet_a_wolf",
    name: "Gấu Trúc Mập Mạp",
    rarity: "A",
    emoji: "🐼",
    description: "Hoạt ảnh 16 khung hình cực mượt, lăn tròn đáng yêu và mang lại vận may tài lộc.",
    smartTrait: "💎 Đánh hơi rương (260px) • 🚨 Cảnh báo cảnh sát • 🎾 Vờn bóng khi nghỉ",
    iconSrc: "assets/world/pets/pet_a_wolf.gif",
    runIconSrc: "assets/world/pets/pet_a_wolf_run.gif",
    playIconSrc: "assets/world/pets/pet_a_wolf_play.gif",
    spriteSheet: {
      idleSrc: "assets/world/pets/pet_a_wolf_idle.png",
      runSrc: "assets/world/pets/pet_a_wolf_run.png",
      playSrc: "assets/world/pets/pet_a_wolf_play.png",
      iw: 64,
      ih: 64,
      ic: 10,
      rw: 64,
      rh: 64,
      rc: 16,
      pw: 64,
      ph: 64,
      pc: 16,
    },
    bonuses: {
      speedPct: 8,
      staminaPct: 12,
      searchSpeedPct: 8,
      sellBonusPct: 10,
      hungerSlowPct: 10,
      redLuckPct: 0,
    },
  },
  {
    id: "pet_a_owl",
    name: "Gấu Mèo Tinh Quái",
    rarity: "A",
    emoji: "🦝",
    description: "Model HD siêu chi tiết với cặp mắt tinh anh, đánh hơi báu vật và trả giá cực khéo.",
    smartTrait: "💎 Đánh hơi rương (260px) • 🚨 Cảnh báo cảnh sát • 🎾 Đùa nghịch khi đứng yên",
    iconSrc: "assets/world/pets/pet_a_owl.gif",
    runIconSrc: "assets/world/pets/pet_a_owl_run.gif",
    playIconSrc: "assets/world/pets/pet_a_owl_play.gif",
    spriteSheet: {
      idleSrc: "assets/world/pets/pet_a_owl_idle.png",
      runSrc: "assets/world/pets/pet_a_owl_run.png",
      playSrc: "assets/world/pets/pet_a_owl_play.png",
      iw: 64,
      ih: 42,
      ic: 9,
      rw: 64,
      rh: 40,
      rc: 6,
      pw: 64,
      ph: 42,
      pc: 9,
    },
    bonuses: {
      speedPct: 10,
      staminaPct: 8,
      searchSpeedPct: 12,
      sellBonusPct: 14,
      hungerSlowPct: 0,
      redLuckPct: 0,
    },
  },

  // === TIER S (0.03%) ===
  {
    id: "pet_s_dragon",
    name: "Akita Inu Hoàng Kim",
    rarity: "S",
    emoji: "🐕",
    description: "Khuyển thần quý tộc Nhật Bản vẽ siêu chi tiết, bùng nổ tốc độ, thể lực và vận may Đồ Đỏ.",
    smartTrait: "💎 Đánh hơi rương xa (320px) • 🚨 Báo động cảnh sát • ✨ Vệt sao lấp lánh & Quẩy vòng quanh chủ",
    iconSrc: "assets/world/pets/pet_s_dragon.gif",
    runIconSrc: "assets/world/pets/pet_s_dragon_run.gif",
    playIconSrc: "assets/world/pets/pet_s_dragon_play.gif",
    spriteSheet: {
      idleSrc: "assets/world/pets/pet_s_dragon_idle.png",
      runSrc: "assets/world/pets/pet_s_dragon_run.png",
      playSrc: "assets/world/pets/pet_s_dragon_play.png",
      iw: 64,
      ih: 42,
      ic: 8,
      rw: 64,
      rh: 42,
      rc: 8,
      pw: 64,
      ph: 42,
      pc: 8,
    },
    bonuses: {
      speedPct: 14,
      staminaPct: 15,
      searchSpeedPct: 15,
      sellBonusPct: 20,
      hungerSlowPct: 12,
      redLuckPct: 2,
    },
  },
  {
    id: "pet_s_unicorn",
    name: "Thần Thú Rừng Xanh",
    rarity: "S",
    emoji: "🌿",
    description: "Thánh thú Huyền Thoại 56 khung hình gốc với hào quang Đỏ-Vàng, ban phước sức bền vô song.",
    smartTrait: "💎 Đánh hơi rương xa (320px) • 🚨 Báo động cảnh sát • ✨ Vệt sao rừng xanh & Vờn đồ chơi",
    iconSrc: "assets/world/pets/pet_s_unicorn.gif",
    runIconSrc: "assets/world/pets/pet_s_unicorn_run.gif",
    playIconSrc: "assets/world/pets/pet_s_unicorn_play.gif",
    spriteSheet: {
      idleSrc: "assets/world/pets/pet_s_unicorn_idle.png",
      runSrc: "assets/world/pets/pet_s_unicorn_run.png",
      playSrc: "assets/world/pets/pet_s_unicorn_play.png",
      iw: 64,
      ih: 64,
      ic: 16,
      rw: 64,
      rh: 30,
      rc: 3,
      pw: 64,
      ph: 64,
      pc: 16,
    },
    bonuses: {
      speedPct: 15,
      staminaPct: 18,
      searchSpeedPct: 12,
      sellBonusPct: 20,
      hungerSlowPct: 18,
      redLuckPct: 2,
    },
  },
];

for (const pet of PET_CATALOG) {
  pet.iconSrc = withAssetHash(pet.iconSrc);
  pet.runIconSrc = withAssetHash(pet.runIconSrc);
  if (pet.playIconSrc) pet.playIconSrc = withAssetHash(pet.playIconSrc);
  pet.spriteSheet.idleSrc = withAssetHash(pet.spriteSheet.idleSrc);
  pet.spriteSheet.runSrc = withAssetHash(pet.spriteSheet.runSrc);
  if (pet.spriteSheet.playSrc) pet.spriteSheet.playSrc = withAssetHash(pet.spriteSheet.playSrc);
}

export const PET_BY_ID: Record<string, PetDef> = Object.fromEntries(
  PET_CATALOG.map((p) => [p.id, p]),
);

export function formatPetBonusSummary(b: PetBonusStats): string {
  const parts: string[] = [];
  if (b.speedPct > 0) parts.push(`+${b.speedPct}% Tốc độ`);
  if (b.staminaPct > 0) parts.push(`+${b.staminaPct}% Thể lực`);
  if (b.searchSpeedPct > 0) parts.push(`+${b.searchSpeedPct}% Tìm đồ`);
  if (b.sellBonusPct > 0) parts.push(`+${b.sellBonusPct}% Giá bán`);
  if (b.hungerSlowPct > 0) parts.push(`-${b.hungerSlowPct}% Tụt đói`);
  if (b.redLuckPct > 0) parts.push(`+${b.redLuckPct}% Tỉ lệ Đồ Đỏ`);
  return parts.join(" • ");
}

export type GachaRollOutcome =
  | {
      kind: "pet";
      rarity: ItemRarity;
      pet: PetDef;
      isDuplicate: boolean;
      refundGold: number;
    }
  | {
      kind: "item";
      rarity: ItemRarity;
      item: CollectibleItemDef;
      storedWhere: "backpack" | "home" | "sold_overflow";
      overflowGold: number;
    };

export function rollPetGachaOutcome(mapId: MapId): {
  kind: "pet";
  rarity: ItemRarity;
  pet: PetDef;
} | {
  kind: "item";
  rarity: ItemRarity;
  item: CollectibleItemDef;
} {
  const roll = Math.random() * 100;
  let acc = 0;

  const pickPet = (rarity: ItemRarity): PetDef => {
    const pool = PET_CATALOG.filter((p) => p.rarity === rarity);
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const pickItem = (rarity: ItemRarity): CollectibleItemDef => {
    const pool = ITEM_CATALOG.filter(
      (it) =>
        it.rarity === rarity &&
        !it.excludeFromRandomLoot &&
        !it.backpackId &&
        !it.garmentId &&
        !it.consumableId &&
        (mapId === "vietnam" ? !it.mapOrigin || it.mapOrigin === "vietnam" : true),
    );
    const fallback = pool.length > 0 ? pool : ITEM_CATALOG.filter((it) => it.rarity === rarity && !it.excludeFromRandomLoot);
    return fallback[Math.floor(Math.random() * fallback.length)] ?? Object.values(ITEM_BY_ID)[0];
  };

  if (roll < (acc += 0.3)) return { kind: "pet", rarity: "S", pet: pickPet("S") };
  if (roll < (acc += 2.0)) return { kind: "pet", rarity: "A", pet: pickPet("A") };
  if (roll < (acc += 5.0)) return { kind: "pet", rarity: "B", pet: pickPet("B") };
  if (roll < (acc += 10.0)) return { kind: "pet", rarity: "C", pet: pickPet("C") };
  if (roll < (acc += 2.0)) return { kind: "item", rarity: "S", item: pickItem("S") };
  if (roll < (acc += 10.0)) return { kind: "item", rarity: "A", item: pickItem("A") };
  if (roll < (acc += 30.0)) return { kind: "item", rarity: "B", item: pickItem("B") };
  return { kind: "item", rarity: "C", item: pickItem("C") };
}
