import "./style.css";
import "@pixi/sound";
import { Application, Assets } from "pixi.js";

import { assets } from "./assets.ts";
import { SupabaseSync } from "./cloud/SupabaseSync.ts";
import { gameReady, initPlatform, setLoadingProgress } from "./platform.ts";
import { SaveVault } from "./security/SaveVault.ts";
import { Hud } from "./ui/Hud.ts";
import { TILE_SIZE } from "./world/types.ts";
import { generateOpenWorld } from "./world/WorldGenerator.ts";
import { WorldScene } from "./world/WorldScene.ts";

async function bootstrap(): Promise<void> {
  await initPlatform();

  // Disable mobile Safari pinch-gesture & double-tap zooming globally across UI & canvas
  const preventZoom = (e: Event): void => {
    e.preventDefault();
  };
  document.addEventListener("gesturestart", preventZoom, { passive: false });
  document.addEventListener("gesturechange", preventZoom, { passive: false });
  document.addEventListener("gestureend", preventZoom, { passive: false });
  document.addEventListener("dblclick", preventZoom, { passive: false });
  let touchStartX = 0;
  let touchStartY = 0;
  let touchMoved = false;
  document.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
        return;
      }
      const t = e.touches[0];
      if (t) {
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchMoved = false;
      }
    },
    { passive: false },
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      const t = e.touches[0];
      if (t && Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY) > 10) {
        touchMoved = true;
      }
    },
    { passive: true },
  );
  let lastTouchEndAt = 0;
  document.addEventListener(
    "touchend",
    (e) => {
      if (touchMoved) {
        lastTouchEndAt = 0;
        return;
      }
      const now = performance.now();
      if (now - lastTouchEndAt <= 320) {
        const target = e.target as HTMLElement | null;
        // Suppress Safari double-tap zoom without interrupting modal drag or text scrolling
        if (!target?.closest(".bag-grids-wrap .delta-item")) {
          e.preventDefault();
          const clickable = target?.closest("button, a, [role='button'], [role='tab']");
          if (clickable instanceof HTMLElement) {
            clickable.click();
          }
        }
      }
      lastTouchEndAt = now;
    },
    { passive: false },
  );

  const app = new Application();

  await app.init({
    background: "#0b191d",
    resizeTo: window,
    // Capped at 1.5 with low-power GPU hint: keeps pixel art crisp while slashing fill-rate & heat
    resolution: Math.min(window.devicePixelRatio || 1, 1.5),
    autoDensity: true,
    antialias: false,
    roundPixels: true,
    powerPreference: "low-power",
  });
  app.ticker.maxFPS = 60;

  document.getElementById("pixi-container")!.appendChild(app.canvas);

  const [, { vault: saveVault, initial: saveLoadResult }] = await Promise.all([
    Assets.load(assets, (progress) => setLoadingProgress(progress * 0.85, "Đang tải tài nguyên đồ họa...")),
    SaveVault.open({
      spawnX: 19.5 * TILE_SIZE,
      spawnY: 44.5 * TILE_SIZE,
    }),
  ]);

  setLoadingProgress(0.92, "Đang khởi tạo bản đồ thế giới...");
  const savedMapId = saveLoadResult.save.profile.activeMapId === "japan" ? "japan" : "vietnam";
  const worldData = generateOpenWorld(202611, savedMapId);
  setLoadingProgress(0.98, "Đang hoàn tất giao diện & ánh sáng...");

  let hud: Hud | null = null;
  let worldScene: WorldScene | null = null;

  const cloudSync = new SupabaseSync({
    onStatusChanged: (status) => {
      hud?.updateCloudSyncStatus(status);
    },
    onRemoteSaveReceived: (remoteSave) => {
      if (!worldScene) return;
      worldScene.applyRemoteSaveState(remoteSave);
      saveVault.scheduleSave(worldScene.getSaveSnapshot(), true);
      hud?.refreshFromRemoteState();
    },
    onRemoteSelfLiveReceived: (live) => {
      worldScene?.applyRemoteLiveState(live);
    },
    onRemotePlayersChanged: (appearances, moves) => {
      worldScene?.syncRemotePlayers(appearances, moves);
    },
    onRemotePoliceChase: (officerId, x, y, untilMs) => {
      worldScene?.applyRemotePoliceChase(officerId, x, y, untilMs);
    },
    onSharedContainerUpdated: (mapId, containerId, items, version, openedAt, refreshAt, meta) => {
      hud?.handleSharedContainerUpdated(mapId, containerId, items, version, openedAt, refreshAt, meta);
    },
    onSharedVaultUnlocked: (payload) => {
      hud?.handleSharedVaultUnlocked(payload);
    },
    onServerClockOffset: (offsetMs) => {
      worldScene?.setServerClockOffsetMs(offsetMs);
    },
    onPersistentWorldEstatesChanged: (estates, localUserId) => {
      worldScene?.syncPersistentWorldEstates(estates, localUserId);
    },
  });

  worldScene = new WorldScene(
    app,
    worldData,
    {
      onLandmarkDiscovered: (lm) => {
        hud?.showDiscoveryToast(`Khám Phá: ${lm.name}`, lm.subtitle);
      },
      onOpenContainer: (container) => {
        hud?.openLootModal(container);
      },
      onOpenVaultPuzzle: (target) => {
        hud?.openVaultPuzzleModal(target);
      },
      onOpenJailMinigame: (station) => {
        hud?.openJailMinigameModal(station);
      },
      onOpenShop: (shopKind) => {
        hud?.openShopModal(shopKind);
      },
      onOpenHomeStorage: () => {
        hud?.openHomeStorageModal();
      },
      onOpenCollectionHall: () => {
        hud?.openCollectionModal();
      },
      onOpenAuctionHouse: () => {
        hud?.openAuctionModal();
      },
      onOpenAirport: () => {
        hud?.openAirportModal();
      },
      onOpenQuestBoard: () => {
        hud?.openQuestBoardModal();
      },
      onOpenReputationShop: () => {
        hud?.openReputationModal("shop");
      },
      onOpenPetGacha: () => {
        hud?.openPetGachaModal();
      },
      onOpenRealEstate: (initialTab) => {
        hud?.openRealEstateModal(initialTab);
      },
      onMapChanged: () => {
        hud?.handleMapChanged();
      },
      onConsumeCompleted: (title, message) => {
        hud?.handleConsumeCompleted(title, message);
      },
      onPoliceChallenge: (officer) => {
        hud?.openPoliceChallengeModal(officer);
      },
      onPoliceBlendIgnored: (officerName, chancePct) => {
        hud?.showDiscoveryToast(
          "🕵️ Hòa nhập thành công!",
          `${officerName} lướt qua bạn không nghi ngờ (${chancePct}%).`,
        );
      },
      onPoliceDetained: (lostCount, durationMs) => {
        hud?.showDetentionScreen(lostCount, durationMs);
      },
      onDetentionEnded: () => {
        hud?.handleDetentionEnded();
      },
      onContainersRefreshed: (containerIds) => {
        hud?.handleContainersRefreshed(containerIds);
      },
      onFaintedToHospital: (reason, feeGold) => {
        hud?.showFaintedHospitalScreen(reason, feeGold);
      },
      onRequestSave: (immediate) => {
        if (!worldScene) return;
        const snap = worldScene.getSaveSnapshot();
        saveVault.scheduleSave(snap, immediate);
        cloudSync.queueSaveSync(snap, immediate);
      },
      onPlayerMoveSample: (sample) => {
        cloudSync.updateLocalMovementAndPresence(sample);
      },
      onPoliceChaseStarted: (officerId, x, y) => {
        cloudSync.broadcastPoliceChase(officerId, x, y);
      },
      onVaultUnlocked: ({ mapId, containerId, chestId, container }) => {
        cloudSync.broadcastVaultUnlocked(mapId, containerId, chestId, container);
      },
      getPlayerDisplayName: () => cloudSync.getActiveDisplayName(),
    },
    saveLoadResult.save,
  );

  app.stage.addChild(worldScene.stageLayer);

  hud = new Hud(worldScene, cloudSync, {
    onAfterLogout: async () => {
      if (!worldScene) return;
      const freshSave = await saveVault.resetToFreshSave();
      worldScene.applyRemoteSaveState(freshSave);
      hud?.refreshFromRemoteState();
      if (worldScene.needsOnboarding()) {
        hud?.openOnboardingModal();
      }
    },
  });
  (window as unknown as { __WORLD_SCENE__?: WorldScene; __HUD__?: Hud }).__WORLD_SCENE__ = worldScene;
  (window as unknown as { __WORLD_SCENE__?: WorldScene; __HUD__?: Hud }).__HUD__ = hud;
  if (worldScene.needsOnboarding()) {
    hud.openOnboardingModal();
  } else if (worldScene.isDetained()) {
    hud.showDetentionScreen(0, worldScene.getDetainedRemainingMs(), true);
  }
  if (saveLoadResult.tamperDetected) {
    hud.showDiscoveryToast(
      "⚠️ Phát hiện can thiệp dữ liệu",
      "Hệ thống đã từ chối bản lưu bất thường và đặt lại phiên an toàn mới.",
    );
  }

  void cloudSync.syncPersistentWorldEstates("vietnam");

  void cloudSync.restoreSession().then((res) => {
    if (!res.authenticated || !worldScene) return;
    if (res.remoteSave) {
      worldScene.applyRemoteSaveState(res.remoteSave);
      if (res.remoteLive) {
        worldScene.applyRemoteLiveState(res.remoteLive);
      }
      saveVault.scheduleSave(worldScene.getSaveSnapshot(), true);
      hud?.refreshFromRemoteState();
    }
  });

  const flushVault = (): void => {
    if (!worldScene) return;
    void saveVault.flushPending(worldScene.getSaveSnapshot());
    cloudSync.flushPendingSave();
  };
  window.addEventListener("pagehide", flushVault);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushVault();
      app.ticker.stop();
    } else {
      app.ticker.start();
    }
  });

  app.ticker.add((ticker) => {
    const dtSeconds = ticker.deltaMS / 1000;
    worldScene?.update(dtSeconds);
    hud?.update(dtSeconds);
  });

  gameReady(app);
}

void bootstrap();
