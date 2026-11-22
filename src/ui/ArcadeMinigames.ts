export type ArcadeMinigameKind = "memory_cards" | "lockpick" | "timing_bar";

export type ArcadeMode = "free" | "police";
export type ArcadeDifficulty = "normal" | "hard" | "nightmare";

export const ARCADE_MINIGAME_META: Record<
  ArcadeMinigameKind,
  { badge: string; title: string; guideFree: string; guidePolice: string }
> = {
  memory_cards: {
    badge: "🃏 LẬT THẺ CẶP",
    title: "Lật Thẻ Ghép Cặp",
    guideFree: "Tìm đủ các cặp biểu tượng giống nhau. Sai quá lượt sẽ xáo lại bàn thẻ!",
    guidePolice: "Tìm đủ các cặp giống nhau trước khi hết lượt sai cho phép!",
  },
  lockpick: {
    badge: "🔓 BẺ KHÓA CƠ HỌC",
    title: "Căn Nhịp Bẻ Khóa Chốt Thép",
    guideFree: "Chạm Đẩy Chốt đúng lúc vào vùng xanh. Trượt tụt chốt, trượt 2 lần sập lẫy!",
    guidePolice: "Đẩy trúng toàn bộ chốt vào vùng xanh. Trượt quá giới hạn sẽ bị bắt!",
  },
  timing_bar: {
    badge: "🎯 CHẶN THANH TRƯỢT",
    title: "Chặn Thanh Trượt Chính Xác",
    guideFree: "Chạm Chặn Thanh trúng vùng xanh đủ số lần. Trượt bị tụt điểm!",
    guidePolice: "Chặn trúng vùng xanh đủ số lần trước khi hết lượt sai!",
  },
};

export interface ArcadeSessionOptions {
  kind: ArcadeMinigameKind;
  mode: ArcadeMode;
  difficulty?: ArcadeDifficulty;
  extraMisses?: number;
  seed?: number;
  boardEl: HTMLElement;
  statusEl: HTMLElement;
  onWin: () => void;
  onFail: () => void;
}

const ALL_CARD_SYMBOLS = ["💎", "🔑", "💰", "🛡️", "⚡", "🔥", "👑", "⚔️"];

