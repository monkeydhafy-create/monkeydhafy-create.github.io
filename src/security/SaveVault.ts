import {
  DEFAULT_OWNED_HAIR_IDS,
  GARMENT_BY_ID,
  HAIR_BY_ID,
  HAIR_OPTIONS,
  MAX_SAVED_OUTFIT_PRESETS,
  createDefaultEquippedGear,
  type EquipmentSlot,
  type EquippedGear,
  type SavedOutfitPreset,
} from "../world/EquipmentCatalog.ts";
import type { BiomeId, CharacterGender, CharacterSkinId, FacingDir, MapId } from "../world/types.ts";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../world/types.ts";
import {
  AUCTION_BY_ID,
  BACKPACK_BY_ID,
  CONTAINER_COLS,
  CONTAINER_REFRESH_RULES,
  CONTAINER_ROWS,
  GYM_BY_ID,
  HOME_STORAGE_BY_ID,
  ITEM_BY_ID,
  LOCKED_PUZZLE_KINDS,
  MYTHIC_HARD_PITY,
  SAFEBOX_BY_ID,
  TREADMILL_BY_ID,
  canPlaceOnGrid,
  COLLECTION_RED_BY_ID,
  createDefaultInventoryState,
  generateAuctionContract,
  generateGymContract,
  generateHomeContract,
  generateSafeboxContract,
  generateTreadmillContract,
  getEffectiveSize,
  getItemMaxUses,
  getNextAuctionTier,
  getNextGymTier,
  getNextHomeTier,
  getNextSafeboxTier,
  getNextTreadmillTier,
  GOLD_LAMP_REQUIRED_COUNT,
  type CollectionSlotState,
  type ContainerLootState,
  type ContainerPuzzleLockState,
  type FacilityUpgradeContract,
  type GridItemInstance,
  type HomeUpgradeContract,
  type LockedPuzzleKind,
  type LootSourceType,
  type PersistedInventoryState,
  type SafeboxQuestRequirement,
  type SafeboxTierDef,
  type SafeboxUpgradeContract,
} from "../world/LootSystem.ts";
import type { SavedDungeonState } from "../world/dungeon/DungeonTypes.ts";
import { createDefaultSurvivalState, type StaminaBuffState, type SurvivalState } from "../world/SurvivalSystem.ts";
import {
  QUEST_REFRESH_INTERVAL_MS,
  type DailyQuestBoardState,
  type DailyQuestEntry,
} from "../world/QuestSystem.ts";
import {
  REPUTATION_MILESTONE_BY_ID,
  type ReputationState,
} from "../world/ReputationSystem.ts";
import { PET_BY_ID } from "../world/PetSystem.ts";
import {
  HOUSE_MODELS,
  LEGACY_DEFAULT_LOT_COL,
  LEGACY_DEFAULT_LOT_ROW,
  createDefaultPlayerEstateState,
  getDefaultEstateLotOrigin,
  isPurchasableEstateTile,
  makeWorldTileKey,
  parseWorldTileKey,
  type PlayerEstateState,
} from "../world/EstateCatalog.ts";

export interface SavedPlayerProfile {
  x: number;
  y: number;
  facing: FacingDir;
  skinId: CharacterSkinId;
  gender?: CharacterGender;
  activeMapId?: MapId;
  onboardingDone?: boolean;
  discoveredLandmarkIds: string[];
  soundEnabled: boolean;
}

export interface SavedPoliceState {
  detainedUntil: number;
  ignoreUntilByOfficer: Record<string, number>;
  globalIgnoreUntil?: number;
  pendingArrestOfficerId: string | null;
}

export interface PlayerGameSaveV3 {
  schemaVersion: 3;
  inventory: PersistedInventoryState;
  profile: SavedPlayerProfile;
  survival: SurvivalState;
  equipment: EquippedGear;
  hairId: string;
  ownedHairIds?: string[];
  savedOutfits?: SavedOutfitPreset[];
  policeState?: SavedPoliceState;
  questBoard?: DailyQuestBoardState;
  reputation?: ReputationState;
  ownedPetIds?: string[];
  equippedPetId?: string | null;
  estate?: PlayerEstateState;
  jpEstate?: PlayerEstateState;
  dungeon?: SavedDungeonState;
}

export interface SaveLoadResult {
  save: PlayerGameSaveV3;
  tamperDetected: boolean;
  migratedLegacy: boolean;
  isNewGame: boolean;
}

export interface SaveEnvelopeV3 {
  v: 3;
  mode: "webcrypto" | "lan-fallback";
  seq: number;
  savedAt: number;
  iv: string;
  aad: string;
  ct: string;
  mac: string;
}

export interface VaultRemoteSyncAdapter {
  syncEncryptedSave?: (envelope: SaveEnvelopeV3) => Promise<void>;
}

interface StoredMasterKeysWebCrypto {
  mode: "webcrypto";
  encKey: CryptoKey;
  macKey: CryptoKey;
}

interface StoredMasterKeysFallback {
  mode: "lan-fallback";
  encSecretB64: string;
  macSecretB64: string;
}

type StoredMasterKeys = StoredMasterKeysWebCrypto | StoredMasterKeysFallback;

interface SeqAnchorRecord {
  seq: number;
  anchorDigest: string;
}

export interface VaultStorageDriver {
  readKeys(): Promise<StoredMasterKeys | null>;
  writeKeys(keys: StoredMasterKeys): Promise<void>;
  readSave(): Promise<{ envelope: SaveEnvelopeV3 | null; anchor: SeqAnchorRecord | null }>;
  writeSaveAtomic(envelope: SaveEnvelopeV3, anchor: SeqAnchorRecord): Promise<void>;
  clearSaveData(): Promise<void>;
  clearAll(): Promise<void>;
}

const DB_NAME = "openworld_secure_vault_v3";
const DB_VERSION = 1;
const STORE_KEYS = "vault_keys";
const STORE_DATA = "vault_data";
const RECORD_MASTER_KEYS = "master_keys";
const RECORD_PRIMARY_SAVE = "primary_save";
const RECORD_SEQ_ANCHOR = "seq_anchor";
const LEGACY_PLAINTEXT_KEY = "openworld_delta_inv_v2";
const APP_AAD_PREFIX = "engbbq-ow-save-v3";

const MAX_VALID_GOLD = 50_000_000;
const ALLOWED_SKINS = new Set<CharacterSkinId>(["samurai_blue", "ninja_blue", "samurai_green"]);
const ALLOWED_FACINGS = new Set<FacingDir>(["down", "up", "left", "right"]);
const ALLOWED_SOURCE_TYPES = new Set<LootSourceType>([
  "trash_bin",
  "house_standard",
  "house_landmark",
  "house_vault",
  "chest_wooden",
  "chest_royal",
  "dungeon_chest",
  "dungeon_royal",
]);
const ALLOWED_BIOMES = new Set<BiomeId>(["city", "plains", "countryside"]);
const ALLOWED_PUZZLE_KINDS = new Set<LockedPuzzleKind>(LOCKED_PUZZLE_KINDS);

class TamperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TamperError";
  }
}

export function createDefaultGameSave(spawnX: number, spawnY: number): PlayerGameSaveV3 {
  return {
    schemaVersion: 3,
    inventory: createDefaultInventoryState(),
    profile: {
      x: spawnX,
      y: spawnY,
      facing: "down",
      skinId: "samurai_blue",
      gender: "male",
      activeMapId: "vietnam",
      onboardingDone: false,
      discoveredLandmarkIds: [],
      soundEnabled: true,
    },
    survival: createDefaultSurvivalState(),
    equipment: createDefaultEquippedGear(),
    hairId: HAIR_OPTIONS[0].id,
    ownedHairIds: [...DEFAULT_OWNED_HAIR_IDS],
    savedOutfits: [],
    policeState: {
      detainedUntil: 0,
      ignoreUntilByOfficer: {},
      globalIgnoreUntil: 0,
      pendingArrestOfficerId: null,
    },
    estate: createDefaultPlayerEstateState("vietnam"),
    jpEstate: createDefaultPlayerEstateState("japan"),
    dungeon: {
      cooldownUntil: 0,
      totalClears: 0,
      runsEntered: 0,
    },
  };
}

function getRuntimeOrigin(): string {
  try {
    return typeof globalThis.location?.origin === "string" && globalThis.location.origin.length > 0
      ? globalThis.location.origin
      : "local-runtime";
  } catch {
    return "local-runtime";
  }
}

function hasWebCryptoSubtle(): boolean {
  return typeof globalThis.crypto?.subtle !== "undefined" && typeof globalThis.crypto.getRandomValues === "function";
}

function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(out);
    return out;
  }
  for (let i = 0; i < length; i++) {
    out[i] = Math.floor(Math.random() * 256);
  }
  return out;
}

function utf8Encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof globalThis.btoa === "function") {
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return globalThis.btoa(bin);
  }
  let hex = "";
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, "0");
  }
  return `hex:${hex}`;
}

function base64ToBytes(b64: string): Uint8Array {
  if (b64.startsWith("hex:")) {
    const hex = b64.slice(4);
    if (hex.length % 2 !== 0) throw new TamperError("Invalid hex payload");
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
  }
  const bin = globalThis.atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries: string[] = [];
  for (const key of keys) {
    const val = record[key];
    if (val === undefined) continue;
    entries.push(`${JSON.stringify(key)}:${canonicalJson(val)}`);
  }
  return `{${entries.join(",")}}`;
}

