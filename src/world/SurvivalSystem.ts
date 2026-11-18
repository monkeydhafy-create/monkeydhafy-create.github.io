import type { EquipmentStats } from "./EquipmentCatalog.ts";
import type { EnvironmentState } from "./HanoiWeatherService.ts";
import type { SurfaceState } from "./types.ts";

export interface StaminaBuffState {
  boostPct: number;
  expiresAt: number;
}

export interface SurvivalState {
  hp: number;
  hunger: number;
  stamina: number;
  bodyTempC: number;
  staminaBuff?: StaminaBuffState | null;
}

export interface ThermalEvaluation {
  ambientTempC: number;
  feelsLikeC: number;
  targetBodyTempC: number;
  isSweating: boolean;
  isShivering: boolean;
  isRainExposed: boolean;
  heatStress: number;
  coldStress: number;
  statusLabel: string;
}

export interface SurvivalTickResult {
  thermal: ThermalEvaluation;
  blurIntensity: number; // 0..1 when hungry / exhausted / low HP
  speedMultiplier: number; // < 1 when exhausted
  fainted: boolean;
  faintReason: string | null;
}

export const SURVIVAL_IDEAL_TEMP_C = 36.8;

export function createDefaultSurvivalState(): SurvivalState {
  return {
    hp: 100,
    hunger: 100,
    stamina: 100,
    bodyTempC: SURVIVAL_IDEAL_TEMP_C,
    staminaBuff: null,
  };
}

/**
 * Smart tiered stamina recovery rate:
 * - 0..10: very slow (0.42/s)
 * - 10..25: slow (0.95/s)
 * - 25..50: normal (1.90/s)
 * - 50..80: moderate (3.30/s)
 * - 80+: fast (5.60/s)
 */
export function getSmartStaminaRecoveryBaseRate(stamina: number): number {
  if (stamina >= 80) return 5.6;
  if (stamina >= 50) return 3.3;
  if (stamina >= 25) return 1.9;
  if (stamina >= 10) return 0.95;
  return 0.42;
}

