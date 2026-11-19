import {
  PET_GACHA_COST_GOLD,
  formatPetBonusSummary,
  type GachaRollOutcome,
} from "../world/PetSystem.ts";
import type { ItemRarity } from "../world/types.ts";

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  shape: "star" | "dot" | "streak" | "ring";
  spin: number;
  angle: number;
}

interface BgStar {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
}

interface MeteorBolt {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  progress: number;
  duration: number;
  delay: number;
  color: string;
  coreColor: string;
  width: number;
  impacted: boolean;
}

export interface PetGachaShowcaseCallbacks {
  isSoundEnabled: () => boolean;
  getGold: () => number;
  canRoll: () => boolean;
  onRollAgain: (times: 1 | 5) => void;
  onClose?: () => void;
}

const RARITY_RANK: Record<ItemRarity, number> = { C: 1, B: 2, A: 3, S: 4 };

// Thời gian loading mở từng thẻ tăng dần theo độ hiếm (thẻ càng hiếm loading càng lâu & càng nhiều aura!)
const CARD_LOAD_MS: Record<ItemRarity, { item: number; pet: number }> = {
  C: { item: 460, pet: 620 },
  B: { item: 820, pet: 1020 },
  A: { item: 1420, pet: 1720 },
  S: { item: 2150, pet: 2550 },
};

const RARITY_PALETTE: Record<
  ItemRarity,
  {
    primary: string;
    secondary: string;
    tertiary: string;
    glow: string;
    label: string;
    sealText: string;
    colors: string[];
  }
> = {
  C: {
    primary: "#34d399",
    secondary: "#10b981",
    tertiary: "#a7f3d0",
    glow: "rgba(52, 211, 153, 0.58)",
    label: "HẠNG C",
    sealText: "Đang giải ấn...",
    colors: ["#6ee7b7", "#34d399", "#a7f3d0", "#ffffff"],
  },
  B: {
    primary: "#38bdf8",
    secondary: "#0284c7",
    tertiary: "#818cf8",
    glow: "rgba(56, 189, 248, 0.78)",
    label: "HẠNG B • HIẾM",
    sealText: "⚡ Năng lượng Hiếm...",
    colors: ["#7dd3fc", "#38bdf8", "#818cf8", "#bae6fd", "#ffffff"],
  },
  A: {
    primary: "#c084fc",
    secondary: "#e879f9",
    tertiary: "#fde047",
    glow: "rgba(192, 132, 252, 0.94)",
    label: "HẠNG A • SỬ THI",
    sealText: "🌟 SỬ THI ĐANG THỨC TỈNH!",
    colors: ["#e879f9", "#c084fc", "#a855f7", "#fde047", "#38bdf8", "#ffffff"],
  },
  S: {
    primary: "#fbbf24",
    secondary: "#f43f5e",
    tertiary: "#c084fc",
    glow: "rgba(251, 191, 36, 0.98)",
    label: "HẠNG S • HUYỀN THOẠI",
    sealText: "👑 HUYỀN THOẠI GIÁNG LÂM!",
    colors: ["#fef08a", "#fbbf24", "#f59e0b", "#fb7185", "#e879f9", "#38bdf8", "#ffffff"],
  },
};

const ASTROLABE_OUTER_SVG = `
<svg class="gacha-astrolabe-svg is-outer" viewBox="0 0 260 260" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="130" cy="130" r="122" stroke="currentColor" stroke-width="1.6" stroke-opacity="0.72"/>
  <circle cx="130" cy="130" r="112" stroke="currentColor" stroke-width="1" stroke-dasharray="5 5" stroke-opacity="0.58"/>
  <circle cx="130" cy="130" r="96" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.45"/>
  <polygon points="130,10 144,44 130,34 116,44" fill="currentColor" fill-opacity="0.88"/>
  <polygon points="130,250 144,216 130,226 116,216" fill="currentColor" fill-opacity="0.88"/>
  <polygon points="10,130 44,116 34,130 44,144" fill="currentColor" fill-opacity="0.88"/>
  <polygon points="250,130 216,116 226,130 216,144" fill="currentColor" fill-opacity="0.88"/>
  <polygon points="130,22 224,76 224,184 130,238 36,184 36,76" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.55"/>
  <circle cx="224" cy="76" r="4" fill="currentColor"/>
  <circle cx="224" cy="184" r="4" fill="currentColor"/>
  <circle cx="36" cy="184" r="4" fill="currentColor"/>
  <circle cx="36" cy="76" r="4" fill="currentColor"/>
</svg>`;

const ASTROLABE_INNER_SVG = `
<svg class="gacha-astrolabe-svg is-inner" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="100" cy="100" r="84" stroke="currentColor" stroke-width="1.6" stroke-dasharray="10 6" stroke-opacity="0.85"/>
  <polygon points="100,18 171,141 29,141" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.72"/>
  <polygon points="100,182 171,59 29,59" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.72"/>
  <circle cx="100" cy="18" r="3.5" fill="currentColor"/>
  <circle cx="100" cy="182" r="3.5" fill="currentColor"/>
  <circle cx="171" cy="59" r="3.5" fill="currentColor"/>
  <circle cx="29" cy="59" r="3.5" fill="currentColor"/>
  <circle cx="171" cy="141" r="3.5" fill="currentColor"/>
  <circle cx="29" cy="141" r="3.5" fill="currentColor"/>
</svg>`;

