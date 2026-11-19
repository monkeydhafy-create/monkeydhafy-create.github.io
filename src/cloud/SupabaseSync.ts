import { createClient, type RealtimeChannel, type Session, type SupabaseClient, type User } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./supabaseConfig.ts";
import type { PlayerGameSaveV3 } from "../security/SaveVault.ts";
import type { EquippedGear } from "../world/EquipmentCatalog.ts";
import type { ContainerLootState, GridItemInstance, LootSourceType } from "../world/LootSystem.ts";
import { MAP_COLS, MAP_ROWS, TILE_SIZE, type BiomeId, type CharacterGender, type CharacterSkinId, type FacingDir, type MapId, type SecurityZone } from "../world/types.ts";

export interface RemotePlayerEstateSummary {
  houseId: string | null;
  originC: number;
  originR: number;
  ownerName: string;
  ownedWorldTiles?: string[];
  displayedItems: Array<{ itemId: string; lightLevel: 0 | 1 | 2 }>;
}

export interface RemotePlayerAppearance {
  uid: string;
  name: string;
  skinId: CharacterSkinId;
  gender: CharacterGender;
  hairId: string;
  equipped: EquippedGear;
  equippedPetId: string | null;
  estate?: RemotePlayerEstateSummary | null;
  x?: number;
  y?: number;
  facing?: FacingDir;
}

export interface RemotePlayerMovePacket {
  uid: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  f: FacingDir;
  m: boolean;
}

export interface LiveStatePayload {
  user_id: string;
  map_id: MapId;
  x: number;
  y: number;
  facing: FacingDir;
  is_moving: boolean;
  hp: number;
  hunger: number;
  stamina: number;
  body_temp_c: number;
  skin_id: CharacterSkinId;
  gender: CharacterGender;
  hair_id: string;
  equipped_pet_id: string | null;
  session_id: string;
  updated_at?: string;
}

export interface CloudSyncStatus {
  authenticated: boolean;
  displayName: string;
  email: string;
  userId: string | null;
  realtimeState: "offline" | "connecting" | "connected" | "error";
  lastSyncAt: number | null;
  lastError: string | null;
  onlineSectorPlayers: number;
}

export interface AuctionListingRow {
  id: string;
  seller_id: string;
  seller_name: string;
  item_id: string;
  item_data: GridItemInstance;
  price_gold: number;
  status: "active" | "sold" | "cancelled" | "claimed";
  buyer_id: string | null;
  buyer_name: string | null;
  created_at: string;
  expires_at: string;
  sold_at: string | null;
}

export interface SupabaseSyncCallbacks {
  onStatusChanged?: (status: CloudSyncStatus) => void;
  onRemoteSaveReceived?: (save: PlayerGameSaveV3, seq: number) => void;
  onRemoteSelfLiveReceived?: (live: LiveStatePayload) => void;
  onRemotePlayersChanged?: (
    appearances: Map<string, RemotePlayerAppearance>,
    moves: Map<string, RemotePlayerMovePacket>,
  ) => void;
  onRemotePoliceChase?: (officerId: string, x: number, y: number, untilMs: number) => void;
  onSharedContainerUpdated?: (
    mapId: MapId,
    containerId: string,
    items: GridItemInstance[],
    version: number,
    openedAt: number,
    refreshAt: number,
    meta?: { title: string; sourceType: LootSourceType; biome: BiomeId; bulkSync?: boolean },
  ) => void;
  onSharedVaultUnlocked?: (payload: {
    mapId: MapId;
    containerId: string;
    unlockedByName: string;
    chestId?: string;
    container?: ContainerLootState;
  }) => void;
  onServerClockOffset?: (offsetMs: number) => void;
  onPersistentWorldEstatesChanged?: (
    estates: Map<string, RemotePlayerEstateSummary>,
    localUserId: string | null,
  ) => void;
}

const SECTOR_COLS = 4; // 204 / 4 = 51 tiles per sector horizontally
const SECTOR_ROWS = 2; // 84 / 2 = 42 tiles per sector vertically

export function computeWorldSectorKey(mapId: MapId, worldX: number, worldY: number): string {
  const col = Math.max(0, Math.min(MAP_COLS - 1, Math.floor(worldX / TILE_SIZE)));
  const row = Math.max(0, Math.min(MAP_ROWS - 1, Math.floor(worldY / TILE_SIZE)));
  const sx = Math.min(SECTOR_COLS - 1, Math.floor((col * SECTOR_COLS) / MAP_COLS));
  const sy = Math.min(SECTOR_ROWS - 1, Math.floor((row * SECTOR_ROWS) / MAP_ROWS));
  return `${mapId}:${sx}_${sy}`;
}

export function normalizeAccountEmail(rawInput: string): { email: string; displayName: string } {
  const trimmed = rawInput.trim();
  if (!trimmed) return { email: "", displayName: "" };
  if (trimmed.includes("@")) {
    return { email: trimmed.toLowerCase(), displayName: trimmed.split("@")[0] || trimmed };
  }
  const slug = trimmed.toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return {
    email: slug ? `${slug}@players.engbbq.me` : "",
    displayName: trimmed,
  };
}

export function formatAccountDisplayName(user: User | null): string {
  if (!user) return "Khách (Chưa liên kết)";
  const metaName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name.trim() : "";
  if (metaName) return metaName;
  const email = user.email ?? "";
  if (email.endsWith("@players.engbbq.me")) {
    return email.slice(0, -"@players.engbbq.me".length);
  }
  return email || user.id.slice(0, 8);
}

export class SupabaseSync {
  private readonly client: SupabaseClient;
  private readonly sessionId: string;
  private readonly guestId: string;
  private readonly callbacks: SupabaseSyncCallbacks;

  private user: User | null = null;
  private localSeq = 1;
  private lastAppliedRemoteSaveMs = 0;
  private lastSyncAt: number | null = null;
  private lastError: string | null = null;
  private realtimeState: CloudSyncStatus["realtimeState"] = "offline";

