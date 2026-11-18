export type ArcadeMinigameKind = "memory_cards" | "lockpick" | "timing_bar";

export type ArcadeMode = "free" | "police";

export const ARCADE_MINIGAME_META: Record<
  ArcadeMinigameKind,
  { badge: string; title: string; guideFree: string; guidePolice: string }
> = {
  memory_cards: {
    badge: "🃏 LẬT THẺ CẶP",
    title: "Lật Thẻ Ghép Cặp",
    guideFree: "Tìm đủ 6 cặp biểu tượng giống nhau. Không giới hạn thời gian hay lượt thử!",
    guidePolice: "Tìm đủ 6 cặp giống nhau. Chỉ được phép ghép nhầm tối đa 7 lần!",
  },
  lockpick: {
    badge: "🔓 BẺ KHÓA CƠ HỌC",
    title: "Căn Nhịp Bẻ Khóa 4 Chốt",
    guideFree: "Chạm nút Đẩy Chốt (hoặc Space) đúng lúc vạch vào vùng xanh. Trượt thử lại thoải mái!",
    guidePolice: "Đẩy trúng 4 chốt vào vùng xanh. Trượt quá 3 lần sẽ tính sai lượt kiểm tra!",
  },
  timing_bar: {
    badge: "🎯 CHẶN THANH TRƯỢT",
    title: "Chặn Thanh Trượt Chính Xác",
    guideFree: "Chạm nút Chặn Thanh (hoặc Space) 3 lần trúng vùng xanh mục tiêu. Sai không bị phạt!",
    guidePolice: "Chặn trúng vùng xanh 3 lần. Trượt quá 3 lần sẽ tính sai lượt kiểm tra!",
  },
};

export interface ArcadeSessionOptions {
  kind: ArcadeMinigameKind;
  mode: ArcadeMode;
  boardEl: HTMLElement;
  statusEl: HTMLElement;
  onWin: () => void;
  onFail: () => void;
}

const CARD_SYMBOLS = ["💎", "🔑", "💰", "🛡️", "⚡", "🔥"];