// Compact pure-TS SHA-256 (FIPS 180-4) used for insecure HTTP LAN dev fallback only.
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256Fallback(data: Uint8Array): Uint8Array {
  const bitLen = data.length * 8;
  const padLen = ((data.length + 9 + 63) >> 6) << 6;
  const padded = new Uint8Array(padLen);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(padLen - 4, bitLen >>> 0, false);

  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const W = new Uint32Array(64);

  for (let offset = 0; offset < padLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      W[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + W[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) {
    outView.setUint32(i * 4, H[i], false);
  }
  return out;
}

function hmacSha256Fallback(key: Uint8Array, msg: Uint8Array): Uint8Array {
  const blockKey = new Uint8Array(64);
  blockKey.set(key.length > 64 ? sha256Fallback(key) : key);
  const oPad = new Uint8Array(64);
  const iPad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    oPad[i] = blockKey[i] ^ 0x5c;
    iPad[i] = blockKey[i] ^ 0x36;
  }
  const inner = new Uint8Array(64 + msg.length);
  inner.set(iPad, 0);
  inner.set(msg, 64);
  const innerHash = sha256Fallback(inner);

  const outer = new Uint8Array(64 + 32);
  outer.set(oPad, 0);
  outer.set(innerHash, 64);
  return sha256Fallback(outer);
}

function streamXorFallback(key: Uint8Array, iv: Uint8Array, aad: Uint8Array, input: Uint8Array): Uint8Array {
  const aadHash = sha256Fallback(aad);
  const out = new Uint8Array(input.length);
  let blockIdx = 0;
  for (let offset = 0; offset < input.length; offset += 32) {
    const seed = new Uint8Array(key.length + iv.length + aadHash.length + 4);
    seed.set(key, 0);
    seed.set(iv, key.length);
    seed.set(aadHash, key.length + iv.length);
    const dv = new DataView(seed.buffer);
    dv.setUint32(seed.length - 4, blockIdx++, false);
    const mask = sha256Fallback(seed);
    const end = Math.min(32, input.length - offset);
    for (let j = 0; j < end; j++) {
      out[offset + j] = input[offset + j] ^ mask[j];
    }
  }
  return out;
}

class IndexedDBVaultDriver implements VaultStorageDriver {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof globalThis.indexedDB === "undefined") {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      const req = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_KEYS)) {
          db.createObjectStore(STORE_KEYS);
        }
        if (!db.objectStoreNames.contains(STORE_DATA)) {
          db.createObjectStore(STORE_DATA);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB open error"));
    });
    return this.dbPromise;
  }

  public async readKeys(): Promise<StoredMasterKeys | null> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_KEYS, "readonly");
      const req = tx.objectStore(STORE_KEYS).get(RECORD_MASTER_KEYS);
      req.onsuccess = () => resolve((req.result as StoredMasterKeys | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB readKeys failed"));
    });
  }

  public async writeKeys(keys: StoredMasterKeys): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_KEYS, "readwrite");
      tx.objectStore(STORE_KEYS).put(keys, RECORD_MASTER_KEYS);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB writeKeys failed"));
    });
  }

  public async readSave(): Promise<{ envelope: SaveEnvelopeV3 | null; anchor: SeqAnchorRecord | null }> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DATA, "readonly");
      const store = tx.objectStore(STORE_DATA);
      const envReq = store.get(RECORD_PRIMARY_SAVE);
      const ancReq = store.get(RECORD_SEQ_ANCHOR);
      let envelope: SaveEnvelopeV3 | null = null;
      let anchor: SeqAnchorRecord | null = null;
      envReq.onsuccess = () => {
        envelope = (envReq.result as SaveEnvelopeV3 | undefined) ?? null;
      };
      ancReq.onsuccess = () => {
        anchor = (ancReq.result as SeqAnchorRecord | undefined) ?? null;
      };
      tx.oncomplete = () => resolve({ envelope, anchor });
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB readSave failed"));
    });
  }

  public async writeSaveAtomic(envelope: SaveEnvelopeV3, anchor: SeqAnchorRecord): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DATA, "readwrite");
      const store = tx.objectStore(STORE_DATA);
      store.put(envelope, RECORD_PRIMARY_SAVE);
      store.put(anchor, RECORD_SEQ_ANCHOR);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB writeSaveAtomic failed"));
    });
  }

  public async clearSaveData(): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DATA, "readwrite");
      tx.objectStore(STORE_DATA).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB clearSaveData failed"));
    });
  }

  public async clearAll(): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_KEYS, STORE_DATA], "readwrite");
      tx.objectStore(STORE_KEYS).clear();
      tx.objectStore(STORE_DATA).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB clearAll failed"));
    });
  }
}

export class MemoryVaultDriver implements VaultStorageDriver {
  private keys: StoredMasterKeys | null = null;
  private envelope: SaveEnvelopeV3 | null = null;
  private anchor: SeqAnchorRecord | null = null;

  public async readKeys(): Promise<StoredMasterKeys | null> {
    return this.keys;
  }

  public async writeKeys(keys: StoredMasterKeys): Promise<void> {
    this.keys = keys;
  }

  public async readSave(): Promise<{ envelope: SaveEnvelopeV3 | null; anchor: SeqAnchorRecord | null }> {
    return {
      envelope: this.envelope ? { ...this.envelope } : null,
      anchor: this.anchor ? { ...this.anchor } : null,
    };
  }

  public async writeSaveAtomic(envelope: SaveEnvelopeV3, anchor: SeqAnchorRecord): Promise<void> {
    this.envelope = { ...envelope };
    this.anchor = { ...anchor };
  }

  public async clearSaveData(): Promise<void> {
    this.envelope = null;
    this.anchor = null;
  }

  public async clearAll(): Promise<void> {
    this.keys = null;
    this.envelope = null;
    this.anchor = null;
  }
}

function validatePlacedItems(
  rawItems: unknown,
  gridCols: number,
  gridRows: number,
  strict: boolean,
): GridItemInstance[] {
  if (!Array.isArray(rawItems)) {
    if (strict) throw new TamperError("Invalid item array");
    return [];
  }
  const verified: GridItemInstance[] = [];
  const seenUids = new Set<string>();

  for (const entry of rawItems) {
    if (!entry || typeof entry !== "object") {
      if (strict) throw new TamperError("Malformed item object");
      continue;
    }
    const it = entry as Partial<GridItemInstance>;
    if (
      typeof it.uid !== "string" ||
      it.uid.length === 0 ||
      seenUids.has(it.uid) ||
      typeof it.itemId !== "string" ||
      !ITEM_BY_ID[it.itemId] ||
      !Number.isInteger(it.x) ||
      !Number.isInteger(it.y) ||
      typeof it.rotated !== "boolean"
    ) {
      if (strict) throw new TamperError("Invalid item fields");
      continue;
    }

    const def = ITEM_BY_ID[it.itemId];
    const { w, h } = getEffectiveSize(def, it.rotated);
    if (!canPlaceOnGrid(gridCols, gridRows, verified, it.x!, it.y!, w, h)) {
      if (strict) throw new TamperError("Item out of bounds or overlapping");
      continue;
    }

    const maxUses = getItemMaxUses(def);
    if (
      def.consumableId &&
      it.usesLeft !== undefined &&
      (typeof it.usesLeft !== "number" ||
        !Number.isInteger(it.usesLeft) ||
        it.usesLeft < 1 ||
        it.usesLeft > maxUses)
    ) {
      if (strict) throw new TamperError("Invalid item usesLeft");
      continue;
    }

    const usesLeft = def.consumableId
      ? typeof it.usesLeft === "number" && Number.isInteger(it.usesLeft)
        ? Math.max(1, Math.min(maxUses, it.usesLeft))
        : maxUses
      : undefined;

    const biome: BiomeId =
      typeof it.originBiome === "string" && ALLOWED_BIOMES.has(it.originBiome)
        ? it.originBiome
        : "plains";

    seenUids.add(it.uid);
    verified.push({
      uid: it.uid,
      itemId: it.itemId,
      x: it.x!,
      y: it.y!,
      rotated: it.rotated,
      originBiome: biome,
      revealed: it.revealed !== false ? true : false,
      ...(usesLeft !== undefined ? { usesLeft } : {}),
    });
  }

  return verified;
}

function validateContractRequirements(
  rawContract: unknown,
  expectedTargetId: string | null,
  targetKey: "targetSafeboxId" | "targetHomeId" | "targetTierId",
  strict: boolean,
  label: string,
): SafeboxQuestRequirement[] | null | "regenerate" {
  if (rawContract === undefined) {
    return expectedTargetId ? "regenerate" : null;
  }
  if (rawContract === null) {
    if (!expectedTargetId) return null;
    if (strict) throw new TamperError(`Missing ${label} upgrade contract`);
    return "regenerate";
  }
  const obj = typeof rawContract === "object" ? (rawContract as Record<string, unknown>) : null;
  if (!obj || !expectedTargetId || obj[targetKey] !== expectedTargetId || !Array.isArray(obj.requirements)) {
    if (strict) throw new TamperError(`${label} contract invariant violated`);
    return expectedTargetId ? "regenerate" : null;
  }
  const validatedReqs: SafeboxQuestRequirement[] = [];
  for (const entry of obj.requirements) {
    if (!entry || typeof entry !== "object") {
      if (strict) throw new TamperError(`Malformed ${label} requirement`);
      continue;
    }
    const req = entry as Partial<SafeboxQuestRequirement>;
    if (
      typeof req.itemId !== "string" ||
      !ITEM_BY_ID[req.itemId] ||
      typeof req.requiredCount !== "number" ||
      !Number.isInteger(req.requiredCount) ||
      req.requiredCount < 1 ||
      req.requiredCount > 20 ||
      typeof req.deliveredCount !== "number" ||
      !Number.isInteger(req.deliveredCount) ||
      req.deliveredCount < 0 ||
      req.deliveredCount > req.requiredCount
    ) {
      if (strict) throw new TamperError(`${label} requirement invariant violated`);
      continue;
    }
    validatedReqs.push({
      itemId: req.itemId,
      requiredCount: req.requiredCount,
      deliveredCount: req.deliveredCount,
    });
  }
  if (validatedReqs.length === 0 || validatedReqs.length > 12) {
    if (strict) throw new TamperError(`${label} contract size violated`);
    return "regenerate";
  }
  return validatedReqs;
}