const CRYSTAL_CORE_SVG = `
<svg class="gacha-crystal-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="gachaCrystalGrad" x1="20" y1="10" x2="100" y2="110" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="var(--orb-c1)" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="var(--orb-c2)" stop-opacity="0.96"/>
    </linearGradient>
  </defs>
  <polygon points="60,8 102,42 88,104 32,104 18,42" fill="url(#gachaCrystalGrad)" stroke="#ffffff" stroke-width="2" stroke-opacity="0.85"/>
  <polygon points="60,8 82,46 60,104 38,46" fill="#ffffff" fill-opacity="0.22"/>
  <polyline points="18,42 60,54 102,42" stroke="#ffffff" stroke-width="1.4" stroke-opacity="0.65"/>
  <path class="gacha-crystal-crack" d="M60 18 L52 46 L68 62 L54 88 M38 46 L52 46 M82 46 L68 62" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>
</svg>`;

const HALO_RUNE_SVG = `
<svg class="aura-rune-svg" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="90" cy="90" r="82" stroke="currentColor" stroke-width="1.8" stroke-dasharray="8 6" stroke-opacity="0.88"/>
  <circle cx="90" cy="90" r="68" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.58"/>
  <polygon points="90,8 97,24 90,20 83,24" fill="currentColor"/>
  <polygon points="90,172 97,156 90,160 83,156" fill="currentColor"/>
  <polygon points="8,90 24,83 20,90 24,97" fill="currentColor"/>
  <polygon points="172,90 156,83 160,90 156,97" fill="currentColor"/>
  <polygon points="90,22 149,56 149,124 90,158 31,124 31,56" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.62"/>
</svg>`;

export class PetGachaShowcase {
  private readonly rootEl: HTMLDivElement;
  private readonly canvasEl: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly stageEl: HTMLDivElement;
  private readonly flashEl: HTMLDivElement;
  private readonly callbacks: PetGachaShowcaseCallbacks;

  private rafId: number | null = null;
  private particles: SparkParticle[] = [];
  private bgStars: BgStar[] = [];
  private meteors: MeteorBolt[] = [];
  private timers: number[] = [];
  private activePhase: "idle" | "charging" | "revealing" | "done" = "idle";
  private currentOutcomes: GachaRollOutcome[] = [];
  private currentTimes: 1 | 5 = 1;
  private highestRarity: ItemRarity = "C";
  private hasAnyPet = false;
  private hasHighPet = false;
  private hasMythicPet = false;
  private audioCtx: AudioContext | null = null;
  private lastFrameAt = 0;
  private elapsedSec = 0;