function createArcadeRng(seed?: number): () => number {
  if (typeof seed !== "number" || !Number.isFinite(seed)) {
    return () => Math.random();
  }
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleCopy<T>(items: readonly T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class ArcadeMinigameController {
  private readonly opts: ArcadeSessionOptions;
  private readonly difficulty: ArcadeDifficulty;
  private readonly rng: () => number;
  private rafId: number | null = null;
  private timeoutIds: number[] = [];
  private finished = false;
  private actionBtn: HTMLButtonElement | null = null;
  private triggerActionFn: (() => void) | null = null;

  constructor(opts: ArcadeSessionOptions) {
    this.opts = opts;
    this.difficulty = opts.difficulty ?? "normal";
    this.rng = createArcadeRng(opts.seed);
    this.mount();
  }

  public handleKeyDown(e: KeyboardEvent): boolean {
    if (this.finished) return false;
    if (e.code === "Space" && this.triggerActionFn) {
      e.preventDefault();
      this.triggerActionFn();
      return true;
    }
    return false;
  }

  public destroy(): void {
    this.finished = true;
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    for (const tid of this.timeoutIds) {
      window.clearTimeout(tid);
    }
    this.timeoutIds = [];
    this.triggerActionFn = null;
    this.actionBtn = null;
    for (const cv of this.opts.boardEl.querySelectorAll("canvas")) {
      cv.width = 0;
      cv.height = 0;
    }
    this.opts.boardEl.replaceChildren();
  }

  private mount(): void {
    this.opts.boardEl.replaceChildren();
    if (this.opts.kind === "memory_cards") {
      this.mountMemoryCards();
    } else if (this.opts.kind === "lockpick") {
      this.mountLockpick();
    } else {
      this.mountTimingBar();
    }
  }

  private finishWin(): void {
    if (this.finished) return;
    this.finished = true;
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.actionBtn) this.actionBtn.disabled = true;
    this.opts.onWin();
  }

  private finishFail(): void {
    if (this.finished) return;
    this.finished = true;
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.actionBtn) this.actionBtn.disabled = true;
    this.opts.onFail();
  }

  // -------------------- 1. MEMORY CARDS (6 PAIRS NORMAL / 8 PAIRS HARD+) --------------------

  private mountMemoryCards(): void {
    const pairCount = this.difficulty === "normal" ? 6 : 8;
    const symbols = ALL_CARD_SYMBOLS.slice(0, pairCount);
    let cards = shuffleCopy([...symbols, ...symbols], this.rng).map((sym, idx) => ({
      idx,
      sym,
      flipped: false,
      matched: false,
    }));
    let firstIdx: number | null = null;
    let compareLocked = false;
    let matchedPairs = 0;
    let misses = 0;
    const baseMaxMisses =
      this.opts.mode === "police"
        ? this.difficulty === "nightmare"
          ? 4
          : this.difficulty === "hard"
            ? 5
            : 7
        : this.difficulty === "nightmare"
          ? 5
          : this.difficulty === "hard"
            ? 6
            : 0;
    const maxMisses = baseMaxMisses > 0 ? baseMaxMisses + (this.opts.extraMisses ?? 0) : 0;

    const grid = document.createElement("div");
    grid.className = "arc-cards-grid";

    const updateStatus = (extra = ""): void => {
      if (maxMisses > 0) {
        this.opts.statusEl.textContent = `🃏 Đã ghép: ${matchedPairs}/${pairCount} cặp • Sai: ${misses}/${maxMisses}${extra}`;
      } else {
        this.opts.statusEl.textContent = `🃏 Đã ghép: ${matchedPairs}/${pairCount} cặp • Không giới hạn thời gian${extra}`;
      }
    };

    const syncButtons = (): void => {
      const btns = grid.querySelectorAll<HTMLButtonElement>(".arc-card-btn");
      btns.forEach((btn, i) => {
        const c = cards[i];
        const open = c.flipped || c.matched;
        btn.classList.toggle("is-open", open);
        btn.classList.toggle("is-matched", c.matched);
        btn.textContent = open ? c.sym : "❓";
        btn.disabled = this.finished || c.matched;
      });
    };

    for (let i = 0; i < cards.length; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "arc-card-btn";
      btn.textContent = "❓";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const card = cards[i];
        if (!card || this.finished || compareLocked || card.flipped || card.matched) return;
        card.flipped = true;
        syncButtons();

        if (firstIdx === null) {
          firstIdx = i;
          return;
        }

        const prev = cards[firstIdx];
        firstIdx = null;
        if (prev.sym === card.sym) {
          prev.matched = true;
          card.matched = true;
          matchedPairs++;
          syncButtons();
          updateStatus(" • ✅ Khớp cặp!");
          if (matchedPairs >= pairCount) {
            this.finishWin();
          }
          return;
        }

        misses++;
        compareLocked = true;
        updateStatus(" • Chưa khớp");
        if (maxMisses > 0 && misses >= maxMisses) {
          if (this.opts.mode === "police") {
            const tid = window.setTimeout(() => {
              compareLocked = false;
              this.finishFail();
            }, 340);
            this.timeoutIds.push(tid);
            return;
          }

          // Chest / Vault hard lock: reset & reshuffle board when miss limit reached
          const tid = window.setTimeout(() => {
            cards = shuffleCopy([...symbols, ...symbols], this.rng).map((sym, idx) => ({
              idx,
              sym,
              flipped: false,
              matched: false,
            }));
            firstIdx = null;
            matchedPairs = 0;
            misses = 0;
            compareLocked = false;
            syncButtons();
            updateStatus(" • ⚠️ Sai quá lượt — Đã xáo lại bàn thẻ!");
          }, 480);
          this.timeoutIds.push(tid);
          return;
        }

        const flipDelayMs = this.difficulty === "normal" ? 520 : 400;
        const tid = window.setTimeout(() => {
          prev.flipped = false;
          card.flipped = false;
          compareLocked = false;
          syncButtons();
        }, flipDelayMs);
        this.timeoutIds.push(tid);
      });
      grid.appendChild(btn);
    }

    updateStatus();
    this.opts.boardEl.appendChild(grid);
  }

  // -------------------- 2. LOCKPICK (4 PINS NORMAL / 5 PINS HARD+) --------------------

  private mountLockpick(): void {
    const isHardPlus = this.difficulty !== "normal";
    const pinCount = isHardPlus ? 5 : 4;
    const zoneHeightPct =
      this.difficulty === "nightmare" ? 19 : this.difficulty === "hard" ? 21 : 27;
    const pins = Array.from({ length: pinCount }, (_, i) => ({
      targetTopPct: 12 + Math.floor(this.rng() * (88 - zoneHeightPct - 12)),
      speed:
        this.difficulty === "nightmare"
          ? 1.18 + i * 0.20
          : this.difficulty === "hard"
            ? 1.08 + i * 0.18
            : 1.05 + i * 0.16,
      locked: false,
      valuePct: 50,
    }));
    let activePin = 0;
    let misses = 0;
    const baseMaxMisses = this.opts.mode === "police" ? (isHardPlus ? 2 : 3) : isHardPlus ? 2 : 0;
    const maxMisses = baseMaxMisses > 0 ? baseMaxMisses + (this.opts.extraMisses ?? 0) : 0;
    let phase = this.rng() * Math.PI * 2;
    let lastTs = performance.now();

    const wrap = document.createElement("div");
    wrap.className = "arc-lock-wrap";

    const chambersEl = document.createElement("div");
    chambersEl.className = `arc-lock-chambers${pinCount === 5 ? " is-5-pins" : ""}`;

    const cursorEls: HTMLDivElement[] = [];
    const chamberEls: HTMLDivElement[] = [];
    const badgeEls: HTMLDivElement[] = [];

    for (let i = 0; i < pinCount; i++) {
      const col = document.createElement("div");
      col.className = `arc-pin-col${i === 0 ? " is-active" : ""}`;

      const track = document.createElement("div");
      track.className = "arc-pin-track";

      const zone = document.createElement("div");
      zone.className = "arc-pin-zone";
      zone.style.top = `${pins[i].targetTopPct}%`;
      zone.style.height = `${zoneHeightPct}%`;

      const cursor = document.createElement("div");
      cursor.className = "arc-pin-cursor";
      cursor.style.top = "50%";

      const num = document.createElement("div");
      num.className = "arc-pin-badge";
      num.textContent = `#${i + 1}`;

      track.append(zone, cursor);
      col.append(track, num);
      chambersEl.appendChild(col);

      chamberEls.push(col);
      cursorEls.push(cursor);
      badgeEls.push(num);
    }

    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "btn-card-primary arc-action-btn";
    actionBtn.textContent = "🔨 ĐẨY CHỐT [Space / Chạm]";
    this.actionBtn = actionBtn;

    const updateStatus = (note = ""): void => {
      if (maxMisses > 0) {
        this.opts.statusEl.textContent = `🔓 Đã mở: ${activePin}/${pinCount} chốt • Sai: ${misses}/${maxMisses}${note}`;
      } else {
        this.opts.statusEl.textContent = `🔓 Đã mở: ${activePin}/${pinCount} chốt • Trượt thử lại không bị phạt${note}`;
      }
    };

    const syncPinStyles = (): void => {
      for (let i = 0; i < pinCount; i++) {
        chamberEls[i].classList.toggle("is-locked", pins[i].locked);
        chamberEls[i].classList.toggle("is-active", i === activePin);
        badgeEls[i].textContent = pins[i].locked ? "✓" : `#${i + 1}`;
      }
    };

    const attemptPin = (): void => {
      if (this.finished || activePin >= pinCount) return;
      const p = pins[activePin];
      const tol = isHardPlus ? 1 : 2;
      const hit = p.valuePct >= p.targetTopPct - tol && p.valuePct <= p.targetTopPct + zoneHeightPct + tol;
      if (hit) {
        p.locked = true;
        activePin++;
        if (activePin >= pinCount) {
          syncPinStyles();
          updateStatus(" • ✅ Mở khóa hoàn tất!");
          this.finishWin();
          return;
        }
        syncPinStyles();
        updateStatus(" • ✅ Vào khớp!");
        return;
      }

      misses++;
      chamberEls[activePin].classList.add("is-miss");
      const tid = window.setTimeout(() => {
        chamberEls.forEach((el) => el.classList.remove("is-miss"));
      }, 240);
      this.timeoutIds.push(tid);

      if (isHardPlus && activePin > 0) {
        activePin--;
        pins[activePin].locked = false;
        syncPinStyles();
      }

      if (this.opts.mode === "police" && misses >= maxMisses) {
        updateStatus(" • ❌ Gãy thanh dò!");
        this.finishFail();
        return;
      }

      if (this.opts.mode === "free" && isHardPlus && misses >= maxMisses) {
        for (const pin of pins) pin.locked = false;
        activePin = 0;
        misses = 0;
        syncPinStyles();
        updateStatus(" • 💥 Sập lẫy! Tụt về chốt #1!");
        return;
      }

      updateStatus(isHardPlus ? " • Trượt chốt, bị tụt!" : " • Chưa trúng vùng xanh, căn lại!");
    };

    this.triggerActionFn = attemptPin;
    actionBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      attemptPin();
    });
    chambersEl.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      attemptPin();
    });

    const tick = (now: number): void => {
      if (this.finished) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      if (activePin < pinCount) {
        phase += dt * pins[activePin].speed * Math.PI * 1.17;
        const pct = 8 + ((Math.sin(phase) + 1) * 0.5) * 84;
        pins[activePin].valuePct = pct;
        cursorEls[activePin].style.top = `${pct.toFixed(1)}%`;
      }
      this.rafId = window.requestAnimationFrame(tick);
    };

    updateStatus();
    wrap.append(chambersEl, actionBtn);
    this.opts.boardEl.appendChild(wrap);
    this.rafId = window.requestAnimationFrame(tick);
  }

  // -------------------- 3. TIMING BAR (3 HITS NORMAL / 5 HITS HARD+) --------------------

  private mountTimingBar(): void {
    const isHardPlus = this.difficulty !== "normal";
    const totalHits = isHardPlus ? 5 : 3;
    let hits = 0;
    let misses = 0;
    const baseMaxMisses = this.opts.mode === "police" ? (isHardPlus ? 2 : 3) : isHardPlus ? 3 : 0;
    const maxMisses = baseMaxMisses > 0 ? baseMaxMisses + (this.opts.extraMisses ?? 0) : 0;
    let cursorPct = 10;
    let dir = 1;
    let targetLeftPct = 36;
    let targetWidthPct = 24;
    let lastTs = performance.now();

    const wrap = document.createElement("div");
    wrap.className = "arc-timing-wrap";

    const pipsEl = document.createElement("div");
    pipsEl.className = "arc-timing-pips";
    const pipNodes: HTMLSpanElement[] = [];
    for (let i = 0; i < totalHits; i++) {
      const pip = document.createElement("span");
      pip.className = "arc-timing-pip";
      pip.textContent = `${i + 1}`;
      pipsEl.appendChild(pip);
      pipNodes.push(pip);
    }

    const track = document.createElement("div");
    track.className = "arc-timing-track";

    const targetZone = document.createElement("div");
    targetZone.className = "arc-timing-zone";

    const needle = document.createElement("div");
    needle.className = "arc-timing-needle";

    track.append(targetZone, needle);

    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "btn-card-primary arc-action-btn";
    actionBtn.textContent = "🎯 CHẶN THANH [Space / Chạm]";
    this.actionBtn = actionBtn;

    const rollZone = (): void => {
      targetWidthPct =
        this.difficulty === "nightmare"
          ? Math.max(14, 25 - hits * 2)
          : this.difficulty === "hard"
            ? Math.max(17, 28 - hits * 2)
            : Math.max(18, 28 - hits * 3);
      targetLeftPct = 10 + Math.floor(this.rng() * (90 - targetWidthPct - 10));
      targetZone.style.left = `${targetLeftPct}%`;
      targetZone.style.width = `${targetWidthPct}%`;
    };

    const syncPips = (): void => {
      for (let i = 0; i < totalHits; i++) {
        const hitDone = i < hits;
        pipNodes[i].classList.toggle("is-hit", hitDone);
        pipNodes[i].textContent = hitDone ? "✓" : `${i + 1}`;
      }
    };

    const updateStatus = (note = ""): void => {
      if (maxMisses > 0) {
        this.opts.statusEl.textContent = `🎯 Tiến độ: ${hits}/${totalHits} • Sai: ${misses}/${maxMisses}${note}`;
      } else {
        this.opts.statusEl.textContent = `🎯 Tiến độ: ${hits}/${totalHits} • Sai không bị phạt${note}`;
      }
    };

    const attemptStop = (): void => {
      if (this.finished) return;
      const tol = isHardPlus ? 0.8 : 1.5;
      const isHit = cursorPct >= targetLeftPct - tol && cursorPct <= targetLeftPct + targetWidthPct + tol;
      if (isHit) {
        hits++;
        syncPips();
        if (hits >= totalHits) {
          updateStatus(" • ✅ Chặn chuẩn xác!");
          this.finishWin();
          return;
        }
        if (isHardPlus) {
          dir = dir === 1 ? -1 : 1;
        }
        rollZone();
        updateStatus(" • ✅ Trúng mục tiêu!");
        return;
      }

      misses++;
      track.classList.add("is-miss");
      const tid = window.setTimeout(() => track.classList.remove("is-miss"), 240);
      this.timeoutIds.push(tid);

      if (isHardPlus && hits > 0) {
        hits--;
        syncPips();
      }

      if (this.opts.mode === "police" && misses >= maxMisses) {
        updateStatus(" • ❌ Trượt quá số lần!");
        this.finishFail();
        return;
      }

      if (this.opts.mode === "free" && isHardPlus && misses >= maxMisses) {
        hits = 0;
        misses = 0;
        syncPips();
        rollZone();
        updateStatus(" • 💥 Trượt 3 lần — Reset tiến độ về 0!");
        return;
      }

      updateStatus(isHardPlus ? " • Trượt! Bị trừ 1 điểm!" : " • Chưa trúng vùng xanh, bấm lại!");
    };

    this.triggerActionFn = attemptStop;
    actionBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      attemptStop();
    });
    track.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      attemptStop();
    });

    const tick = (now: number): void => {
      if (this.finished) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      const speedPctPerSec =
        this.difficulty === "nightmare"
          ? 90 + hits * 22
          : this.difficulty === "hard"
            ? 81 + hits * 20
            : (95 + hits * 24) * 0.81;
      cursorPct += dir * speedPctPerSec * dt;
      if (cursorPct >= 97) {
        cursorPct = 97;
        dir = -1;
      } else if (cursorPct <= 3) {
        cursorPct = 3;
        dir = 1;
      }
      needle.style.left = `${cursorPct.toFixed(1)}%`;
      this.rafId = window.requestAnimationFrame(tick);
    };

    rollZone();
    syncPips();
    updateStatus();
    wrap.append(pipsEl, track, actionBtn);
    this.opts.boardEl.appendChild(wrap);
    this.rafId = window.requestAnimationFrame(tick);
  }
}