function validateFacilityTierAndContract(opts: {
  rawId: unknown;
  rawContract: unknown;
  defaultId: string;
  byId: Record<string, SafeboxTierDef>;
  getNextTier: (id: string) => SafeboxTierDef | null;
  generateContract: (id: string) => FacilityUpgradeContract | null;
  strict: boolean;
  label: string;
}): { id: string; contract: FacilityUpgradeContract | null } {
  const id =
    opts.rawId === undefined
      ? opts.defaultId
      : typeof opts.rawId === "string" && opts.byId[opts.rawId]
        ? opts.rawId
        : opts.strict
          ? (() => {
              throw new TamperError(`Invalid ${opts.label} tier`);
            })()
          : opts.defaultId;
  const next = opts.getNextTier(id);
  const res = validateContractRequirements(
    opts.rawContract,
    next ? next.id : null,
    "targetTierId",
    opts.strict,
    opts.label,
  );
  const contract: FacilityUpgradeContract | null =
    res === "regenerate"
      ? next
        ? opts.generateContract(next.id)
        : null
      : res === null
        ? null
        : { targetTierId: next!.id, requirements: res };
  return { id, contract };
}

export function validateSavePayload(
  raw: unknown,
  spawnX: number,
  spawnY: number,
  strict: boolean,
): PlayerGameSaveV3 {
  if (!raw || typeof raw !== "object") {
    throw new TamperError("Payload is not an object");
  }
  const obj = raw as Partial<PlayerGameSaveV3>;
  if (strict && obj.schemaVersion !== 3) {
    throw new TamperError("Unsupported save schema version");
  }

  const rawInv = (obj.inventory ?? {}) as Partial<PersistedInventoryState>;
  const gold = rawInv.gold;
  if (typeof gold !== "number" || !Number.isInteger(gold) || gold < 0 || gold > MAX_VALID_GOLD) {
    throw new TamperError("Gold invariant violated");
  }

  let backpackId: string | null;
  if (rawInv.backpackId === null) {
    backpackId = null;
  } else if (typeof rawInv.backpackId === "string" && BACKPACK_BY_ID[rawInv.backpackId]) {
    backpackId = rawInv.backpackId;
  } else if (strict) {
    throw new TamperError("Invalid equipped backpack");
  } else {
    backpackId = "starter_4x4";
  }

  const ownedRaw = Array.isArray(rawInv.ownedBackpackIds) ? rawInv.ownedBackpackIds : [];
  const ownedSet = new Set<string>();
  for (const id of ownedRaw) {
    if (typeof id !== "string" || !BACKPACK_BY_ID[id]) {
      if (strict) throw new TamperError("Invalid owned backpack entry");
      continue;
    }
    ownedSet.add(id);
  }
  if (backpackId) ownedSet.add(backpackId);

  const bpDef = backpackId ? BACKPACK_BY_ID[backpackId] : null;
  const backpackItems = validatePlacedItems(
    rawInv.backpackItems,
    bpDef ? bpDef.cols : 0,
    bpDef ? bpDef.rows : 0,
    strict,
  );

  let homeStorageId: string;
  let homeItems: GridItemInstance[];
  if (rawInv.homeStorageId === undefined) {
    // Legacy migration: saves created before Home Storage tiers validated homeItems against old 8x6 grid.
    homeItems =
      rawInv.homeItems !== undefined ? validatePlacedItems(rawInv.homeItems, 8, 6, strict) : [];
    const maxBounds = homeItems.reduce(
      (acc, it) => {
        const def = ITEM_BY_ID[it.itemId];
        if (!def) return acc;
        const sz = getEffectiveSize(def, it.rotated);
        return { maxX: Math.max(acc.maxX, it.x + sz.w), maxY: Math.max(acc.maxY, it.y + sz.h) };
      },
      { maxX: 0, maxY: 0 },
    );
    homeStorageId =
      maxBounds.maxX <= 4 && maxBounds.maxY <= 4
        ? "home_4x4"
        : maxBounds.maxX <= 7 && maxBounds.maxY <= 7
          ? "home_7x7"
          : "home_9x9";
  } else if (typeof rawInv.homeStorageId === "string" && HOME_STORAGE_BY_ID[rawInv.homeStorageId]) {
    homeStorageId = rawInv.homeStorageId;
    const hmDef = HOME_STORAGE_BY_ID[homeStorageId];
    homeItems =
      rawInv.homeItems !== undefined
        ? validatePlacedItems(rawInv.homeItems, hmDef.cols, hmDef.rows, strict)
        : [];
  } else if (strict) {
    throw new TamperError("Invalid home storage tier");
  } else {
    homeStorageId = "home_4x4";
    homeItems =
      rawInv.homeItems !== undefined ? validatePlacedItems(rawInv.homeItems, 4, 4, false) : [];
  }

  const expectedNextHome = getNextHomeTier(homeStorageId);
  const homeContractRes = validateContractRequirements(
    rawInv.homeContract,
    expectedNextHome ? expectedNextHome.id : null,
    "targetHomeId",
    strict,
    "Home storage",
  );
  const homeContract: HomeUpgradeContract | null =
    homeContractRes === "regenerate"
      ? expectedNextHome
        ? generateHomeContract(expectedNextHome.id)
        : null
      : homeContractRes === null
        ? null
        : { targetHomeId: expectedNextHome!.id, requirements: homeContractRes };

  let jpHomeStorageId = "home_4x4";
  let jpHomeItems: GridItemInstance[] = [];
  if (rawInv.jpHomeStorageId !== undefined) {
    if (typeof rawInv.jpHomeStorageId === "string" && HOME_STORAGE_BY_ID[rawInv.jpHomeStorageId]) {
      jpHomeStorageId = rawInv.jpHomeStorageId;
      const jpHmDef = HOME_STORAGE_BY_ID[jpHomeStorageId];
      jpHomeItems =
        rawInv.jpHomeItems !== undefined
          ? validatePlacedItems(rawInv.jpHomeItems, jpHmDef.cols, jpHmDef.rows, strict)
          : [];
    } else if (strict) {
      throw new TamperError("Invalid jpHomeStorageId");
    }
  } else if (rawInv.jpHomeItems !== undefined) {
    jpHomeItems = validatePlacedItems(rawInv.jpHomeItems, 4, 4, strict);
  }

  const expectedNextJpHome = getNextHomeTier(jpHomeStorageId);
  const jpHomeContractRes = validateContractRequirements(
    rawInv.jpHomeContract,
    expectedNextJpHome ? expectedNextJpHome.id : null,
    "targetHomeId",
    strict,
    "Japan Home storage",
  );
  const jpHomeContract: HomeUpgradeContract | null =
    jpHomeContractRes === "regenerate"
      ? expectedNextJpHome
        ? generateHomeContract(expectedNextJpHome.id)
        : null
      : jpHomeContractRes === null
        ? null
        : { targetHomeId: expectedNextJpHome!.id, requirements: jpHomeContractRes };

  const safeboxId =
    rawInv.safeboxId === undefined
      ? "safe_2x2"
      : typeof rawInv.safeboxId === "string" && SAFEBOX_BY_ID[rawInv.safeboxId]
        ? rawInv.safeboxId
        : strict
          ? (() => {
              throw new TamperError("Invalid safebox tier");
            })()
          : "safe_2x2";

  const sbDef = SAFEBOX_BY_ID[safeboxId];
  const safeboxItems =
    rawInv.safeboxItems !== undefined
      ? validatePlacedItems(rawInv.safeboxItems, sbDef.cols, sbDef.rows, strict)
      : [];
  const torsoItems =
    rawInv.torsoItems !== undefined
      ? validatePlacedItems(rawInv.torsoItems, 5, 5, strict)
      : [];
  const legsItems =
    rawInv.legsItems !== undefined
      ? validatePlacedItems(rawInv.legsItems, 5, 5, strict)
      : [];

  const expectedNextSb = getNextSafeboxTier(safeboxId);
  const sbContractRes = validateContractRequirements(
    rawInv.safeboxContract,
    expectedNextSb ? expectedNextSb.id : null,
    "targetSafeboxId",
    strict,
    "Safebox",
  );
  const safeboxContract: SafeboxUpgradeContract | null =
    sbContractRes === "regenerate"
      ? expectedNextSb
        ? generateSafeboxContract(expectedNextSb.id)
        : null
      : sbContractRes === null
        ? null
        : { targetSafeboxId: expectedNextSb!.id, requirements: sbContractRes };

  const validatedGym = validateFacilityTierAndContract({
    rawId: rawInv.homeGymId,
    rawContract: rawInv.homeGymContract,
    defaultId: "gym_0",
    byId: GYM_BY_ID,
    getNextTier: getNextGymTier,
    generateContract: generateGymContract,
    strict,
    label: "Home gym",
  });
  const validatedTreadmill = validateFacilityTierAndContract({
    rawId: rawInv.homeTreadmillId,
    rawContract: rawInv.homeTreadmillContract,
    defaultId: "treadmill_0",
    byId: TREADMILL_BY_ID,
    getNextTier: getNextTreadmillTier,
    generateContract: generateTreadmillContract,
    strict,
    label: "Home treadmill",
  });
  const validatedAuction = validateFacilityTierAndContract({
    rawId: rawInv.auctionSlotsId,
    rawContract: rawInv.auctionContract,
    defaultId: "auc_7",
    byId: AUCTION_BY_ID,
    getNextTier: getNextAuctionTier,
    generateContract: generateAuctionContract,
    strict,
    label: "Auction slots",
  });

  const mythicPity = rawInv.mythicPity ?? 0;
  if (
    typeof mythicPity !== "number" ||
    !Number.isInteger(mythicPity) ||
    mythicPity < 0 ||
    mythicPity > MYTHIC_HARD_PITY
  ) {
    throw new TamperError("Pity counter invariant violated");
  }

  const consecutiveJunk = rawInv.consecutiveJunk ?? 0;
  if (
    typeof consecutiveJunk !== "number" ||
    !Number.isInteger(consecutiveJunk) ||
    consecutiveJunk < 0 ||
    consecutiveJunk > 50
  ) {
    throw new TamperError("Consecutive junk invariant violated");
  }

  const nextUid = rawInv.nextUid ?? 1;
  if (typeof nextUid !== "number" || !Number.isInteger(nextUid) || nextUid < 1 || nextUid > 10_000_000) {
    throw new TamperError("nextUid invariant violated");
  }

  const validateCollectionRecord = (rawRec: unknown): Record<string, CollectionSlotState> => {
    const out: Record<string, CollectionSlotState> = {};
    if (rawRec === undefined) return out;
    if (typeof rawRec !== "object" || rawRec === null || Array.isArray(rawRec)) {
      throw new TamperError("Collection hall state invariant violated");
    }
    for (const [itemId, rawSlot] of Object.entries(rawRec)) {
      if (!COLLECTION_RED_BY_ID[itemId]) {
        throw new TamperError(`Invalid collection item id: ${itemId}`);
      }
      if (typeof rawSlot !== "object" || rawSlot === null || Array.isArray(rawSlot)) {
        throw new TamperError("Collection slot invariant violated");
      }
      const typedSlot = rawSlot as Partial<CollectionSlotState>;
      if (typeof typedSlot.displayed !== "boolean") {
        throw new TamperError("Collection displayed flag invariant violated");
      }
      if (
        typeof typedSlot.lightLevel !== "number" ||
        !Number.isInteger(typedSlot.lightLevel) ||
        typedSlot.lightLevel < 0 ||
        typedSlot.lightLevel > 2
      ) {
        throw new TamperError("Collection light level invariant violated");
      }
      const rawProgress = typedSlot.goldLampProgress ?? 0;
      if (
        typeof rawProgress !== "number" ||
        !Number.isInteger(rawProgress) ||
        rawProgress < 0 ||
        rawProgress >= GOLD_LAMP_REQUIRED_COUNT ||
        (typedSlot.lightLevel !== 1 && rawProgress !== 0)
      ) {
        throw new TamperError("Collection gold lamp progress invariant violated");
      }
      if (typedSlot.displayed || typedSlot.lightLevel > 0 || rawProgress > 0) {
        out[itemId] = {
          displayed: typedSlot.displayed,
          lightLevel: typedSlot.lightLevel as 0 | 1 | 2,
          goldLampProgress: rawProgress,
        };
      }
    }
    return out;
  };

  const validatedCollectionHall = validateCollectionRecord(rawInv.collectionHall);
  const validatedJpCollectionHall = validateCollectionRecord(rawInv.jpCollectionHall);

  const validatedContainers: Record<string, ContainerLootState> = {};
  const expiredContainerIds = new Set<string>();
  const rawContainers = rawInv.containers ?? {};
  if (!rawContainers || typeof rawContainers !== "object" || Array.isArray(rawContainers)) {
    throw new TamperError("Containers record invalid");
  }

  const now = Date.now();
  for (const [key, rawC] of Object.entries(rawContainers)) {
    if (!rawC || typeof rawC !== "object") {
      if (strict) throw new TamperError("Malformed container record");
      continue;
    }
    const c = rawC as Partial<ContainerLootState>;
    if (
      c.containerId !== key ||
      typeof c.title !== "string" ||
      !c.sourceType ||
      !ALLOWED_SOURCE_TYPES.has(c.sourceType) ||
      !c.biome ||
      !ALLOWED_BIOMES.has(c.biome) ||
      c.cols !== CONTAINER_COLS ||
      c.rows !== CONTAINER_ROWS
    ) {
      if (strict) throw new TamperError("Invalid container metadata");
      continue;
    }

    const genAt = typeof c.generatedAt === "number" && Number.isFinite(c.generatedAt) ? c.generatedAt : now;
    const rule = CONTAINER_REFRESH_RULES[c.sourceType];
    let refAt =
      typeof c.refreshAt === "number" && Number.isFinite(c.refreshAt)
        ? c.refreshAt
        : genAt + rule.minMs;

    const legacyMaxMs = Math.ceil(rule.maxMs / 0.49);
    if (strict && (refAt < genAt || refAt - genAt > legacyMaxMs + 60_000)) {
      throw new TamperError("Container cooldown window tampered");
    }
    if (refAt - genAt > rule.maxMs) {
      refAt = genAt + rule.maxMs;
    }
    if (now >= refAt) {
      // Automatically discard expired containers instead of reviving old loot
      expiredContainerIds.add(key);
      continue;
    }

    validatedContainers[key] = {
      containerId: c.containerId,
      title: c.title,
      sourceType: c.sourceType,
      biome: c.biome,
      cols: CONTAINER_COLS,
      rows: CONTAINER_ROWS,
      items: validatePlacedItems(c.items, CONTAINER_COLS, CONTAINER_ROWS, strict),
      generatedAt: genAt,
      refreshAt: refAt,
    };
  }

  const validatedContainerPuzzles: Record<string, ContainerPuzzleLockState> = {};
  if (rawInv.containerPuzzles !== undefined) {
    if (
      !rawInv.containerPuzzles ||
      typeof rawInv.containerPuzzles !== "object" ||
      Array.isArray(rawInv.containerPuzzles)
    ) {
      throw new TamperError("containerPuzzles record invalid");
    }
    for (const [cid, rawLock] of Object.entries(rawInv.containerPuzzles)) {
      if (!cid || typeof rawLock !== "object" || rawLock === null || Array.isArray(rawLock)) {
        if (strict) throw new TamperError("Malformed container puzzle lock");
        continue;
      }
      const p = rawLock as Partial<ContainerPuzzleLockState>;
      if (
        typeof p.kind !== "string" ||
        !ALLOWED_PUZZLE_KINDS.has(p.kind) ||
        typeof p.seed !== "number" ||
        !Number.isInteger(p.seed) ||
        p.seed < 1 ||
        p.seed > 0x7fffffff
      ) {
        if (strict) throw new TamperError("Invalid container puzzle lock fields");
        continue;
      }
      if (expiredContainerIds.has(cid) || validatedContainers[cid]) {
        continue;
      }
      validatedContainerPuzzles[cid] = {
        kind: p.kind,
        seed: p.seed,
      };
    }
  }

  const rawProfile = (obj.profile ?? {}) as Partial<SavedPlayerProfile>;
  const px =
    typeof rawProfile.x === "number" && Number.isFinite(rawProfile.x)
      ? Math.max(0, Math.min(WORLD_WIDTH, rawProfile.x))
      : strict
        ? (() => {
            throw new TamperError("Invalid player X coordinate");
          })()
        : spawnX;
  const py =
    typeof rawProfile.y === "number" && Number.isFinite(rawProfile.y)
      ? Math.max(0, Math.min(WORLD_HEIGHT, rawProfile.y))
      : strict
        ? (() => {
            throw new TamperError("Invalid player Y coordinate");
          })()
        : spawnY;

  const skinId: CharacterSkinId =
    rawProfile.skinId && ALLOWED_SKINS.has(rawProfile.skinId)
      ? rawProfile.skinId
      : strict
        ? (() => {
            throw new TamperError("Invalid character skin");
          })()
        : "samurai_blue";

  const facing: FacingDir =
    rawProfile.facing && ALLOWED_FACINGS.has(rawProfile.facing)
      ? rawProfile.facing
      : strict
        ? (() => {
            throw new TamperError("Invalid facing direction");
          })()
        : "down";

  const activeMapId: MapId =
    rawProfile.activeMapId === undefined
      ? "vietnam"
      : rawProfile.activeMapId === "vietnam" || rawProfile.activeMapId === "japan"
        ? rawProfile.activeMapId
        : strict
          ? (() => {
              throw new TamperError("Invalid activeMapId");
            })()
          : "vietnam";

  const discoveredLandmarkIds = Array.isArray(rawProfile.discoveredLandmarkIds)
    ? Array.from(
        new Set(rawProfile.discoveredLandmarkIds.filter((id): id is string => typeof id === "string" && id.length > 0)),
      )
    : [];

  // Validate owned & equipped pets early so pet passive bonuses (e.g. stamina) are verified with survival vitals
  const ownedPetSet = new Set<string>();
  if (Array.isArray(obj.ownedPetIds)) {
    for (const id of obj.ownedPetIds) {
      if (typeof id === "string" && PET_BY_ID[id]) {
        ownedPetSet.add(id);
      }
    }
  }
  const equippedPetId =
    typeof obj.equippedPetId === "string" && ownedPetSet.has(obj.equippedPetId)
      ? obj.equippedPetId
      : null;
  const petStaminaPct = equippedPetId ? (PET_BY_ID[equippedPetId]?.bonuses.staminaPct ?? 0) : 0;

  // Validate survival vitals + optional temporary stamina buff
  let survival = createDefaultSurvivalState();
  if (obj.survival !== undefined) {
    if (!obj.survival || typeof obj.survival !== "object") {
      throw new TamperError("Invalid survival object");
    }
    const s = obj.survival as Partial<SurvivalState>;
    let validatedBuff: StaminaBuffState | null = null;
    if (s.staminaBuff !== undefined && s.staminaBuff !== null) {
      if (typeof s.staminaBuff !== "object") {
        throw new TamperError("Invalid staminaBuff object");
      }
      const b = s.staminaBuff as Partial<StaminaBuffState>;
      if (
        typeof b.boostPct !== "number" ||
        !Number.isInteger(b.boostPct) ||
        b.boostPct < 1 ||
        b.boostPct > 80 ||
        typeof b.expiresAt !== "number" ||
        !Number.isFinite(b.expiresAt) ||
        b.expiresAt > now + 660_000
      ) {
        throw new TamperError("Stamina buff invariant violated");
      }
      if (b.expiresAt > now) {
        validatedBuff = { boostPct: b.boostPct, expiresAt: b.expiresAt };
      }
    }
    const permanentGymPct = GYM_BY_ID[validatedGym.id]?.bonusPct ?? 0;
    const activeBuffPct = validatedBuff ? validatedBuff.boostPct : 0;
    // Allow a grace window for stamina decaying after a valid boost recently expired
    const rawBuff = s.staminaBuff as Partial<StaminaBuffState> | null | undefined;
    const graceBuffPct =
      activeBuffPct > 0
        ? activeBuffPct
        : (rawBuff &&
            typeof rawBuff.boostPct === "number" &&
            rawBuff.boostPct >= 1 &&
            rawBuff.boostPct <= 80 &&
            typeof rawBuff.expiresAt === "number" &&
            rawBuff.expiresAt > now - 180_000
            ? rawBuff.boostPct
            : 0);
    const maxAllowedStamina = 100 + permanentGymPct + petStaminaPct + graceBuffPct;
    if (
      typeof s.hp !== "number" ||
      !Number.isFinite(s.hp) ||
      s.hp < 0 ||
      s.hp > 100 ||
      typeof s.hunger !== "number" ||
      !Number.isFinite(s.hunger) ||
      s.hunger < 0 ||
      s.hunger > 100 ||
      typeof s.stamina !== "number" ||
      !Number.isFinite(s.stamina) ||
      s.stamina < 0 ||
      s.stamina > maxAllowedStamina ||
      typeof s.bodyTempC !== "number" ||
      !Number.isFinite(s.bodyTempC) ||
      s.bodyTempC < 33.5 ||
      s.bodyTempC > 41.5
    ) {
      throw new TamperError("Survival invariant bounds violated");
    }
    const currentActiveCap = 100 + permanentGymPct + petStaminaPct + activeBuffPct;
    const cleanStamina = Math.min(s.stamina, currentActiveCap);
    survival = {
      hp: s.hp,
      hunger: s.hunger,
      stamina: cleanStamina,
      bodyTempC: s.bodyTempC,
      staminaBuff: validatedBuff,
    };
  }

  // Validate equipped garments per slot (physical item worn on body)
  let equipment = createDefaultEquippedGear();
  if (obj.equipment !== undefined) {
    if (!obj.equipment || typeof obj.equipment !== "object") {
      throw new TamperError("Invalid equipment object");
    }
    const eq = obj.equipment as Partial<Record<EquipmentSlot, unknown>>;
    const slots: readonly EquipmentSlot[] = ["hat", "torso", "legs", "feet", "accessory"];
    const validatedEq = createDefaultEquippedGear();
    for (const slot of slots) {
      const val = eq[slot];
      if (val === null || val === undefined) {
        validatedEq[slot] = null;
        continue;
      }
      if (typeof val !== "string" || !GARMENT_BY_ID[val] || GARMENT_BY_ID[val].slot !== slot) {
        throw new TamperError(`Invalid garment equipped in slot ${slot}`);
      }
      validatedEq[slot] = val;
    }
    equipment = validatedEq;
  }

  const savedOutfits: SavedOutfitPreset[] = [];
  if (obj.savedOutfits !== undefined) {
    if (!Array.isArray(obj.savedOutfits)) {
      throw new TamperError("Invalid savedOutfits array");
    }
    if (strict && obj.savedOutfits.length > MAX_SAVED_OUTFIT_PRESETS) {
      throw new TamperError("Saved outfit limit exceeded");
    }
    const slots: readonly EquipmentSlot[] = ["hat", "torso", "legs", "feet", "accessory"];
    for (const rawPreset of obj.savedOutfits.slice(0, MAX_SAVED_OUTFIT_PRESETS)) {
      if (!rawPreset || typeof rawPreset !== "object") {
        if (strict) throw new TamperError("Malformed saved outfit preset");
        continue;
      }
      const p = rawPreset as Partial<SavedOutfitPreset>;
      if (
        typeof p.id !== "string" ||
        p.id.length === 0 ||
        typeof p.name !== "string" ||
        p.name.trim().length === 0 ||
        typeof p.savedAt !== "number" ||
        !Number.isFinite(p.savedAt) ||
        !p.gear ||
        typeof p.gear !== "object"
      ) {
        if (strict) throw new TamperError("Invalid saved outfit fields");
        continue;
      }
      const gear: EquippedGear = {
        hat: null,
        torso: null,
        legs: null,
        feet: null,
        accessory: null,
      };
      let validPresetGear = true;
      for (const slot of slots) {
        const val = (p.gear as Partial<Record<EquipmentSlot, unknown>>)[slot];
        if (val === null || val === undefined) continue;
        const gDef = typeof val === "string" ? GARMENT_BY_ID[val] : undefined;
        if (!gDef || gDef.slot !== slot || gDef.excludeFromShop) {
          if (strict) throw new TamperError(`Invalid preset garment in slot ${slot}`);
          validPresetGear = false;
          break;
        }
        gear[slot] = gDef.id;
      }
      if (!validPresetGear || !Object.values(gear).some(Boolean)) continue;
      savedOutfits.push({
        id: p.id.slice(0, 40),
        name: p.name.trim().slice(0, 42),
        gear,
        savedAt: p.savedAt,
      });
    }
  }

  const allowedHairIds = new Set(HAIR_OPTIONS.map((h) => h.id));
  const ownedHairSet = new Set<string>(DEFAULT_OWNED_HAIR_IDS);
  if (obj.ownedHairIds !== undefined) {
    if (!Array.isArray(obj.ownedHairIds)) {
      throw new TamperError("Invalid ownedHairIds");
    }
    for (const id of obj.ownedHairIds) {
      if (typeof id !== "string" || !HAIR_BY_ID[id]) {
        if (strict) throw new TamperError("Unknown owned hair id");
        continue;
      }
      ownedHairSet.add(id);
    }
  }

  let hairId =
    typeof obj.hairId === "string" && allowedHairIds.has(obj.hairId)
      ? obj.hairId
      : HAIR_OPTIONS[0].id;
  if (!ownedHairSet.has(hairId)) {
    if (obj.ownedHairIds !== undefined && strict) {
      throw new TamperError("Unowned hair equipped");
    }
    if (obj.ownedHairIds === undefined) {
      // Legacy save migration before Hair Salon purchase requirement
      ownedHairSet.add(hairId);
    } else {
      hairId = HAIR_OPTIONS[0].id;
    }
  }

  let gender: CharacterGender = "male";
  if (rawProfile.gender !== undefined) {
    if (rawProfile.gender !== "male" && rawProfile.gender !== "female") {
      if (strict) throw new TamperError("Invalid character gender");
    } else {
      gender = rawProfile.gender;
    }
  }

  let policeState: SavedPoliceState = {
    detainedUntil: 0,
    ignoreUntilByOfficer: {},
    globalIgnoreUntil: 0,
    pendingArrestOfficerId: null,
  };
  if (obj.policeState !== undefined) {
    if (!obj.policeState || typeof obj.policeState !== "object") {
      throw new TamperError("Invalid policeState object");
    }
    const ps = obj.policeState as Partial<SavedPoliceState>;
    const detainedUntil =
      typeof ps.detainedUntil === "number" && Number.isFinite(ps.detainedUntil) && ps.detainedUntil >= 0
        ? ps.detainedUntil
        : (() => {
            throw new TamperError("Invalid detainedUntil");
          })();
    if (strict && detainedUntil > now + 310_000) {
      throw new TamperError("detainedUntil out of valid 5-minute window");
    }
    let globalIgnoreUntil = 0;
    if (ps.globalIgnoreUntil !== undefined) {
      if (typeof ps.globalIgnoreUntil !== "number" || !Number.isFinite(ps.globalIgnoreUntil) || ps.globalIgnoreUntil < 0) {
        if (strict) throw new TamperError("Invalid globalIgnoreUntil");
      } else {
        if (strict && ps.globalIgnoreUntil > now + 130_000) {
          throw new TamperError("globalIgnoreUntil exceeds 2 minutes");
        }
        globalIgnoreUntil = ps.globalIgnoreUntil > now ? ps.globalIgnoreUntil : 0;
      }
    }
    const ignoreUntilByOfficer: Record<string, number> = {};
    if (ps.ignoreUntilByOfficer !== undefined) {
      if (!ps.ignoreUntilByOfficer || typeof ps.ignoreUntilByOfficer !== "object") {
        throw new TamperError("Invalid ignoreUntilByOfficer");
      }
      for (const [oid, exp] of Object.entries(ps.ignoreUntilByOfficer)) {
        if (typeof exp !== "number" || !Number.isFinite(exp) || exp < 0) {
          if (strict) throw new TamperError("Invalid officer ignore timestamp");
          continue;
        }
        if (strict && exp > now + 610_000) {
          throw new TamperError("Officer ignore duration exceeds 10 minutes");
        }
        if (exp > now) {
          ignoreUntilByOfficer[oid] = exp;
        }
      }
    }
    const pendingArrestOfficerId =
      ps.pendingArrestOfficerId === null || ps.pendingArrestOfficerId === undefined
        ? null
        : typeof ps.pendingArrestOfficerId === "string" && ps.pendingArrestOfficerId.length > 0
          ? ps.pendingArrestOfficerId
          : (() => {
              throw new TamperError("Invalid pendingArrestOfficerId");
            })();
    policeState = {
      detainedUntil: detainedUntil > now ? detainedUntil : 0,
      ignoreUntilByOfficer,
      globalIgnoreUntil,
      pendingArrestOfficerId,
    };
  }

  let questBoard: DailyQuestBoardState | undefined;
  if (obj.questBoard !== undefined && obj.questBoard !== null) {
    if (typeof obj.questBoard !== "object") {
      throw new TamperError("Invalid questBoard object");
    }
    const qb = obj.questBoard as Partial<DailyQuestBoardState>;
    if (
      typeof qb.epochIndex !== "number" ||
      !Number.isInteger(qb.epochIndex) ||
      qb.epochIndex < 0 ||
      typeof qb.nextRefreshAt !== "number" ||
      qb.nextRefreshAt !== (qb.epochIndex + 1) * QUEST_REFRESH_INTERVAL_MS ||
      typeof qb.rerollCount !== "number" ||
      !Number.isInteger(qb.rerollCount) ||
      qb.rerollCount < 0 ||
      qb.rerollCount > 100 ||
      (qb.mapId !== "vietnam" && qb.mapId !== "japan") ||
      !Array.isArray(qb.quests) ||
      qb.quests.length < 3 ||
      qb.quests.length > 5
    ) {
      throw new TamperError("questBoard metadata invariant violated");
    }
    const validQuests: DailyQuestEntry[] = [];
    for (const rawQ of qb.quests) {
      if (!rawQ || typeof rawQ !== "object") {
        throw new TamperError("Invalid quest entry");
      }
      const q = rawQ as Partial<DailyQuestEntry>;
      if (
        typeof q.id !== "string" ||
        (q.kind !== "deliver" && q.kind !== "explore" && q.kind !== "minigame") ||
        typeof q.title !== "string" ||
        typeof q.description !== "string" ||
        typeof q.difficultyScore !== "number" ||
        !Number.isFinite(q.difficultyScore) ||
        q.difficultyScore < 0 ||
        q.difficultyScore > 15 ||
        typeof q.targetCount !== "number" ||
        !Number.isInteger(q.targetCount) ||
        q.targetCount < 1 ||
        q.targetCount > 10 ||
        typeof q.progress !== "number" ||
        !Number.isInteger(q.progress) ||
        q.progress < 0 ||
        q.progress > q.targetCount ||
        typeof q.claimed !== "boolean" ||
        !q.reward ||
        typeof q.reward !== "object" ||
        typeof q.reward.gold !== "number" ||
        !Number.isInteger(q.reward.gold) ||
        q.reward.gold < 0 ||
        q.reward.gold > 3500 ||
        typeof q.reward.itemQty !== "number" ||
        !Number.isInteger(q.reward.itemQty) ||
        q.reward.itemQty < 0 ||
        q.reward.itemQty > 5 ||
        (q.reward.itemId !== null && (typeof q.reward.itemId !== "string" || !ITEM_BY_ID[q.reward.itemId]))
      ) {
        throw new TamperError("questEntry invariant violated");
      }
      validQuests.push({
        id: q.id,
        kind: q.kind,
        title: q.title,
        description: q.description,
        difficultyScore: q.difficultyScore,
        ...(q.targetItemId ? { targetItemId: q.targetItemId } : {}),
        ...(q.exploreTarget ? { exploreTarget: q.exploreTarget } : {}),
        targetCount: q.targetCount,
        progress: q.progress,
        claimed: q.claimed,
        reward: {
          gold: q.reward.gold,
          itemId: q.reward.itemId,
          itemQty: q.reward.itemQty,
          categoryLabel: q.reward.categoryLabel ?? "Tiền",
        },
      });
    }
    if (now < qb.nextRefreshAt) {
      questBoard = {
        epochIndex: qb.epochIndex,
        nextRefreshAt: qb.nextRefreshAt,
        rerollCount: qb.rerollCount,
        mapId: qb.mapId,
        quests: validQuests,
      };
    }
  }

  let reputation: ReputationState | undefined;
  if (obj.reputation !== undefined && obj.reputation !== null) {
    if (typeof obj.reputation !== "object") {
      throw new TamperError("Invalid reputation object");
    }
    const rep = obj.reputation as Partial<ReputationState>;
    const repNum = (v: unknown, label: string): number => {
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
        throw new TamperError(`Invalid reputation.${label}`);
      }
      return Math.floor(v);
    };
    const rawClaimed = Array.isArray(rep.claimedIds) ? rep.claimedIds : [];
    const claimedSet = new Set<string>();
    for (const id of rawClaimed) {
      if (typeof id === "string" && REPUTATION_MILESTONE_BY_ID[id]) {
        claimedSet.add(id);
      }
    }
    reputation = {
      points: repNum(rep.points ?? 0, "points"),
      peakGold: Math.max(gold, repNum(rep.peakGold ?? 0, "peakGold")),
      dailyQuestsCompleted: repNum(rep.dailyQuestsCompleted ?? 0, "dailyQuestsCompleted"),
      homeUpgradesCompleted: repNum(rep.homeUpgradesCompleted ?? 0, "homeUpgradesCompleted"),
      rareItemsLooted: repNum(rep.rareItemsLooted ?? 0, "rareItemsLooted"),
      redItemsLooted: repNum(rep.redItemsLooted ?? 0, "redItemsLooted"),
      minigamesWon: repNum(rep.minigamesWon ?? 0, "minigamesWon"),
      consumablesUsed: repNum(rep.consumablesUsed ?? 0, "consumablesUsed"),
      claimedIds: Array.from(claimedSet),
    };
  }

  const validateEstateForMap = (rawObj: unknown, mapId: MapId): PlayerEstateState => {
    const defOrigin = getDefaultEstateLotOrigin(mapId);
    if (!rawObj || typeof rawObj !== "object" || Array.isArray(rawObj)) {
      return createDefaultPlayerEstateState(mapId);
    }
    const rawEstate = rawObj as Partial<PlayerEstateState>;
    const plotTier =
      typeof rawEstate.plotTier === "number" &&
      Number.isInteger(rawEstate.plotTier) &&
      rawEstate.plotTier >= 0 &&
      rawEstate.plotTier <= 4
        ? rawEstate.plotTier
        : strict
          ? (() => {
              throw new TamperError(`Invalid ${mapId} estate.plotTier`);
            })()
          : 0;

    let houseId: string | null = null;
    if (typeof rawEstate.houseId === "string" && HOUSE_MODELS[rawEstate.houseId]) {
      const model = HOUSE_MODELS[rawEstate.houseId];
      if (strict && model.tier > plotTier) {
        throw new TamperError("House model tier exceeds owned plot tier");
      }
      if (model.tier <= plotTier) {
        houseId = rawEstate.houseId;
      }
    } else if (rawEstate.houseId !== null && rawEstate.houseId !== undefined && strict) {
      throw new TamperError("Invalid estate.houseId");
    }

    const purchasedAt =
      typeof rawEstate.purchasedAt === "number" && Number.isFinite(rawEstate.purchasedAt) && rawEstate.purchasedAt >= 0
        ? rawEstate.purchasedAt
        : 0;

    const lastDividendDay =
      typeof rawEstate.lastDividendDay === "number" && Number.isFinite(rawEstate.lastDividendDay) && rawEstate.lastDividendDay >= 0
        ? rawEstate.lastDividendDay
        : 0;

    const ownerName =
      typeof rawEstate.ownerName === "string" ? rawEstate.ownerName.trim().slice(0, 40) : undefined;

    let ownedTileIndices: number[] = [];
    if (Array.isArray(rawEstate.ownedTileIndices)) {
      const tileSet = new Set<number>();
      for (const item of rawEstate.ownedTileIndices) {
        if (typeof item === "number" && Number.isInteger(item) && item >= 0 && item <= 15) {
          tileSet.add(item);
        } else if (strict) {
          throw new TamperError("Invalid estate.ownedTileIndices entry");
        }
      }
      ownedTileIndices = Array.from(tileSet).sort((a, b) => a - b);
    } else if (plotTier > 0) {
      if (plotTier === 1) ownedTileIndices = [0];
      else if (plotTier === 2) ownedTileIndices = [0, 1, 4, 5];
      else if (plotTier === 3) ownedTileIndices = [0, 1, 2, 4, 5, 6, 8, 9, 10];
      else if (plotTier === 4) ownedTileIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    }

    let ownedWorldTiles: string[] = [];
    if (Array.isArray(rawEstate.ownedWorldTiles)) {
      const worldTileSet = new Set<string>();
      for (const item of rawEstate.ownedWorldTiles) {
        if (typeof item === "string") {
          const parsed = parseWorldTileKey(item);
          if (parsed && isPurchasableEstateTile(parsed.c, parsed.r, mapId)) {
            worldTileSet.add(makeWorldTileKey(parsed.c, parsed.r));
          } else if (strict) {
            throw new TamperError("Invalid estate.ownedWorldTiles entry");
          }
        } else if (strict) {
          throw new TamperError("Invalid estate.ownedWorldTiles type");
        }
      }
      ownedWorldTiles = Array.from(worldTileSet).sort();
    } else if (ownedTileIndices.length > 0 && mapId === "vietnam") {
      const migrated = new Set<string>();
      for (const idx of ownedTileIndices) {
        const c = LEGACY_DEFAULT_LOT_COL + (idx % 4);
        const r = LEGACY_DEFAULT_LOT_ROW + Math.floor(idx / 4);
        if (isPurchasableEstateTile(c, r, "vietnam")) {
          migrated.add(makeWorldTileKey(c, r));
        }
      }
      ownedWorldTiles = Array.from(migrated).sort();
    }

    let houseOrigin: { c: number; r: number } = { c: defOrigin.c, r: defOrigin.r };
    if (rawEstate.houseOrigin && typeof rawEstate.houseOrigin === "object") {
      const rawC = (rawEstate.houseOrigin as { c?: unknown; r?: unknown }).c;
      const rawR = (rawEstate.houseOrigin as { c?: unknown; r?: unknown }).r;
      const c =
        typeof rawC === "number" && Number.isInteger(rawC) && rawC >= 0 && rawC <= 35
          ? rawC
          : defOrigin.c;
      const r =
        typeof rawR === "number" && Number.isInteger(rawR) && rawR >= 0 && rawR <= 80
          ? rawR
          : defOrigin.r;
      houseOrigin = { c, r };
    }

    return {
      plotTier,
      houseId,
      purchasedAt,
      lastDividendDay,
      ownerName,
      ownedTileIndices,
      ownedWorldTiles,
      houseOrigin,
    };
  };

  const validatedEstate = validateEstateForMap(obj.estate, "vietnam");
  const validatedJpEstate = validateEstateForMap(obj.jpEstate, "japan");

  let dungeonState: SavedDungeonState = {
    cooldownUntil: 0,
    totalClears: 0,
    runsEntered: 0,
  };
  if (obj.dungeon !== undefined && obj.dungeon !== null) {
    if (typeof obj.dungeon !== "object" || Array.isArray(obj.dungeon)) {
      throw new TamperError("Invalid dungeon state");
    }
    const rawDung = obj.dungeon as Partial<SavedDungeonState>;
    if (
      typeof rawDung.cooldownUntil !== "number" ||
      !Number.isFinite(rawDung.cooldownUntil) ||
      rawDung.cooldownUntil < 0 ||
      rawDung.cooldownUntil > now + 3_600_000
    ) {
      throw new TamperError("Dungeon cooldown invariant violated");
    }
    if (
      typeof rawDung.totalClears !== "number" ||
      !Number.isInteger(rawDung.totalClears) ||
      rawDung.totalClears < 0 ||
      rawDung.totalClears > 100_000
    ) {
      throw new TamperError("Dungeon totalClears invariant violated");
    }
    if (
      typeof rawDung.runsEntered !== "number" ||
      !Number.isInteger(rawDung.runsEntered) ||
      rawDung.runsEntered < 0 ||
      rawDung.runsEntered > 100_000
    ) {
      throw new TamperError("Dungeon runsEntered invariant violated");
    }
    dungeonState = {
      cooldownUntil: rawDung.cooldownUntil > now ? rawDung.cooldownUntil : 0,
      totalClears: rawDung.totalClears,
      runsEntered: rawDung.runsEntered,
    };
  }

  return {
    schemaVersion: 3,
    inventory: {
      gold,
      backpackId,
      ownedBackpackIds: Array.from(ownedSet),
      backpackItems,
      torsoItems,
      legsItems,
      homeStorageId,
      homeItems,
      homeContract,
      jpHomeStorageId,
      jpHomeItems,
      jpHomeContract,
      homeGymId: validatedGym.id,
      homeGymContract: validatedGym.contract,
      homeTreadmillId: validatedTreadmill.id,
      homeTreadmillContract: validatedTreadmill.contract,
      auctionSlotsId: validatedAuction.id,
      auctionContract: validatedAuction.contract,
      safeboxId,
      safeboxItems,
      safeboxContract,
      collectionHall: validatedCollectionHall,
      jpCollectionHall: validatedJpCollectionHall,
      containers: validatedContainers,
      containerPuzzles: validatedContainerPuzzles,
      mythicPity,
      consecutiveJunk,
      nextUid,
    },
    profile: {
      x: px,
      y: py,
      facing,
      skinId,
      gender,
      activeMapId,
      onboardingDone:
        typeof rawProfile.onboardingDone === "boolean" ? rawProfile.onboardingDone : true,
      discoveredLandmarkIds,
      soundEnabled: typeof rawProfile.soundEnabled === "boolean" ? rawProfile.soundEnabled : true,
    },
    survival,
    equipment,
    hairId,
    ownedHairIds: Array.from(ownedHairSet),
    savedOutfits,
    policeState,
    ...(questBoard ? { questBoard } : {}),
    ...(reputation ? { reputation } : {}),
    ownedPetIds: Array.from(ownedPetSet),
    equippedPetId,
    estate: validatedEstate,
    jpEstate: validatedJpEstate,
    dungeon: dungeonState,
  };
}