  constructor(callbacks: PetGachaShowcaseCallbacks) {
    this.callbacks = callbacks;

    this.rootEl = document.createElement("div");
    this.rootEl.id = "pet-gacha-cinema";
    this.rootEl.className = "gacha-cinema";
    this.rootEl.setAttribute("role", "dialog");
    this.rootEl.setAttribute("aria-modal", "true");

    this.canvasEl = document.createElement("canvas");
    this.canvasEl.className = "gacha-cinema-canvas";
    this.ctx = this.canvasEl.getContext("2d")!;

    this.flashEl = document.createElement("div");
    this.flashEl.className = "gacha-cinema-flash";

    this.stageEl = document.createElement("div");
    this.stageEl.className = "gacha-cinema-stage";

    this.rootEl.append(this.canvasEl, this.flashEl, this.stageEl);
    document.body.appendChild(this.rootEl);

    this.rootEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
    });
    window.addEventListener("resize", () => {
      if (this.activePhase !== "idle") {
        this.resizeCanvas();
      }
    });
  }

  public isOpen(): boolean {
    return this.activePhase !== "idle";
  }

  public play(outcomes: GachaRollOutcome[], times: 1 | 5): void {
    this.clearTimers();
    // Sắp xếp thứ tự mở: Vật phẩm mở trước (C -> S), Thú Cưng luôn để đằng sau và Pet càng hiếm càng về cuối!
    const orderedOutcomes = [...outcomes].sort((a, b) => {
      const kindDiff = (a.kind === "pet" ? 1 : 0) - (b.kind === "pet" ? 1 : 0);
      if (kindDiff !== 0) return kindDiff;
      return RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity];
    });
    this.currentOutcomes = orderedOutcomes;
    this.currentTimes = times;
    this.elapsedSec = 0;

    let maxRank = 1;
    let maxRarity: ItemRarity = "C";
    let anyPet = false;
    let highPet = false;
    let mythicPet = false;
    for (const out of orderedOutcomes) {
      if (RARITY_RANK[out.rarity] > maxRank) {
        maxRank = RARITY_RANK[out.rarity];
        maxRarity = out.rarity;
      }
      if (out.kind === "pet") {
        anyPet = true;
        if (out.rarity === "A" || out.rarity === "S") {
          highPet = true;
          if (out.rarity === "S") mythicPet = true;
        }
      }
    }
    this.highestRarity = maxRarity;
    this.hasAnyPet = anyPet;
    this.hasHighPet = highPet;
    this.hasMythicPet = mythicPet;

    this.rootEl.dataset.tier = mythicPet ? "pet-s" : highPet ? "pet-a" : maxRarity.toLowerCase();
    this.rootEl.classList.add("is-open");
    this.resizeCanvas();
    this.initStarfield();
    this.particles.length = 0;
    this.meteors.length = 0;
    this.activePhase = "charging";
    this.startLoop();

    this.renderChargePhase();
    this.spawnSummonMeteors(orderedOutcomes, times);
    this.playMeteorWhooshSfx();

    // Pha triệu hồi sao băng gọn đẹp (1.0s - 1.15s) rồi chuyển ngay sang pha giải ấn loading từng thẻ kịch tính!
    const chargeMs = times === 5 ? 1120 : 950;

    const crackTimer = window.setTimeout(() => {
      if (this.activePhase !== "charging") return;
      const wrap = this.stageEl.querySelector(".gacha-charge-wrap");
      wrap?.classList.add("is-cracking");
      if (this.hasHighPet) {
        wrap?.classList.add("is-shaking");
      }
      this.playChargeSfx(this.highestRarity, 0.55);
    }, Math.round(chargeMs * 0.42));
    this.timers.push(crackTimer);

    const burstInterval = window.setInterval(() => {
      if (this.activePhase !== "charging") return;
      this.spawnConvergingParticles(this.hasMythicPet ? 14 : this.hasHighPet ? 10 : 7);
    }, 65);
    this.timers.push(burstInterval);

    const revealTimer = window.setTimeout(() => {
      window.clearInterval(burstInterval);
      if (this.activePhase === "charging") {
        this.beginRevealPhase(false);
      }
    }, chargeMs);
    this.timers.push(revealTimer);
  }

  public close(): void {
    this.clearTimers();
    this.stopLoop();
    this.activePhase = "idle";
    this.particles.length = 0;
    this.meteors.length = 0;
    this.rootEl.classList.remove("is-open");
    this.stageEl.innerHTML = "";
    this.callbacks.onClose?.();
  }

  private getCardLoadDurationMs(out: GachaRollOutcome): number {
    const cfg = CARD_LOAD_MS[out.rarity];
    return out.kind === "pet" ? cfg.pet : cfg.item;
  }

  private initStarfield(): void {
    const w = this.canvasEl.width;
    const h = this.canvasEl.height;
    this.bgStars = [];
    for (let i = 0; i < 85; i++) {
      this.bgStars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.9 + Math.random() * 2.1,
        phase: Math.random() * Math.PI * 2,
        speed: 1.2 + Math.random() * 2.8,
      });
    }
  }

  private spawnSummonMeteors(outcomes: GachaRollOutcome[], times: 1 | 5): void {
    const w = this.canvasEl.width;
    const h = this.canvasEl.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const targetX = w * 0.5;
    const targetY = h * 0.46;

    if (times === 1) {
      const pal = RARITY_PALETTE[this.highestRarity];
      this.meteors.push({
        startX: w * 0.88,
        startY: -40 * dpr,
        endX: targetX,
        endY: targetY,
        progress: 0,
        duration: 0.54,
        delay: 0.03,
        color: pal.primary,
        coreColor: "#ffffff",
        width: (this.hasMythicPet ? 7 : this.hasHighPet ? 5.5 : 4.2) * dpr,
        impacted: false,
      });
    } else {
      const startOffsets = [0.12, 0.3, 0.5, 0.72, 0.9];
      outcomes.forEach((out, idx) => {
        const pal = RARITY_PALETTE[out.rarity];
        const isHigh = out.rarity === "A" || out.rarity === "S";
        this.meteors.push({
          startX: w * startOffsets[idx],
          startY: (-40 - (idx % 2) * 35) * dpr,
          endX: targetX,
          endY: targetY,
          progress: 0,
          duration: 0.58,
          delay: 0.03 + idx * 0.07,
          color: pal.primary,
          coreColor: isHigh ? "#fef08a" : "#ffffff",
          width: (isHigh ? 6.5 : 3.8) * dpr,
          impacted: false,
        });
      });
    }
  }

  private renderChargePhase(): void {
    const pal = RARITY_PALETTE[this.highestRarity];
    const orbLabel =
      this.currentTimes === 5
        ? "🌠 MƯA SAO BĂNG TRIỆU HỒI ×5 🌠"
        : "✨ NGHI THỨC TRIỆU HỒI BÍ ẨN ✨";
    const subHint = "Tinh tú đang hội tụ vào Ấn Ký Triệu Hồi...";

    this.stageEl.innerHTML = `
      <div class="gacha-charge-wrap" style="--orb-c1:${pal.primary};--orb-c2:${pal.secondary};--orb-glow:${pal.glow}">
        <div class="gacha-godrays ${this.hasMythicPet ? "is-mythic" : this.hasHighPet ? "is-epic" : ""}" style="--ray-c1:${pal.primary};--ray-c2:${pal.secondary}"></div>
        <div class="gacha-astrolabe-stage" style="color:${pal.primary}">
          ${ASTROLABE_OUTER_SVG}
          ${ASTROLABE_INNER_SVG}
          <div class="gacha-summon-orb">
            ${CRYSTAL_CORE_SVG}
          </div>
        </div>
        <div class="gacha-charge-title">${orbLabel}</div>
        <div class="gacha-charge-sub">${subHint}</div>
        <button id="btn-gacha-skip" class="gacha-skip-btn" type="button">⏩ Bỏ qua</button>
      </div>
    `;
    this.stageEl.querySelector("#btn-gacha-skip")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.clearTimers();
      this.beginRevealPhase(true);
    });
  }

  private beginRevealPhase(instant: boolean): void {
    this.activePhase = "revealing";
    this.meteors.length = 0;
    this.triggerFlash(this.hasMythicPet ? "is-mythic" : this.hasHighPet ? "is-epic" : "is-normal");
    this.spawnCenterExplosion(
      this.hasMythicPet ? 95 : this.hasHighPet ? 70 : 42,
      RARITY_PALETTE[this.highestRarity].colors,
    );

    const gold = this.callbacks.getGold();
    const canRoll = this.callbacks.canRoll();
    const can1 = canRoll && gold >= PET_GACHA_COST_GOLD;
    const can5 = canRoll && gold >= PET_GACHA_COST_GOLD * 5;

    const isSingle = this.currentOutcomes.length === 1;
    const gridClass = isSingle ? "gacha-reveal-grid is-single" : "gacha-reveal-grid is-multi";
    const cardsHtml = this.currentOutcomes
      .map((out, idx) => this.buildCardHtml(out, idx, isSingle, instant))
      .join("");

    const pal = RARITY_PALETTE[this.highestRarity];
    const initialBannerText = instant
      ? this.getFinalBannerText()
      : isSingle
        ? "🔮 ĐANG GIẢI ẤN THẺ TRIỆU HỒI..."
        : "🔮 ĐANG GIẢI ẤN LẦN LƯỢT 5 THẺ...";
    const initialBannerCls = instant
      ? this.hasMythicPet
        ? "is-mythic"
        : this.hasHighPet
          ? "is-epic"
          : "is-normal"
      : "is-normal";

    this.stageEl.innerHTML = `
      <div class="gacha-reveal-wrap">
        <div class="gacha-bg-godrays ${this.hasMythicPet ? "is-mythic" : this.hasHighPet ? "is-epic" : ""}" style="--ray-c1:${pal.primary};--ray-c2:${pal.secondary}"></div>
        <div id="gacha-top-banner" class="gacha-top-banner ${initialBannerCls}">${initialBannerText}</div>
        <div class="${gridClass}" id="gacha-cards-grid">${cardsHtml}</div>
        <div class="gacha-reveal-footer">
          <div class="gacha-wallet-pill">🪙 Ví: <strong>${gold.toLocaleString("vi-VN")} Vàng</strong></div>
          <div id="gacha-unseal-skip-wrap" class="gacha-reveal-btns ${instant ? "is-hidden" : ""}">
            <button id="btn-cinema-skip-all" class="gacha-skip-btn" type="button">⏩ Mở nhanh tất cả</button>
          </div>
          <div id="gacha-final-btns" class="gacha-reveal-btns ${instant ? "" : "is-hidden"}">
            <button id="btn-cinema-roll-1" class="btn-card-primary gacha-act-btn" type="button" ${!can1 ? "disabled" : ""}>
              🎰 Quay 1 lần (${PET_GACHA_COST_GOLD.toLocaleString("vi-VN")}🪙)
            </button>
            <button id="btn-cinema-roll-5" class="btn-card-secondary gacha-act-btn" type="button" ${!can5 ? "disabled" : ""}>
              🎲 Quay 5 lần (${(PET_GACHA_COST_GOLD * 5).toLocaleString("vi-VN")}🪙)
            </button>
            <button id="btn-cinema-done" class="gacha-done-btn" type="button">✅ Xác nhận</button>
          </div>
        </div>
      </div>
    `;

    this.stageEl.querySelector("#btn-cinema-roll-1")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.callbacks.onRollAgain(1);
    });
    this.stageEl.querySelector("#btn-cinema-roll-5")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.callbacks.onRollAgain(5);
    });
    this.stageEl.querySelector("#btn-cinema-done")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.close();
    });

    const cardEls = Array.from(this.stageEl.querySelectorAll<HTMLElement>(".gacha-card"));

    const finishAllInstant = (): void => {
      this.clearTimers();
      cardEls.forEach((el, idx) => {
        el.classList.remove("is-loading");
        el.classList.add("is-unsealed");
        const pctEl = el.querySelector(".gacha-seal-pct");
        if (pctEl) pctEl.textContent = "100%";
        if (idx === 0 && !instant) {
          this.spawnCenterExplosion(
            this.hasMythicPet ? 95 : this.hasHighPet ? 70 : 40,
            RARITY_PALETTE[this.highestRarity].colors,
          );
        }
      });
      this.onAllCardsUnsealed();
    };

    this.stageEl.querySelector("#btn-cinema-skip-all")?.addEventListener("click", (e) => {
      e.stopPropagation();
      finishAllInstant();
    });

    if (instant) {
      this.onAllCardsUnsealed();
      return;
    }

    // Giải ấn từng thẻ tuần tự: thẻ càng hiếm loading càng lâu, càng nhiều aura màu sắc!
    let cursorMs = 120;
    cardEls.forEach((cardEl, idx) => {
      const out = this.currentOutcomes[idx];
      const loadMs = this.getCardLoadDurationMs(out);
      const palCard = RARITY_PALETTE[out.rarity];
      const startAt = cursorMs;
      const finishAt = startAt + loadMs;

      // Bắt đầu pha loading cho thẻ idx
      const startTimer = window.setTimeout(() => {
        if (this.activePhase !== "revealing") return;
        cardEl.classList.add("is-loading");
        this.playChargeSfx(out.rarity, Math.min(1.4, loadMs / 1000));

        // Cập nhật % mượt mà & phun tia năng lượng đa sắc trong lúc loading (không tiết lộ trước tên hay Pet/Đồ!)
        const pctEl = cardEl.querySelector<HTMLElement>(".gacha-seal-pct");
        const statusEl = cardEl.querySelector<HTMLElement>(".seal-status-text");
        if (statusEl) statusEl.textContent = "Đang giải ấn...";
        const t0 = performance.now();
        const sparkCount = out.rarity === "S" ? 6 : out.rarity === "A" ? 4 : out.rarity === "B" ? 2 : 1;
        const tickId = window.setInterval(() => {
          if (this.activePhase !== "revealing" || cardEl.classList.contains("is-unsealed")) {
            window.clearInterval(tickId);
            return;
          }
          const frac = Math.min(1, (performance.now() - t0) / loadMs);
          if (pctEl) {
            pctEl.textContent = `${Math.round(frac * 100)}%`;
          }
          // Escalate thẻ A/S khi nạp qua 55% -> rung mạnh & phun hạt cầu vồng (vẫn giữ bí ẩn tên/loại thẻ!)
          if (frac >= 0.55 && (out.rarity === "A" || out.rarity === "S")) {
            cardEl.classList.add("is-overcharged");
            if (statusEl) {
              statusEl.textContent =
                out.rarity === "S" ? "✨ Năng lượng cực đại..." : "✨ Dao động mạnh...";
            }
          }
          const rect = cardEl.getBoundingClientRect();
          if (rect.width > 0) {
            this.spawnSealChargeSparks(
              rect.left + rect.width * 0.5,
              rect.top + rect.height * 0.45,
              sparkCount,
              palCard.colors,
            );
          }
        }, 70);
        this.timers.push(tickId);
      }, startAt);
      this.timers.push(startTimer);

      // Hoàn tất loading -> nổ bung giải ấn thẻ idx!
      const doneTimer = window.setTimeout(() => {
        if (this.activePhase !== "revealing") return;
        cardEl.classList.remove("is-loading", "is-overcharged");
        cardEl.classList.add("is-unsealed");
        const rect = cardEl.getBoundingClientRect();
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.5;
        const isPetCard = out.kind === "pet";
        const baseBurst =
          out.rarity === "S" ? 72 : out.rarity === "A" ? 48 : out.rarity === "B" ? 24 : 14;
        const burstCount = isPetCard ? Math.round(baseBurst * 1.45) : baseBurst;
        this.spawnPointExplosion(
          cx,
          cy,
          burstCount,
          palCard.colors,
          isPetCard || out.rarity === "A" || out.rarity === "S",
        );

        if (isPetCard && out.rarity === "S") {
          this.triggerFlash("is-mythic");
          this.playMythicFanfareSfx();
        } else if (isPetCard && out.rarity === "A") {
          this.triggerFlash("is-epic");
          this.playEpicFanfareSfx();
        } else if (isPetCard) {
          // Hiệu ứng đặc biệt khi ra Pet (kể cả C/B): flash sáng nhẹ + sóng xung kích kép + tiếng chuông linh thú
          this.triggerFlash("is-normal");
          this.spawnPointExplosion(cx, cy, 18, ["#fef08a", "#ffffff", palCard.primary], true);
          this.playPetChimeSfx(out.rarity === "B" ? 660 : 540);
        } else if (out.rarity === "S") {
          this.triggerFlash("is-mythic");
          this.playMythicFanfareSfx();
        } else if (out.rarity === "A") {
          this.triggerFlash("is-epic");
          this.playEpicFanfareSfx();
        } else {
          this.playPopSfx(out.rarity === "B" ? 600 : 440 + idx * 35);
        }

        if (idx === cardEls.length - 1) {
          this.onAllCardsUnsealed();
        }
      }, finishAt);
      this.timers.push(doneTimer);

      // Thẻ tiếp theo nối nhịp ngay sau khi thẻ trước giải ấn (thẻ hiếm nghỉ thêm 140ms để thưởng thức hào quang!)
      cursorMs = finishAt + (out.rarity === "S" ? 260 : out.rarity === "A" ? 180 : 90);
    });
  }

  private getFinalBannerText(): string {
    if (this.hasMythicPet) return "👑 HUYỀN THOẠI GIÁNG LÂM • PET HẠNG S 👑";
    if (this.hasHighPet) return "🌟 SỬ THI TỎA SÁNG • PET HẠNG A 🌟";
    if (this.hasAnyPet) return "🐾 CHÚC MỪNG TRIỆU HỒI ĐƯỢC THÚ CƯNG! 🐾";
    return this.currentTimes === 5 ? "🌠 KẾT QUẢ TRIỆU HỒI 5 LẦN" : "📦 KẾT QUẢ TRIỆU HỒI";
  }

  private onAllCardsUnsealed(): void {
    this.activePhase = "done";
    const banner = this.stageEl.querySelector<HTMLElement>("#gacha-top-banner");
    if (banner) {
      banner.textContent = this.getFinalBannerText();
      banner.className = `gacha-top-banner ${
        this.hasMythicPet ? "is-mythic" : this.hasHighPet ? "is-epic" : "is-normal"
      }`;
    }
    this.stageEl.querySelector("#gacha-unseal-skip-wrap")?.classList.add("is-hidden");
    this.stageEl.querySelector("#gacha-final-btns")?.classList.remove("is-hidden");

    if (this.hasHighPet) {
      const ambientId = window.setInterval(() => {
        if (this.activePhase === "idle") return;
        const w = this.canvasEl.width;
        const h = this.canvasEl.height;
        const colors = this.hasMythicPet ? RARITY_PALETTE.S.colors : RARITY_PALETTE.A.colors;
        for (let i = 0; i < (this.hasMythicPet ? 5 : 3); i++) {
          this.particles.push({
            x: Math.random() * w,
            y: h * (0.18 + Math.random() * 0.72),
            vx: (Math.random() - 0.5) * 36,
            vy: -28 - Math.random() * 58,
            size: 2.6 + Math.random() * 3.8,
            alpha: 0.92,
            life: 0,
            maxLife: 1.15 + Math.random() * 0.95,
            color: colors[Math.floor(Math.random() * colors.length)],
            shape: "star",
            spin: (Math.random() - 0.5) * 6,
            angle: Math.random() * Math.PI * 2,
          });
        }
      }, 125);
      this.timers.push(ambientId);
    }
  }

  private buildCardHtml(
    out: GachaRollOutcome,
    idx: number,
    isSingle: boolean,
    instant: boolean,
  ): string {
    const pal = RARITY_PALETTE[out.rarity];
    const loadMs = this.getCardLoadDurationMs(out);
    const isPet = out.kind === "pet";
    const isPetA = isPet && out.rarity === "A";
    const isPetS = isPet && out.rarity === "S";
    const iconSrc = isPet ? (out.pet.playIconSrc ?? out.pet.iconSrc) : out.item.iconSrc;
    const title = isPet ? `${out.pet.emoji} ${out.pet.name}` : out.item.name;
    const badgeText = isPet ? `PET ${out.rarity}` : `VẬT PHẨM ${out.rarity}`;

    let detailText = "";
    if (isPet) {
      detailText = out.isDuplicate
        ? `Trùng Pet • Hoàn +${out.refundGold.toLocaleString("vi-VN")}🪙`
        : formatPetBonusSummary(out.pet.bonuses);
    } else {
      detailText =
        out.storedWhere === "backpack"
          ? "Đã cất vào Balo"
          : out.storedWhere === "home"
            ? "Balo đầy • Gửi Kho Nhà"
            : `Tự bán +${out.overflowGold.toLocaleString("vi-VN")}🪙`;
    }

    const extraClass = [
      "gacha-card",
      `rarity-${out.rarity.toLowerCase()}`,
      isPet ? "is-pet" : "is-item",
      isPetA ? "has-aura-a" : "",
      isPetS ? "has-aura-s" : "",
      isSingle ? "is-hero-card" : "",
      instant ? "is-unsealed" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const auraHtml = isPetS
      ? `<div class="gacha-pet-aura is-s" style="color:#fde047"><span class="aura-rays"></span>${HALO_RUNE_SVG}<span class="aura-ring"></span><span class="aura-ring-2"></span></div>`
      : isPetA
        ? `<div class="gacha-pet-aura is-a" style="color:#e879f9"><span class="aura-rays"></span>${HALO_RUNE_SVG}<span class="aura-ring"></span></div>`
        : isPet
          ? `<div class="gacha-pet-aura is-soft"></div>`
          : "";

    // Lớp aura đa sắc phía sau vòng tròn loading (càng hiếm càng nhiều tầng hào quang!)
    const sealAuraLayers =
      out.rarity === "S"
        ? `<span class="seal-aura-prismatic is-s"></span><span class="seal-aura-rays is-s"></span>${HALO_RUNE_SVG}`
        : out.rarity === "A"
          ? `<span class="seal-aura-prismatic is-a"></span><span class="seal-aura-rays is-a"></span>${HALO_RUNE_SVG}`
          : out.rarity === "B"
            ? `<span class="seal-aura-prismatic is-b"></span>`
            : `<span class="seal-aura-prismatic is-c"></span>`;

    // Không tiết lộ trước tên vật phẩm, Pet hay hạng thẻ trước khi mở — chỉ hiển thị phong ấn bí ẩn!
    const sealEmblem = "❓";
    const sealHintLabel = "THẺ BÍ ẨN";
    const sealStatusLabel = "Chờ giải ấn...";

    const petOrbitWispsHtml = isPet
      ? `<div class="seal-pet-orbit"><span class="seal-pet-wisp is-w1"></span><span class="seal-pet-wisp is-w2"></span></div>`
      : "";

    const petBeamHtml = isPet
      ? `<div class="gacha-pet-beam"></div>`
      : "";

    const petPedestalHtml = isPet
      ? `<div class="gacha-pet-pedestal"></div>`
      : "";

    const newBadge =
      isPet && !out.isDuplicate ? `<span class="gacha-new-pill">NEW!</span>` : "";

    return `
      <div class="${extraClass}" data-idx="${idx}" style="--card-c1:${pal.primary};--card-c2:${pal.secondary};--card-c3:${pal.tertiary};--card-glow:${pal.glow};--load-ms:${loadMs}ms">
        <!-- MẶT PHONG ẤN ĐANG LOADING DẦN DẦN -->
        <div class="gacha-card-seal">
          <div class="seal-bg-aura" style="color:${pal.primary}">${sealAuraLayers}</div>
          <div class="seal-rarity-hint">${sealHintLabel}</div>
          <div class="seal-ring-wrap">
            ${petOrbitWispsHtml}
            <svg class="seal-progress-svg" viewBox="0 0 84 84" aria-hidden="true">
              <circle class="seal-ring-track" cx="42" cy="42" r="36" />
              <circle class="seal-ring-fill" cx="42" cy="42" r="36" />
            </svg>
            <div class="seal-center-core">
              <span class="seal-emblem">${sealEmblem}</span>
              <span class="gacha-seal-pct">0%</span>
            </div>
          </div>
          <div class="seal-status-text">${sealStatusLabel}</div>
          <div class="seal-bar-track">
            <div class="seal-bar-fill"></div>
          </div>
        </div>

        <!-- MẶT KẾT QUẢ SAU KHI LOADING 100% -->
        <div class="gacha-card-face">
          ${petBeamHtml}
          <div class="gacha-card-pillar"></div>
          <div class="gacha-card-shine"></div>
          <div class="gacha-card-top">
            <span class="gacha-rarity-tag">${badgeText}</span>
            ${newBadge}
          </div>
          <div class="gacha-card-art">
            ${auraHtml}
            ${petPedestalHtml}
            <img class="gacha-card-img ${isPet ? "is-pet-gif" : ""}" src="${iconSrc}" alt="${title}" />
          </div>
          <div class="gacha-card-name">${title}</div>
          <div class="gacha-card-sub">${detailText}</div>
        </div>
      </div>
    `;
  }

  private triggerFlash(cls: string): void {
    this.flashEl.className = `gacha-cinema-flash ${cls}`;
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add("is-active");
  }

  private resizeCanvas(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvasEl.width = Math.max(1, Math.floor(window.innerWidth * dpr));
    this.canvasEl.height = Math.max(1, Math.floor(window.innerHeight * dpr));
    this.canvasEl.style.width = `${window.innerWidth}px`;
    this.canvasEl.style.height = `${window.innerHeight}px`;
  }

  private spawnConvergingParticles(count: number): void {
    const w = this.canvasEl.width;
    const h = this.canvasEl.height;
    const cx = w * 0.5;
    const cy = h * 0.46;
    const colors = RARITY_PALETTE[this.highestRarity].colors;
    const radius = Math.min(w, h) * 0.46;

    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = radius * (0.62 + Math.random() * 0.52);
      const sx = cx + Math.cos(ang) * dist;
      const sy = cy + Math.sin(ang) * dist;
      const speed = dist / 0.52;
      this.particles.push({
        x: sx,
        y: sy,
        vx: -Math.cos(ang) * speed,
        vy: -Math.sin(ang) * speed,
        size: 2.2 + Math.random() * 3.4,
        alpha: 0.95,
        life: 0,
        maxLife: 0.48 + Math.random() * 0.18,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: Math.random() > 0.42 ? "streak" : "star",
        spin: 5,
        angle: ang,
      });
    }
  }

  private spawnSealChargeSparks(
    screenX: number,
    screenY: number,
    count: number,
    colors: string[],
  ): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const cx = screenX * dpr;
    const cy = screenY * dpr;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = (34 + Math.random() * 44) * dpr;
      this.particles.push({
        x: cx + Math.cos(ang) * dist,
        y: cy + Math.sin(ang) * dist,
        vx: -Math.cos(ang) * (55 * dpr) + (Math.random() - 0.5) * 28,
        vy: -Math.sin(ang) * (55 * dpr) - 24 * dpr,
        size: (2.0 + Math.random() * 2.8) * dpr,
        alpha: 0.92,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.25,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: "star",
        spin: (Math.random() - 0.5) * 8,
        angle: Math.random() * Math.PI * 2,
      });
    }
  }

  private spawnCenterExplosion(count: number, colors: string[]): void {
    this.spawnPointExplosion(window.innerWidth * 0.5, window.innerHeight * 0.46, count, colors, true);
  }

  private spawnPointExplosion(
    screenX: number,
    screenY: number,
    count: number,
    colors: string[],
    withShockwave = false,
  ): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const cx = screenX * dpr;
    const cy = screenY * dpr;
    if (withShockwave) {
      this.particles.push({
        x: cx,
        y: cy,
        vx: 0,
        vy: 0,
        size: 18 * dpr,
        alpha: 0.92,
        life: 0,
        maxLife: 0.62,
        color: colors[0],
        shape: "ring",
        spin: 0,
        angle: 0,
      });
    }
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (110 + Math.random() * 420) * dpr;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 60 * dpr,
        size: (2.4 + Math.random() * 4.2) * dpr,
        alpha: 1,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.85,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: Math.random() > 0.32 ? "star" : "dot",
        spin: (Math.random() - 0.5) * 10,
        angle: Math.random() * Math.PI * 2,
      });
    }
  }

  private startLoop(): void {
    if (this.rafId !== null) return;
    this.lastFrameAt = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameAt) / 1000));
      this.lastFrameAt = now;
      this.elapsedSec += dt;
      this.renderFrame(dt);
      this.rafId = window.requestAnimationFrame(tick);
    };
    this.rafId = window.requestAnimationFrame(tick);
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
  }

  private renderFrame(dt: number): void {
    const ctx = this.ctx;
    const w = this.canvasEl.width;
    const h = this.canvasEl.height;
    ctx.clearRect(0, 0, w, h);

    for (const s of this.bgStars) {
      const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(this.elapsedSec * s.speed + s.phase));
      ctx.fillStyle = `rgba(226, 232, 240, ${a.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const m of this.meteors) {
      if (this.elapsedSec < m.delay || m.impacted) continue;
      m.progress = Math.min(1, m.progress + dt / m.duration);
      const ease = 1 - Math.pow(1 - m.progress, 2.2);
      const curX = m.startX + (m.endX - m.startX) * ease;
      const curY = m.startY + (m.endY - m.startY) * ease;
      const tailEase = Math.max(0, ease - 0.24);
      const tailX = m.startX + (m.endX - m.startX) * tailEase;
      const tailY = m.startY + (m.endY - m.startY) * tailEase;

      const grad = ctx.createLinearGradient(tailX, tailY, curX, curY);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.55, m.color);
      grad.addColorStop(1, m.coreColor);

      ctx.save();
      ctx.lineCap = "round";
      ctx.strokeStyle = grad;
      ctx.lineWidth = m.width;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(curX, curY);
      ctx.stroke();

      ctx.fillStyle = m.coreColor;
      ctx.shadowColor = m.color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(curX, curY, m.width * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (Math.random() < 0.7) {
        this.particles.push({
          x: curX + (Math.random() - 0.5) * 10,
          y: curY + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 45,
          vy: (Math.random() - 0.5) * 45,
          size: 2 + Math.random() * 2.5,
          alpha: 0.9,
          life: 0,
          maxLife: 0.42,
          color: m.color,
          shape: "star",
          spin: 5,
          angle: Math.random() * Math.PI * 2,
        });
      }

      if (m.progress >= 1 && !m.impacted) {
        m.impacted = true;
        this.particles.push({
          x: m.endX,
          y: m.endY,
          vx: 0,
          vy: 0,
          size: 16,
          alpha: 0.85,
          life: 0,
          maxLife: 0.45,
          color: m.color,
          shape: "ring",
          spin: 0,
          angle: 0,
        });
      }
    }

    const next: SparkParticle[] = [];
    for (const p of this.particles) {
      p.life += dt;
      if (p.life >= p.maxLife) continue;
      const t = p.life / p.maxLife;
      const alpha = p.alpha * (1 - t);

      if (p.shape === "ring") {
        const radius = p.size + t * Math.min(w, h) * 0.36;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.5, 5.5 * (1 - t));
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        next.push(p);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (this.activePhase !== "charging") {
        p.vx *= 0.965;
        p.vy = p.vy * 0.965 + 150 * dt;
      }
      p.angle += p.spin * dt;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      if (p.shape === "star") {
        const s = p.size * (1 - t * 0.32);
        ctx.beginPath();
        ctx.moveTo(0, -s * 1.45);
        ctx.lineTo(s * 0.36, -s * 0.36);
        ctx.lineTo(s * 1.45, 0);
        ctx.lineTo(s * 0.36, s * 0.36);
        ctx.lineTo(0, s * 1.45);
        ctx.lineTo(-s * 0.36, s * 0.36);
        ctx.lineTo(-s * 1.45, 0);
        ctx.lineTo(-s * 0.36, -s * 0.36);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === "streak") {
        ctx.lineWidth = Math.max(1.5, p.size * 0.55);
        ctx.beginPath();
        ctx.moveTo(-p.size * 3.8, 0);
        ctx.lineTo(p.size * 1.6, 0);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.78, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      next.push(p);
    }
    this.particles = next;
  }

  private clearTimers(): void {
    for (const id of this.timers) {
      window.clearTimeout(id);
      window.clearInterval(id);
    }
    this.timers.length = 0;
  }

  private getAudio(): AudioContext | null {
    if (!this.callbacks.isSoundEnabled()) return null;
    try {
      if (!this.audioCtx) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.audioCtx = new Ctor();
      }
      if (this.audioCtx.state === "suspended") {
        void this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  private playMeteorWhooshSfx(): void {
    const ctx = this.getAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.5);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.54);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.56);
  }

  private playChargeSfx(rarity: ItemRarity, durSec: number): void {
    const ctx = this.getAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dur = Math.max(0.32, Math.min(1.8, durSec));
    const endFreq = rarity === "S" ? 1180 : rarity === "A" ? 880 : rarity === "B" ? 640 : 480;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = rarity === "S" || rarity === "A" ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(rarity === "S" ? 0.065 : 0.045, now + dur * 0.45);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.04);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.06);
  }

  private playPopSfx(freq: number): void {
    const ctx = this.getAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.38, now + 0.14);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  private playPetChimeSfx(baseFreq: number): void {
    const ctx = this.getAudio();
    if (!ctx) return;
    const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2];
    const now = ctx.currentTime;
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const t = now + i * 0.065;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.11, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  private playEpicFanfareSfx(): void {
    const ctx = this.getAudio();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const now = ctx.currentTime;
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t = now + i * 0.08;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.11, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.46);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  private playMythicFanfareSfx(): void {
    const ctx = this.getAudio();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    const now = ctx.currentTime;
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i >= 3 ? "sine" : "triangle";
      const t = now + i * 0.075;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.13, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.68);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.72);
    });
  }
}