  private accountChannel: RealtimeChannel | null = null;
  private worldChannel: RealtimeChannel | null = null;
  private auctionChannel: RealtimeChannel | null = null;
  private estatesChannel: RealtimeChannel | null = null;
  private activeSectorKey: string | null = null;
  private readonly persistentWorldEstates = new Map<string, RemotePlayerEstateSummary>();

  private saveTimerId: number | null = null;
  private pendingSave: PlayerGameSaveV3 | null = null;
  private lastSelfMoveBroadcastAt = 0;
  private lastSelfDbPushAt = 0;
  private lastWorldMoveBroadcastAt = 0;
  private wasWorldMoving = false;
  private lastAppearanceSig = "";

  private readonly remoteAppearances = new Map<string, RemotePlayerAppearance>();
  private readonly remoteMoves = new Map<string, RemotePlayerMovePacket>();
  private latestLocalAppearance: RemotePlayerAppearance | null = null;
  private latestLocalLive: Omit<LiveStatePayload, "user_id" | "session_id" | "updated_at"> | null = null;

  constructor(callbacks: SupabaseSyncCallbacks = {}) {
    this.callbacks = callbacks;
    this.sessionId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `sess_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
    const randHex =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
    this.guestId = `guest_${randHex}`;

    this.client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 12,
        },
      },
    });
  }

  public isAuthenticated(): boolean {
    return this.user !== null;
  }

  public getUserId(): string | null {
    return this.user?.id ?? null;
  }

  public getActiveWorldPlayerId(): string {
    return this.user?.id ?? this.guestId;
  }

  public getActiveDisplayName(): string {
    return this.user ? formatAccountDisplayName(this.user) : `Khách #${this.guestId.slice(-4).toUpperCase()}`;
  }

  public getStatus(): CloudSyncStatus {
    return {
      authenticated: this.user !== null,
      displayName: formatAccountDisplayName(this.user),
      email: this.user?.email ?? "",
      userId: this.user?.id ?? null,
      realtimeState: this.realtimeState,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
      onlineSectorPlayers: this.remoteAppearances.size,
    };
  }

  private emitStatus(): void {
    this.callbacks.onStatusChanged?.(this.getStatus());
  }

  public async restoreSession(): Promise<{
    authenticated: boolean;
    remoteSave: PlayerGameSaveV3 | null;
    remoteSeq: number;
    remoteLive: LiveStatePayload | null;
  }> {
    void this.syncServerClock();
    const { data, error } = await this.client.auth.getSession();
    if (error || !data.session?.user) {
      this.user = null;
      this.realtimeState = "offline";
      const initMap = this.latestLocalLive?.map_id ?? "vietnam";
      const initX = this.latestLocalLive?.x ?? 936;
      const initY = this.latestLocalLive?.y ?? 2136;
      this.subscribeWorldSector(computeWorldSectorKey(initMap, initX, initY));
      this.emitStatus();
      return { authenticated: false, remoteSave: null, remoteSeq: 0, remoteLive: null };
    }

    return await this.activateUserSession(data.session);
  }

  public async syncServerClock(): Promise<void> {
    try {
      const t0 = Date.now();
      const { data, error } = await this.client.rpc("get_server_time_ms");
      const t1 = Date.now();
      if (!error && typeof data === "number" && Number.isFinite(data)) {
        const midpoint = Math.round((t0 + t1) / 2);
        this.callbacks.onServerClockOffset?.(data - midpoint);
      }
    } catch {
      // Optional clock sync; fall back to local clock when offline or schema not yet created
    }
  }