/**
 * Cryptographic Player Save Vault:
 * - Stores non-extractable AES-256-GCM + HMAC-SHA-256 keys inside IndexedDB (`extractable: false`).
 * - Binds every save envelope with origin-scoped AAD, fresh random 96-bit IV, monotonic sequence
 *   anti-rollback anchor, and inner SHA-256 canonical payload checksum.
 * - Strictly forbids plaintext JSON persistence in `localStorage` and auto-resets on tamper.
 */
export class SaveVault {
  private readonly driver: VaultStorageDriver;
  private readonly spawnX: number;
  private readonly spawnY: number;
  private readonly origin: string;
  private readonly remoteSync?: VaultRemoteSyncAdapter;

  private keys!: StoredMasterKeys;
  private currentSeq = 0;
  private writeQueue: Promise<void> = Promise.resolve();
  private debounceTimer: number | null = null;
  private pendingSnapshot: PlayerGameSaveV3 | null = null;

  private constructor(
    driver: VaultStorageDriver,
    spawnX: number,
    spawnY: number,
    remoteSync?: VaultRemoteSyncAdapter,
  ) {
    this.driver = driver;
    this.spawnX = spawnX;
    this.spawnY = spawnY;
    this.origin = getRuntimeOrigin();
    this.remoteSync = remoteSync;
  }

