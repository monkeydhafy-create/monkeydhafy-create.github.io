import type { DungeonSfx } from "./DungeonSfx.ts";
import {
  bindFastTap,
  clamp,
  createScaledCanvas,
  createTimerBar,
  lerp,
  traceRoundedRect,
  type DungeonMinigameMountHost,
} from "./DungeonMinigameHelpers.ts";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  color: string;
}

type SignSym = "X" | "O" | "SQ";

function drawSignEmblem(
  ctx: CanvasRenderingContext2D,
  sym: SignSym,
  x: number,
  y: number,
  size: number,
  strokeWidth = 3.2,
  colorOverride = "#f8fafc",
  darkOutline = false,
): void {
  const trace = (): void => {
    if (sym === "X") {
      ctx.beginPath();
      ctx.moveTo(-size, -size);
      ctx.lineTo(size, size);
      ctx.moveTo(size, -size);
      ctx.lineTo(-size, size);
      ctx.stroke();
    } else if (sym === "O") {
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(-size, -size, size * 2, size * 2);
    }
  };

  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (darkOutline) {
    ctx.lineWidth = strokeWidth + 3.0;
    ctx.strokeStyle = "rgba(2, 6, 23, 0.8)";
    trace();
  }
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = colorOverride;
  trace();
  ctx.restore();
}