function shuffleCopy<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class ArcadeMinigameController {
  private readonly opts: ArcadeSessionOptions;
  private rafId: number | null = null;
  private timeoutIds: number[] = [];
  private finished = false;
  private actionBtn: HTMLButtonElement | null = null;
  private triggerActionFn: (() => void) | null = null;

  constructor(opts: ArcadeSessionOptions) {
    this.opts = opts;
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

  // -------------------- 1. MEMORY CARDS (4x3 = 6 PAIRS) --------------------

  private mountMemoryCards(): void {
    const cards = shuffleCopy([...CARD_SYMBOLS, ...CARD_SYMBOLS]).map((sym, idx) => ({
      idx,
      sym,
      flipped: false,
      matched: false,
    }));
    let firstIdx: number | null = null;
    let compareLocked = false;
    let matchedPairs = 0;
    let misses = 0;
    const maxMisses = 7;

    const grid = document.createElement("div");
    grid.className = "arc-cards-grid";

    const updateStatus = (extra = ""): void => {
      if (this.opts.mode === "police") {
        this.opts.statusEl.textContent = `🃏 Đã ghép: ${matchedPairs}/6 cặp • Sai: ${misses}/${maxMisses}${extra}`;
      } else {
        this.opts.statusEl.textContent = `🃏 Đã ghép: ${matchedPairs}/6 cặp • Không giới hạn thời gian${extra}`;
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

    for (const card of cards) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "arc-card-btn";
      btn.textContent = "❓";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.finished || compareLocked || card.flipped || card.matched) return;
        card.flipped = true;
        syncButtons();

        if (firstIdx === null) {
          firstIdx = card.idx;
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
          if (matchedPairs >= CARD_SYMBOLS.length) {
            this.finishWin();
          }
          return;
        }

        misses++;
        compareLocked = true;
        updateStatus(" • Chưa khớp");
        if (this.opts.mode === "police" && misses >= maxMisses) {
          const tid = window.setTimeout(() => {
            compareLocked = false;
            this.finishFail();
          }, 360);
          this.timeoutIds.push(tid);
          return;
        }

        const tid = window.setTimeout(() => {
          prev.flipped = false;
          card.flipped = false;
          compareLocked = false;
          syncButtons();
        }, 520);
        this.timeoutIds.push(tid);
      });
      grid.appendChild(btn);
    }

    updateStatus();
    this.opts.boardEl.appendChild(grid);
  }

  // -------------------- 2. LOCKPICK (4 VERTICAL PIN TUMBLERS) --------------------

  private mountLockpick(): void {
    const pinCount = 4;
    const zoneHeightPct = 24;
    const pins = Array.from({ length: pinCount }, (_, i) => ({
      targetTopPct: 14 + Math.floor(Math.random() * (86 - zoneHeightPct - 14)),
      speed: 1.05 + i * 0.16,
      locked: false,
      valuePct: 50,
    }));
    let activePin = 0;
    let misses = 0;
    const maxMisses = 3;
    let phase = Math.random() * Math.PI * 2;
    let lastTs = performance.now();

    const wrap = document.createElement("div");
    wrap.className = "arc-lock-wrap";

    const chambersEl = document.createElement("div");
    chambersEl.className = "arc-lock-chambers";

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
      if (this.opts.mode === "police") {
        this.opts.statusEl.textContent = `🔓 Đã mở: ${activePin}/${pinCount} chốt • Sai: ${misses}/${maxMisses}${note}`;
      } else {
        this.opts.statusEl.textContent = `🔓 Đã mở: ${activePin}/${pinCount} chốt • Trượt thử lại không bị phạt${note}`;
      }
    };

    const attemptPin = (): void => {
      if (this.finished || activePin >= pinCount) return;
      const p = pins[activePin];
      const hit = p.valuePct >= p.targetTopPct - 2 && p.valuePct <= p.targetTopPct + zoneHeightPct + 2;
      if (hit) {
        p.locked = true;
        chamberEls[activePin].classList.remove("is-active");
        chamberEls[activePin].classList.add("is-locked");
        badgeEls[activePin].textContent = "✓";
        activePin++;
        if (activePin >= pinCount) {
          updateStatus(" • ✅ Mở khóa hoàn tất!");
          this.finishWin();
          return;
        }
        chamberEls[activePin].classList.add("is-active");
        updateStatus(" • ✅ Vào khớp!");
        return;
      }

      misses++;
      chamberEls[activePin].classList.add("is-miss");
      const tid = window.setTimeout(() => {
        chamberEls.forEach((el) => el.classList.remove("is-miss"));
      }, 240);
      this.timeoutIds.push(tid);

      if (this.opts.mode === "police" && misses >= maxMisses) {
        updateStatus(" • ❌ Gãy thanh dò!");
        this.finishFail();
        return;
      }
      updateStatus(" • Chưa trúng vùng xanh, căn lại!");
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
        phase += dt * pins[activePin].speed * Math.PI * 1.305;
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

  // -------------------- 3. TIMING BAR (3 PRECISION STOPS) --------------------

  private mountTimingBar(): void {
    const totalHits = 3;
    let hits = 0;
    let misses = 0;
    const maxMisses = 3;
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
      targetWidthPct = Math.max(16, 25 - hits * 3);
      targetLeftPct = 12 + Math.floor(Math.random() * (88 - targetWidthPct - 12));
      targetZone.style.left = `${targetLeftPct}%`;
      targetZone.style.width = `${targetWidthPct}%`;
    };

    const updateStatus = (note = ""): void => {
      if (this.opts.mode === "police") {
        this.opts.statusEl.textContent = `🎯 Tiến độ: ${hits}/${totalHits} • Sai: ${misses}/${maxMisses}${note}`;
      } else {
        this.opts.statusEl.textContent = `🎯 Tiến độ: ${hits}/${totalHits} • Sai không bị phạt${note}`;
      }
    };

    const attemptStop = (): void => {
      if (this.finished) return;
      const isHit = cursorPct >= targetLeftPct - 1.5 && cursorPct <= targetLeftPct + targetWidthPct + 1.5;
      if (isHit) {
        pipNodes[hits].classList.add("is-hit");
        pipNodes[hits].textContent = "✓";
        hits++;
        if (hits >= totalHits) {
          updateStatus(" • ✅ Chặn chuẩn xác!");
          this.finishWin();
          return;
        }
        rollZone();
        updateStatus(" • ✅ Trúng mục tiêu!");
        return;
      }

      misses++;
      track.classList.add("is-miss");
      const tid = window.setTimeout(() => track.classList.remove("is-miss"), 240);
      this.timeoutIds.push(tid);

      if (this.opts.mode === "police" && misses >= maxMisses) {
        updateStatus(" • ❌ Trượt quá số lần!");
        this.finishFail();
        return;
      }
      updateStatus(" • Chưa trúng vùng xanh, bấm lại!");
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
      const speedPctPerSec = (95 + hits * 24) * 0.9;
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
    updateStatus();
    wrap.append(pipsEl, track, actionBtn);
    this.opts.boardEl.appendChild(wrap);
    this.rafId = window.requestAnimationFrame(tick);
  }
}