  public static async open(options: {
    spawnX: number;
    spawnY: number;
    driver?: VaultStorageDriver;
    remoteSync?: VaultRemoteSyncAdapter;
  }): Promise<{ vault: SaveVault; initial: SaveLoadResult }> {
    const driver = options.driver ?? new IndexedDBVaultDriver();
    const vault = new SaveVault(driver, options.spawnX, options.spawnY, options.remoteSync);
    const initial = await vault.initializeAndLoad();
    return { vault, initial };
  }

  public getCryptoMode(): "webcrypto" | "lan-fallback" {
    return this.keys.mode;
  }

  private async initializeAndLoad(): Promise<SaveLoadResult> {
    const useWebCrypto = hasWebCryptoSubtle();
    if (!useWebCrypto) {
      console.warn(
        "[SaveVault] HTTP LAN origin lacks window.crypto.subtle; activating pure-TS authenticated cipher fallback.",
      );
    }

    const storedKeys = await this.driver.readKeys();
    const existingRecord = await this.driver.readSave();
    let keyWasReset = false;

    if (storedKeys && this.areKeysValidForRuntime(storedKeys, useWebCrypto)) {
      this.keys = storedKeys;
    } else {
      if (existingRecord.envelope || existingRecord.anchor) {
        keyWasReset = true;
      }
      await this.driver.clearAll();
      this.keys = await this.generateKeys(useWebCrypto);
      await this.driver.writeKeys(this.keys);
    }

    const afterKeyRecord = keyWasReset ? { envelope: null, anchor: null } : existingRecord;
    if (afterKeyRecord.envelope || afterKeyRecord.anchor) {
      try {
        if (!afterKeyRecord.envelope || !afterKeyRecord.anchor) {
          throw new TamperError("Incomplete save/anchor pair");
        }
        const verified = await this.decryptAndVerifyEnvelope(
          afterKeyRecord.envelope,
          afterKeyRecord.anchor,
          useWebCrypto,
        );
        this.currentSeq = afterKeyRecord.envelope.seq;
        this.purgeLegacyPlaintext();
        return {
          save: verified,
          tamperDetected: false,
          migratedLegacy: false,
          isNewGame: false,
        };
      } catch {
        const minSeq = Math.max(
          afterKeyRecord.anchor?.seq ?? 0,
          afterKeyRecord.envelope?.seq ?? 0,
        );
        this.currentSeq = minSeq;
        await this.driver.clearSaveData();
        const fresh = createDefaultGameSave(this.spawnX, this.spawnY);
        await this.saveNow(fresh);
        this.purgeLegacyPlaintext();
        return {
          save: fresh,
          tamperDetected: true,
          migratedLegacy: false,
          isNewGame: true,
        };
      }
    }

    if (keyWasReset) {
      const fresh = createDefaultGameSave(this.spawnX, this.spawnY);
      await this.saveNow(fresh);
      this.purgeLegacyPlaintext();
      return { save: fresh, tamperDetected: true, migratedLegacy: false, isNewGame: true };
    }

    const migrated = this.tryReadLegacyPlaintext();
    if (migrated) {
      await this.saveNow(migrated);
      this.purgeLegacyPlaintext();
      return { save: migrated, tamperDetected: false, migratedLegacy: true, isNewGame: false };
    }

    const fresh = createDefaultGameSave(this.spawnX, this.spawnY);
    await this.saveNow(fresh);
    return { save: fresh, tamperDetected: false, migratedLegacy: false, isNewGame: true };
  }