function updateAndDrawParticles(
  ctx: CanvasRenderingContext2D,
  list: Particle[],
  dt: number,
  gravity = 260,
): void {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life += dt;
    if (p.life >= p.maxLife) {
      list.splice(i, 1);
      continue;
    }
    p.vy += gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function syncLowTimeChrome(
  timerBar: { wrap: HTMLDivElement; fill: HTMLDivElement; label: HTMLSpanElement },
  modalEl: HTMLElement,
  timeLeft: number,
  durationSec: number,
  active: boolean,
): { isLowTime: boolean; isCriticalTime: boolean } {
  const pct = clamp((timeLeft / durationSec) * 100, 0, 100);
  const isLowTime = active && timeLeft <= 10;
  const isCriticalTime = active && timeLeft <= 4;
  timerBar.fill.style.width = `${pct.toFixed(2)}%`;
  timerBar.label.textContent = `⏱️ ${Math.max(0, timeLeft).toFixed(1)}s`;
  timerBar.wrap.classList.toggle("is-low-time", isLowTime);
  timerBar.wrap.classList.toggle("is-critical-time", isCriticalTime);
  modalEl.classList.toggle("is-low-time", isLowTime);
  modalEl.classList.toggle("is-critical-time", isCriticalTime);
  return { isLowTime, isCriticalTime };
}

function playLowTimeTick(
  sfx: DungeonSfx,
  timeLeft: number,
  lastTickSecRef: { value: number },
): void {
  if (timeLeft <= 10 && timeLeft > 0) {
    const curSec = Math.ceil(timeLeft);
    if (curSec < lastTickSecRef.value) {
      lastTickSecRef.value = curSec;
      sfx.playTimerTick(timeLeft <= 4);
    }
  }
}

// ============================================================================
// GAME 3: UỐNG BIA HƠI VỚI ĐẠI CA GIANG HỒ (Hidden choke -> Cough Delay, 0 HP)
// ============================================================================

export function mountBeerBossMinigame(host: DungeonMinigameMountHost): void {
  const DURATION_SEC = 28.0;
  const COUGH_DELAY_SEC = 3.8;
  const LOGICAL_W = 520;
  const LOGICAL_H = 340;
  const MUG_CAPACITY = 100;

  let started = false;
  let finished = false;
  let elapsed = 0;
  let timeLeft = DURATION_SEC;
  const lastTickSecRef = { value: Math.ceil(DURATION_SEC) };
  let beerRemaining = MUG_CAPACITY;
  let isHoldingDrink = false;
  let continuousHoldTime = 0;

  // Completely hidden choke mechanic (NO HUD gauge, NO pre-cough warning)
  // Tuned with 26.0s limit & 3.8s cough delay so finishing requires <= 2 coughs.
  let hiddenChokeLoad = 0;
  let hiddenTriggerLimit = 0.84 + Math.random() * 0.12;
  let coughRemaining = 0;
  let coughCount = 0;
  let gulpSfxAccum = 0;

  // Animation states
  let mugTilt = 0;
  let sloshAngle = 0;
  let sloshVel = 0;
  let foamSplashAnim = 0;
  let bossReactionAnim = 0;
  let bossSipTimer = 2.4;
  let bossSipAnim = 0;
  let bossShocked = false;
  let bulbSway = 0;

  interface Bubble {
    x: number;
    y: number;
    vy: number;
    r: number;
  }
  const bubbles: Bubble[] = Array.from({ length: 24 }, () => ({
    x: (Math.random() - 0.5) * 62,
    y: Math.random() * 118,
    vy: 18 + Math.random() * 28,
    r: 1.5 + Math.random() * 2.5,
  }));
  const particles: Particle[] = [];

  const spawnBurst = (x: number, y: number, color: string, count: number, speed = 150): void => {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.35 + Math.random() * 0.85);
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 55,
        life: 0,
        maxLife: 0.36 + Math.random() * 0.35,
        r: 2 + Math.random() * 3.5,
        color,
      });
    }
  };

  const wrap = document.createElement("div");
  wrap.className = "dm-beer-wrap";

  const timerBar = createTimerBar(DURATION_SEC);

  const stage = document.createElement("div");
  stage.className = "dm-canvas-stage";
  const { canvas, ctx, dpr } = createScaledCanvas(LOGICAL_W, LOGICAL_H);
  stage.appendChild(canvas);

  const startOverlay = document.createElement("div");
  startOverlay.className = "dm-start-overlay";
  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.className = "dm-start-btn";
  startBtn.textContent = "🍻 CỤNG LY BẮT ĐẦU";
  startOverlay.appendChild(startBtn);
  stage.appendChild(startOverlay);

  const controls = document.createElement("div");
  controls.className = "dm-action-row dm-single-action";
  const drinkBtn = document.createElement("button");
  drinkBtn.type = "button";
  drinkBtn.className = "dm-action-btn is-beer";
  drinkBtn.disabled = true;
  drinkBtn.innerHTML = `<span class="dm-btn-ico">🍺</span><span>GIỮ ĐỂ TU BIA</span><small>[Giữ / Space]</small>`;
  controls.appendChild(drinkBtn);

  wrap.append(timerBar.wrap, stage, controls);
  host.boardEl.appendChild(wrap);

  let rafId: number | null = null;
  let lastTs = performance.now();

  const stopHolding = (): void => {
    isHoldingDrink = false;
    drinkBtn.classList.remove("is-held");
  };

  const beginHolding = (): void => {
    if (!started || finished || coughRemaining > 0) return;
    isHoldingDrink = true;
    drinkBtn.classList.add("is-held");
  };

  const startGame = (): void => {
    if (started || finished) return;
    started = true;
    startOverlay.classList.add("is-hidden");
    drinkBtn.disabled = false;
    host.setLockedIn(true);
    host.sfx.playBeerMugClink();
    spawnBurst(256, 200, "#fef08a", 16, 135);
    spawnBurst(256, 200, "#ffffff", 12, 110);
    foamSplashAnim = 0.8;
  };

  startBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    startGame();
  });

  drinkBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!started || drinkBtn.disabled) return;
    beginHolding();
  });
  drinkBtn.addEventListener("pointerup", (e) => {
    e.preventDefault();
    stopHolding();
  });
  drinkBtn.addEventListener("pointercancel", stopHolding);
  drinkBtn.addEventListener("pointerleave", stopHolding);

  const onWindowPointerUp = (): void => {
    stopHolding();
  };
  const onWindowBlur = (): void => {
    stopHolding();
  };
  const onWindowKeyUp = (e: KeyboardEvent): void => {
    if (e.key === " " || e.key === "a" || e.key === "A" || e.key === "d" || e.key === "D" || e.key === "ArrowUp") {
      stopHolding();
    }
  };
  window.addEventListener("pointerup", onWindowPointerUp);
  window.addEventListener("blur", onWindowBlur);
  window.addEventListener("keyup", onWindowKeyUp);

  host.setKeyHandler((e) => {
    if (!started) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        startGame();
      }
      return;
    }
    if (e.key === " " || e.key === "a" || e.key === "A" || e.key === "d" || e.key === "D" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!e.repeat) {
        beginHolding();
      }
    }
  });

  const drawFrostedHanoiMug = (
    cx: number,
    cy: number,
    scale: number,
    fill01: number,
    tiltRad: number,
    liquidSlosh: number,
    isHeroMug: boolean,
  ): void => {
    const w = 78 * scale;
    const h = 114 * scale;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tiltRad);

    // Handle on right
    ctx.lineWidth = 8 * scale;
    ctx.strokeStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.arc(w * 0.5, 0, h * 0.24, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
    ctx.lineWidth = 4.5 * scale;
    ctx.strokeStyle = "#94a3b8";
    ctx.stroke();

    // Dimpled green-tinted Hanoi bia hoi glass body
    traceRoundedRect(ctx, -w / 2, -h / 2, w, h, 8 * scale);
    ctx.fillStyle = "rgba(186, 230, 253, 0.22)";
    ctx.fill();
    ctx.save();
    ctx.clip();

    // Beer liquid level inside glass
    const clampedFill = clamp(fill01, 0, 1);
    if (clampedFill > 0.005) {
      const topY = lerp(h * 0.46, -h * 0.34, clampedFill);
      const sloshDiff = Math.sin(liquidSlosh) * (isHeroMug ? 9 : 4) * scale;
      const beerGrad = ctx.createLinearGradient(0, topY, 0, h / 2);
      beerGrad.addColorStop(0, "#fbbf24");
      beerGrad.addColorStop(0.5, "#f59e0b");
      beerGrad.addColorStop(1, "#b45309");

      ctx.beginPath();
      ctx.moveTo(-w * 0.7, h * 0.7);
      ctx.lineTo(-w * 0.7, topY - sloshDiff);
      ctx.quadraticCurveTo(0, topY + sloshDiff * 0.65, w * 0.7, topY + sloshDiff);
      ctx.lineTo(w * 0.7, h * 0.7);
      ctx.closePath();
      ctx.fillStyle = beerGrad;
      ctx.fill();

      // Rising golden carbonation bubbles inside the liquid
      if (isHeroMug) {
        ctx.fillStyle = "rgba(254, 249, 195, 0.78)";
        for (const b of bubbles) {
          const bx = clamp(b.x * scale, -w * 0.38, w * 0.38);
          const by = h * 0.45 - ((b.y + elapsed * b.vy) % Math.max(8, h * 0.44 - topY));
          if (by > topY + 6 * scale) {
            ctx.beginPath();
            ctx.arc(bx, by, b.r * scale, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Thick creamy beer foam head
      const foamH = (12 + foamSplashAnim * 5) * scale;
      ctx.beginPath();
      ctx.moveTo(-w * 0.7, topY - sloshDiff);
      ctx.quadraticCurveTo(0, topY + sloshDiff * 0.65, w * 0.7, topY + sloshDiff);
      ctx.lineTo(w * 0.7, topY + sloshDiff - foamH);
      ctx.quadraticCurveTo(0, topY - foamH + sloshDiff * 0.5, -w * 0.7, topY - sloshDiff - foamH);
      ctx.closePath();
      ctx.fillStyle = "#fffbeb";
      ctx.fill();
    }

    // Dimpled glass vertical ribs highlight
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2 * scale;
    for (let gx = -w * 0.32; gx <= w * 0.33; gx += w * 0.22) {
      ctx.beginPath();
      ctx.moveTo(gx, -h * 0.42);
      ctx.lineTo(gx, h * 0.42);
      ctx.stroke();
    }
    ctx.restore();

    // Thick rim & condensation highlights
    traceRoundedRect(ctx, -w / 2, -h / 2, w, h, 8 * scale);
    ctx.lineWidth = 2.6 * scale;
    ctx.strokeStyle = "#94a3b8";
    ctx.stroke();

    // Frosted outer sheen
    ctx.fillStyle = "rgba(224, 242, 254, 0.35)";
    ctx.fillRect(-w * 0.4, -h * 0.42, 7 * scale, h * 0.84);
    ctx.restore();
  };

  const render = (): void => {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);

    // 1. Atmospheric Hanoi riverside night sky + Red River reflection
    const bgGrad = ctx.createLinearGradient(0, 0, 0, LOGICAL_H);
    bgGrad.addColorStop(0, "#090f1e");
    bgGrad.addColorStop(0.52, "#13233f");
    bgGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    // Shimmering Red River surface in background
    ctx.fillStyle = "#2b1d19";
    ctx.fillRect(0, 146, LOGICAL_W, 88);
    for (let wy = 156; wy < 226; wy += 12) {
      const wx = ((elapsed * 42 + wy * 9) % (LOGICAL_W + 90)) - 45;
      ctx.fillStyle = "rgba(251, 191, 36, 0.14)";
      ctx.fillRect(wx, wy, 48, 2.5);
    }

    // Steel barge side railing behind table
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 182, LOGICAL_W, 9);
    for (let rx = 24; rx < LOGICAL_W; rx += 64) {
      ctx.fillRect(rx, 152, 6, 40);
    }

    // String of swaying warm Edison pub bulbs overhead
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.quadraticCurveTo(LOGICAL_W * 0.5, 36, LOGICAL_W, 18);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const bx = 50 + i * 84 + Math.sin(bulbSway + i) * 3;
      const by = 24 + Math.sin((i / 5) * Math.PI) * 8;
      const glow = ctx.createRadialGradient(bx, by + 6, 2, bx, by + 6, 48);
      glow.addColorStop(0, "rgba(253, 224, 71, 0.36)");
      glow.addColorStop(1, "rgba(253, 224, 71, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(bx, by + 6, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(bx, by + 4, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. ĐẠI CA GIANG HỒ seated across the table (upper center-left)
    const bossX = 166;
    const coughLaughBounce =
      coughRemaining > 0 ? Math.abs(Math.sin(elapsed * 16)) * 7 : Math.sin(elapsed * 2.1) * 1.8;
    const bossY = 128 - coughLaughBounce + (bossReactionAnim > 0 ? -Math.sin(bossReactionAnim * Math.PI) * 5 : 0);

    // Muscular shoulders + black tank top
    ctx.save();
    ctx.translate(bossX, bossY);
    traceRoundedRect(ctx, -56, 8, 112, 74, 22);
    ctx.fillStyle = "#9a6b52";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#0f172a";
    ctx.stroke();

    // Black tank top core
    ctx.beginPath();
    ctx.moveTo(-36, 12);
    ctx.lineTo(-22, 8);
    ctx.quadraticCurveTo(0, 22, 22, 8);
    ctx.lineTo(36, 12);
    ctx.lineTo(40, 82);
    ctx.lineTo(-40, 82);
    ctx.closePath();
    ctx.fillStyle = "#111827";
    ctx.fill();

    // Subtle dragon arm tattoo marks
    ctx.strokeStyle = "rgba(15, 23, 42, 0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-44, 34, 8, 0.4, 2.7);
    ctx.arc(44, 34, 8, 0.4, 2.7);
    ctx.stroke();

    // Chunky gleaming gold chain
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 14, 22, 0.25, Math.PI - 0.25);
    ctx.stroke();
    ctx.strokeStyle = "#fef9c3";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Neck & square jaw head
    ctx.fillStyle = "#e0a988";
    ctx.fillRect(-13, -12, 26, 22);
    traceRoundedRect(ctx, -28, -58, 56, 54, 14);
    ctx.fillStyle = "#eec0a0";
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = "#0f172a";
    ctx.stroke();

    // Haircut (high fade)
    ctx.beginPath();
    ctx.moveTo(-28, -36);
    ctx.quadraticCurveTo(-28, -64, 0, -64);
    ctx.quadraticCurveTo(28, -64, 28, -36);
    ctx.lineTo(20, -45);
    ctx.lineTo(-20, -45);
    ctx.closePath();
    ctx.fillStyle = "#0f172a";
    ctx.fill();

    // Sunglasses (slip down nose if player wins!)
    const glassesDropY = bossShocked ? 13 : 0;
    if (bossShocked) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-11, -31, 6, 0, Math.PI * 2);
      ctx.arc(11, -31, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(-11, -31, 2.4, 0, Math.PI * 2);
      ctx.arc(11, -31, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(0, glassesDropY);
    traceRoundedRect(ctx, -24, -39, 21, 13, 3);
    ctx.fillStyle = "#020617";
    ctx.fill();
    traceRoundedRect(ctx, 3, -39, 21, 13, 3);
    ctx.fill();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-3, -34);
    ctx.lineTo(3, -34);
    ctx.stroke();
    // Glint across shades
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, -37);
    ctx.lineTo(-12, -28);
    ctx.moveTo(9, -37);
    ctx.lineTo(15, -28);
    ctx.stroke();
    ctx.restore();

    // Goatee + smirk / laughing / shocked mouth
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(0, -10, 6, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    if (coughRemaining > 0) {
      ctx.fillStyle = "#7f1d1d";
      ctx.beginPath();
      ctx.arc(0, -18, 9, 0, Math.PI);
      ctx.fill();
      ctx.stroke();
    } else if (bossShocked) {
      ctx.fillStyle = "#7f1d1d";
      ctx.beginPath();
      ctx.ellipse(0, -15, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(-10, -17);
      ctx.quadraticCurveTo(2, -13, 12, -20);
      ctx.stroke();
    }
    ctx.restore();

    // Boss's beer mug raising when sipping or laughing
    const bossMugX = bossX + 58;
    const bossMugY = 178 - bossSipAnim * 28 - coughLaughBounce * 0.4;
    drawFrostedHanoiMug(bossMugX, bossMugY, 0.56, 0.72, -bossSipAnim * 0.55, elapsed * 2, false);

    // 3. Green Hanoi plastic sidewalk table surface
    const tableGrad = ctx.createLinearGradient(0, 198, 0, LOGICAL_H);
    tableGrad.addColorStop(0, "#15803d");
    tableGrad.addColorStop(0.25, "#166534");
    tableGrad.addColorStop(1, "#052e16");
    traceRoundedRect(ctx, 22, 196, LOGICAL_W - 44, LOGICAL_H - 184, 16);
    ctx.fillStyle = tableGrad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#22c55e";
    ctx.stroke();

    // Plate of roasted peanuts & lime wedges on table
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.ellipse(156, 250, 38, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let pi = 0; pi < 7; pi++) {
      ctx.fillStyle = pi % 2 === 0 ? "#d97706" : "#b45309";
      ctx.beginPath();
      ctx.ellipse(138 + pi * 6, 246 + ((pi % 3) - 1) * 4, 4.5, 2.8, pi * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. PLAYER CHARACTER + HERO FROSTED HANOI BEER MUG (Right foreground)
    const isDrinkingNow = isHoldingDrink && coughRemaining <= 0 && !finished;
    const isCoughingNow = coughRemaining > 0;
    const coughJerkX = isCoughingNow ? Math.sin(elapsed * 32) * 7 : 0;
    const coughJerkY = isCoughingNow ? Math.abs(Math.sin(elapsed * 22)) * 9 : 0;
    const px = 374 + coughJerkX;
    const py = 204 + coughJerkY;

    // Player shoulders
    ctx.save();
    ctx.translate(px, py);
    traceRoundedRect(ctx, -46, 24, 92, 92, 20);
    ctx.fillStyle = "#1d4ed8";
    ctx.fill();
    ctx.strokeStyle = "#020617";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Player head (NO pre-cough red warning!)
    ctx.fillStyle = "#f2c6a0";
    ctx.beginPath();
    ctx.arc(0, -14, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hair
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(0, -24, 33, Math.PI * 1.04, -Math.PI * 0.04);
    ctx.fill();

    // Eyes (focused while drinking, squeezed shut ONLY during cough)
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.8;
    if (isCoughingNow) {
      ctx.beginPath();
      ctx.moveTo(-18, -20);
      ctx.lineTo(-8, -14);
      ctx.lineTo(-18, -8);
      ctx.moveTo(18, -20);
      ctx.lineTo(8, -14);
      ctx.lineTo(18, -8);
      ctx.stroke();
    } else if (isDrinkingNow) {
      ctx.beginPath();
      ctx.arc(-13, -15, 5, Math.PI, 0);
      ctx.arc(13, -15, 5, Math.PI, 0);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(-13, -15, 3.8, 0, Math.PI * 2);
      ctx.arc(13, -15, 3.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Playful foam mustache after drinking some beer
    if (beerRemaining < 92) {
      ctx.fillStyle = "#fffbeb";
      ctx.beginPath();
      ctx.ellipse(-6, -2, 7, 3, -0.15, 0, Math.PI * 2);
      ctx.ellipse(6, -2, 7, 3, 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mouth (wide gulp / open cough / relaxed smile)
    if (isCoughingNow) {
      ctx.fillStyle = "#991b1b";
      ctx.beginPath();
      ctx.ellipse(0, 7, 13, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (isDrinkingNow) {
      ctx.fillStyle = "#78350f";
      ctx.beginPath();
      ctx.ellipse(0, 6, 7 + Math.sin(elapsed * 18) * 1.5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Amber liquid stream entering mouth
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(-16, 4, 16, 5);
    } else {
      ctx.beginPath();
      ctx.arc(0, 5, 7, 0.15, Math.PI - 0.15);
      ctx.stroke();
    }
    ctx.restore();

    // Giant Player Frosted Bia Hơi Mug (tilts up cleanly toward mouth as you hold)
    const heroMugX = lerp(296, 336, mugTilt) + coughJerkX * 0.4;
    const heroMugY = lerp(244, 212, mugTilt) + coughJerkY * 0.4;
    drawFrostedHanoiMug(
      heroMugX,
      heroMugY,
      1.04,
      beerRemaining / MUG_CAPACITY,
      mugTilt * 0.72,
      sloshAngle,
      true,
    );

    // 5. Cough foam burst & sparks
    updateAndDrawParticles(ctx, particles, 1 / 60, 220);

    ctx.restore();
  };

  let coughParticleAccum = 0;

  const tick = (ts: number): void => {
    const dt = clamp((ts - lastTs) / 1000, 0, 0.05);
    lastTs = ts;
    elapsed += dt;
    bulbSway += dt * 1.7;

    if (foamSplashAnim > 0) {
      foamSplashAnim = Math.max(0, foamSplashAnim - dt * 1.8);
    }
    if (bossReactionAnim > 0) {
      bossReactionAnim = Math.max(0, bossReactionAnim - dt * 2.2);
    }

    // Idle Đại Ca sip loop
    bossSipTimer -= dt;
    if (bossSipTimer <= 0 && coughRemaining <= 0 && !finished) {
      bossSipAnim = Math.min(1, bossSipAnim + dt * 3.5);
      if (bossSipTimer <= -1.0) {
        bossSipTimer = 2.6 + Math.random() * 1.8;
      }
    } else {
      bossSipAnim = Math.max(0, bossSipAnim - dt * 3.0);
    }

    // Sloshing spring physics for beer surface
    const targetTilt = isHoldingDrink && coughRemaining <= 0 && started && !finished ? 1 : 0;
    const prevTilt = mugTilt;
    mugTilt = lerp(mugTilt, targetTilt, 1 - Math.exp(-14 * dt));
    const tiltDelta = mugTilt - prevTilt;
    sloshVel += (-42 * sloshAngle - 4.2 * sloshVel + tiltDelta * 85) * dt;
    sloshAngle += sloshVel * dt;

    if (started && !finished) {
      timeLeft -= dt;
      playLowTimeTick(host.sfx, timeLeft, lastTickSecRef);

      if (timeLeft <= 0) {
        timeLeft = 0;
        finished = true;
        syncLowTimeChrome(timerBar, host.modalEl, timeLeft, DURATION_SEC, false);
        stopHolding();
        drinkBtn.disabled = true;
        render();
        host.finish(
          "beer_boss",
          false,
          `Hết ${Math.round(DURATION_SEC)}s — Vẫn còn ${Math.ceil(beerRemaining)}% bia trong vại! (sặc ${coughCount} lần)`,
          0,
          0,
        );
        return;
      }

      if (coughRemaining > 0) {
        coughRemaining = Math.max(0, coughRemaining - dt);
        coughParticleAccum += dt;
        if (coughParticleAccum >= 0.08) {
          coughParticleAccum = 0;
          spawnBurst(362, 214, "#ffffff", 4, 130);
          spawnBurst(362, 214, "#fde68a", 2, 100);
        }
        if (coughRemaining <= 0) {
          drinkBtn.disabled = false;
        }
      } else if (isHoldingDrink) {
        continuousHoldTime += dt;
        // Accelerating sip rate (tuned so finishing <= 26s allows at most 2 cough fits)
        const speedMul = 0.85 + Math.min(0.95, continuousHoldTime * 0.65);
        const sipRate = 6.5 * speedMul;
        beerRemaining = Math.max(0, beerRemaining - sipRate * dt);

        gulpSfxAccum += dt;
        if (gulpSfxAccum >= 0.19) {
          gulpSfxAccum = 0;
          host.sfx.playBeerGulp();
        }

        // Hidden choke buildup (NO visible warning beforehand)
        hiddenChokeLoad += dt * (0.52 + continuousHoldTime * 0.16);
        if (hiddenChokeLoad >= hiddenTriggerLimit && beerRemaining > 0) {
          // Choke -> pure delay cough fit (0 HP damage!)
          hiddenChokeLoad = 0;
          hiddenTriggerLimit = 0.84 + Math.random() * 0.12;
          continuousHoldTime = 0;
          coughRemaining = COUGH_DELAY_SEC;
          coughCount += 1;
          stopHolding();
          drinkBtn.disabled = true;
          bossReactionAnim = 1;
          host.sfx.playBeerCough();
          spawnBurst(364, 212, "#ffffff", 16, 175);
          stage.classList.remove("is-shake");
          void stage.offsetWidth;
          stage.classList.add("is-shake");
        }

        if (beerRemaining <= 0) {
          beerRemaining = 0;
          finished = true;
          bossShocked = true;
          stopHolding();
          drinkBtn.disabled = true;
          const elapsedSec = DURATION_SEC - timeLeft;
          const SIX_CHEST_SEC = 21.5;
          const rewardChests =
            elapsedSec <= SIX_CHEST_SEC
              ? 6
              : Math.max(1, 6 - Math.ceil(((elapsedSec - SIX_CHEST_SEC) / (DURATION_SEC - SIX_CHEST_SEC)) * 5));
          spawnBurst(296, 200, "#facc15", 22, 180);
          render();
          syncLowTimeChrome(timerBar, host.modalEl, timeLeft, DURATION_SEC, false);
          host.finish(
            "beer_boss",
            true,
            `Tu cạn vại Bia Hơi trước Đại Ca trong ${elapsedSec.toFixed(1)}s${coughCount > 0 ? ` (sặc ${coughCount} lần)` : ""} → Nhận ${rewardChests} rương báu!`,
            0,
            rewardChests,
          );
          return;
        }
      } else {
        continuousHoldTime = Math.max(0, continuousHoldTime - dt * 2.6);
        hiddenChokeLoad = Math.max(0, hiddenChokeLoad - dt * 1.15);
      }

      syncLowTimeChrome(timerBar, host.modalEl, timeLeft, DURATION_SEC, true);
    }

    render();
    rafId = window.requestAnimationFrame(tick);
  };

  render();
  rafId = window.requestAnimationFrame(tick);

  host.setCleanup(() => {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("blur", onWindowBlur);
    window.removeEventListener("keyup", onWindowKeyUp);
    particles.length = 0;
    bubbles.length = 0;
    canvas.width = 0;
    canvas.height = 0;
  });
}

// ============================================================================
// GAME 4: TRÈO THUYỀN NGƯỢC DÒNG SÔNG HỒNG (2 Nút Trái/Phải + Nước Chảy Mạnh Dần)
// ============================================================================

export function mountBoatRowMinigame(host: DungeonMinigameMountHost): void {
  const DURATION_SEC = 45.0;
  const LOGICAL_W = 520;
  const LOGICAL_H = 340;
  const DANGER_LINE_Y = 294;

  type RowAction = "left" | "right" | "pull" | "brace";
  const ALL_ACTIONS: readonly RowAction[] = ["left", "right", "pull", "brace"];
  const ACTION_META: Record<
    RowAction,
    {
      label: string;
      shortLabel: string;
      keyHint: string;
      icon: string;
      btnClass: string;
      gradTop: string;
      gradBot: string;
      border: string;
      glow: string;
    }
  > = {
    left: {
      label: "CHÈO TRÁI",
      shortLabel: "TRÁI",
      keyHint: "A / ←",
      icon: "⬅️",
      btnClass: "is-primary",
      gradTop: "#1d4ed8",
      gradBot: "#0f172a",
      border: "#38bdf8",
      glow: "rgba(56, 189, 248, 0.36)",
    },
    right: {
      label: "CHÈO PHẢI",
      shortLabel: "PHẢI",
      keyHint: "D / →",
      icon: "➡️",
      btnClass: "is-accent",
      gradTop: "#0f766e",
      gradBot: "#042f2e",
      border: "#2dd4bf",
      glow: "rgba(45, 212, 191, 0.36)",
    },
    pull: {
      label: "KÉO ĐÔI",
      shortLabel: "KÉO ĐÔI",
      keyHint: "W / ↑",
      icon: "⬆️",
      btnClass: "is-pull",
      gradTop: "#b45309",
      gradBot: "#451a03",
      border: "#facc15",
      glow: "rgba(250, 204, 21, 0.38)",
    },
    brace: {
      label: "GHÌM LÁI",
      shortLabel: "GHÌM LÁI",
      keyHint: "S / ↓",
      icon: "⬇️",
      btnClass: "is-brace",
      gradTop: "#6d28d9",
      gradBot: "#2e1065",
      border: "#a78bfa",
      glow: "rgba(167, 139, 250, 0.38)",
    },
  };
  const ACTION_ANGLES: Record<RowAction, number> = {
    right: 0,
    brace: Math.PI * 0.5,
    left: Math.PI,
    pull: -Math.PI * 0.5,
  };
  const KEY_TO_ACTION: Record<string, RowAction> = {
    a: "left",
    arrowleft: "left",
    d: "right",
    arrowright: "right",
    w: "pull",
    arrowup: "pull",
    s: "brace",
    arrowdown: "brace",
  };

  let started = false;
  let finished = false;
  let elapsed = 0;
  let timeLeft = DURATION_SEC;
  const lastTickSecRef = { value: Math.ceil(DURATION_SEC) };

  let progress = 20; // Starts cleanly at 20% -> reach 100% to board Sand Barge!
  let surgeSpeed = 0;
  let stepsCleared = 0;
  let comboCount = 0;
  let boatYaw = 0;
  let yawVel = 0;
  let boatLateralX = 0;
  let oarLeftAnim = 0;
  let oarRightAnim = 0;
  let doublePullAnim = 0;
  let braceAnim = 0;
  let rowLean = 0;
  let scrollDistance = 0;
  let cmdPopAnim = 0;
  let wrongFlashTimer = 0;
  let wrongFlashAction: RowAction | null = null;
  let missFlashTimer = 0;
  let statusPopText = "";
  let cuePulse = 0;

  const pickRandomAction = (history: readonly RowAction[]): RowAction => {
    const prev = history[history.length - 1];
    const twoSame = history.length >= 2 && history[history.length - 2] === prev;
    if (!prev) {
      return ALL_ACTIONS[Math.floor(Math.random() * ALL_ACTIONS.length)];
    }
    if (!twoSame && Math.random() < 0.18) {
      return prev;
    }
    const others = ALL_ACTIONS.filter((a) => a !== prev);
    return others[Math.floor(Math.random() * others.length)];
  };

  const cmdQueue: RowAction[] = [];
  for (let qi = 0; qi < 3; qi++) {
    cmdQueue.push(pickRandomAction(cmdQueue));
  }
  const getProgressRatio = (): number =>
    clamp((elapsed / 38) * 0.45 + clamp(progress / 100, 0, 1) * 0.55, 0, 1);
  const computeCmdLimitSec = (): number => {
    const p = getProgressRatio();
    if (p <= 0.35) return lerp(2.45, 2.05, p / 0.35);
    if (p <= 0.7) return lerp(2.05, 1.48, (p - 0.35) / 0.35);
    return lerp(1.48, 0.96, (p - 0.7) / 0.3) / 1.1;
  };
  let cmdLimitSec = 2.45;
  let cmdTimer = cmdLimitSec;

  const advanceQueue = (): void => {
    cmdQueue.shift();
    cmdQueue.push(pickRandomAction(cmdQueue));
    cmdLimitSec = computeCmdLimitSec();
    cmdTimer = cmdLimitSec;
    cmdPopAnim = 1;
  };

  interface RiverStreak {
    x: number;
    y: number;
    len: number;
    speedMul: number;
    alpha: number;
  }
  const streaks: RiverStreak[] = Array.from({ length: 44 }, () => ({
    x: 42 + Math.random() * (LOGICAL_W - 84),
    y: Math.random() * LOGICAL_H,
    len: 16 + Math.random() * 26,
    speedMul: 0.75 + Math.random() * 0.65,
    alpha: 0.16 + Math.random() * 0.24,
  }));

  interface WaterRipple {
    x: number;
    y: number;
    age: number;
    maxR: number;
  }
  const ripples: WaterRipple[] = [];
  const particles: Particle[] = [];

  const spawnSplash = (x: number, y: number, count: number, color = "#e0f2fe"): void => {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 35 + Math.random() * 85;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp + 40,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.25,
        r: 2 + Math.random() * 2.5,
        color,
      });
    }
  };

  const wrap = document.createElement("div");
  wrap.className = "dm-boat-wrap";
  const timerBar = createTimerBar(DURATION_SEC);

  const stage = document.createElement("div");
  stage.className = "dm-canvas-stage";
  const { canvas, ctx, dpr } = createScaledCanvas(LOGICAL_W, LOGICAL_H);
  stage.appendChild(canvas);

  const startOverlay = document.createElement("div");
  startOverlay.className = "dm-start-overlay";
  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.className = "dm-start-btn";
  startBtn.textContent = "🛶 BẮT ĐẦU TRÈO";
  startOverlay.appendChild(startBtn);
  stage.appendChild(startOverlay);

  const controls = document.createElement("div");
  controls.className = "dm-action-row dm-quad-actions";
  const btnMap = {} as Record<RowAction, HTMLButtonElement>;

  let rafId: number | null = null;
  let lastTs = performance.now();

  const setAllBtnsDisabled = (disabled: boolean): void => {
    for (const act of ALL_ACTIONS) {
      btnMap[act].disabled = disabled;
    }
  };

  const syncCueButtons = (): void => {
    for (const act of ALL_ACTIONS) {
      const btn = btnMap[act];
      btn.classList.remove("is-cue-active", "is-cue-dim");
      if (!started || finished) {
        btn.classList.remove("is-cue-wrong");
        continue;
      }
      btn.classList.toggle("is-cue-wrong", wrongFlashTimer > 0 && wrongFlashAction === act);
    }
  };

  const applyFailPullback = (
    reason: "wrong" | "timeout",
    pressedAction: RowAction | null,
    amount: number,
  ): void => {
    progress = Math.max(-5, progress - amount);
    surgeSpeed = 0;
    comboCount = 0;

    if (reason === "wrong") {
      wrongFlashTimer = 0.44;
      wrongFlashAction = pressedAction;
      missFlashTimer = 0;
      statusPopText = "✕ SAI! TỤT LẠI!";
      cmdTimer = Math.max(cmdTimer, 0.38);
    } else {
      missFlashTimer = 0.44;
      wrongFlashTimer = 0;
      wrongFlashAction = null;
      statusPopText = "⏱️ QUÁ CHẬM! TỤT LẠI!";
    }

    const bx = LOGICAL_W * 0.5 + boatLateralX;
    const by = lerp(DANGER_LINE_Y - 12, 136, clamp(progress / 100, 0, 1));
    const joltDir =
      pressedAction === "left" ? 1 : pressedAction === "right" ? -1 : Math.random() < 0.5 ? 1 : -1;
    yawVel += joltDir * 6.4;
    boatLateralX = clamp(boatLateralX + joltDir * 10, -32, 32);
    ripples.push({ x: bx, y: by + 12, age: 0, maxR: 32 });
    spawnSplash(bx, by + 12, 13, "#f87171");
    stage.classList.remove("is-shake");
    void stage.offsetWidth;
    stage.classList.add("is-shake");
    host.sfx.playBoatYawSlip();
  };

  const handleAction = (action: RowAction): void => {
    if (!started || finished) return;
    const expected = cmdQueue[0];
    const bx = LOGICAL_W * 0.5 + boatLateralX;
    const by = lerp(DANGER_LINE_Y - 12, 136, clamp(progress / 100, 0, 1));

    if (action !== expected) {
      applyFailPullback("wrong", action, 5.8);
      syncCueButtons();
      return;
    }

    wrongFlashTimer = 0;
    wrongFlashAction = null;
    missFlashTimer = 0;
    statusPopText = "";

    stepsCleared += 1;
    comboCount = Math.min(16, comboCount + 1);
    const fastBonus = cmdTimer / Math.max(0.1, cmdLimitSec) > 0.55 ? 0.55 : 0;
    const gain = 3.6 + comboCount * 0.12 + fastBonus;
    progress = Math.min(100, progress + gain);
    surgeSpeed = Math.min(18.5, surgeSpeed + (action === "pull" ? 8.2 : 6.8));

    if (action === "left") {
      oarLeftAnim = 1;
      rowLean = 0.85;
      yawVel += 1.4;
      boatLateralX = clamp(boatLateralX + 3.5, -26, 26);
      ripples.push({ x: bx - 34, y: by + 10, age: 0, maxR: 22 });
      spawnSplash(bx - 34, by + 10, 9);
      host.sfx.playPaddleSplash("left");
    } else if (action === "right") {
      oarRightAnim = 1;
      rowLean = 0.85;
      yawVel -= 1.4;
      boatLateralX = clamp(boatLateralX - 3.5, -26, 26);
      ripples.push({ x: bx + 34, y: by + 10, age: 0, maxR: 22 });
      spawnSplash(bx + 34, by + 10, 9);
      host.sfx.playPaddleSplash("right");
    } else if (action === "pull") {
      oarLeftAnim = 1;
      oarRightAnim = 1;
      doublePullAnim = 1;
      rowLean = 1.25;
      yawVel *= 0.35;
      ripples.push({ x: bx - 32, y: by + 12, age: 0, maxR: 25 });
      ripples.push({ x: bx + 32, y: by + 12, age: 0, maxR: 25 });
      spawnSplash(bx - 32, by + 12, 8, "#fde68a");
      spawnSplash(bx + 32, by + 12, 8, "#fde68a");
      host.sfx.playPaddleSplash("left");
      host.sfx.playPaddleSplash("right");
    } else {
      // "brace" — hạ trọng tâm ghìm mái giữ thăng bằng giữa sóng lớn
      braceAnim = 1;
      rowLean = -0.7;
      yawVel *= 0.15;
      boatYaw *= 0.4;
      boatLateralX *= 0.45;
      ripples.push({ x: bx, y: by + 4, age: 0, maxR: 36 });
      spawnSplash(bx, by + 4, 12, "#ddd6fe");
      host.sfx.playRaftDriftSnap();
    }

    advanceQueue();
    syncCueButtons();
  };

  const BUTTON_ORDER: readonly RowAction[] = ["pull", "left", "brace", "right"];
  for (const act of BUTTON_ORDER) {
    const m = ACTION_META[act];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `dm-action-btn ${m.btnClass}`;
    btn.disabled = true;
    btn.innerHTML = `<span class="dm-btn-ico">${m.icon}</span><span>${m.label}</span><small>[${m.keyHint}]</small>`;
    btnMap[act] = btn;
    controls.appendChild(btn);
    bindFastTap(btn, () => handleAction(act));
  }

  wrap.append(timerBar.wrap, stage, controls);
  host.boardEl.appendChild(wrap);

  const startGame = (): void => {
    if (started || finished) return;
    started = true;
    startOverlay.classList.add("is-hidden");
    setAllBtnsDisabled(false);
    cmdLimitSec = computeCmdLimitSec();
    cmdTimer = cmdLimitSec;
    cmdPopAnim = 1;
    syncCueButtons();
    host.setLockedIn(true);
    host.sfx.playBeltStart();
  };

  startBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    startGame();
  });

  host.setKeyHandler((e) => {
    if (!started) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        startGame();
      }
      return;
    }
    const mapped = KEY_TO_ACTION[e.key.toLowerCase()];
    if (mapped) {
      e.preventDefault();
      if (!e.repeat) handleAction(mapped);
    }
  });

  const drawArrowVector = (
    action: RowAction,
    cx: number,
    cy: number,
    scale: number,
    fill: string,
    stroke: string,
  ): void => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ACTION_ANGLES[action]);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(2, -19);
    ctx.lineTo(2, -8);
    ctx.lineTo(-26, -8);
    ctx.lineTo(-26, 8);
    ctx.lineTo(2, 8);
    ctx.lineTo(2, 19);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    ctx.restore();
  };

  const render = (currentSpeed: number): void => {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);

    // 1. Terracotta-red Sông Hồng water + muddy banks
    const waterGrad = ctx.createLinearGradient(0, 0, 0, LOGICAL_H);
    waterGrad.addColorStop(0, "#7c2d12");
    waterGrad.addColorStop(0.55, "#9a3412");
    waterGrad.addColorStop(1, "#7f1d1d");
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    // Sandy muddy riverbanks on left & right scrolling downward
    ctx.fillStyle = "#57412b";
    ctx.fillRect(0, 0, 34, LOGICAL_H);
    ctx.fillRect(LOGICAL_W - 34, 0, 34, LOGICAL_H);
    ctx.fillStyle = "#785838";
    ctx.fillRect(30, 0, 8, LOGICAL_H);
    ctx.fillRect(LOGICAL_W - 38, 0, 8, LOGICAL_H);

    // Riverbank bamboo stakes & green reeds rushing downward
    const bankPeriod = 68;
    const bankOff = scrollDistance % bankPeriod;
    for (let y = bankOff - bankPeriod; y < LOGICAL_H + bankPeriod; y += bankPeriod) {
      ctx.fillStyle = "#15803d";
      ctx.beginPath();
      ctx.arc(16, y, 8, 0, Math.PI * 2);
      ctx.arc(LOGICAL_W - 16, y + 32, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#92400e";
      ctx.fillRect(26, y + 22, 7, 14);
      ctx.fillRect(LOGICAL_W - 33, y + 6, 7, 14);
    }

    // 2. White rapid streaks rushing downward (intensifying with currentSpeed!)
    const speedRatio = clamp((currentSpeed - 3.2) / 8, 0, 1);
    for (const s of streaks) {
      const sy = (s.y + scrollDistance * s.speedMul) % (LOGICAL_H + 40) - 20;
      ctx.strokeStyle = `rgba(254, 243, 199, ${s.alpha + speedRatio * 0.28})`;
      ctx.lineWidth = 2 + speedRatio * 1.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.x, sy);
      ctx.lineTo(s.x, sy + s.len * (0.8 + speedRatio * 0.7));
      ctx.stroke();
    }

    // 3. Swirling crimson whirlpool danger zone along bottom edge
    const dangerGrad = ctx.createLinearGradient(0, DANGER_LINE_Y - 12, 0, LOGICAL_H);
    dangerGrad.addColorStop(0, "rgba(239, 68, 68, 0)");
    dangerGrad.addColorStop(1, "rgba(185, 28, 28, 0.72)");
    ctx.fillStyle = dangerGrad;
    ctx.fillRect(34, DANGER_LINE_Y - 12, LOGICAL_W - 68, LOGICAL_H - DANGER_LINE_Y + 12);
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = "rgba(252, 165, 165, 0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(38, DANGER_LINE_Y);
    ctx.lineTo(LOGICAL_W - 38, DANGER_LINE_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Target Sand Barge Stern descending cleanly into view near 100%
    if (progress > 68) {
      const dockVis = clamp((progress - 68) / 32, 0, 1);
      const bargeY = lerp(-56, 36, dockVis);
      ctx.save();
      traceRoundedRect(ctx, LOGICAL_W * 0.5 - 115, bargeY - 36, 230, 56, 12);
      ctx.fillStyle = "#334155";
      ctx.fill();
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 3;
      ctx.stroke();
      // Boarding plank glowing green
      ctx.fillStyle = "#10b981";
      ctx.fillRect(LOGICAL_W * 0.5 - 22, bargeY + 16, 44, 22);
      ctx.strokeStyle = "#d1fae5";
      ctx.lineWidth = 2;
      ctx.strokeRect(LOGICAL_W * 0.5 - 22, bargeY + 16, 44, 22);
      ctx.restore();
    }

    // 5. Water ripples behind boat
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.age += 1 / 60;
      rp.y += (80 + currentSpeed * 12) * (1 / 60);
      if (rp.age >= 0.5) {
        ripples.splice(i, 1);
        continue;
      }
      const t = rp.age / 0.5;
      ctx.strokeStyle = `rgba(224, 242, 254, ${(1 - t) * 0.65})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, lerp(6, rp.maxR, t), lerp(4, rp.maxR * 0.6, t), 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 6. WOODEN SAMPAN BOAT & 4 REAL-LIFE ROWING POSTURES
    const boatX = LOGICAL_W * 0.5 + boatLateralX;
    const boatY = lerp(DANGER_LINE_Y - 12, 92, clamp(progress / 100, 0, 1));

    // V-shaped bow wake behind boat (turns golden on Kéo Đôi surge)
    ctx.strokeStyle =
      doublePullAnim > 0.1
        ? `rgba(250, 204, 21, ${0.42 + doublePullAnim * 0.45})`
        : `rgba(255, 255, 255, ${0.28 + comboCount * 0.03})`;
    ctx.lineWidth = 3 + doublePullAnim * 2;
    ctx.beginPath();
    ctx.moveTo(boatX - 6, boatY + 26);
    ctx.lineTo(boatX - 28 - comboCount * 1.2 - doublePullAnim * 12, boatY + 72);
    ctx.moveTo(boatX + 6, boatY + 26);
    ctx.lineTo(boatX + 28 + comboCount * 1.2 + doublePullAnim * 12, boatY + 72);
    ctx.stroke();

    ctx.save();
    ctx.translate(boatX, boatY);
    ctx.rotate(boatYaw);

    // Stabilizing brace aura ring during Ghìm Lái
    if (braceAnim > 0.05) {
      ctx.strokeStyle = `rgba(167, 139, 250, ${braceAnim * 0.85})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 32 + (1 - braceAnim) * 14, 46 + (1 - braceAnim) * 12, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Boat shadow on water
    ctx.fillStyle = "rgba(2, 6, 23, 0.35)";
    ctx.beginPath();
    ctx.ellipse(3, 5, 19, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Articulated Left & Right wooden oars (flares wide on brace, sweeps deep on doublePull)
    const lSweep = braceAnim > 0.1 ? -braceAnim * 0.35 : Math.sin(oarLeftAnim * Math.PI) * 1.05;
    const rSweep = braceAnim > 0.1 ? -braceAnim * 0.35 : Math.sin(oarRightAnim * Math.PI) * 1.05;
    // Left oar
    ctx.save();
    ctx.translate(-14, -4);
    ctx.rotate(-0.45 - lSweep);
    ctx.fillStyle = "#d97706";
    ctx.fillRect(-30, -2, 30, 4);
    ctx.fillStyle = "#92400e";
    ctx.fillRect(-38, -4.5, 11, 9);
    ctx.restore();
    // Right oar
    ctx.save();
    ctx.translate(14, -4);
    ctx.rotate(0.45 + rSweep);
    ctx.fillStyle = "#d97706";
    ctx.fillRect(0, -2, 30, 4);
    ctx.fillStyle = "#92400e";
    ctx.fillRect(27, -4.5, 11, 9);
    ctx.restore();

    // Wooden hull
    ctx.beginPath();
    ctx.moveTo(0, -38);
    ctx.quadraticCurveTo(22, -12, 16, 28);
    ctx.lineTo(-16, 28);
    ctx.quadraticCurveTo(-22, -12, 0, -38);
    ctx.closePath();
    ctx.fillStyle = "#92400e";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#451a03";
    ctx.stroke();

    // Inner deck planks
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.quadraticCurveTo(14, -8, 11, 23);
    ctx.lineTo(-11, 23);
    ctx.quadraticCurveTo(-14, -8, 0, -28);
    ctx.closePath();
    ctx.fill();

    // Rower torso + nón lá (leans back on Kéo Đôi, crouches tight forward on Ghìm Lái)
    const leanOff = rowLean * 5.2;
    const crouchScale = 1 - braceAnim * 0.14;
    ctx.save();
    ctx.scale(crouchScale, crouchScale);
    ctx.fillStyle = doublePullAnim > 0.15 ? "#f59e0b" : braceAnim > 0.15 ? "#7c3aed" : "#1d4ed8";
    ctx.beginPath();
    ctx.ellipse(0, 3 + leanOff, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Conical hat (Nón lá)
    ctx.fillStyle = "#fef3c7";
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 1 + leanOff, 10.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#d97706";
    ctx.beginPath();
    ctx.arc(0, 1 + leanOff, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    updateAndDrawParticles(ctx, particles, 1 / 60, 0);

    // 6.5 GIANT LEFT ACTIVE COMMAND BOARD & RIGHT QUEUE/TEMPO BOARD (Clear of boat & oars!)
    const activeAction = cmdQueue[0];
    const activeMeta = ACTION_META[activeAction];
    const hasFailFlash = wrongFlashTimer > 0 || missFlashTimer > 0;

    // LEFT BOARD: Giant Active Prompt + Directional Vector Arrow + Per-Command Countdown Bar
    {
      const bx = 40;
      const by = 80;
      const bw = 136;
      const bh = 162;
      const cx = bx + bw * 0.5;
      const cy = by + bh * 0.5;
      const popBoost = cmdPopAnim * 0.11;
      const pulse = started && !finished ? Math.sin(cuePulse * 14) * 0.038 + popBoost : 0;
      const shakeX = hasFailFlash ? Math.sin(cuePulse * 72) * 5.5 : 0;

      ctx.save();
      ctx.globalAlpha = started ? 0.97 : 0.78;
      ctx.translate(cx + shakeX, cy);
      ctx.scale(1 + pulse, 1 + pulse);

      // Luminous halo
      traceRoundedRect(ctx, -bw * 0.5 - 6, -bh * 0.5 - 6, bw + 12, bh + 12, 18);
      ctx.fillStyle = hasFailFlash ? "rgba(239, 68, 68, 0.36)" : activeMeta.glow;
      ctx.fill();

      // Main card body
      traceRoundedRect(ctx, -bw * 0.5, -bh * 0.5, bw, bh, 15);
      const cardGrad = ctx.createLinearGradient(0, -bh * 0.5, 0, bh * 0.5);
      if (hasFailFlash) {
        cardGrad.addColorStop(0, "rgba(153, 27, 27, 0.96)");
        cardGrad.addColorStop(1, "rgba(69, 10, 10, 0.96)");
      } else {
        cardGrad.addColorStop(0, activeMeta.gradTop);
        cardGrad.addColorStop(1, activeMeta.gradBot);
      }
      ctx.fillStyle = cardGrad;
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = hasFailFlash ? "#f87171" : "#fde047";
      ctx.stroke();

      // Header strip
      traceRoundedRect(ctx, -bw * 0.43, -bh * 0.44, bw * 0.86, 21, 7);
      ctx.fillStyle = hasFailFlash ? "#dc2626" : "#facc15";
      ctx.fill();
      ctx.font = "900 10.5px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = hasFailFlash ? "#ffffff" : "#0f172a";
      ctx.fillText(
        hasFailFlash ? statusPopText : started ? "⚡ BẤM NGAY!" : "SẴN SÀNG",
        0,
        -bh * 0.44 + 10.5,
      );

      // Giant bold vector arrow (scale 1.15)
      drawArrowVector(
        activeAction,
        0,
        -15,
        1.14,
        hasFailFlash ? "#fecaca" : "#fef9c3",
        hasFailFlash ? "#7f1d1d" : activeMeta.gradBot,
      );

      // Bold action label
      ctx.font = "900 19.5px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(2, 6, 23, 0.88)";
      ctx.strokeText(activeMeta.label, 0, 26);
      ctx.fillStyle = hasFailFlash ? "#fecaca" : "#ffffff";
      ctx.fillText(activeMeta.label, 0, 26);

      // Keycap badge
      traceRoundedRect(ctx, -36, 41, 72, 20, 6);
      ctx.fillStyle = "rgba(2, 6, 23, 0.72)";
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = hasFailFlash ? "#fca5a5" : "#fde047";
      ctx.stroke();
      ctx.font = "800 11.5px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = hasFailFlash ? "#fecaca" : "#fde047";
      ctx.fillText(activeMeta.keyHint, 0, 51);

      // Per-command shrinking countdown bar at bottom
      const cmdFrac = started && !finished ? clamp(cmdTimer / Math.max(0.1, cmdLimitSec), 0, 1) : 1;
      traceRoundedRect(ctx, -bw * 0.43, bh * 0.5 - 15, bw * 0.86, 7, 3.5);
      ctx.fillStyle = "rgba(2, 6, 23, 0.78)";
      ctx.fill();
      traceRoundedRect(
        ctx,
        -bw * 0.43,
        bh * 0.5 - 15,
        Math.max(4, bw * 0.86 * cmdFrac),
        7,
        3.5,
      );
      ctx.fillStyle = cmdFrac > 0.45 ? "#4ade80" : cmdFrac > 0.22 ? "#facc15" : "#ef4444";
      ctx.fill();

      ctx.restore();
    }

    // RIGHT BOARD: Upcoming Queue (Next 2) + Tempo Multiplier & Combo
    {
      const bx = 342;
      const by = 84;
      const bw = 134;
      const bh = 154;
      const nextOne = cmdQueue[1];
      const nextTwo = cmdQueue[2];
      const m1 = ACTION_META[nextOne];
      const m2 = ACTION_META[nextTwo];

      ctx.save();
      ctx.globalAlpha = started ? 0.94 : 0.72;
      traceRoundedRect(ctx, bx, by, bw, bh, 14);
      const qGrad = ctx.createLinearGradient(0, by, 0, by + bh);
      qGrad.addColorStop(0, "rgba(15, 23, 42, 0.94)");
      qGrad.addColorStop(1, "rgba(2, 6, 23, 0.94)");
      ctx.fillStyle = qGrad;
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = "#475569";
      ctx.stroke();

      // Label "TIẾP THEO"
      ctx.font = "900 10.5px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("TIẾP THEO", bx + bw * 0.5, by + 16);

      // Next #1 prominent preview tile
      traceRoundedRect(ctx, bx + 10, by + 27, bw - 20, 44, 10);
      ctx.fillStyle = "rgba(30, 41, 59, 0.88)";
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = m1.border;
      ctx.stroke();
      drawArrowVector(nextOne, bx + 32, by + 49, 0.56, m1.border, "#020617");
      ctx.font = "900 13.5px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(m1.shortLabel, bx + 52, by + 43);
      ctx.font = "700 10.5px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = m1.border;
      ctx.fillText(m1.keyHint, bx + 52, by + 58);

      // Next #2 smaller chip
      traceRoundedRect(ctx, bx + 14, by + 77, bw - 28, 28, 8);
      ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
      ctx.fill();
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = "#334155";
      ctx.stroke();
      drawArrowVector(nextTwo, bx + 32, by + 91, 0.36, m2.border, "#020617");
      ctx.font = "800 11.5px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(`Sau: ${m2.shortLabel}`, bx + 48, by + 91);

      // Tempo & Combo divider pill at bottom
      const speedMul = 2.45 / Math.max(0.8, cmdLimitSec);
      traceRoundedRect(ctx, bx + 10, by + 112, bw - 20, 32, 9);
      ctx.fillStyle = "rgba(30, 41, 59, 0.85)";
      ctx.fill();
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = speedMul >= 1.7 ? "#f59e0b" : "#334155";
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.font = "900 11px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = speedMul >= 1.7 ? "#fbbf24" : "#38bdf8";
      ctx.fillText(`⚡ TỐC ĐỘ x${speedMul.toFixed(1)}`, bx + bw * 0.5, by + 123);
      ctx.fillStyle = comboCount >= 5 ? "#4ade80" : "#e2e8f0";
      ctx.fillText(`🔥 COMBO x${comboCount}`, bx + bw * 0.5, by + 137);

      ctx.restore();
    }

    // 7. Vertical Distance Track along right edge (pure visual icons, 0 text)
    traceRoundedRect(ctx, LOGICAL_W - 24, 24, 14, LOGICAL_H - 48, 7);
    ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
    ctx.fill();
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const trackFillH = (LOGICAL_H - 54) * clamp(progress / 100, 0, 1);
    traceRoundedRect(
      ctx,
      LOGICAL_W - 21,
      LOGICAL_H - 27 - trackFillH,
      8,
      trackFillH,
      4,
    );
    ctx.fillStyle = "#38bdf8";
    ctx.fill();
    // Marker dot
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(LOGICAL_W - 17, LOGICAL_H - 27 - trackFillH, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const tick = (ts: number): void => {
    const dt = clamp((ts - lastTs) / 1000, 0, 0.05);
    lastTs = ts;

    oarLeftAnim = Math.max(0, oarLeftAnim - dt * 5.2);
    oarRightAnim = Math.max(0, oarRightAnim - dt * 5.2);
    doublePullAnim = Math.max(0, doublePullAnim - dt * 3.8);
    braceAnim = Math.max(0, braceAnim - dt * 3.2);
    cmdPopAnim = Math.max(0, cmdPopAnim - dt * 5.0);
    rowLean = lerp(rowLean, 0, 1 - Math.exp(-8 * dt));
    surgeSpeed = Math.max(0, surgeSpeed - dt * 15);
    boatLateralX = lerp(boatLateralX, 0, 1 - Math.exp(-3.5 * dt));

    // Yaw spring back to straight
    yawVel += (-26 * boatYaw - 5.2 * yawVel) * dt;
    boatYaw += yawVel * dt;

    const p = getProgressRatio();
    const baseDrag =
      p <= 0.35
        ? lerp(2.2, 3.4, p / 0.35)
        : p <= 0.7
          ? lerp(3.4, 5.2, (p - 0.35) / 0.35)
          : lerp(5.2, 7.2, (p - 0.7) / 0.3) * 1.1;
    const currentSpeed = started ? baseDrag : 1.95;
    scrollDistance += (66 + currentSpeed * 14 + surgeSpeed * 10) * dt;
    cuePulse += dt;

    if (wrongFlashTimer > 0) {
      wrongFlashTimer = Math.max(0, wrongFlashTimer - dt);
      if (wrongFlashTimer <= 0) {
        wrongFlashAction = null;
        if (missFlashTimer <= 0) statusPopText = "";
        syncCueButtons();
      }
    }
    if (missFlashTimer > 0) {
      missFlashTimer = Math.max(0, missFlashTimer - dt);
      if (missFlashTimer <= 0 && wrongFlashTimer <= 0) {
        statusPopText = "";
      }
    }

    if (started && !finished) {
      elapsed += dt;
      timeLeft -= dt;
      playLowTimeTick(host.sfx, timeLeft, lastTickSecRef);

      cmdTimer -= dt;
      if (cmdTimer <= 0) {
        applyFailPullback("timeout", null, 5.2);
        advanceQueue();
        syncCueButtons();
      }

      // Smoothly escalating Red River downward drag
      const waveBoost = Math.sin(elapsed * 1.25) > 0.78 ? 1.05 : 0;
      progress = Math.min(100, progress + (surgeSpeed - currentSpeed - waveBoost) * dt);

      if (progress >= 100) {
        progress = 100;
        finished = true;
        setAllBtnsDisabled(true);
        syncCueButtons();
        const SIX_CHEST_SEC = 23.0;
        const rewardChests =
          elapsed <= SIX_CHEST_SEC
            ? 6
            : Math.max(1, 6 - Math.ceil(((elapsed - SIX_CHEST_SEC) / (DURATION_SEC - SIX_CHEST_SEC)) * 5));
        render(currentSpeed);
        syncLowTimeChrome(timerBar, host.modalEl, timeLeft, DURATION_SEC, false);
        host.finish(
          "boat_row",
          true,
          `Cập mạn Tàu Cát Sông Hồng trong ${elapsed.toFixed(1)}s → Nhận ${rewardChests} rương báu!`,
          0,
          rewardChests,
        );
        return;
      }

      if (elapsed > 1.8 && progress < -2) {
        finished = true;
        setAllBtnsDisabled(true);
        syncCueButtons();
        render(currentSpeed);
        syncLowTimeChrome(timerBar, host.modalEl, timeLeft, DURATION_SEC, false);
        host.finish(
          "boat_row",
          false,
          "Bị dòng nước xiết Sông Hồng cuốn lật thuyền! (-40 HP)",
          40,
          0,
        );
        return;
      }

      if (timeLeft <= 0) {
        timeLeft = 0;
        finished = true;
        setAllBtnsDisabled(true);
        syncCueButtons();
        render(currentSpeed);
        syncLowTimeChrome(timerBar, host.modalEl, timeLeft, DURATION_SEC, false);
        host.finish("boat_row", false, "Hết 45s — Chưa kịp chèo tới mạn Tàu Cát!", 0, 0);
        return;
      }

      syncLowTimeChrome(timerBar, host.modalEl, timeLeft, DURATION_SEC, true);
    }

    render(currentSpeed);
    rafId = window.requestAnimationFrame(tick);
  };

  render(1.95);
  rafId = window.requestAnimationFrame(tick);

  host.setCleanup(() => {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    particles.length = 0;
    ripples.length = 0;
    streaks.length = 0;
    cmdQueue.length = 0;
    canvas.width = 0;
    canvas.height = 0;
  });
}

// ============================================================================
// GAME 5: BÈ PHAO 6x6 SÔNG HỒNG — 6 VÒNG: KÝ HIỆU ĐƠN SẮC + ĐÈN MÀU XANH/ĐỎ/VÀNG
// ============================================================================

export function mountRaftSignsMinigame(host: DungeonMinigameMountHost): void {
  const GRID = 6;
  const REMOVE_SCHEDULE = [0, 3, 5, 7, 9, 5] as const;
  const ROUND_DURATIONS = [5.4, 4.8, 4.3, 3.4, 3.05, 2.8] as const;
  const SAFE_COUNTS = [7, 6, 5, 4, 3, 2] as const;
  const TOTAL_ROUNDS = ROUND_DURATIONS.length;
  const LOGICAL_W = 520;
  const LOGICAL_H = 408;

  type RaftColor = "green" | "red" | "yellow";
  const RAFT_COLORS: readonly RaftColor[] = ["green", "red", "yellow"];
  const RAFT_COLOR_META: Record<
    RaftColor,
    {
      plateTop: string;
      plateBot: string;
      rim: string;
      glow: string;
      lampCore: string;
      lampMid: string;
      lampGlow: string;
    }
  > = {
    green: {
      plateTop: "#22c55e",
      plateBot: "#15803d",
      rim: "#86efac",
      glow: "rgba(34, 197, 94, 0.38)",
      lampCore: "#dcfce7",
      lampMid: "#22c55e",
      lampGlow: "rgba(34, 197, 94, 0.46)",
    },
    red: {
      plateTop: "#ef4444",
      plateBot: "#b91c1c",
      rim: "#fca5a5",
      glow: "rgba(239, 68, 68, 0.38)",
      lampCore: "#fee2e2",
      lampMid: "#ef4444",
      lampGlow: "rgba(239, 68, 68, 0.46)",
    },
    yellow: {
      plateTop: "#facc15",
      plateBot: "#ca8a04",
      rim: "#fef08a",
      glow: "rgba(250, 204, 21, 0.42)",
      lampCore: "#fef9c3",
      lampMid: "#facc15",
      lampGlow: "rgba(250, 204, 21, 0.48)",
    },
  };

  const PITCH = 50;
  const RAFT_SIZE = 44;
  const BOARD_ORIGIN_X = (LOGICAL_W - (GRID * PITCH - (PITCH - RAFT_SIZE))) * 0.5;
  const BOARD_ORIGIN_Y = 98;
  const PLAYER_SPEED = 248;

  interface RaftCell {
    r: number;
    c: number;
    alive: boolean;
    sym: SignSym;
    color: RaftColor;
    bobPhase: number;
    sinkAnim: number;
    glowAnim: number;
    drifting: boolean;
    driftTime: number;
    driftX: number;
    driftY: number;
    driftRot: number;
  }

  const cells: RaftCell[] = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      cells.push({
        r,
        c,
        alive: true,
        sym: "X",
        color: "green",
        bobPhase: (r * 0.7 + c * 1.1) % (Math.PI * 2),
        sinkAnim: 0,
        glowAnim: 0,
        drifting: false,
        driftTime: 0,
        driftX: 0,
        driftY: 0,
        driftRot: 0,
      });
    }
  }

  const cellCenter = (r: number, c: number): { x: number; y: number } => ({
    x: BOARD_ORIGIN_X + c * PITCH + RAFT_SIZE * 0.5,
    y: BOARD_ORIGIN_Y + r * PITCH + RAFT_SIZE * 0.5,
  });

  const idxOf = (r: number, c: number): number => r * GRID + c;

  // Player state (starts on center tile row 2, col 2)
  let px = cellCenter(2, 2).x;
  let py = cellCenter(2, 2).y;
  let playerWalkPhase = 0;
  let playerFacingX = 0;
  let playerFacingY = 1;
  let playerPlungeAnim = 0;
  let pathWaypoints: Array<{ x: number; y: number }> = [];
  const heldKeys = new Set<string>();
  let pointerDragActive = false;
  let dragTargetX = px;
  let dragTargetY = py;

  type RoundPhase = "idle" | "flipping" | "running" | "resolving" | "drifting" | "lost" | "won";
  let started = false;
  let finished = false;
  let phase: RoundPhase = "idle";
  let elapsed = 0;
  let roundIdx = 0;
  let phaseTimer = 0;
  let roundTimer: number = ROUND_DURATIONS[0];
  let roundDuration: number = ROUND_DURATIONS[0];
  let marginAccum = 0;
  let bannerText = "";
  let bannerColor = "#34d399";
  let bannerTimer = 0;
  const lastTickSecRef = { value: 10 };

  const showBanner = (text: string, color: string, dur = 1.05): void => {
    bannerText = text;
    bannerColor = color;
    bannerTimer = dur;
  };

  let panelSigns: [SignSym, SignSym, SignSym] = ["X", "X", "O"];
  let safeSymbol: SignSym = "X";
  let safeColor: RaftColor = "green";
  const isCellSafe = (cell: RaftCell): boolean =>
    cell.alive && cell.sym === safeSymbol && cell.color === safeColor;

  interface WaterStreak {
    x: number;
    y: number;
    len: number;
    speed: number;
  }
  const streaks: WaterStreak[] = Array.from({ length: 34 }, () => ({
    x: Math.random() * LOGICAL_W,
    y: BOARD_ORIGIN_Y - 12 + Math.random() * (LOGICAL_H - BOARD_ORIGIN_Y + 20),
    len: 14 + Math.random() * 24,
    speed: 38 + Math.random() * 44,
  }));

  interface RippleRing {
    x: number;
    y: number;
    age: number;
    maxR: number;
    color: string;
  }
  const ripples: RippleRing[] = [];
  const particles: Particle[] = [];

  const spawnSplash = (x: number, y: number, color: string, count: number, speed = 135): void => {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.35 + Math.random() * 0.8);
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 45,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.35,
        r: 2 + Math.random() * 3,
        color,
      });
    }
  };

  // Find active raft closest to pixel coordinates
  const findNearestAliveCell = (wx: number, wy: number): RaftCell => {
    let best = cells.find((it) => it.alive) ?? cells[0];
    let bestD = Infinity;
    for (const cell of cells) {
      if (!cell.alive) continue;
      const ct = cellCenter(cell.r, cell.c);
      const d = Math.hypot(wx - ct.x, wy - ct.y);
      if (d < bestD) {
        bestD = d;
        best = cell;
      }
    }
    return best;
  };

  // Anti-fall walkability check: inside active raft tile OR connecting plank bridge between adjacent active tiles!
  const isWalkablePixel = (wx: number, wy: number): boolean => {
    const pad = 18.5; // keeps player feet inside 44x44 raft!
    for (const cell of cells) {
      if (!cell.alive) continue;
      const ct = cellCenter(cell.r, cell.c);
      if (Math.abs(wx - ct.x) <= pad && Math.abs(wy - ct.y) <= pad) {
        return true;
      }
      // Horizontal plank bridge to right alive neighbor
      if (cell.c + 1 < GRID && cells[idxOf(cell.r, cell.c + 1)].alive) {
        const rightCt = cellCenter(cell.r, cell.c + 1);
        if (wx >= ct.x && wx <= rightCt.x && Math.abs(wy - ct.y) <= 13) {
          return true;
        }
      }
      // Vertical plank bridge to bottom alive neighbor
      if (cell.r + 1 < GRID && cells[idxOf(cell.r + 1, cell.c)].alive) {
        const botCt = cellCenter(cell.r + 1, cell.c);
        if (wy >= ct.y && wy <= botCt.y && Math.abs(wx - ct.x) <= 13) {
          return true;
        }
      }
    }
    return false;
  };

  // Compute BFS hop distance map from a start tile across alive rafts only
  const computeBfsDistances = (startR: number, startC: number): Map<number, number> => {
    const dist = new Map<number, number>();
    const startIdx = idxOf(startR, startC);
    if (!cells[startIdx]?.alive) return dist;
    const q: number[] = [startIdx];
    dist.set(startIdx, 0);
    let head = 0;
    while (head < q.length) {
      const cur = q[head++];
      const d = dist.get(cur)!;
      const cr = Math.floor(cur / GRID);
      const cc = cur % GRID;
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ] as const) {
        const nr = cr + dr;
        const nc = cc + dc;
        if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) continue;
        const ni = idxOf(nr, nc);
        if (!cells[ni].alive || dist.has(ni)) continue;
        dist.set(ni, d + 1);
        q.push(ni);
      }
    }
    return dist;
  };

  // BFS shortest path from player's current cell to target alive cell
  const computeBfsPath = (goalR: number, goalC: number): Array<{ x: number; y: number }> => {
    const startCell = findNearestAliveCell(px, py);
    const startIdx = idxOf(startCell.r, startCell.c);
    const goalIdx = idxOf(goalR, goalC);
    if (startIdx === goalIdx) {
      const ct = cellCenter(goalR, goalC);
      return [{ x: ct.x, y: ct.y }];
    }
    const parent = new Map<number, number>();
    const visited = new Set<number>([startIdx]);
    const q: number[] = [startIdx];
    let found = false;
    for (let head = 0; head < q.length; head++) {
      const cur = q[head];
      if (cur === goalIdx) {
        found = true;
        break;
      }
      const cr = Math.floor(cur / GRID);
      const cc = cur % GRID;
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ] as const) {
        const nr = cr + dr;
        const nc = cc + dc;
        if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) continue;
        const ni = idxOf(nr, nc);
        if (!cells[ni].alive || visited.has(ni)) continue;
        visited.add(ni);
        parent.set(ni, cur);
        q.push(ni);
      }
    }
    if (!found) return [];
    const chain: number[] = [];
    let walk: number | undefined = goalIdx;
    while (walk !== undefined && walk !== startIdx) {
      chain.push(walk);
      walk = parent.get(walk);
    }
    chain.reverse();
    return chain.map((idx) => cellCenter(Math.floor(idx / GRID), idx % GRID));
  };

  // BFS-verified raft removal: strictly removes `removeCount` tiles while keeping ALL alive tiles connected!
  const removeConnectedRafts = (removeCount: number): RaftCell[] => {
    const playerCell = findNearestAliveCell(px, py);
    const playerIdx = idxOf(playerCell.r, playerCell.c);
    const removedList: RaftCell[] = [];

    for (let step = 0; step < removeCount; step++) {
      const currentAlive = cells.filter((c) => c.alive);
      if (currentAlive.length <= 4) break;
      const expectedAfter = currentAlive.length - 1;

      const candidates = currentAlive
        .map((cell) => {
          const ci = idxOf(cell.r, cell.c);
          if (ci === playerIdx) return null;
          // Temporarily toggle off & run BFS from playerIdx
          cell.alive = false;
          const reachable = computeBfsDistances(playerCell.r, playerCell.c);
          cell.alive = true;
          if (reachable.size !== expectedAfter) return null;

          // Score lightly prefers perimeter / lower-degree tiles so walkways twist cleanly
          let deg = 0;
          for (const [dr, dc] of [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ] as const) {
            const nr = cell.r + dr;
            const nc = cell.c + dc;
            if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && cells[idxOf(nr, nc)].alive) {
              deg += 1;
            }
          }
          const isEdge = cell.r === 0 || cell.r === GRID - 1 || cell.c === 0 || cell.c === GRID - 1 ? 1 : 0;
          return { cell, weight: deg * -0.4 + isEdge * 0.9 + Math.random() * 2.2 };
        })
        .filter((item): item is { cell: RaftCell; weight: number } => item !== null)
        .sort((a, b) => b.weight - a.weight);

      if (candidates.length === 0) break;
      const picked = candidates[0].cell;
      picked.alive = false;
      picked.drifting = true;
      picked.driftTime = 0;
      picked.driftX = 0;
      picked.driftY = 0;
      picked.driftRot = 0;
      removedList.push(picked);

      const ct = cellCenter(picked.r, picked.c);
      ripples.push({ x: ct.x, y: ct.y, age: 0, maxR: 32, color: "rgba(253, 224, 71, 0.78)" });
      spawnSplash(ct.x, ct.y, "#fde68a", 6, 95);
    }

    if (removedList.length > 0) {
      host.sfx.playRaftDriftSnap();
    }
    return removedList;
  };

  // Setup round symbols + signal color lamp guaranteeing reachable dual-match safe tiles & deceptive traps
  const setupRound = (nextRoundIdx: number): void => {
    roundIdx = nextRoundIdx;
    roundDuration = ROUND_DURATIONS[roundIdx];
    roundTimer = roundDuration;
    lastTickSecRef.value = Math.ceil(roundDuration);

    const allSyms: SignSym[] = ["X", "O", "SQ"];
    safeSymbol = allSyms[Math.floor(Math.random() * allSyms.length)];
    const decoys = allSyms.filter((s) => s !== safeSymbol);
    const panelDecoy = decoys[Math.floor(Math.random() * decoys.length)];
    const rawPanel: SignSym[] = [safeSymbol, safeSymbol, panelDecoy];
    for (let i = rawPanel.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rawPanel[i], rawPanel[j]] = [rawPanel[j], rawPanel[i]];
    }
    panelSigns = [rawPanel[0], rawPanel[1], rawPanel[2]];

    if (nextRoundIdx > 0 && Math.random() < 0.75) {
      const otherColors = RAFT_COLORS.filter((c) => c !== safeColor);
      safeColor = otherColors[Math.floor(Math.random() * otherColors.length)];
    } else {
      safeColor = RAFT_COLORS[Math.floor(Math.random() * RAFT_COLORS.length)];
    }
    const wrongColors = RAFT_COLORS.filter((c) => c !== safeColor);

    const playerCell = findNearestAliveCell(px, py);
    const bfsDists = computeBfsDistances(playerCell.r, playerCell.c);
    const aliveCells = cells.filter((c) => c.alive);

    const desiredSafeCount = clamp(
      SAFE_COUNTS[roundIdx] ?? 2,
      2,
      Math.max(2, aliveCells.length - 3),
    );
    const minHops = roundIdx >= 4 ? 3 : roundIdx >= 2 ? 2 : 1;
    const maxSafeHops = roundIdx >= 4 ? 4 : 5;

    const preferredPool = aliveCells.filter((c) => {
      const d = bfsDists.get(idxOf(c.r, c.c)) ?? 99;
      return d >= minHops && d <= maxSafeHops;
    });
    const nearFallback = aliveCells.filter((c) => {
      const d = bfsDists.get(idxOf(c.r, c.c)) ?? 99;
      return d >= 1 && d <= maxSafeHops;
    });

    const chosenSafeSet = new Set<number>();
    const shuffleCopy = <T>(arr: readonly T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

    // Guarantee at least 2 reachable safe tiles forcing movement away on later rounds
    for (const pool of [preferredPool, nearFallback]) {
      for (const nc of shuffleCopy(pool)) {
        if (chosenSafeSet.size >= Math.min(2, desiredSafeCount)) break;
        chosenSafeSet.add(idxOf(nc.r, nc.c));
      }
      if (chosenSafeSet.size >= Math.min(2, desiredSafeCount)) break;
    }

    const farThenAny = [
      ...shuffleCopy(aliveCells.filter((c) => (bfsDists.get(idxOf(c.r, c.c)) ?? 99) >= minHops)),
      ...shuffleCopy(aliveCells),
    ];
    for (const ac of farThenAny) {
      if (chosenSafeSet.size >= desiredSafeCount) break;
      chosenSafeSet.add(idxOf(ac.r, ac.c));
    }

    for (const cell of aliveCells) {
      cell.sinkAnim = 0;
      cell.glowAnim = 0;
      const ci = idxOf(cell.r, cell.c);
      if (chosenSafeSet.has(ci)) {
        cell.sym = safeSymbol;
        cell.color = safeColor;
      } else {
        const trapRoll = Math.random();
        if (trapRoll < 0.34) {
          // Trap A: Right monochrome symbol, WRONG color!
          cell.sym = safeSymbol;
          cell.color = wrongColors[Math.floor(Math.random() * wrongColors.length)];
        } else if (trapRoll < 0.68) {
          // Trap B: WRONG symbol, right color!
          cell.sym = decoys[Math.floor(Math.random() * decoys.length)];
          cell.color = safeColor;
        } else {
          // Trap C: Both symbol and color differ
          cell.sym = decoys[Math.floor(Math.random() * decoys.length)];
          cell.color = wrongColors[Math.floor(Math.random() * wrongColors.length)];
        }
      }
    }

    phase = "flipping";
    phaseTimer = 0.56;
    host.sfx.playRaftSignFlip();
  };

  // DOM UI (no instructional text!)
  const wrap = document.createElement("div");
  wrap.className = "dm-raft-wrap";
  const timerBar = createTimerBar(ROUND_DURATIONS[0]);

  const stage = document.createElement("div");
  stage.className = "dm-canvas-stage is-tall";
  const { canvas, ctx, dpr } = createScaledCanvas(LOGICAL_W, LOGICAL_H);
  stage.appendChild(canvas);

  const startOverlay = document.createElement("div");
  startOverlay.className = "dm-start-overlay";
  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.className = "dm-start-btn";
  startBtn.textContent = "🪵 BẮT ĐẦU TRÒ BÈ PHAO";
  startOverlay.appendChild(startBtn);
  stage.appendChild(startOverlay);

  wrap.append(timerBar.wrap, stage);
  host.boardEl.appendChild(wrap);

  const clientToLogical = (clientX: number, clientY: number): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / Math.max(1, rect.width)) * LOGICAL_W,
      y: ((clientY - rect.top) / Math.max(1, rect.height)) * LOGICAL_H,
    };
  };

  const startGame = (): void => {
    if (started || finished) return;
    started = true;
    startOverlay.classList.add("is-hidden");
    host.setLockedIn(true);
    setupRound(0);
  };

  startBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    startGame();
  });

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!started || finished || (phase !== "running" && phase !== "flipping")) return;
    const pt = clientToLogical(e.clientX, e.clientY);
    const targetCell = findNearestAliveCell(pt.x, pt.y);
    pathWaypoints = computeBfsPath(targetCell.r, targetCell.c);
    pointerDragActive = true;
    dragTargetX = pt.x;
    dragTargetY = pt.y;
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!pointerDragActive || !started || finished || phase !== "running") return;
    const pt = clientToLogical(e.clientX, e.clientY);
    if (Math.hypot(pt.x - dragTargetX, pt.y - dragTargetY) >= 12) {
      dragTargetX = pt.x;
      dragTargetY = pt.y;
      const targetCell = findNearestAliveCell(pt.x, pt.y);
      pathWaypoints = computeBfsPath(targetCell.r, targetCell.c);
    }
  });

  const endPointerDrag = (): void => {
    pointerDragActive = false;
  };
  canvas.addEventListener("pointerup", endPointerDrag);
  canvas.addEventListener("pointercancel", endPointerDrag);

  const onWindowKeyUp = (e: KeyboardEvent): void => {
    heldKeys.delete(e.key.toLowerCase());
  };
  const onWindowBlur = (): void => {
    heldKeys.clear();
    pointerDragActive = false;
  };
  window.addEventListener("keyup", onWindowKeyUp);
  window.addEventListener("blur", onWindowBlur);

  host.setKeyHandler((e) => {
    if (!started) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        startGame();
      }
      return;
    }
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
      e.preventDefault();
      heldKeys.add(k);
      pathWaypoints = [];
    }
  });

  let rafId: number | null = null;
  let lastTs = performance.now();

  const drawSingleRaft = (
    cx: number,
    cy: number,
    cell: RaftCell,
    showSymbol: boolean,
    isPlayerCell: boolean,
  ): void => {
    const sinkDrop = cell.sinkAnim * 18;
    const scale = clamp(1 - cell.sinkAnim * 0.55 - clamp(cell.driftTime * 0.65, 0, 0.7), 0.15, 1.08);
    const alpha = cell.drifting
      ? Math.max(0, 1 - cell.driftTime / 1.05)
      : Math.max(0, 1 - cell.sinkAnim * 0.85);
    if (alpha <= 0.02) return;

    const bobY = cell.drifting ? 0 : Math.sin(elapsed * 2.5 + cell.bobPhase) * 1.8;
    const shakeX =
      phase === "resolving" && !isCellSafe(cell) && cell.sinkAnim < 0.25
        ? Math.sin(elapsed * 58) * 2.6
        : 0;

    const half = RAFT_SIZE * 0.5;
    const isSafeResolving = phase === "resolving" && isCellSafe(cell);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx + cell.driftX + shakeX, cy + bobY + sinkDrop + cell.driftY);
    ctx.rotate(cell.driftRot);
    ctx.scale(scale, scale);

    // Subtle animated water-foam ring lapping around alive rafts
    if (!cell.drifting && cell.sinkAnim < 0.25) {
      const foamPulse = 1 + Math.sin(elapsed * 3.1 + cell.bobPhase) * 0.5;
      traceRoundedRect(ctx, -half - 2.5 - foamPulse * 0.6, -half - 2.5 - foamPulse * 0.6, RAFT_SIZE + 5 + foamPulse * 1.2, RAFT_SIZE + 5 + foamPulse * 1.2, 8);
      ctx.strokeStyle = isSafeResolving
        ? "rgba(52, 211, 153, 0.55)"
        : "rgba(254, 243, 199, 0.16)";
      ctx.lineWidth = isSafeResolving ? 2.2 : 1.2;
      ctx.stroke();
    }

    // Soft dark water shadow beneath raft
    ctx.fillStyle = "rgba(2, 6, 23, 0.48)";
    traceRoundedRect(ctx, -half + 2.5, -half + 5.5, RAFT_SIZE, RAFT_SIZE, 6);
    ctx.fill();

    // 3D cylindrical steel oil drums peeking top & bottom
    const drawOilDrum = (dx: number, dy: number, isBlue: boolean): void => {
      const gDrum = ctx.createLinearGradient(dx, dy, dx + 12, dy);
      if (isBlue) {
        gDrum.addColorStop(0, "#1e3a8a");
        gDrum.addColorStop(0.42, "#3b82f6");
        gDrum.addColorStop(1, "#172554");
      } else {
        gDrum.addColorStop(0, "#7f1d1d");
        gDrum.addColorStop(0.42, "#ef4444");
        gDrum.addColorStop(1, "#450a0a");
      }
      ctx.fillStyle = gDrum;
      ctx.fillRect(dx, dy, 12, 6.5);
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.fillRect(dx + 3.5, dy + 1, 2.2, 4.5);
      ctx.strokeStyle = "#020617";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(dx, dy, 12, 6.5);
    };
    drawOilDrum(-half + 4, -half - 3, true);
    drawOilDrum(half - 16, -half - 3, false);
    drawOilDrum(-half + 4, half - 3.5, true);
    drawOilDrum(half - 16, half - 3.5, false);

    // 3D timber deck thickness extrusion skirt
    traceRoundedRect(ctx, -half, -half + 3.2, RAFT_SIZE, RAFT_SIZE, 5.5);
    ctx.fillStyle = isSafeResolving ? "#064e3b" : "#3f1c05";
    ctx.fill();

    // Rich timber plank deck with subtle wood gradient
    traceRoundedRect(ctx, -half, -half, RAFT_SIZE, RAFT_SIZE, 5.5);
    const plankGrad = ctx.createLinearGradient(0, -half, 0, half);
    if (isSafeResolving) {
      plankGrad.addColorStop(0, "#059669");
      plankGrad.addColorStop(1, "#064e3b");
    } else if (cell.drifting) {
      plankGrad.addColorStop(0, "#9a3412");
      plankGrad.addColorStop(1, "#451a03");
    } else {
      plankGrad.addColorStop(0, "#92400e");
      plankGrad.addColorStop(0.55, "#78350f");
      plankGrad.addColorStop(1, "#5c280a");
    }
    ctx.fillStyle = plankGrad;
    ctx.fill();

    // Plank seam lines & subtle highlight strip
    ctx.strokeStyle = "rgba(41, 17, 4, 0.72)";
    ctx.lineWidth = 1.3;
    for (let pyOff = -half + 11; pyOff < half; pyOff += 11) {
      ctx.beginPath();
      ctx.moveTo(-half + 2, pyOff);
      ctx.lineTo(half - 2, pyOff);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255, 248, 220, 0.09)";
    ctx.fillRect(-half + 3, -half + 1.5, RAFT_SIZE - 6, 3);

    // Border & player standing tile highlight
    const showStandRing = isPlayerCell && started && phase === "running";
    const borderCol = isSafeResolving
      ? "#6ee7b7"
      : showStandRing
        ? "#38bdf8"
        : cell.drifting
          ? "#fb923c"
          : "#d97706";
    traceRoundedRect(ctx, -half, -half, RAFT_SIZE, RAFT_SIZE, 5.5);
    ctx.lineWidth = isSafeResolving || showStandRing ? 2.6 : 1.7;
    ctx.strokeStyle = borderCol;
    ctx.stroke();

    // Bright corner targeting brackets around active player raft
    if (showStandRing) {
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      const br = half - 2;
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(sx * (br - 6), sy * br);
        ctx.lineTo(sx * br, sy * br);
        ctx.lineTo(sx * br, sy * (br - 6));
        ctx.stroke();
      }
    }

    // Corner rope knots
    ctx.fillStyle = "#fde68a";
    for (const [kx, ky] of [
      [-half + 4.5, -half + 4.5],
      [half - 4.5, -half + 4.5],
      [-half + 4.5, half - 4.5],
      [half - 4.5, half - 4.5],
    ] as const) {
      ctx.beginPath();
      ctx.arc(kx, ky, 1.9, 0, Math.PI * 2);
      ctx.fill();
    }

    // Colored raft tile plate + pure monochrome white X / O / Square emblem
    if (showSymbol) {
      const colMeta = RAFT_COLOR_META[cell.color];
      // Subtle matching painted edge strips on raft timber
      ctx.fillStyle = colMeta.plateTop;
      ctx.fillRect(-half + 6, -half + 1.5, RAFT_SIZE - 12, 2.5);
      ctx.fillRect(-half + 6, half - 4, RAFT_SIZE - 12, 2.5);

      traceRoundedRect(ctx, -15, -15, 30, 30, 6.5);
      const tileGrad = ctx.createLinearGradient(0, -15, 0, 15);
      tileGrad.addColorStop(0, colMeta.plateTop);
      tileGrad.addColorStop(1, colMeta.plateBot);
      ctx.fillStyle = tileGrad;
      ctx.fill();
      ctx.lineWidth = isSafeResolving ? 2.4 : 1.7;
      ctx.strokeStyle = isSafeResolving ? "#ffffff" : colMeta.rim;
      ctx.stroke();

      drawSignEmblem(ctx, cell.sym, 0, 0, 8.2, 3.0, "#ffffff", true);
    }

    ctx.restore();
  };

  const render = (): void => {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);

    // 1. Rich Red River twilight backdrop + caustic waves + floating lotus/hyacinth margins
    const riverGrad = ctx.createLinearGradient(0, 0, 0, LOGICAL_H);
    riverGrad.addColorStop(0, "#0b1120");
    riverGrad.addColorStop(0.24, "#3b1506");
    riverGrad.addColorStop(0.62, "#7c2d12");
    riverGrad.addColorStop(1, "#3f0c09");
    ctx.fillStyle = riverGrad;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    // Undulating copper/amber river caustic wave ribbons
    ctx.lineCap = "round";
    for (let wi = 0; wi < 6; wi++) {
      const baseY = 112 + wi * 52;
      ctx.strokeStyle = `rgba(251, 191, 36, ${0.06 + (wi % 2) * 0.03})`;
      ctx.lineWidth = 7;
      ctx.beginPath();
      for (let x = 0; x <= LOGICAL_W; x += 26) {
        const yOff = Math.sin(x * 0.028 - elapsed * 1.9 + wi * 1.4) * 5.5;
        if (x === 0) ctx.moveTo(x, baseY + yOff);
        else ctx.lineTo(x, baseY + yOff);
      }
      ctx.stroke();
    }

    // Animated Red River foam currents flowing rightward under the rafts
    for (const st of streaks) {
      const sx = (st.x + elapsed * st.speed) % (LOGICAL_W + 40) - 20;
      ctx.strokeStyle = "rgba(254, 243, 199, 0.22)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, st.y);
      ctx.lineTo(sx + st.len, st.y);
      ctx.stroke();
    }

    // Subtle dark vignette along outer left/right edges
    const leftShoreGrad = ctx.createLinearGradient(0, 0, 92, 0);
    leftShoreGrad.addColorStop(0, "rgba(2, 6, 23, 0.65)");
    leftShoreGrad.addColorStop(1, "rgba(2, 6, 23, 0)");
    ctx.fillStyle = leftShoreGrad;
    ctx.fillRect(0, 88, 92, LOGICAL_H - 88);

    const rightShoreGrad = ctx.createLinearGradient(LOGICAL_W, 0, LOGICAL_W - 92, 0);
    rightShoreGrad.addColorStop(0, "rgba(2, 6, 23, 0.65)");
    rightShoreGrad.addColorStop(1, "rgba(2, 6, 23, 0)");
    ctx.fillStyle = rightShoreGrad;
    ctx.fillRect(LOGICAL_W - 92, 88, 92, LOGICAL_H - 88);

    // Bobbing water-hyacinth clusters along safe outer river margins
    const hyacinths = [
      { x: 26, y: 186, r: 9, p: 0.4 },
      { x: 58, y: 245, r: 7, p: 1.9 },
      { x: 34, y: 318, r: 10, p: 3.1 },
      { x: LOGICAL_W - 28, y: 174, r: 9, p: 2.2 },
      { x: LOGICAL_W - 60, y: 262, r: 8, p: 0.9 },
      { x: LOGICAL_W - 32, y: 332, r: 10, p: 4.3 },
    ];
    for (const h of hyacinths) {
      const hy = h.y + Math.sin(elapsed * 2.1 + h.p) * 3.5;
      ctx.fillStyle = "#14532d";
      ctx.beginPath();
      ctx.arc(h.x, hy, h.r, 0, Math.PI * 2);
      ctx.arc(h.x + h.r * 0.72, hy + 3, h.r * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#15803d";
      ctx.beginPath();
      ctx.arc(h.x - 1.5, hy - 1.5, h.r * 0.58, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4 Mooring bollards + hawser anchor lines tethering the raft grid frame
    const bollards: ReadonlyArray<{ bx: number; by: number; tx: number; ty: number }> = [
      { bx: 38, by: 122, tx: BOARD_ORIGIN_X + 10, ty: BOARD_ORIGIN_Y + 14 },
      { bx: 38, by: 368, tx: BOARD_ORIGIN_X + 10, ty: BOARD_ORIGIN_Y + 5 * PITCH + 28 },
      { bx: LOGICAL_W - 38, by: 122, tx: BOARD_ORIGIN_X + 5 * PITCH + 34, ty: BOARD_ORIGIN_Y + 14 },
      { bx: LOGICAL_W - 38, by: 368, tx: BOARD_ORIGIN_X + 5 * PITCH + 34, ty: BOARD_ORIGIN_Y + 5 * PITCH + 28 },
    ];
    for (const m of bollards) {
      ctx.strokeStyle = "rgba(217, 119, 6, 0.5)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(m.bx, m.by);
      ctx.quadraticCurveTo((m.bx + m.tx) * 0.5, (m.by + m.ty) * 0.5 + 10, m.tx, m.ty);
      ctx.stroke();

      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(m.bx, m.by, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#d97706";
      ctx.beginPath();
      ctx.arc(m.bx, m.by, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. TOP CRANE SIGNAL GANTRY (Steel Hazard Frame + 3 Beveled Sign Plaques + Left Round Pill + Right Dial)
    const gantryX = 14;
    const gantryY = 6;
    const gantryW = LOGICAL_W - 28;
    const gantryH = 80;

    ctx.save();
    traceRoundedRect(ctx, gantryX, gantryY, gantryW, gantryH, 13);
    const gantryGrad = ctx.createLinearGradient(0, gantryY, 0, gantryY + gantryH);
    gantryGrad.addColorStop(0, "rgba(30, 41, 59, 0.96)");
    gantryGrad.addColorStop(1, "rgba(15, 23, 42, 0.96)");
    ctx.fillStyle = gantryGrad;
    ctx.fill();
    ctx.save();
    ctx.clip();

    // Yellow-black hazard trim along top beam
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(gantryX, gantryY, gantryW, 5);
    ctx.fillStyle = "#020617";
    for (let sx = gantryX - 10; sx < gantryX + gantryW + 10; sx += 16) {
      ctx.beginPath();
      ctx.moveTo(sx, gantryY);
      ctx.lineTo(sx + 8, gantryY);
      ctx.lineTo(sx + 4, gantryY + 5);
      ctx.lineTo(sx - 4, gantryY + 5);
      ctx.closePath();
      ctx.fill();
    }

    // Twin soft overhead floodlight cones behind monochrome plaques
    for (const coneX of [186, 254]) {
      const lightGrad = ctx.createRadialGradient(coneX, 16, 4, coneX, 56, 68);
      lightGrad.addColorStop(0, "rgba(254, 240, 138, 0.14)");
      lightGrad.addColorStop(1, "rgba(254, 240, 138, 0)");
      ctx.fillStyle = lightGrad;
      ctx.fillRect(coneX - 75, 10, 150, 76);
    }
    ctx.restore();

    traceRoundedRect(ctx, gantryX, gantryY, gantryW, gantryH, 13);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = "#475569";
    ctx.stroke();

    // Metallic crane rail & corner rivets
    ctx.fillStyle = "#334155";
    ctx.fillRect(132, 13, 172, 5);
    ctx.fillStyle = "#94a3b8";
    for (const [rxp, ryp] of [
      [gantryX + 10, gantryY + 12],
      [gantryX + gantryW - 10, gantryY + 12],
      [gantryX + 10, gantryY + gantryH - 9],
      [gantryX + gantryW - 10, gantryY + gantryH - 9],
    ] as const) {
      ctx.beginPath();
      ctx.arc(rxp, ryp, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3 Monochrome Beveled Sign Plaques (no color coding per symbol!)
    for (let i = 0; i < 3; i++) {
      const slotX = 160 + i * 58;
      const slotY = 48;
      let scaleX = 1;
      let revealSym = started;
      if (phase === "flipping") {
        const localT = clamp((0.56 - phaseTimer - i * 0.11) / 0.24, 0, 1);
        scaleX = Math.max(0.06, Math.abs(Math.cos(localT * Math.PI)));
        revealSym = localT >= 0.5;
      }

      // Twin hanging steel chains + bracket
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(slotX - 9, 16);
      ctx.lineTo(slotX - 9, 23);
      ctx.moveTo(slotX + 9, 16);
      ctx.lineTo(slotX + 9, 23);
      ctx.stroke();

      ctx.save();
      ctx.translate(slotX, slotY);
      ctx.scale(scaleX, 1);
      const sym = panelSigns[i];
      const isMatchingSafePlaque = phase === "resolving" && sym === safeSymbol;

      if (isMatchingSafePlaque) {
        traceRoundedRect(ctx, -28, -27, 56, 54, 11);
        ctx.fillStyle = "rgba(52, 211, 153, 0.34)";
        ctx.fill();
      }

      traceRoundedRect(ctx, -25, -24, 50, 48, 9);
      const plaqueGrad = ctx.createLinearGradient(0, -24, 0, 24);
      plaqueGrad.addColorStop(0, revealSym ? "#334155" : "#1e293b");
      plaqueGrad.addColorStop(1, "#0f172a");
      ctx.fillStyle = plaqueGrad;
      ctx.fill();
      ctx.lineWidth = isMatchingSafePlaque ? 3.0 : 2.3;
      ctx.strokeStyle = isMatchingSafePlaque ? "#6ee7b7" : revealSym ? "#cbd5e1" : "#475569";
      ctx.stroke();

      // Top glass specular sheen on plaque
      ctx.fillStyle = "rgba(255, 255, 255, 0.11)";
      traceRoundedRect(ctx, -21, -21, 42, 11, 5);
      ctx.fill();

      if (revealSym) {
        drawSignEmblem(ctx, sym, 0, 1, 12, 4.2, "#f8fafc", true);
      } else {
        ctx.fillStyle = "#64748b";
        ctx.beginPath();
        ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Adjacent 3-Color Signal Beacon Lamp (Pure glowing signal lens, NO color text)
    {
      const bx = 322;
      const by = 16;
      const bw = 88;
      const bh = 62;
      const lampOn = started && phase !== "idle";
      const shownColor: RaftColor =
        phase === "flipping"
          ? RAFT_COLORS[Math.floor(elapsed * 16) % RAFT_COLORS.length]
          : safeColor;
      const lMeta = RAFT_COLOR_META[shownColor];
      const isLampResolving = phase === "resolving";

      traceRoundedRect(ctx, bx, by, bw, bh, 12);
      ctx.fillStyle = "rgba(2, 6, 23, 0.72)";
      ctx.fill();
      ctx.lineWidth = isLampResolving ? 2.6 : 1.8;
      ctx.strokeStyle = isLampResolving ? "#6ee7b7" : lampOn ? lMeta.rim : "#475569";
      ctx.stroke();

      // Centered large glowing glass beacon dome
      const lx = bx + bw * 0.5;
      const ly = by + bh * 0.5;
      if (lampOn) {
        const halo = ctx.createRadialGradient(lx, ly, 5, lx, ly, 32);
        halo.addColorStop(0, lMeta.lampGlow);
        halo.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(lx, ly, 32, 0, Math.PI * 2);
        ctx.fill();
      }

      // Outer metallic socket bezel with 4 corner screws
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(lx, ly, 24.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Luminous colored glass lens
      if (lampOn) {
        const bulbGrad = ctx.createRadialGradient(lx - 5, ly - 6, 2.5, lx, ly, 21.5);
        bulbGrad.addColorStop(0, lMeta.lampCore);
        bulbGrad.addColorStop(0.55, lMeta.lampMid);
        bulbGrad.addColorStop(1, lMeta.plateBot);
        ctx.fillStyle = bulbGrad;
      } else {
        ctx.fillStyle = "#334155";
      }
      ctx.beginPath();
      ctx.arc(lx, ly, 21, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = lampOn ? lMeta.rim : "#475569";
      ctx.stroke();

      // Glass reflection highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.48)";
      ctx.beginPath();
      ctx.ellipse(lx - 6.5, ly - 7.5, 7, 3.6, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Left Round Tracker Pill (LƯỢT X/6 + 6 beveled gems)
    traceRoundedRect(ctx, 20, 18, 104, 58, 10);
    ctx.fillStyle = "rgba(2, 6, 23, 0.56)";
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
    ctx.stroke();

    ctx.font = "800 11px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(`LƯỢT ${started ? roundIdx + 1 : 1}/${TOTAL_ROUNDS}`, 72, 32);

    for (let ri = 0; ri < TOTAL_ROUNDS; ri++) {
      const gx = 34.5 + ri * 15;
      const gy = 54;
      const isDone = ri < roundIdx;
      const isCur = ri === roundIdx && started;
      if (isCur) {
        ctx.beginPath();
        ctx.arc(gx, gy, 7.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(250, 204, 21, 0.28)";
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(gx, gy, 4.6, 0, Math.PI * 2);
      ctx.fillStyle = isDone ? "#10b981" : isCur ? "#facc15" : "#334155";
      ctx.fill();
      ctx.strokeStyle = isDone ? "#a7f3d0" : isCur ? "#fef08a" : "#0f172a";
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }

    // Right Countdown Dial Gauge with numeric timer centered inside
    const cdFrac = started && phase === "running" ? clamp(roundTimer / roundDuration, 0, 1) : phase === "flipping" ? 1 : 0;
    const rx = 468;
    const ry = 47;
    ctx.fillStyle = "rgba(2, 6, 23, 0.62)";
    ctx.beginPath();
    ctx.arc(rx, ry, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.arc(rx, ry, 21, 0, Math.PI * 2);
    ctx.stroke();
    if (cdFrac > 0) {
      ctx.strokeStyle = cdFrac > 0.45 ? "#38bdf8" : cdFrac > 0.22 ? "#f59e0b" : "#ef4444";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(rx, ry, 21, -Math.PI / 2, -Math.PI / 2 + cdFrac * Math.PI * 2);
      ctx.stroke();
    }
    ctx.font = "900 11.5px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle =
      phase === "resolving"
        ? "#6ee7b7"
        : cdFrac <= 0.25 && started && phase === "running"
          ? "#fca5a5"
          : "#f8fafc";
    ctx.fillText(
      !started
        ? `${roundDuration.toFixed(1)}s`
        : phase === "resolving"
          ? "✓"
          : `${Math.max(0, roundTimer).toFixed(1)}`,
      rx,
      ry + 0.5,
    );

    ctx.restore();

    // 3. Detailed Wooden Connecting Plank Bridges with cross-cleats & brass nails
    for (const cell of cells) {
      if (!cell.alive) continue;
      const ct = cellCenter(cell.r, cell.c);
      if (cell.c + 1 < GRID && cells[idxOf(cell.r, cell.c + 1)].alive) {
        const rightCt = cellCenter(cell.r, cell.c + 1);
        const bw = rightCt.x - ct.x;
        ctx.fillStyle = "rgba(2, 6, 23, 0.35)";
        ctx.fillRect(ct.x, ct.y - 3, bw, 13);
        ctx.fillStyle = "#b45309";
        ctx.fillRect(ct.x, ct.y - 6.5, bw, 13);
        ctx.strokeStyle = "#451a03";
        ctx.lineWidth = 1.4;
        ctx.strokeRect(ct.x, ct.y - 6.5, bw, 13);
        // Plank center split + brass nails
        ctx.beginPath();
        ctx.moveTo(ct.x, ct.y);
        ctx.lineTo(rightCt.x, ct.y);
        ctx.stroke();
        ctx.fillStyle = "#fde68a";
        ctx.fillRect(ct.x + bw * 0.5 - 1.5, ct.y - 4.5, 3, 2);
        ctx.fillRect(ct.x + bw * 0.5 - 1.5, ct.y + 2.5, 3, 2);
      }
      if (cell.r + 1 < GRID && cells[idxOf(cell.r + 1, cell.c)].alive) {
        const botCt = cellCenter(cell.r + 1, cell.c);
        const bh = botCt.y - ct.y;
        ctx.fillStyle = "rgba(2, 6, 23, 0.35)";
        ctx.fillRect(ct.x - 4.5, ct.y, 13, bh);
        ctx.fillStyle = "#b45309";
        ctx.fillRect(ct.x - 6.5, ct.y, 13, bh);
        ctx.strokeStyle = "#451a03";
        ctx.lineWidth = 1.4;
        ctx.strokeRect(ct.x - 6.5, ct.y, 13, bh);
        ctx.beginPath();
        ctx.moveTo(ct.x, ct.y);
        ctx.lineTo(ct.x, botCt.y);
        ctx.stroke();
        ctx.fillStyle = "#fde68a";
        ctx.fillRect(ct.x - 4.5, ct.y + bh * 0.5 - 1.5, 2, 3);
        ctx.fillRect(ct.x + 2.5, ct.y + bh * 0.5 - 1.5, 2, 3);
      }
    }

    // 4. Draw 6x6 Oil-Drum Rafts (highlighting current standing tile)
    const showRaftSyms = started && phase !== "idle";
    const activePlayerCell = findNearestAliveCell(px, py);
    for (const cell of cells) {
      if (!cell.alive && !cell.drifting) continue;
      const ct = cellCenter(cell.r, cell.c);
      drawSingleRaft(ct.x, ct.y, cell, showRaftSyms && !cell.drifting, cell === activePlayerCell);
    }

    // 5. BFS Walk Waypoints dashed golden path + destination target reticle
    if (pathWaypoints.length > 0 && phase === "running") {
      ctx.save();
      ctx.strokeStyle = "rgba(250, 204, 21, 0.72)";
      ctx.lineWidth = 2.4;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      for (const wp of pathWaypoints) {
        ctx.lineTo(wp.x, wp.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      const lastWp = pathWaypoints[pathWaypoints.length - 1];
      const reticleR = 9 + Math.sin(elapsed * 10) * 2;
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lastWp.x, lastWp.y, reticleR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(lastWp.x, lastWp.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Water splash rings
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.age += 1 / 60;
      if (rp.age >= 0.65) {
        ripples.splice(i, 1);
        continue;
      }
      const t = rp.age / 0.65;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = rp.color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, lerp(6, rp.maxR, t), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 7. SOLO PLAYER EXPLORER CHARACTER (Ground ring + life-vest + swinging limbs + Nón Lá)
    const pScale = clamp(1 - playerPlungeAnim * 0.72, 0.15, 1);
    const pDrop = playerPlungeAnim * 20;
    const pAlpha = Math.max(0, 1 - playerPlungeAnim * 0.92);
    const pBob = phase === "resolving" ? 0 : Math.sin(elapsed * 2.5 + activePlayerCell.bobPhase) * 1.8;

    ctx.save();
    ctx.globalAlpha = pAlpha;
    ctx.translate(px, py + pBob + pDrop);
    ctx.scale(pScale, pScale);

    // Crisp ground locator ring + foot shadow
    ctx.strokeStyle = "rgba(56, 189, 248, 0.68)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 8, 12.5, 6.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(2, 6, 23, 0.52)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const stepOffset = Math.sin(playerWalkPhase) * 3.5;
    // Swinging boots & arms
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(-3.5, 6 + stepOffset, 3.1, 0, Math.PI * 2);
    ctx.arc(3.5, 6 - stepOffset, 3.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f2c6a0";
    ctx.beginPath();
    ctx.arc(-10.5, -1 - stepOffset * 0.7, 2.5, 0, Math.PI * 2);
    ctx.arc(10.5, -1 + stepOffset * 0.7, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Explorer navy shirt + bright orange life-vest jacket
    traceRoundedRect(ctx, -9.5, -7, 19, 13.5, 5);
    ctx.fillStyle = "#1d4ed8";
    ctx.fill();
    ctx.strokeStyle = "#020617";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // High-vis vest flaps
    ctx.fillStyle = "#f97316";
    ctx.fillRect(-7.5, -6, 5.5, 10);
    ctx.fillRect(2, -6, 5.5, 10);
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(-7, -1, 4.5, 2);
    ctx.fillRect(2.5, -1, 4.5, 2);

    // Head + stylized Nón Lá conical hat
    ctx.fillStyle = "#f2c6a0";
    ctx.beginPath();
    ctx.arc(0, -11, 7.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Face eyes oriented toward velocity
    ctx.fillStyle = "#020617";
    ctx.beginPath();
    ctx.arc(playerFacingX * 2.4 - 2.2, -10 + playerFacingY * 1.4, 1.3, 0, Math.PI * 2);
    ctx.arc(playerFacingX * 2.4 + 2.2, -10 + playerFacingY * 1.4, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Woven Vietnamese Nón Lá crown with radial ribs
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.moveTo(-12.5, -12.5);
    ctx.lineTo(0, -23.5);
    ctx.lineTo(12.5, -12.5);
    ctx.quadraticCurveTo(0, -10, -12.5, -12.5);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.7;
    ctx.strokeStyle = "#92400e";
    ctx.stroke();
    ctx.strokeStyle = "rgba(180, 83, 9, 0.55)";
    ctx.lineWidth = 1;
    for (const rxOff of [-6, 0, 6]) {
      ctx.beginPath();
      ctx.moveTo(0, -23.2);
      ctx.lineTo(rxOff, -12);
      ctx.stroke();
    }

    ctx.restore();

    // Splash particles
    updateAndDrawParticles(ctx, particles, 1 / 60, 200);

    // 8. Floating Non-Blocking Transition Status Banner
    if (bannerTimer > 0 && bannerText) {
      const bAlpha = clamp(bannerTimer / 0.35, 0, 1);
      ctx.save();
      ctx.globalAlpha = bAlpha;
      traceRoundedRect(ctx, LOGICAL_W * 0.5 - 98, 92, 196, 26, 13);
      ctx.fillStyle = "rgba(2, 6, 23, 0.88)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = bannerColor;
      ctx.stroke();
      ctx.font = "900 12.5px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = bannerColor;
      ctx.fillText(bannerText, LOGICAL_W * 0.5, 105);
      ctx.restore();
    }

    ctx.restore();
  };

  // Axis-separated clamped movement inside walkable rafts + plank bridges
  const stepPlayerMovement = (dt: number): void => {
    let moveVx = 0;
    let moveVy = 0;

    let kx = 0;
    let ky = 0;
    if (heldKeys.has("a") || heldKeys.has("arrowleft")) kx -= 1;
    if (heldKeys.has("d") || heldKeys.has("arrowright")) kx += 1;
    if (heldKeys.has("w") || heldKeys.has("arrowup")) ky -= 1;
    if (heldKeys.has("s") || heldKeys.has("arrowdown")) ky += 1;

    if (kx !== 0 || ky !== 0) {
      const mag = Math.hypot(kx, ky);
      moveVx = (kx / mag) * PLAYER_SPEED;
      moveVy = (ky / mag) * PLAYER_SPEED;
    } else if (pathWaypoints.length > 0) {
      const wp = pathWaypoints[0];
      const dx = wp.x - px;
      const dy = wp.y - py;
      const dist = Math.hypot(dx, dy);
      if (dist <= 4.5) {
        px = wp.x;
        py = wp.y;
        pathWaypoints.shift();
      } else {
        moveVx = (dx / dist) * PLAYER_SPEED;
        moveVy = (dy / dist) * PLAYER_SPEED;
      }
    }

    if (moveVx !== 0 || moveVy !== 0) {
      playerWalkPhase += dt * 18;
      const m = Math.hypot(moveVx, moveVy);
      playerFacingX = moveVx / m;
      playerFacingY = moveVy / m;

      const nextX = px + moveVx * dt;
      if (isWalkablePixel(nextX, py)) {
        px = nextX;
      }
      const nextY = py + moveVy * dt;
      if (isWalkablePixel(px, nextY)) {
        py = nextY;
      }
    }
  };

  // Evaluate player tile at countdown end with 8px edge-snap forgiveness toward touching dual-safe neighbors
  const resolvePlayerSafeCell = (): { safe: boolean; standingCell: RaftCell } => {
    const primary = findNearestAliveCell(px, py);
    if (isCellSafe(primary)) {
      return { safe: true, standingCell: primary };
    }
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const nr = primary.r + dr;
      const nc = primary.c + dc;
      if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) continue;
      const nb = cells[idxOf(nr, nc)];
      if (!isCellSafe(nb)) continue;
      const nbCt = cellCenter(nr, nc);
      if (Math.abs(px - nbCt.x) <= RAFT_SIZE * 0.5 + 8 && Math.abs(py - nbCt.y) <= RAFT_SIZE * 0.5 + 8) {
        px = clamp(px, nbCt.x - 14, nbCt.x + 14);
        py = clamp(py, nbCt.y - 14, nbCt.y + 14);
        return { safe: true, standingCell: nb };
      }
    }
    return { safe: false, standingCell: primary };
  };

  const tick = (ts: number): void => {
    const dt = clamp((ts - lastTs) / 1000, 0, 0.05);
    lastTs = ts;
    elapsed += dt;
    if (bannerTimer > 0) {
      bannerTimer = Math.max(0, bannerTimer - dt);
    }

    if (started && !finished) {
      if (phase === "flipping") {
        phaseTimer -= dt;
        stepPlayerMovement(dt * 0.5);
        syncLowTimeChrome(timerBar, host.modalEl, roundTimer, roundDuration, false);
        if (phaseTimer <= 0) {
          phase = "running";
        }
      } else if (phase === "running") {
        roundTimer -= dt;
        stepPlayerMovement(dt);
        if (roundTimer <= 2.2 && roundTimer > 0) {
          playLowTimeTick(host.sfx, roundTimer, lastTickSecRef);
        }
        syncLowTimeChrome(
          timerBar,
          host.modalEl,
          Math.max(0, roundTimer),
          roundDuration,
          roundTimer <= 1.8,
        );

        if (roundTimer <= 0) {
          roundTimer = 0;
          syncLowTimeChrome(timerBar, host.modalEl, 0, roundDuration, false);
          pathWaypoints = [];
          const outcome = resolvePlayerSafeCell();
          const standCt = cellCenter(outcome.standingCell.r, outcome.standingCell.c);

          if (outcome.safe) {
            marginAccum += 0.35;
            ripples.push({ x: standCt.x, y: standCt.y, age: 0, maxR: 38, color: "rgba(52, 211, 153, 0.9)" });
            spawnSplash(standCt.x, standCt.y, "#34d399", 10, 120);
            showBanner("✓ AN TOÀN!", "#34d399", 1.15);
            host.sfx.playRaftRoundClear();
            phase = "resolving";
            phaseTimer = 1.2;
          } else {
            ripples.push({ x: standCt.x, y: standCt.y, age: 0, maxR: 42, color: "rgba(239, 68, 68, 0.92)" });
            stage.classList.remove("is-shake");
            void stage.offsetWidth;
            stage.classList.add("is-shake");
            phase = "lost";
            phaseTimer = 1.1;
          }
          host.sfx.playRaftSinkSplash();
          for (const cell of cells) {
            if (!cell.alive || isCellSafe(cell)) continue;
            const ct = cellCenter(cell.r, cell.c);
            spawnSplash(ct.x, ct.y, "#e0f2fe", 6, 120);
            ripples.push({ x: ct.x, y: ct.y, age: 0, maxR: 28, color: "rgba(224, 242, 254, 0.72)" });
          }
        }
      } else if (phase === "resolving") {
        phaseTimer -= dt;
        const sinkProg = clamp((1.2 - phaseTimer) / 0.45, 0, 1);
        for (const cell of cells) {
          if (!cell.alive || isCellSafe(cell)) continue;
          cell.sinkAnim = phaseTimer > 0.35 ? sinkProg : clamp(phaseTimer / 0.35, 0, 1);
        }
        if (phaseTimer <= 0) {
          for (const cell of cells) {
            cell.sinkAnim = 0;
          }
          if (roundIdx >= TOTAL_ROUNDS - 1) {
            finished = true;
            phase = "won";
            const bonusChests = Math.min(6, Math.max(4, Math.round(4 + marginAccum)));
            for (const cell of cells) {
              if (!cell.alive) continue;
              const ct = cellCenter(cell.r, cell.c);
              spawnSplash(ct.x, ct.y, "#facc15", 5, 110);
            }
            render();
            host.finish(
              "raft_signs",
              true,
              `Vượt qua ${TOTAL_ROUNDS}/${TOTAL_ROUNDS} lượt Bè Phao 6×6 trên Sông Hồng → Mở ${bonusChests} rương báu!`,
              0,
              bonusChests,
            );
            return;
          }
          // Permanently cast off 3 -> 5 -> 7 -> 9 -> 5 rafts with BFS single-component guarantee
          const nextRemove = REMOVE_SCHEDULE[roundIdx + 1];
          const removed = removeConnectedRafts(nextRemove);
          if (removed.length > 0) {
            showBanner(`-${removed.length} BÈ TRÔI DẠT!`, "#fbbf24", 1.0);
          }
          phase = "drifting";
          phaseTimer = 1.05;
        }
      } else if (phase === "drifting") {
        phaseTimer -= dt;
        for (const cell of cells) {
          if (!cell.drifting) continue;
          cell.driftTime += dt;
          cell.driftX += (82 + cell.driftTime * 55) * dt;
          cell.driftY += Math.sin(cell.driftTime * 6 + cell.bobPhase) * 14 * dt;
          cell.driftRot += 0.55 * dt;
          if (phaseTimer <= 0) {
            cell.drifting = false;
          }
        }
        if (phaseTimer <= 0) {
          setupRound(roundIdx + 1);
        }
      } else if (phase === "lost") {
        phaseTimer -= dt;
        const plunge = clamp((1.1 - phaseTimer) / 0.45, 0, 1);
        playerPlungeAnim = plunge;
        for (const cell of cells) {
          if (!cell.alive || isCellSafe(cell)) continue;
          cell.sinkAnim = plunge;
        }
        if (phaseTimer <= 0) {
          finished = true;
          render();
          host.finish(
            "raft_signs",
            false,
            `Đứng nhầm ký hiệu hoặc màu bè ở lượt ${roundIdx + 1}/${TOTAL_ROUNDS} — Rơi xuống Sông Hồng! (-60 HP)`,
            60,
            0,
          );
          return;
        }
      }
    }

    render();
    rafId = window.requestAnimationFrame(tick);
  };

  render();
  rafId = window.requestAnimationFrame(tick);

  host.setCleanup(() => {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    window.removeEventListener("keyup", onWindowKeyUp);
    window.removeEventListener("blur", onWindowBlur);
    heldKeys.clear();
    pathWaypoints.length = 0;
    cells.length = 0;
    ripples.length = 0;
    particles.length = 0;
    streaks.length = 0;
    canvas.width = 0;
    canvas.height = 0;
  });
}