export function getActiveStaminaMax(
  state: SurvivalState,
  nowMs = Date.now(),
  permanentStaminaBonusPct = 0,
): number {
  const perm = Math.max(0, permanentStaminaBonusPct);
  const buff = state.staminaBuff;
  const buffPct = buff && buff.expiresAt > nowMs && buff.boostPct > 0 ? buff.boostPct : 0;
  return 100 + perm + buffPct;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/**
 * Physics-inspired thermoregulation model combining:
 * - Current weather temperature, solar radiation, humidity, wind speed & rainfall
 * - Water submersion cooling (wading / swimming)
 * - Player outfit warmth, solar heat resistance & wind/rain protection
 */
export function evaluateThermalState(
  env: EnvironmentState,
  surface: SurfaceState,
  equip: EquipmentStats,
  currentBodyTempC: number,
): ThermalEvaluation {
  const windShield = clamp(equip.windRainResist, 0, 0.92);
  const heatShield = clamp(equip.heatResist, 0, 1.0);

  // Sun raises radiant load; summer hats, sunglasses & breathable shirts cut absorbed heat
  const sunLoadC = env.sunIntensity * 5.2 * (1 - heatShield * 0.72);
  // High humidity amplifies perceived heat when warm
  const humidityLoadC =
    env.temperatureC >= 24 ? ((Math.max(55, env.humidityPct) - 55) / 45) * 2.2 : 0;

  // Wind-chill & wet rainfall cooling, mitigated by windproof/waterproof garments
  const windFactor = clamp(env.windSpeedKmh / 10, 0, 5);
  const windChillBase = env.temperatureC < 25 ? 1.25 : 0.65;
  const windChillC = windFactor * windChillBase * (1 - windShield * 0.85);
  const wetChillC = env.rainIntensity * 5.4 * (1 - windShield * 0.88);
  const waterChillC = surface === "swim" ? 4.4 : surface === "wade" ? 1.8 : 0;

  // Heavy warm coats insulate against cold, but add heat burden on hot sunny days
  const outfitThermalOffset =
    env.temperatureC >= 27 && equip.warmth > 2
      ? equip.warmth * 1.15
      : equip.warmth * 1.1;

  const feelsLikeC = Number(
    (env.temperatureC + sunLoadC + humidityLoadC - windChillC - wetChillC - waterChillC).toFixed(
      1,
    ),
  );

  const effectiveAmbientC = feelsLikeC + outfitThermalOffset;

  let targetBodyTempC = SURVIVAL_IDEAL_TEMP_C;
  if (effectiveAmbientC > 27.5) {
    targetBodyTempC = clamp(36.8 + (effectiveAmbientC - 27.5) * 0.24, 36.8, 40.4);
  } else if (effectiveAmbientC < 21.5) {
    targetBodyTempC = clamp(36.8 - (21.5 - effectiveAmbientC) * 0.24, 34.1, 36.8);
  }

  const isSweating = currentBodyTempC >= 37.55 || (effectiveAmbientC >= 31.5 && currentBodyTempC >= 37.3);
  const isShivering = currentBodyTempC <= 36.05 || (effectiveAmbientC <= 14.5 && currentBodyTempC <= 36.25);
  const isRainExposed = env.rainIntensity >= 0.25 && windShield < 0.5;

  const heatStress = clamp((currentBodyTempC - 37.4) / 1.9, 0, 1.5);
  const coldStress = clamp((36.2 - currentBodyTempC) / 1.9, 0, 1.5);

  let statusLabel = "😌 Thân nhiệt ổn định";
  if (currentBodyTempC >= 39.0) {
    statusLabel = "🥵 Sốc nhiệt nắng nóng!";
  } else if (isSweating) {
    statusLabel = "💦 Nóng toát mồ hôi";
  } else if (currentBodyTempC <= 35.0) {
    statusLabel = "🥶 Hạ thân nhiệt nguy hiểm!";
  } else if (isShivering && isRainExposed) {
    statusLabel = "🌧️ Lạnh cóng vì mưa gió";
  } else if (isShivering) {
    statusLabel = "🥶 Lạnh run (mặc thêm áo ấm)";
  } else if (isRainExposed) {
    statusLabel = "☔ Dầm mưa gió (tốn sức)";
  }

  return {
    ambientTempC: env.temperatureC,
    feelsLikeC,
    targetBodyTempC,
    isSweating,
    isShivering,
    isRainExposed,
    heatStress,
    coldStress,
    statusLabel,
  };
}

export function stepSurvivalState(
  state: SurvivalState,
  dtSeconds: number,
  options: {
    isMoving: boolean;
    surface: SurfaceState;
    env: EnvironmentState;
    equip: EquipmentStats;
    totalWeightKg?: number;
    permanentStaminaBonusPct?: number;
    heavySpeedBonusPct?: number;
    nowMs?: number;
  },
): SurvivalTickResult {
  const dt = Math.min(Math.max(dtSeconds, 0), 0.25);
  const { isMoving, surface, env, equip } = options;
  const totalWeightKg = Math.max(0, options.totalWeightKg ?? equip.weightKg);
  const permStaminaPct = Math.max(0, options.permanentStaminaBonusPct ?? 0);
  const heavySpeedBonusPct = Math.max(0, options.heavySpeedBonusPct ?? 0);
  const nowMs = options.nowMs ?? Date.now();

  const activeBuff =
    state.staminaBuff && state.staminaBuff.expiresAt > nowMs && state.staminaBuff.boostPct > 0
      ? state.staminaBuff
      : null;
  if (!activeBuff && state.staminaBuff) {
    state.staminaBuff = null;
  }
  const totalBoostPct = permStaminaPct + (activeBuff ? activeBuff.boostPct : 0);
  const buffMultiplier = 1 + totalBoostPct / 100;
  const maxStamina = 100 + totalBoostPct;
  if (state.stamina > maxStamina) {
    state.stamina = maxStamina;
  }

  const thermal = evaluateThermalState(env, surface, equip, state.bodyTempC);

  // Smoothly drift core body temperature toward thermal equilibrium
  const tempAlpha = 1 - Math.exp(-0.075 * dt);
  state.bodyTempC = clamp(
    state.bodyTempC + (thermal.targetBodyTempC - state.bodyTempC) * tempAlpha,
    34.0,
    41.0,
  );

  // Hunger decay: faster when moving/swimming, carrying heavy load, sweating from heat, or shivering
  const baseHungerLoss = isMoving ? (surface === "swim" ? 0.62 : 0.38) : 0.14;
  const thermalHungerMul = 1 + thermal.heatStress * 0.42 + thermal.coldStress * 0.5;
  const weightHungerMul = isMoving ? 1 + Math.max(0, totalWeightKg - 3) * 0.02 : 1;
  state.hunger = clamp(state.hunger - baseHungerLoss * thermalHungerMul * weightHungerMul * dt, 0, 100);

  // Fatigue/Stamina model:
  // - Hunger dramatically accelerates fatigue when walking (< 45 hunger up to 2.5x drain)
  // - Heavy carried load (clothes + backpack + loot) increases walking fatigue
  // - Heat (sweating), cold, wind & heavy rain accelerate fatigue
  // - Smart tiered resting recovery based on stamina band (0..10 very slow .. 80..100 fast)
  const hungerPenaltyMul =
    state.hunger < 45 ? 1 + ((45 - state.hunger) / 45) * 1.5 : 1.0;
  // Heavier fatigue drain especially past 10 kg and 20 kg thresholds
  const lightWeightExcess = Math.min(8, Math.max(0, totalWeightKg - 2.0));
  const heavyOver10Kg = Math.max(0, totalWeightKg - 10.0);
  const superHeavyOver20Kg = Math.max(0, totalWeightKg - 20.0);
  const weightDrainMul =
    1 + lightWeightExcess * 0.055 + heavyOver10Kg * 0.095 + superHeavyOver20Kg * 0.06;
  const weatherFatigueMul =
    1 +
    thermal.heatStress * 0.72 +
    thermal.coldStress * 0.62 +
    (thermal.isRainExposed ? env.rainIntensity * 0.45 : 0) +
    env.windIntensity * (1 - clamp(equip.windRainResist, 0, 0.9) * 0.75) * 0.35;
  const gearReliefMul = 1 - clamp(equip.staminaSave, 0, 0.45);
  const buffDrainRelief = 1 / buffMultiplier;

  if (isMoving) {
    const moveDrain = surface === "swim" ? 6.8 : surface === "wade" ? 4.6 : 3.4;
    state.stamina = clamp(
      state.stamina -
        moveDrain *
          hungerPenaltyMul *
          weightDrainMul *
          weatherFatigueMul *
          gearReliefMul *
          buffDrainRelief *
          dt,
      0,
      maxStamina,
    );
  } else {
    const baseRecovery = getSmartStaminaRecoveryBaseRate(state.stamina);
    const hungerRecoveryScale = state.hunger < 25 ? 0.48 : state.hunger < 50 ? 0.78 : 1.0;
    const weatherRecoveryScale = clamp(1 - (thermal.heatStress + thermal.coldStress) * 0.35, 0.3, 1);
    const weightRecoveryScale = clamp(1 - Math.max(0, totalWeightKg - 10) * 0.035, 0.35, 1);
    const recoverRate =
      baseRecovery * hungerRecoveryScale * weatherRecoveryScale * weightRecoveryScale * buffMultiplier;
    state.stamina = clamp(state.stamina + recoverRate * dt, 0, maxStamina);
  }

  // Health impact & natural regeneration
  let hpDelta = 0;
  let dangerReason: string | null = null;

  if (state.hunger <= 0) {
    hpDelta -= 3.2;
    dangerReason = "quá đói kiệt sức";
  } else if (state.hunger < 12) {
    hpDelta -= 0.65;
    dangerReason = "đói lả";
  }

  if (state.bodyTempC >= 39.1) {
    hpDelta -= 1.65;
    dangerReason ??= "sốc nhiệt nắng nóng";
  } else if (state.bodyTempC <= 34.9) {
    hpDelta -= 1.55;
    dangerReason ??= "hạ thân nhiệt vì rét";
  }

  if (hpDelta === 0 && state.hunger >= 65 && state.stamina >= 50) {
    hpDelta += 0.55;
  }

  state.hp = clamp(state.hp + hpDelta * dt, 0, 100);

  // Vision blur intensity grows when hungry (<30), fatigued (<30), or critically wounded (<35)
  const hungerBlur = state.hunger < 30 ? (30 - state.hunger) / 30 : 0;
  const staminaBlur = state.stamina < 30 ? (30 - state.stamina) / 30 : 0;
  const hpBlur = state.hp < 35 ? (35 - state.hp) / 35 : 0;
  const blurIntensity = clamp(Math.max(hungerBlur, staminaBlur, hpBlur), 0, 1);

  // Extreme slow movement when stamina drops to 0 (0.22x crawl) + progressive weight overload slow
  let staminaSpeedMul = 1.0;
  if (state.stamina <= 0.5) {
    staminaSpeedMul = 0.22;
  } else if (state.stamina < 10) {
    staminaSpeedMul = 0.42;
  } else if (state.stamina < 25) {
    staminaSpeedMul = 0.68;
  } else if (state.stamina < 50) {
    staminaSpeedMul = 0.88;
  }

  let overloadSpeedMul = 1.0;
  if (totalWeightKg >= 35) {
    overloadSpeedMul = clamp(0.32 - (totalWeightKg - 35) * 0.012, 0.22, 0.32);
  } else if (totalWeightKg >= 20) {
    overloadSpeedMul = clamp(0.58 - (totalWeightKg - 20) * 0.0173, 0.32, 0.58);
  } else if (totalWeightKg >= 10) {
    overloadSpeedMul = clamp(0.78 - (totalWeightKg - 10) * 0.02, 0.58, 0.78);
  }
  if (totalWeightKg >= 10 && heavySpeedBonusPct > 0) {
    overloadSpeedMul = clamp(overloadSpeedMul * (1 + heavySpeedBonusPct / 100), 0.22, 1.0);
  }

  const speedMultiplier = Math.max(0.18, staminaSpeedMul * overloadSpeedMul);
  const fainted = state.hp <= 0 || (state.hunger <= 0 && state.stamina <= 1);

  return {
    thermal,
    blurIntensity,
    speedMultiplier,
    fainted,
    faintReason: fainted ? (dangerReason ?? "kiệt sức") : null,
  };
}
