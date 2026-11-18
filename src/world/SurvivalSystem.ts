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
 * Smart tiered stamina recovery rate (+10% baseline):
 * - 0..10: very slow (0.462/s)
 * - 10..25: slow (1.045/s)
 * - 25..50: normal (2.09/s)
 * - 50..80: moderate (3.63/s)
 * - 80+: fast (6.16/s)
 */
export function getSmartStaminaRecoveryBaseRate(stamina: number): number {
  if (stamina >= 80) return 6.16;
  if (stamina >= 50) return 3.63;
  if (stamina >= 25) return 2.09;
  if (stamina >= 10) return 1.045;
  return 0.462;
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
  options?: { inSnowZone?: boolean },
): ThermalEvaluation {
  const windShield = clamp(equip.windRainResist, 0, 0.92);
  const heatShield = clamp(equip.heatResist, 0, 1.0);
  const inSnowZone = Boolean(options?.inSnowZone);
  const snowIntensity = clamp(env.snowIntensity ?? 0, 0, 1);
  const effectiveSnow = inSnowZone ? Math.max(snowIntensity, 0.7) : snowIntensity;
  const altitudeDropC = inSnowZone ? 9.0 : 0;

  const airTempC = env.temperatureC - altitudeDropC;

  // Sun raises radiant load; summer hats, sunglasses & breathable shirts cut absorbed heat
  const sunLoadC = env.sunIntensity * 5.2 * (1 - heatShield * 0.72);
  // High humidity amplifies perceived heat when warm
  const humidityLoadC =
    airTempC >= 24 ? ((Math.max(55, env.humidityPct) - 55) / 45) * 2.2 : 0;

  // Wind-chill, snowfall & wet rainfall cooling, mitigated by windproof/waterproof garments
  const windFactor = clamp(env.windSpeedKmh / 10, 0, 5);
  const windChillBase = airTempC < 25 ? 1.25 : 0.65;
  const windChillC = windFactor * windChillBase * (1 - windShield * 0.85);
  const wetChillC = env.rainIntensity * 5.4 * (1 - windShield * 0.88);
  const snowChillC = effectiveSnow * 8.5 * (1 - windShield * 0.86);
  const waterChillC = surface === "swim" ? 4.4 : surface === "wade" ? 1.8 : 0;

  // Heavy winter coats insulate strongly in cold/snowy climates without overheating in freezing air
  const outfitThermalOffset =
    airTempC >= 27 && equip.warmth > 2
      ? equip.warmth * 1.15
      : airTempC < 14 && equip.warmth > 0
        ? equip.warmth * (effectiveSnow > 0 ? 2.9 : 2.1)
        : equip.warmth * 1.1;

  const feelsLikeC = Number(
    (
      airTempC +
      sunLoadC +
      humidityLoadC -
      windChillC -
      wetChillC -
      snowChillC -
      waterChillC
    ).toFixed(1),
  );

  let effectiveAmbientC = feelsLikeC + outfitThermalOffset;
  if (airTempC <= 18 && equip.warmth > 0 && feelsLikeC < 25.0) {
    effectiveAmbientC = Math.min(effectiveAmbientC, 25.0);
  }

  let targetBodyTempC = SURVIVAL_IDEAL_TEMP_C;
  if (effectiveAmbientC > 27.5) {
    targetBodyTempC = clamp(36.8 + (effectiveAmbientC - 27.5) * 0.24, 36.8, 40.4);
  } else if (effectiveAmbientC < 21.5) {
    const coldRate = effectiveSnow > 0 ? 0.28 : 0.24;
    targetBodyTempC = clamp(36.8 - (21.5 - effectiveAmbientC) * coldRate, 34.0, 36.8);
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
  } else if (effectiveSnow > 0 && currentBodyTempC <= 35.4) {
    statusLabel = "🥶 Đóng băng giữa tuyết lạnh!";
  } else if (currentBodyTempC <= 35.0) {
    statusLabel = "🥶 Hạ thân nhiệt nguy hiểm!";
  } else if (isShivering && effectiveSnow > 0) {
    statusLabel = "❄️ Giá rét núi tuyết (mặc ấm)";
  } else if (isShivering && isRainExposed) {
    statusLabel = "🌧️ Lạnh cóng vì mưa gió";
  } else if (isShivering) {
    statusLabel = "🥶 Lạnh run (mặc thêm áo ấm)";
  } else if (isRainExposed) {
    statusLabel = "☔ Dầm mưa gió (tốn sức)";
  }

  return {
    ambientTempC: Number((env.temperatureC - altitudeDropC).toFixed(1)),
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
    inSnowZone?: boolean;
    totalWeightKg?: number;
    permanentStaminaBonusPct?: number;
    heavySpeedBonusPct?: number;
    nowMs?: number;
  },
): SurvivalTickResult {
  const dt = Math.min(Math.max(dtSeconds, 0), 0.25);
  const { isMoving, surface, env, equip } = options;
  const inSnowZone = Boolean(options.inSnowZone);
  const effSnow = inSnowZone ? Math.max(env.snowIntensity ?? 0, 0.7) : clamp(env.snowIntensity ?? 0, 0, 1);
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

  const thermal = evaluateThermalState(env, surface, equip, state.bodyTempC, { inSnowZone });

  // Smoothly drift core body temperature toward thermal equilibrium (cools faster in heavy snow)
  const driftRate = effSnow > 0 && thermal.targetBodyTempC < state.bodyTempC ? 0.115 : 0.075;
  const tempAlpha = 1 - Math.exp(-driftRate * dt);
  state.bodyTempC = clamp(
    state.bodyTempC + (thermal.targetBodyTempC - state.bodyTempC) * tempAlpha,
    34.0,
    41.0,
  );

  // Hunger decay: faster when moving/swimming, carrying heavy load, sweating from heat, or shivering in snow
  const baseHungerLoss = isMoving ? (surface === "swim" ? 0.434 : 0.266) : 0.098;
  const thermalHungerMul = 1 + thermal.heatStress * 0.42 + thermal.coldStress * 0.55 + effSnow * 0.22;
  const weightHungerMul = isMoving ? 1 + Math.max(0, totalWeightKg - 3) * 0.02 : 1;
  state.hunger = clamp(state.hunger - baseHungerLoss * thermalHungerMul * weightHungerMul * dt, 0, 100);

  // Fatigue/Stamina model:
  // - Hunger dramatically accelerates fatigue when walking (< 45 hunger up to 2.5x drain)
  // - Heavy carried load (clothes + backpack + loot) increases walking fatigue
  // - Heat (sweating), cold, snow/blizzard, wind & heavy rain accelerate fatigue
  // - Smart tiered resting recovery based on stamina band (0..10 very slow .. 80..100 fast)
  const hungerPenaltyMul =
    state.hunger < 45 ? 1 + ((45 - state.hunger) / 45) * 1.5 : 1.0;
  // Heavier fatigue drain especially past 10 kg and 20 kg thresholds
  const lightWeightExcess = Math.min(8, Math.max(0, totalWeightKg - 2.0));
  const heavyOver10Kg = Math.max(0, totalWeightKg - 10.0);
  const superHeavyOver20Kg = Math.max(0, totalWeightKg - 20.0);
  const weightDrainMul =
    1 + lightWeightExcess * 0.055 + heavyOver10Kg * 0.095 + superHeavyOver20Kg * 0.06;
  const snowShield = clamp(equip.windRainResist, 0, 0.92);
  const weatherFatigueMul =
    1 +
    thermal.heatStress * 0.72 +
    thermal.coldStress * 0.68 +
    effSnow * (1 - snowShield * 0.65) * 0.38 +
    (thermal.isRainExposed ? env.rainIntensity * 0.45 : 0) +
    env.windIntensity * (1 - clamp(equip.windRainResist, 0, 0.9) * 0.75) * 0.35;
  const gearReliefMul = 1 - clamp(equip.staminaSave, 0, 0.45);
  const buffDrainRelief = 1 / buffMultiplier;

  if (isMoving) {
    const moveDrain = surface === "swim" ? 3.808 : surface === "wade" ? 2.576 : 1.904;
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
    hpDelta -= effSnow > 0 ? 2.4 : 1.55;
    dangerReason ??= effSnow > 0 ? "cóng giá giữa bão tuyết" : "hạ thân nhiệt vì rét";
  } else if (effSnow > 0 && state.bodyTempC <= 35.3) {
    hpDelta -= 1.1;
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

  // Extreme slow movement when stamina drops to 0 (0.22x crawl) + progressive weight overload slow + snow slow
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

  const snowSpeedMul =
    effSnow > 0 || thermal.coldStress > 0.25
      ? clamp(1 - effSnow * 0.22 * (1 - snowShield * 0.7) - thermal.coldStress * 0.18, 0.58, 1.0)
      : 1.0;

  const speedMultiplier = Math.max(0.18, staminaSpeedMul * overloadSpeedMul * snowSpeedMul);
  const fainted = state.hp <= 0 || (state.hunger <= 0 && state.stamina <= 1);

  return {
    thermal,
    blurIntensity,
    speedMultiplier,
    fainted,
    faintReason: fainted ? (dangerReason ?? "kiệt sức") : null,
  };
}