  public async signUpAndUpload(
    rawIdentifier: string,
    password: string,
    currentSave: PlayerGameSaveV3,
    appearance: Omit<RemotePlayerAppearance, "uid">,
  ): Promise<{ ok: boolean; message: string }> {
    const { email, displayName } = normalizeAccountEmail(rawIdentifier);
    if (!email) {
      return { ok: false, message: "Vui lòng nhập Tên tài khoản hoặc Email hợp lệ." };
    }
    if (password.length < 6) {
      return { ok: false, message: "Mật khẩu phải có ít nhất 6 ký tự." };
    }

    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });

    if (error) {
      return { ok: false, message: this.translateAuthError(error.message) };
    }

    if (!data.session || !data.user) {
      return {
        ok: false,
        message: "Tài khoản đã tạo nhưng cần xác nhận email trên Supabase Auth trước khi đồng bộ.",
      };
    }

    this.user = data.user;
    this.localSeq = Math.max(2, this.localSeq + 1);
    this.lastAppearanceSig = "";
    this.latestLocalAppearance = { ...appearance, uid: data.user.id, name: displayName };
    await this.client.realtime.setAuth(data.session.access_token);

    const pushRes = await this.upsertSaveImmediate(currentSave);
    await this.upsertLiveImmediate(currentSave);
    this.startRealtimeChannels(
      currentSave.profile.activeMapId === "japan" ? "japan" : "vietnam",
      currentSave.profile.x,
      currentSave.profile.y,
    );

    if (!pushRes.ok) {
      return {
        ok: true,
        message: `Đã tạo tài khoản ${displayName}, nhưng bảng Supabase chưa sẵn sàng (${pushRes.error}).`,
      };
    }

    return {
      ok: true,
      message: `Đã tạo tài khoản "${displayName}" và lưu toàn bộ dữ liệu hiện tại lên Cloud!`,
    };
  }

  public async signInAndLoad(
    rawIdentifier: string,
    password: string,
  ): Promise<{
    ok: boolean;
    message: string;
    remoteSave: PlayerGameSaveV3 | null;
    remoteLive: LiveStatePayload | null;
  }> {
    const { email } = normalizeAccountEmail(rawIdentifier);
    if (!email || !password) {
      return { ok: false, message: "Vui lòng nhập đầy đủ tài khoản và mật khẩu.", remoteSave: null, remoteLive: null };
    }

    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      return {
        ok: false,
        message: this.translateAuthError(error?.message ?? "Đăng nhập thất bại."),
        remoteSave: null,
        remoteLive: null,
      };
    }

    const activated = await this.activateUserSession(data.session);
    if (!activated.remoteSave) {
      return {
        ok: true,
        message: `Đã đăng nhập "${formatAccountDisplayName(this.user)}" (tài khoản chưa có bản lưu Cloud).`,
        remoteSave: null,
        remoteLive: activated.remoteLive,
      };
    }

    return {
      ok: true,
      message: `Đã tải dữ liệu tài khoản "${formatAccountDisplayName(this.user)}" và bật đồng bộ Realtime!`,
      remoteSave: activated.remoteSave,
      remoteLive: activated.remoteLive,
    };
  }

  public async signOut(): Promise<void> {
    // Đẩy bản lưu cuối cùng lên Cloud trước khi đăng xuất để tài khoản không mất dữ liệu
    if (this.pendingSave) {
      const toPush = this.pendingSave;
      this.pendingSave = null;
      if (this.saveTimerId !== null) {
        window.clearTimeout(this.saveTimerId);
        this.saveTimerId = null;
      }
      await this.upsertSaveImmediate(toPush);
    }
    if (this.latestLocalLive) {
      await this.pushLiveRow(this.latestLocalLive);
    }
    await this.stopRealtimeChannels();
    await this.client.auth.signOut();
    this.user = null;
    this.realtimeState = "offline";
    this.lastError = null;
    this.emitStatus();
    // Re-emit persistent world estates với localUserId = null để người chơi sau khi logout vẫn thấy nhà của tài khoản đã offline
    this.callbacks.onPersistentWorldEstatesChanged?.(this.persistentWorldEstates, null);
    void this.syncPersistentWorldEstates("vietnam");
  }

  private async activateUserSession(session: Session): Promise<{
    authenticated: boolean;
    remoteSave: PlayerGameSaveV3 | null;
    remoteSeq: number;
    remoteLive: LiveStatePayload | null;
  }> {
    this.user = session.user;
    this.lastAppearanceSig = "";
    if (this.latestLocalAppearance) {
      this.latestLocalAppearance = {
        ...this.latestLocalAppearance,
        uid: session.user.id,
        name: formatAccountDisplayName(session.user),
      };
    }
    this.realtimeState = "connecting";
    this.lastError = null;
    this.emitStatus();
    await this.client.realtime.setAuth(session.access_token);

    const [{ data: saveRow, error: saveErr }, { data: liveRow }] = await Promise.all([
      this.client
        .from("player_saves")
        .select("save_json, seq")
        .eq("user_id", session.user.id)
        .maybeSingle(),
      this.client
        .from("player_live_state")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle(),
    ]);

    if (saveErr) {
      this.lastError = saveErr.message;
    }

    const remoteSeq = typeof saveRow?.seq === "number" ? saveRow.seq : 0;
    if (remoteSeq > this.localSeq) {
      this.localSeq = remoteSeq;
    }

    const remoteSave = (saveRow?.save_json as PlayerGameSaveV3 | undefined) ?? null;
    const remoteLive = (liveRow as LiveStatePayload | undefined) ?? null;

    const initMap: MapId =
      remoteLive?.map_id === "japan" || remoteSave?.profile.activeMapId === "japan"
        ? "japan"
        : "vietnam";
    const initX = remoteLive?.x ?? remoteSave?.profile.x ?? 936;
    const initY = remoteLive?.y ?? remoteSave?.profile.y ?? 2136;

    this.startRealtimeChannels(initMap, initX, initY);
    if (remoteSave) {
      void this.upsertWorldEstateFromSave(remoteSave);
    }
    void this.syncPersistentWorldEstates("vietnam");
    this.lastSyncAt = Date.now();
    this.emitStatus();

    return {
      authenticated: true,
      remoteSave,
      remoteSeq,
      remoteLive,
    };
  }

  public queueSaveSync(save: PlayerGameSaveV3, immediate = false): void {
    if (!this.user) return;
    // Ignore echo immediately after applying a remote save
    if (Date.now() - this.lastAppliedRemoteSaveMs < 350) return;

    this.pendingSave = save;
    if (this.saveTimerId !== null) {
      window.clearTimeout(this.saveTimerId);
    }
    const delay = immediate ? 180 : 1800;
    this.saveTimerId = window.setTimeout(() => {
      this.saveTimerId = null;
      const toPush = this.pendingSave;
      this.pendingSave = null;
      if (toPush) {
        void this.upsertSaveImmediate(toPush);
      }
    }, delay);
  }

  public flushPendingSave(): void {
    if (!this.user) return;
    if (this.saveTimerId !== null) {
      window.clearTimeout(this.saveTimerId);
      this.saveTimerId = null;
    }
    if (this.pendingSave) {
      const toPush = this.pendingSave;
      this.pendingSave = null;
      void this.upsertSaveImmediate(toPush);
    }
    if (this.latestLocalLive) {
      void this.pushLiveRow(this.latestLocalLive);
    }
  }

  public async forceSyncNow(save: PlayerGameSaveV3): Promise<{ ok: boolean; message: string }> {
    if (!this.user) {
      return { ok: false, message: "Chưa đăng nhập tài khoản." };
    }
    const res = await this.upsertSaveImmediate(save);
    await this.upsertLiveImmediate(save);
    if (!res.ok) {
      return { ok: false, message: `Lỗi đồng bộ: ${res.error}` };
    }
    return { ok: true, message: "Đã đồng bộ dữ liệu lên Cloud thành công!" };
  }

  private async upsertSaveImmediate(save: PlayerGameSaveV3): Promise<{ ok: boolean; error?: string }> {
    if (!this.user) return { ok: false, error: "Not authenticated" };
    this.localSeq += 1;
    const { error } = await this.client.from("player_saves").upsert(
      {
        user_id: this.user.id,
        save_json: save,
        seq: this.localSeq,
        last_session_id: this.sessionId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      this.lastError = error.message;
      this.emitStatus();
      return { ok: false, error: error.message };
    }
    this.lastSyncAt = Date.now();
    this.lastError = null;
    this.emitStatus();
    void this.upsertWorldEstateFromSave(save);
    return { ok: true };
  }

  private async upsertWorldEstateFromSave(save: PlayerGameSaveV3): Promise<void> {
    if (!this.user) return;
    try {
      const est = save.estate;
      const ownedWorldTiles = Array.isArray(est?.ownedWorldTiles) ? est.ownedWorldTiles : [];
      const houseId = est?.houseId ?? null;
      if (!houseId && ownedWorldTiles.length === 0) {
        await this.client.from("world_estates").delete().eq("user_id", this.user.id);
        this.persistentWorldEstates.delete(this.user.id);
        return;
      }
      const ownerName = (est?.ownerName || formatAccountDisplayName(this.user) || "Người Chơi").trim();
      const originC = est?.houseOrigin?.c ?? 13;
      const originR = est?.houseOrigin?.r ?? 13;
      const displayedItems: Array<{ itemId: string; lightLevel: 0 | 1 | 2 }> = [];
      if (houseId && save.inventory?.collectionHall) {
        for (const [itemId, slot] of Object.entries(save.inventory.collectionHall)) {
          if (slot?.displayed) {
            const lvl = slot.lightLevel === 2 ? 2 : slot.lightLevel === 1 ? 1 : 0;
            displayedItems.push({ itemId, lightLevel: lvl });
          }
        }
      }
      const summary: RemotePlayerEstateSummary = {
        houseId,
        originC,
        originR,
        ownerName,
        ownedWorldTiles,
        displayedItems,
      };
      const { error } = await this.client.from("world_estates").upsert(
        {
          user_id: this.user.id,
          map_id: "vietnam",
          owner_name: ownerName,
          house_id: houseId,
          origin_c: originC,
          origin_r: originR,
          owned_world_tiles: ownedWorldTiles,
          displayed_items: displayedItems,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (!error) {
        this.persistentWorldEstates.set(this.user.id, summary);
      }
    } catch {
      // Ignore if world_estates table has not been migrated yet
    }
  }

  public async syncPersistentWorldEstates(mapId: MapId = "vietnam"): Promise<void> {
    try {
      const { data, error } = await this.client
        .from("world_estates")
        .select("user_id, owner_name, house_id, origin_c, origin_r, owned_world_tiles, displayed_items")
        .eq("map_id", mapId)
        .limit(300);

      if (!error && Array.isArray(data)) {
        this.persistentWorldEstates.clear();
        for (const raw of data) {
          const row = raw as {
            user_id?: string;
            owner_name?: string;
            house_id?: string | null;
            origin_c?: number;
            origin_r?: number;
            owned_world_tiles?: unknown;
            displayed_items?: unknown;
          };
          if (!row.user_id) continue;
          const ownedWorldTiles = Array.isArray(row.owned_world_tiles)
            ? row.owned_world_tiles.filter((x): x is string => typeof x === "string")
            : [];
          const displayedItems = Array.isArray(row.displayed_items)
            ? (row.displayed_items as Array<{ itemId: string; lightLevel: 0 | 1 | 2 }>)
            : [];
          if (!row.house_id && ownedWorldTiles.length === 0) continue;
          this.persistentWorldEstates.set(row.user_id, {
            houseId: row.house_id ?? null,
            originC: Number.isFinite(row.origin_c) ? Number(row.origin_c) : 13,
            originR: Number.isFinite(row.origin_r) ? Number(row.origin_r) : 13,
            ownerName: row.owner_name || "Người Chơi",
            ownedWorldTiles,
            displayedItems,
          });
        }
        this.callbacks.onPersistentWorldEstatesChanged?.(
          this.persistentWorldEstates,
          this.user?.id ?? null,
        );
      }
    } catch {
      // Ignore if table not migrated yet
    }

    // Đăng ký kênh Realtime cho bảng world_estates (1 lần duy nhất) để nhà & đất cập nhật tức thời
    if (!this.estatesChannel) {
      const chan = this.client.channel("world_estates_global");
      chan
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "world_estates" },
          (payload) => {
            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as { user_id?: string } | null;
              if (oldRow?.user_id) {
                this.persistentWorldEstates.delete(oldRow.user_id);
                this.callbacks.onPersistentWorldEstatesChanged?.(
                  this.persistentWorldEstates,
                  this.user?.id ?? null,
                );
              }
              return;
            }
            const nextRow = payload.new as {
              user_id?: string;
              owner_name?: string;
              house_id?: string | null;
              origin_c?: number;
              origin_r?: number;
              owned_world_tiles?: unknown;
              displayed_items?: unknown;
            } | null;
            if (!nextRow?.user_id) return;
            const ownedWorldTiles = Array.isArray(nextRow.owned_world_tiles)
              ? nextRow.owned_world_tiles.filter((x): x is string => typeof x === "string")
              : [];
            const displayedItems = Array.isArray(nextRow.displayed_items)
              ? (nextRow.displayed_items as Array<{ itemId: string; lightLevel: 0 | 1 | 2 }>)
              : [];
            if (!nextRow.house_id && ownedWorldTiles.length === 0) {
              this.persistentWorldEstates.delete(nextRow.user_id);
            } else {
              this.persistentWorldEstates.set(nextRow.user_id, {
                houseId: nextRow.house_id ?? null,
                originC: Number.isFinite(nextRow.origin_c) ? Number(nextRow.origin_c) : 13,
                originR: Number.isFinite(nextRow.origin_r) ? Number(nextRow.origin_r) : 13,
                ownerName: nextRow.owner_name || "Người Chơi",
                ownedWorldTiles,
                displayedItems,
              });
            }
            this.callbacks.onPersistentWorldEstatesChanged?.(
              this.persistentWorldEstates,
              this.user?.id ?? null,
            );
          },
        )
        .subscribe();
      this.estatesChannel = chan;
    }
  }

  private async upsertLiveImmediate(save: PlayerGameSaveV3): Promise<void> {
    if (!this.user) return;
    const payload: Omit<LiveStatePayload, "user_id" | "session_id" | "updated_at"> = {
      map_id: save.profile.activeMapId === "japan" ? "japan" : "vietnam",
      x: Math.round(save.profile.x * 10) / 10,
      y: Math.round(save.profile.y * 10) / 10,
      facing: save.profile.facing,
      is_moving: false,
      hp: Math.round(save.survival.hp * 10) / 10,
      hunger: Math.round(save.survival.hunger * 10) / 10,
      stamina: Math.round(save.survival.stamina * 10) / 10,
      body_temp_c: Math.round(save.survival.bodyTempC * 100) / 100,
      skin_id: save.profile.skinId,
      gender: save.profile.gender ?? "male",
      hair_id: save.hairId,
      equipped_pet_id: save.equippedPetId ?? null,
    };
    this.latestLocalLive = payload;
    await this.pushLiveRow(payload);
  }

  private async pushLiveRow(
    payload: Omit<LiveStatePayload, "user_id" | "session_id" | "updated_at">,
  ): Promise<void> {
    if (!this.user) return;
    const { error } = await this.client.from("player_live_state").upsert(
      {
        ...payload,
        user_id: this.user.id,
        session_id: this.sessionId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (!error) {
      this.lastSyncAt = Date.now();
    }
  }

  public updateLocalMovementAndPresence(params: {
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
    estate?: RemotePlayerEstateSummary | null;
  }): void {
    const uid = this.getActiveWorldPlayerId();
    const now = performance.now();

    const nextLive: Omit<LiveStatePayload, "user_id" | "session_id" | "updated_at"> = {
      map_id: params.mapId,
      x: Math.round(params.x * 10) / 10,
      y: Math.round(params.y * 10) / 10,
      facing: params.facing,
      is_moving: params.isMoving,
      hp: Math.round(params.hp * 10) / 10,
      hunger: Math.round(params.hunger * 10) / 10,
      stamina: Math.round(params.stamina * 10) / 10,
      body_temp_c: Math.round(params.bodyTempC * 100) / 100,
      skin_id: params.skinId,
      gender: params.gender,
      hair_id: params.hairId,
      equipped_pet_id: params.equippedPetId,
    };
    this.latestLocalLive = nextLive;

    const nextAppearance: RemotePlayerAppearance = {
      uid,
      name: this.getActiveDisplayName(),
      skinId: params.skinId,
      gender: params.gender,
      hairId: params.hairId,
      equipped: params.equipped,
      equippedPetId: params.equippedPetId,
      estate: params.estate ?? null,
      x: nextLive.x,
      y: nextLive.y,
      facing: nextLive.facing,
    };
    this.latestLocalAppearance = nextAppearance;

    // 1. Switch spatial sector channel automatically when crossing sector borders
    const sectorKey = computeWorldSectorKey(params.mapId, params.x, params.y);
    if (sectorKey !== this.activeSectorKey) {
      this.lastAppearanceSig = "";
      this.subscribeWorldSector(sectorKey);
    }

    // 2. Update Presence when appearance, name, or estate/displayed items changes
    const appSig = JSON.stringify([
      nextAppearance.uid,
      nextAppearance.name,
      nextAppearance.skinId,
      nextAppearance.gender,
      nextAppearance.hairId,
      nextAppearance.equipped,
      nextAppearance.equippedPetId,
      nextAppearance.estate ?? null,
    ]);
    if (appSig !== this.lastAppearanceSig && this.worldChannel) {
      this.lastAppearanceSig = appSig;
      void this.worldChannel.track(nextAppearance);
    }

    // 3. Cross-device self move broadcast (~130ms while moving or on stop, authenticated only)
    if (this.user && this.accountChannel && (params.isMoving || this.wasWorldMoving)) {
      if (!params.isMoving || now - this.lastSelfMoveBroadcastAt >= 130) {
        this.lastSelfMoveBroadcastAt = now;
        void this.accountChannel.send({
          type: "broadcast",
          event: "self_move",
          payload: {
            ...nextLive,
            user_id: uid,
            session_id: this.sessionId,
          },
        });
      }
    }

    // 4. Shared World 50-CCU throttled move broadcast (~400ms while moving + 1 final stop packet)
    if (this.worldChannel && (params.isMoving || this.wasWorldMoving)) {
      if (!params.isMoving || now - this.lastWorldMoveBroadcastAt >= 400) {
        this.lastWorldMoveBroadcastAt = now;
        const movePkt: RemotePlayerMovePacket = {
          uid,
          x: nextLive.x,
          y: nextLive.y,
          vx: Math.round(params.vx),
          vy: Math.round(params.vy),
          f: params.facing,
          m: params.isMoving,
        };
        void this.worldChannel.send({
          type: "broadcast",
          event: "p_move",
          payload: movePkt,
        });
      }
    }
    this.wasWorldMoving = params.isMoving;

    // 5. Periodic DB live_state persistence (every 800ms while moving, authenticated only)
    if (this.user && params.isMoving && now - this.lastSelfDbPushAt >= 800) {
      this.lastSelfDbPushAt = now;
      void this.pushLiveRow(nextLive);
    }
  }

  public broadcastPoliceChase(officerId: string, x: number, y: number, durationMs = 4500): void {
    if (!this.worldChannel) return;
    void this.worldChannel.send({
      type: "broadcast",
      event: "p_police",
      payload: {
        oid: officerId,
        uid: this.getActiveWorldPlayerId(),
        x: Math.round(x),
        y: Math.round(y),
        until: Date.now() + durationMs,
      },
    });
  }

  public broadcastVaultUnlocked(
    mapId: MapId,
    containerId: string,
    chestId?: string,
    container?: ContainerLootState,
  ): void {
    if (!this.worldChannel) return;
    void this.worldChannel.send({
      type: "broadcast",
      event: "w_vault_open",
      payload: {
        uid: this.getActiveWorldPlayerId(),
        name: this.getActiveDisplayName(),
        mapId,
        cid: containerId,
        chestId,
        container,
      },
    });
  }

  public async claimOrOpenWorldContainer(params: {
    mapId: MapId;
    containerId: string;
    title: string;
    sourceType: LootSourceType;
    biome: BiomeId;
    zone: SecurityZone;
    initialItems: GridItemInstance[];
    refreshMs: number;
  }): Promise<{
    items: GridItemInstance[];
    openedAt: number;
    refreshAt: number;
    version: number;
  } | null> {
    try {
      const { data, error } = await this.client.rpc("claim_or_open_world_container", {
        p_map_id: params.mapId,
        p_container_id: params.containerId,
        p_title: params.title,
        p_source_type: params.sourceType,
        p_biome: params.biome,
        p_zone: params.zone,
        p_initial_items: params.initialItems,
        p_refresh_ms: params.refreshMs,
      });
      if (error || !data) return null;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      const items = Array.isArray(row.items) ? (row.items as GridItemInstance[]) : [];
      const openedAt = Date.parse(row.opened_at) || Date.now();
      const refreshAt = Date.parse(row.refresh_at) || Date.now() + params.refreshMs;
      const version = Number(row.state_version) || 1;
      if (this.worldChannel) {
        void this.worldChannel.send({
          type: "broadcast",
          event: "w_chest",
          payload: { mapId: params.mapId, cid: params.containerId, items, ver: version, openedAt, refreshAt },
        });
      }
      return { items, openedAt, refreshAt, version };
    } catch {
      return null;
    }
  }

  public async takeWorldContainerItem(
    mapId: MapId,
    containerId: string,
    itemUid: string,
    expectedVersion: number,
  ): Promise<{
    ok: boolean;
    newVersion: number;
    takenItem: GridItemInstance | null;
    items: GridItemInstance[];
  } | null> {
    try {
      const { data, error } = await this.client.rpc("take_world_container_item", {
        p_map_id: mapId,
        p_container_id: containerId,
        p_item_uid: itemUid,
        p_expected_version: expectedVersion,
      });
      if (error || !Array.isArray(data) || data.length === 0) return null;
      const row = data[0];
      const items = Array.isArray(row.items) ? (row.items as GridItemInstance[]) : [];
      const newVersion = Number(row.new_version) || expectedVersion;
      const openedAt = row.opened_at ? Date.parse(row.opened_at) : Date.now();
      const refreshAt = row.refresh_at ? Date.parse(row.refresh_at) : Date.now() + 648_270;
      if (row.ok && this.worldChannel) {
        void this.worldChannel.send({
          type: "broadcast",
          event: "w_chest",
          payload: { mapId, cid: containerId, items, ver: newVersion, openedAt, refreshAt },
        });
      }
      return {
        ok: Boolean(row.ok),
        newVersion,
        takenItem: (row.taken_item as GridItemInstance | null) ?? null,
        items,
      };
    } catch {
      return null;
    }
  }

  public async depositWorldContainerItem(
    mapId: MapId,
    containerId: string,
    item: GridItemInstance,
    expectedVersion: number,
  ): Promise<{
    ok: boolean;
    newVersion: number;
    items: GridItemInstance[];
  } | null> {
    try {
      const { data, error } = await this.client.rpc("deposit_world_container_item", {
        p_map_id: mapId,
        p_container_id: containerId,
        p_item: item,
        p_expected_version: expectedVersion,
      });
      if (error || !Array.isArray(data) || data.length === 0) return null;
      const row = data[0];
      const items = Array.isArray(row.items) ? (row.items as GridItemInstance[]) : [];
      const newVersion = Number(row.new_version) || expectedVersion;
      const openedAt = row.opened_at ? Date.parse(row.opened_at) : Date.now();
      const refreshAt = row.refresh_at ? Date.parse(row.refresh_at) : Date.now() + 648_270;
      if (row.ok && this.worldChannel) {
        void this.worldChannel.send({
          type: "broadcast",
          event: "w_chest",
          payload: { mapId, cid: containerId, items, ver: newVersion, openedAt, refreshAt },
        });
      }
      return {
        ok: Boolean(row.ok),
        newVersion,
        items,
      };
    } catch {
      return null;
    }
  }

  public async moveWorldContainerItem(
    mapId: MapId,
    containerId: string,
    itemUid: string,
    x: number,
    y: number,
    rotated: boolean,
    expectedVersion: number,
  ): Promise<{
    ok: boolean;
    newVersion: number;
    items: GridItemInstance[];
  } | null> {
    try {
      const { data, error } = await this.client.rpc("move_world_container_item", {
        p_map_id: mapId,
        p_container_id: containerId,
        p_item_uid: itemUid,
        p_x: x,
        p_y: y,
        p_rotated: rotated,
        p_expected_version: expectedVersion,
      });
      if (error || !Array.isArray(data) || data.length === 0) return null;
      const row = data[0];
      const items = Array.isArray(row.items) ? (row.items as GridItemInstance[]) : [];
      const newVersion = Number(row.new_version) || expectedVersion;
      const openedAt = row.opened_at ? Date.parse(row.opened_at) : Date.now();
      const refreshAt = row.refresh_at ? Date.parse(row.refresh_at) : Date.now() + 648_270;
      if (row.ok && this.worldChannel) {
        void this.worldChannel.send({
          type: "broadcast",
          event: "w_chest",
          payload: { mapId, cid: containerId, items, ver: newVersion, openedAt, refreshAt },
        });
      }
      return {
        ok: Boolean(row.ok),
        newVersion,
        items,
      };
    } catch {
      return null;
    }
  }

  private startRealtimeChannels(mapId: MapId, x: number, y: number): void {
    const setup = (): void => {
      if (!this.user) return;
      const uid = this.user.id;
      this.realtimeState = "connecting";
      this.emitStatus();

      // Personal Cross-Device Channel
      const accChan = this.client.channel(`account:${uid}`, {
        config: { broadcast: { self: false } },
      });

      accChan
        .on("broadcast", { event: "self_move" }, ({ payload }) => {
          const live = payload as LiveStatePayload;
          if (!live || live.session_id === this.sessionId) return;
          this.callbacks.onRemoteSelfLiveReceived?.(live);
        })
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "player_saves",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const row = payload.new as { save_json?: PlayerGameSaveV3; seq?: number; last_session_id?: string } | null;
            if (!row?.save_json || row.last_session_id === this.sessionId) return;
            const remoteSeq = Number(row.seq) || 0;
            if (remoteSeq <= this.localSeq) return;
            this.localSeq = remoteSeq;
            this.lastAppliedRemoteSaveMs = Date.now();
            this.lastSyncAt = Date.now();
            this.callbacks.onRemoteSaveReceived?.(row.save_json, remoteSeq);
            this.emitStatus();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "player_live_state",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const row = payload.new as LiveStatePayload | null;
            if (!row || row.session_id === this.sessionId) return;
            this.callbacks.onRemoteSelfLiveReceived?.(row);
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            this.realtimeState = "connected";
            this.lastError = null;
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            this.realtimeState = "error";
          }
          this.emitStatus();
        });

      this.accountChannel = accChan;
      this.subscribeWorldSector(computeWorldSectorKey(mapId, x, y));
    };

    if (this.accountChannel || this.worldChannel) {
      void this.stopRealtimeChannels().then(setup);
    } else {
      setup();
    }
  }

  private subscribeWorldSector(sectorKey: string): void {
    if (this.activeSectorKey === sectorKey && this.worldChannel) return;

    if (this.worldChannel) {
      const prevChan = this.worldChannel;
      this.worldChannel = null;
      void prevChan.untrack().catch(() => {}).finally(() => {
        void this.client.removeChannel(prevChan);
      });
    }

    this.activeSectorKey = sectorKey;
    this.remoteAppearances.clear();
    this.remoteMoves.clear();
    this.callbacks.onRemotePlayersChanged?.(this.remoteAppearances, this.remoteMoves);

    const uid = this.getActiveWorldPlayerId();
    const chan = this.client.channel(`world:${sectorKey}`, {
      config: {
        presence: { key: uid },
        broadcast: { self: false },
      },
    });

    const broadcastCurrentPos = (): void => {
      if (!this.latestLocalLive || this.worldChannel !== chan) return;
      void chan.send({
        type: "broadcast",
        event: "p_move",
        payload: {
          uid,
          x: this.latestLocalLive.x,
          y: this.latestLocalLive.y,
          vx: 0,
          vy: 0,
          f: this.latestLocalLive.facing,
          m: this.latestLocalLive.is_moving,
        } satisfies RemotePlayerMovePacket,
      });
    };

    chan
      .on("presence", { event: "sync" }, () => {
        const state = chan.presenceState<RemotePlayerAppearance>();
        this.remoteAppearances.clear();
        for (const [key, presences] of Object.entries(state)) {
          if (key === uid || presences.length === 0) continue;
          this.remoteAppearances.set(key, presences[0]);
        }
        // Prune stale moves for players who left sector
        for (const moveUid of this.remoteMoves.keys()) {
          if (!this.remoteAppearances.has(moveUid)) {
            this.remoteMoves.delete(moveUid);
          }
        }
        this.callbacks.onRemotePlayersChanged?.(this.remoteAppearances, this.remoteMoves);
        this.emitStatus();
      })
      .on("presence", { event: "join" }, ({ key }) => {
        if (key && key !== uid) {
          broadcastCurrentPos();
        }
      })
      .on("broadcast", { event: "p_move" }, ({ payload }) => {
        const pkt = payload as RemotePlayerMovePacket;
        if (!pkt || pkt.uid === uid) return;
        this.remoteMoves.set(pkt.uid, pkt);
        this.callbacks.onRemotePlayersChanged?.(this.remoteAppearances, this.remoteMoves);
      })
      .on("broadcast", { event: "p_police" }, ({ payload }) => {
        const p = payload as { oid?: string; uid?: string; x?: number; y?: number; until?: number };
        if (!p?.oid || p.uid === uid) return;
        this.callbacks.onRemotePoliceChase?.(p.oid, p.x ?? 0, p.y ?? 0, p.until ?? Date.now() + 3000);
      })
      .on("broadcast", { event: "w_chest" }, ({ payload }) => {
        const p = payload as {
          mapId?: MapId;
          cid?: string;
          items?: GridItemInstance[];
          ver?: number;
          openedAt?: number;
          refreshAt?: number;
        };
        if (!p?.mapId || !p.cid || !Array.isArray(p.items)) return;
        this.callbacks.onSharedContainerUpdated?.(
          p.mapId,
          p.cid,
          p.items,
          Number(p.ver) || 1,
          Number(p.openedAt) || Date.now(),
          Number(p.refreshAt) || Date.now() + 648_270,
        );
      })
      .on("broadcast", { event: "w_vault_open" }, ({ payload }) => {
        const p = payload as {
          uid?: string;
          name?: string;
          mapId?: MapId;
          cid?: string;
          chestId?: string;
          container?: ContainerLootState;
        };
        if (!p?.mapId || !p.cid || p.uid === uid) return;
        this.callbacks.onSharedVaultUnlocked?.({
          mapId: p.mapId,
          containerId: p.cid,
          unlockedByName: p.name ?? "Người chơi khác",
          chestId: p.chestId,
          container: p.container,
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (this.latestLocalAppearance) {
            void chan.track({ ...this.latestLocalAppearance, uid });
          }
          broadcastCurrentPos();
          const sectorMapId = (sectorKey.split(":")[0] || "vietnam") as MapId;
          void this.syncActiveWorldContainers(sectorMapId);
        }
      });

    this.worldChannel = chan;
  }

  private async stopRealtimeChannels(): Promise<void> {
    if (this.accountChannel) {
      await this.client.removeChannel(this.accountChannel);
      this.accountChannel = null;
    }
    if (this.worldChannel) {
      await this.worldChannel.untrack().catch(() => {});
      await this.client.removeChannel(this.worldChannel);
      this.worldChannel = null;
    }
    await this.unsubscribeAuctionChannel();
    this.activeSectorKey = null;
    this.lastAppearanceSig = "";
    this.remoteAppearances.clear();
    this.remoteMoves.clear();
    this.callbacks.onRemotePlayersChanged?.(this.remoteAppearances, this.remoteMoves);
  }

  // ─── AUCTION HOUSE (24H PLAYER MARKET) ─────────────────────────────────────────────────────

  public async syncActiveWorldContainers(mapId: MapId): Promise<void> {
    try {
      const { data, error } = await this.client.rpc("sync_active_world_containers", {
        p_map_id: mapId,
      });
      if (error || !Array.isArray(data)) return;
      for (const row of data as Array<{
        container_id: string;
        title: string;
        source_type: LootSourceType;
        biome: BiomeId;
        items: GridItemInstance[];
        state_version: number;
        opened_at: string;
        refresh_at: string;
      }>) {
        const items = Array.isArray(row.items) ? row.items : [];
        const openedAt = Date.parse(row.opened_at) || Date.now();
        const refreshAt = Date.parse(row.refresh_at) || Date.now() + 648_270;
        this.callbacks.onSharedContainerUpdated?.(
          mapId,
          row.container_id,
          items,
          Number(row.state_version) || 1,
          openedAt,
          refreshAt,
          {
            title: row.title,
            sourceType: row.source_type,
            biome: row.biome,
            bulkSync: true,
          },
        );
      }
    } catch {
      // Ignore transient sync error
    }
  }

  public async fetchAuctionListings(): Promise<{ ok: boolean; listings: AuctionListingRow[]; error?: string }> {
    const nowIso = new Date().toISOString();
    const uid = this.user?.id ?? null;
    const { data, error } = await this.client
      .from("auction_listings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return { ok: false, listings: [], error: error.message };
    }

    const rows = ((data ?? []) as AuctionListingRow[]).filter((r) => {
      if (r.status === "active" && r.expires_at > nowIso) return true;
      if (uid && r.seller_id === uid && (r.status === "active" || r.status === "sold")) return true;
      return false;
    });
    return { ok: true, listings: rows };
  }

  public async createAuctionListing(
    itemData: GridItemInstance,
    priceGold: number,
    maxSlots: number,
  ): Promise<{ ok: boolean; message: string; listing?: AuctionListingRow }> {
    if (!this.user) {
      return { ok: false, message: "Cần đăng nhập tài khoản Cloud (☰ -> Tài khoản) để treo bán đồ!" };
    }
    const sellerName = formatAccountDisplayName(this.user);
    const { data, error } = await this.client.rpc("create_auction_listing", {
      p_seller_name: sellerName,
      p_item_id: itemData.itemId,
      p_item_data: itemData,
      p_price_gold: Math.max(1, Math.round(priceGold)),
      p_max_slots: Math.max(1, Math.round(maxSlots)),
    });
    if (error) {
      return { ok: false, message: error.message };
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { ok: false, message: "Không nhận được phản hồi từ máy chủ." };
    return {
      ok: Boolean(row.ok),
      message: String(row.message ?? ""),
      listing: row.listing as AuctionListingRow | undefined,
    };
  }

  public async buyAuctionListing(
    listingId: string,
  ): Promise<{ ok: boolean; message: string; priceGold?: number; itemData?: GridItemInstance }> {
    if (!this.user) {
      return { ok: false, message: "Cần đăng nhập tài khoản Cloud (☰ -> Tài khoản) để mua đồ!" };
    }
    const buyerName = formatAccountDisplayName(this.user);
    const { data, error } = await this.client.rpc("buy_auction_listing", {
      p_listing_id: listingId,
      p_buyer_name: buyerName,
    });
    if (error) {
      return { ok: false, message: error.message };
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { ok: false, message: "Không nhận được phản hồi từ máy chủ." };
    return {
      ok: Boolean(row.ok),
      message: String(row.message ?? ""),
      priceGold: typeof row.price_gold === "number" ? row.price_gold : Number(row.price_gold ?? 0),
      itemData: row.item_data as GridItemInstance | undefined,
    };
  }

  public async cancelAuctionListing(
    listingId: string,
  ): Promise<{ ok: boolean; message: string; itemData?: GridItemInstance }> {
    if (!this.user) {
      return { ok: false, message: "Cần đăng nhập tài khoản Cloud." };
    }
    const { data, error } = await this.client.rpc("cancel_auction_listing", {
      p_listing_id: listingId,
    });
    if (error) {
      return { ok: false, message: error.message };
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { ok: false, message: "Không nhận được phản hồi từ máy chủ." };
    return {
      ok: Boolean(row.ok),
      message: String(row.message ?? ""),
      itemData: row.item_data as GridItemInstance | undefined,
    };
  }

  public async claimAuctionProceeds(
    listingId: string,
  ): Promise<{ ok: boolean; message: string; priceGold?: number }> {
    if (!this.user) {
      return { ok: false, message: "Cần đăng nhập tài khoản Cloud." };
    }
    const { data, error } = await this.client.rpc("claim_auction_proceeds", {
      p_listing_id: listingId,
    });
    if (error) {
      return { ok: false, message: error.message };
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { ok: false, message: "Không nhận được phản hồi từ máy chủ." };
    return {
      ok: Boolean(row.ok),
      message: String(row.message ?? ""),
      priceGold: typeof row.price_gold === "number" ? row.price_gold : Number(row.price_gold ?? 0),
    };
  }

  public subscribeAuctionChannel(onUpdate: () => void): void {
    if (this.auctionChannel) return;
    this.auctionChannel = this.client
      .channel("auction-house-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "auction_listings" },
        () => {
          onUpdate();
        },
      )
      .subscribe();
  }

  public async unsubscribeAuctionChannel(): Promise<void> {
    if (!this.auctionChannel) return;
    const ch = this.auctionChannel;
    this.auctionChannel = null;
    await this.client.removeChannel(ch).catch(() => {});
  }

  private translateAuthError(msg: string): string {
    const low = msg.toLowerCase();
    if (low.includes("invalid login credentials")) return "Sai tên tài khoản hoặc mật khẩu.";
    if (low.includes("already registered") || low.includes("already exists")) {
      return "Tài khoản này đã tồn tại — hãy chuyển sang tab Load tài khoản.";
    }
    if (low.includes("email not confirmed")) return "Tài khoản chưa xác nhận email trên Supabase.";
    if (low.includes("password")) return "Mật khẩu phải tối thiểu 6 ký tự.";
    return msg;
  }
}

export function applySharedItemsToContainer(
  container: ContainerLootState,
  items: GridItemInstance[],
  generatedAt: number,
  refreshAt: number,
): void {
  container.items = items;
  container.generatedAt = generatedAt;
  container.refreshAt = refreshAt;
}