  private areKeysValidForRuntime(keys: StoredMasterKeys, useWebCrypto: boolean): boolean {
    if (useWebCrypto) {
      return (
        keys.mode === "webcrypto" &&
        keys.encKey instanceof CryptoKey &&
        keys.macKey instanceof CryptoKey &&
        keys.encKey.extractable === false &&
        keys.macKey.extractable === false
      );
    }
    return (
      keys.mode === "lan-fallback" &&
      typeof keys.encSecretB64 === "string" &&
      keys.encSecretB64.length >= 20 &&
      typeof keys.macSecretB64 === "string" &&
      keys.macSecretB64.length >= 20
    );
  }

  private async generateKeys(useWebCrypto: boolean): Promise<StoredMasterKeys> {
    if (useWebCrypto) {
      const subtle = globalThis.crypto.subtle;
      // Non-extractable keys cannot be exported via crypto.subtle.exportKey in DevTools
      const [encKey, macKey] = await Promise.all([
        subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]),
        subtle.generateKey({ name: "HMAC", hash: "SHA-256", length: 256 }, false, ["sign", "verify"]),
      ]);
      return { mode: "webcrypto", encKey, macKey };
    }
    return {
      mode: "lan-fallback",
      encSecretB64: bytesToBase64(randomBytes(32)),
      macSecretB64: bytesToBase64(randomBytes(32)),
    };
  }

  private tryReadLegacyPlaintext(): PlayerGameSaveV3 | null {
    try {
      const storage = globalThis.localStorage;
      if (!storage) return null;
      const raw = storage.getItem(LEGACY_PLAINTEXT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      return validateSavePayload(
        {
          schemaVersion: 3,
          inventory: parsed,
          profile: createDefaultGameSave(this.spawnX, this.spawnY).profile,
        },
        this.spawnX,
        this.spawnY,
        false,
      );
    } catch {
      return null;
    }
  }

  private purgeLegacyPlaintext(): void {
    try {
      globalThis.localStorage?.removeItem(LEGACY_PLAINTEXT_KEY);
    } catch {
      // Ignore storage access restrictions
    }
  }

  public scheduleSave(snapshot: PlayerGameSaveV3, immediate = false): void {
    this.pendingSnapshot = snapshot;
    if (this.debounceTimer !== null) {
      globalThis.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (immediate) {
      const target = this.pendingSnapshot;
      this.pendingSnapshot = null;
      void this.saveNow(target);
      return;
    }

    this.debounceTimer = globalThis.setTimeout(() => {
      this.debounceTimer = null;
      if (this.pendingSnapshot) {
        const target = this.pendingSnapshot;
        this.pendingSnapshot = null;
        void this.saveNow(target);
      }
    }, 150);
  }

  public flushPending(fallbackSnapshot?: PlayerGameSaveV3): Promise<void> {
    if (this.debounceTimer !== null) {
      globalThis.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    const target = this.pendingSnapshot ?? fallbackSnapshot;
    this.pendingSnapshot = null;
    if (target) {
      return this.saveNow(target);
    }
    return this.writeQueue;
  }

  public saveNow(snapshot: PlayerGameSaveV3): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      const clean = validateSavePayload(snapshot, this.spawnX, this.spawnY, true);
      const envelope = await this.encryptAndSignSave(clean);
      const anchor = await this.computeSeqAnchor(envelope);
      await this.driver.writeSaveAtomic(envelope, anchor);
      if (this.remoteSync?.syncEncryptedSave) {
        await this.remoteSync.syncEncryptedSave(envelope).catch(() => {});
      }
    });
    return this.writeQueue;
  }

  public async resetToFreshSave(): Promise<PlayerGameSaveV3> {
    if (this.debounceTimer !== null) {
      globalThis.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingSnapshot = null;
    const fresh = createDefaultGameSave(this.spawnX, this.spawnY);
    this.writeQueue = this.writeQueue.then(async () => {
      await this.driver.clearSaveData();
      this.purgeLegacyPlaintext();
      const clean = validateSavePayload(fresh, this.spawnX, this.spawnY, true);
      const envelope = await this.encryptAndSignSave(clean);
      const anchor = await this.computeSeqAnchor(envelope);
      await this.driver.writeSaveAtomic(envelope, anchor);
    });
    await this.writeQueue;
    return fresh;
  }

  private async sha256B64(input: Uint8Array): Promise<string> {
    if (hasWebCryptoSubtle()) {
      const digest = await globalThis.crypto.subtle.digest("SHA-256", toArrayBuffer(input));
      return bytesToBase64(new Uint8Array(digest));
    }
    return bytesToBase64(sha256Fallback(input));
  }

  private async computeSeqAnchor(envelope: SaveEnvelopeV3): Promise<SeqAnchorRecord> {
    const anchorMaterial = utf8Encode(
      `${APP_AAD_PREFIX}|${this.origin}|${envelope.seq}|${envelope.mac}|${envelope.savedAt}`,
    );
    return {
      seq: envelope.seq,
      anchorDigest: await this.sha256B64(anchorMaterial),
    };
  }

  private async encryptAndSignSave(payload: PlayerGameSaveV3): Promise<SaveEnvelopeV3> {
    const innerDigest = await this.sha256B64(utf8Encode(canonicalJson(payload)));
    const innerBytes = utf8Encode(JSON.stringify({ payload, digest: innerDigest }));

    this.currentSeq += 1;
    const seq = this.currentSeq;
    const savedAt = Date.now();
    const aad = `${APP_AAD_PREFIX}|${this.origin}|v3|${seq}|${savedAt}`;
    const aadBytes = utf8Encode(aad);
    const iv = randomBytes(12);
    const ivB64 = bytesToBase64(iv);

    let ctB64 = "";
    let macB64 = "";

    if (this.keys.mode === "webcrypto") {
      const subtle = globalThis.crypto.subtle;
      const cipherBuf = await subtle.encrypt(
        {
          name: "AES-GCM",
          iv: toArrayBuffer(iv),
          additionalData: toArrayBuffer(aadBytes),
          tagLength: 128,
        },
        this.keys.encKey,
        toArrayBuffer(innerBytes),
      );
      ctB64 = bytesToBase64(new Uint8Array(cipherBuf));
      const macInput = utf8Encode(`webcrypto|3|${seq}|${savedAt}|${aad}|${ivB64}|${ctB64}`);
      const sigBuf = await subtle.sign("HMAC", this.keys.macKey, toArrayBuffer(macInput));
      macB64 = bytesToBase64(new Uint8Array(sigBuf));
      return {
        v: 3,
        mode: "webcrypto",
        seq,
        savedAt,
        iv: ivB64,
        aad,
        ct: ctB64,
        mac: macB64,
      };
    }

    const encKey = base64ToBytes(this.keys.encSecretB64);
    const macKey = base64ToBytes(this.keys.macSecretB64);
    const cipherBytes = streamXorFallback(encKey, iv, aadBytes, innerBytes);
    ctB64 = bytesToBase64(cipherBytes);
    const macInput = utf8Encode(`lan-fallback|3|${seq}|${savedAt}|${aad}|${ivB64}|${ctB64}`);
    macB64 = bytesToBase64(hmacSha256Fallback(macKey, macInput));
    return {
      v: 3,
      mode: "lan-fallback",
      seq,
      savedAt,
      iv: ivB64,
      aad,
      ct: ctB64,
      mac: macB64,
    };
  }

  private async decryptAndVerifyEnvelope(
    envelope: SaveEnvelopeV3,
    anchor: SeqAnchorRecord,
    useWebCrypto: boolean,
  ): Promise<PlayerGameSaveV3> {
    if (
      envelope.v !== 3 ||
      !Number.isInteger(envelope.seq) ||
      envelope.seq < 1 ||
      typeof envelope.savedAt !== "number" ||
      typeof envelope.iv !== "string" ||
      typeof envelope.aad !== "string" ||
      typeof envelope.ct !== "string" ||
      typeof envelope.mac !== "string"
    ) {
      throw new TamperError("Invalid envelope header");
    }

    if (useWebCrypto && envelope.mode !== "webcrypto") {
      throw new TamperError("Cipher downgrade blocked in secure context");
    }
    if (envelope.mode !== this.keys.mode) {
      throw new TamperError("Envelope cipher mode mismatch");
    }

    const expectedAad = `${APP_AAD_PREFIX}|${this.origin}|v3|${envelope.seq}|${envelope.savedAt}`;
    if (envelope.aad !== expectedAad) {
      throw new TamperError("AAD origin or version mismatch");
    }

    if (envelope.seq < anchor.seq) {
      throw new TamperError("Rollback detected against monotonic sequence anchor");
    }
    const expectedAnchor = await this.computeSeqAnchor(envelope);
    if (expectedAnchor.anchorDigest !== anchor.anchorDigest || anchor.seq !== envelope.seq) {
      throw new TamperError("Sequence anchor digest mismatch");
    }

    const macBytes = base64ToBytes(envelope.mac);
    const ivBytes = base64ToBytes(envelope.iv);
    const ctBytes = base64ToBytes(envelope.ct);
    const aadBytes = utf8Encode(envelope.aad);

    let plaintextBytes: Uint8Array;

    if (this.keys.mode === "webcrypto") {
      const subtle = globalThis.crypto.subtle;
      const macInput = utf8Encode(
        `webcrypto|3|${envelope.seq}|${envelope.savedAt}|${envelope.aad}|${envelope.iv}|${envelope.ct}`,
      );
      const macOk = await subtle.verify(
        "HMAC",
        this.keys.macKey,
        toArrayBuffer(macBytes),
        toArrayBuffer(macInput),
      );
      if (!macOk) {
        throw new TamperError("HMAC signature invalid");
      }

      const plainBuf = await subtle.decrypt(
        {
          name: "AES-GCM",
          iv: toArrayBuffer(ivBytes),
          additionalData: toArrayBuffer(aadBytes),
          tagLength: 128,
        },
        this.keys.encKey,
        toArrayBuffer(ctBytes),
      );
      plaintextBytes = new Uint8Array(plainBuf);
    } else {
      const encKey = base64ToBytes(this.keys.encSecretB64);
      const macKey = base64ToBytes(this.keys.macSecretB64);
      const macInput = utf8Encode(
        `lan-fallback|3|${envelope.seq}|${envelope.savedAt}|${envelope.aad}|${envelope.iv}|${envelope.ct}`,
      );
      const expectedMac = hmacSha256Fallback(macKey, macInput);
      if (!constantTimeEqual(macBytes, expectedMac)) {
        throw new TamperError("Fallback HMAC signature invalid");
      }
      plaintextBytes = streamXorFallback(encKey, ivBytes, aadBytes, ctBytes);
    }

    const decoded = JSON.parse(utf8Decode(plaintextBytes)) as {
      payload?: unknown;
      digest?: unknown;
    };
    if (!decoded || typeof decoded !== "object" || typeof decoded.digest !== "string") {
      throw new TamperError("Decrypted envelope missing integrity digest");
    }

    const sanitized = validateSavePayload(decoded.payload, this.spawnX, this.spawnY, true);
    const recomputedDigest = await this.sha256B64(utf8Encode(canonicalJson(decoded.payload)));
    if (recomputedDigest !== decoded.digest) {
      throw new TamperError("Inner payload SHA-256 digest mismatch");
    }

    return sanitized;
  }
}
