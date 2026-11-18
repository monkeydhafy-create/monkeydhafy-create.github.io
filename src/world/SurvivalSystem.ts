import type { EquipmentStats } from "./EquipmentCatalog.ts";
import type { EnvironmentState } from "./HanoiWeatherService.ts";
import type { BiomeId, MapId, SecurityZone, SurfaceState } from "./types.ts";

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

/**
 * Zone-based scaling for adverse environmental & survival effects:
 * - Green Safe Zone: -70% adverse impact (0.3x)
 * - Yellow Transition Zone: -30% adverse impact (0.7x)
 * - Red High-Risk Zone: full 100% adverse impact (1.0x)
 */
export function getZoneAdverseFactor(zone?: SecurityZone): number {
  if (zone === "green") return 0.3;
  if (zone === "yellow") return 0.7;
  return 1.0;
}

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
  options?: {
    inSnowZone?: boolean;
    securityZone?: SecurityZone;
    mapId?: MapId;
    biome?: BiomeId;
  },
): ThermalEvaluation {
  const windShield = clamp(equip.windRainResist, 0, 0.92);
  const heatShield = clamp(equip.heatResist, 0, 1.0);
  const inSnowZone = Boolean(options?.inSnowZone);
  const adverseFactor = getZoneAdverseFactor(options?.securityZone);
  const mapId: MapId = options?.mapId ?? env.mapId ?? "vietnam";
  const snowIntensity = clamp(env.snowIntensity ?? 0, 0, 1);
  const effectiveSnow = inSnowZone ? Math.max(snowIntensity, 0.7) : snowIntensity;
  const altitudeDropC = inSnowZone ? 9.0 : 0;

  const airTempC = env.temperatureC - altitudeDropC;

  // Sun raises radiant load; summer hats, sunglasses & breathable shirts cut absorbed heat
  const hanoiHeatBonusC =
    mapId === "vietnam" && (env.sunIntensity >= 0.55 || airTempC >= 30)
      ? (env.sunIntensity * 1.4 + Math.max(0, airTempC - 29) * 0.35) * (1 - heatShield * 0.72)
      : 0;
  const sunLoadC = env.sunIntensity * 5.2 * (1 - heatShield * 0.72) + hanoiHeatBonusC;
  // High humidity amplifies perceived heat when warm
  const humidityLoadC =
    airTempC >= 24 ? ((Math.max(55, env.humidityPct) - 55) / 45) * 2.2 : 0;

  // Wind-chill, snowfall & wet rainfall cooling, mitigated by windproof/waterproof garments
  const windFactor = clamp(env.windSpeedKmh / 10, 0, 5);
  const windChillBase = airTempC < 25 ? 1.25 : 0.65;
  const windChillC = windFactor * windChillBase * (1 - windShield * 0.85);
  const hanoiStormChillC =
    mapId === "vietnam" && (env.condition === "storm" || env.rainIntensity >= 0.45)
      ? env.rainIntensity * 1.6 * (1 - windShield * 0.85)
      : 0;
  const wetChillC = env.rainIntensity * 5.4 * (1 - windShield * 0.88) + hanoiStormChillC;
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
  targetBodyTempC = SURVIVAL_IDEAL_TEMP_C + (targetBodyTempC - SURVIVAL_IDEAL_TEMP_C) * adverseFactor;

  const isSweating = currentBodyTempC >= 37.55 || (effectiveAmbientC >= 31.5 && currentBodyTempC >= 37.3);
  const isShivering = currentBodyTempC <= 36.05 || (effectiveAmbientC <= 14.5 && currentBodyTempC <= 36.25);
  const isRainExposed = env.rainIntensity >= 0.25 && windShield < 0.5;
  const isHanoiSmog =
    mapId === "vietnam" &&
    (env.condition === "fog" || (env.humidityPct >= 82 && env.windSpeedKmh < 12) || env.dustIntensity >= 0.45);
  const isHanoiMonsoon =
    mapId === "vietnam" && (env.condition === "storm" || env.rainIntensity >= 0.45);
  const isHanoiHeatwave =
    mapId === "vietnam" && (env.sunIntensity >= 0.65 || airTempC >= 31.5);
  const isHanoiInsectMiasma =
    mapId === "vietnam" &&
    (options?.biome === "countryside" || options?.securityZone === "red") &&
    (env.nightFactor >= 0.35 || env.humidityPct >= 75);

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
  } else if (isHanoiMonsoon && adverseFactor >= 0.7) {
    statusLabel = "⛈️ Mưa bão ngập đường (trơn trượt)";
  } else if (isRainExposed) {
    statusLabel = "☔ Dầm mưa gió (tốn sức)";
  } else if (isHanoiHeatwave && adverseFactor >= 0.7) {
    statusLabel = "☀️ Nắng gắt Hà Nội (dễ sốc nhiệt)";
  } else if (isHanoiInsectMiasma && adverseFactor >= 0.7) {
    statusLabel = "🦟 Chướng khí & muỗi rừng (mất máu nhẹ)";
  } else if (isHanoiSmog && adverseFactor >= 0.7) {
    statusLabel = "🌫️ Bụi mịn & nồm ẩm (hụt hơi)";
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

interface HanoiAdverseEffects {
  hungerBonus: number;
  fatigueBonus: number;
  recoveryPenalty: number;
  hpDrain: number;
  blurBonus: number;
  speedPenalty: number;
  dangerReason: string | null;
}

function computeHanoiAdverseEffects(
  mapId: MapId,
  env: EnvironmentState,
  equip: EquipmentStats,
  surface: SurfaceState,
  biome?: BiomeId,
  securityZone?: SecurityZone,
): HanoiAdverseEffects {
  if (mapId !== "vietnam") {
    return {
      hungerBonus: 0,
      fatigueBonus: 0,
      recoveryPenalty: 0,
      hpDrain: 0,
      blurBonus: 0,
      speedPenalty: 0,
      dangerReason: null,
    };
  }

  const heatShield = clamp(equip.heatResist, 0, 1);
  const windShield = clamp(equip.windRainResist, 0, 0.92);

  let hungerBonus = 0;
  let fatigueBonus = 0;
  let recoveryPenalty = 0;
  let hpDrain = 0;
  let blurBonus = 0;
  let speedPenalty = 0;
  let dangerReason: string | null = null;

  // 1. Nắng gắt & sốc nhiệt Hà Nội
  if (env.sunIntensity >= 0.55 || env.temperatureC >= 30) {
    const heatFactor = clamp(
      (env.sunIntensity * 0.6 + Math.max(0, env.temperatureC - 29) * 0.12) * (1 - heatShield * 0.65),
      0,
      1,
    );
    hungerBonus += heatFactor * 0.25;
    fatigueBonus += heatFactor * 0.26;
    blurBonus = Math.max(blurBonus, heatFactor * 0.14);
    speedPenalty += heatFactor * 0.08;
  }

  // 2. Bụi mịn & nồm ẩm Hà Nội
  if (env.condition === "fog" || (env.humidityPct >= 82 && env.windSpeedKmh < 12) || env.dustIntensity >= 0.45) {
    fatigueBonus += 0.22;
    recoveryPenalty += 0.18;
    blurBonus = Math.max(blurBonus, 0.15);
  }

  // 3. Mưa bão nhiệt đới & đường ngập bùn
  if (env.condition === "storm" || env.rainIntensity >= 0.45 || surface === "wade" || surface === "swim") {
    const wetFactor = Math.max(env.rainIntensity, surface === "swim" ? 0.85 : surface === "wade" ? 0.55 : 0);
    hungerBonus += wetFactor * 0.18;
    fatigueBonus += wetFactor * 0.28 * (1 - windShield * 0.65);
    speedPenalty += wetFactor * 0.16 * (1 - windShield * 0.6);
  }

  // 4. Muỗi rừng & chướng khí vùng sâu Hà Nội (Red Zone / countryside)
  if ((biome === "countryside" || securityZone === "red") && (env.nightFactor >= 0.35 || env.humidityPct >= 75)) {
    const cover = clamp((windShield + heatShield) * 0.45, 0, 0.7);
    hpDrain += 0.28 * (1 - cover);
    fatigueBonus += 0.16 * (1 - cover);
    dangerReason = "chướng khí & muỗi rừng sâu";
  }

  return { hungerBonus, fatigueBonus, recoveryPenalty, hpDrain, blurBonus, speedPenalty, dangerReason };
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
    securityZone?: SecurityZone;
    mapId?: MapId;
    biome?: BiomeId;
    totalWeightKg?: number;
    permanentStaminaBonusPct?: number;
    heavySpeedBonusPct?: number;
    nowMs?: number;
  },
): SurvivalTickResult {
  const dt = Math.min(Math.max(dtSeconds, 0), 0.25);
  const { isMoving, surface, env, equip } = options;
  const inSnowZone = Boolean(options.inSnowZone);
  const adverseFactor = getZoneAdverseFactor(options.securityZone);
  const mapId: MapId = options.mapId ?? env.mapId ?? "vietnam";
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

  const thermal = evaluateThermalState(env, surface, equip, state.bodyTempC, {
    inSnowZone,
    securityZone: options.securityZone,
    mapId,
    biome: options.biome,
  });
  const hanoiFx = computeHanoiAdverseEffects(
    mapId,
    env,
    equip,
    surface,
    options.biome,
    options.securityZone,
  );

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
  const thermalHungerMul =
    1 + (thermal.heatStress * 0.42 + thermal.coldStress * 0.55 + effSnow * 0.22 + hanoiFx.hungerBonus) * adverseFactor;
  const weightHungerMul = isMoving ? 1 + Math.max(0, totalWeightKg - 3) * 0.02 * adverseFactor : 1;
  state.hunger = clamp(state.hunger - baseHungerLoss * thermalHungerMul * weightHungerMul * dt, 0, 100);

  // Fatigue/Stamina model scaled by zone adverse factor (Green -70%, Yellow -30%, Red 100%)
  const hungerPenaltyMul =
    state.hunger < 45 ? 1 + ((45 - state.hunger) / 45) * 1.5 * adverseFactor : 1.0;
  const lightWeightExcess = Math.min(8, Math.max(0, totalWeightKg - 2.0));
  const heavyOver10Kg = Math.max(0, totalWeightKg - 10.0);
  const superHeavyOver20Kg = Math.max(0, totalWeightKg - 20.0);
  const weightThresholdPenalty =
    (totalWeightKg >= 10.0 ? 0.1 : 0) + (totalWeightKg > 20.0 ? 0.06 : 0);
  const weightDrainMul =
    1 +
    (lightWeightExcess * 0.055 +
      weightThresholdPenalty +
      heavyOver10Kg * 0.105 +
      superHeavyOver20Kg * 0.054) *
      adverseFactor;
  const snowShield = clamp(equip.windRainResist, 0, 0.92);
  const weatherFatigueMul =
    1 +
    (thermal.heatStress * 0.72 +
      thermal.coldStress * 0.68 +
      effSnow * (1 - snowShield * 0.65) * 0.38 +
      (thermal.isRainExposed ? env.rainIntensity * 0.45 : 0) +
      env.windIntensity * (1 - clamp(equip.windRainResist, 0, 0.9) * 0.75) * 0.35 +
      hanoiFx.fatigueBonus) *
      adverseFactor;
  const gearReliefMul = 1 - clamp(equip.staminaSave, 0, 0.45);
  const buffDrainRelief = 1 / buffMultiplier;

  if (isMoving) {
    const moveDrain = surface === "swim" ? 3.237 : surface === "wade" ? 2.19 : 1.618;
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
    const weatherRecoveryScale = clamp(
      1 - ((thermal.heatStress + thermal.coldStress) * 0.35 + hanoiFx.recoveryPenalty) * adverseFactor,
      0.3,
      1,
    );
    const weightRecoveryScale = clamp(1 - Math.max(0, totalWeightKg - 10) * 0.035 * adverseFactor, 0.35, 1);
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

  if (hanoiFx.hpDrain > 0) {
    hpDelta -= hanoiFx.hpDrain;
    dangerReason ??= hanoiFx.dangerReason;
  }

  if (hpDelta < 0) {
    hpDelta *= adverseFactor;
  } else if (hpDelta === 0 && state.hunger >= 65 && state.stamina >= 50) {
    hpDelta += 0.55;
  }

  state.hp = clamp(state.hp + hpDelta * dt, 0, 100);

  // Vision blur intensity grows when hungry (<30), fatigued (<30), critically wounded (<35), or Hanoi smog/heat
  const hungerBlur = state.hunger < 30 ? (30 - state.hunger) / 30 : 0;
  const staminaBlur = state.stamina < 30 ? (30 - state.stamina) / 30 : 0;
  const hpBlur = state.hp < 35 ? (35 - state.hp) / 35 : 0;
  const blurIntensity = clamp(Math.max(hungerBlur, staminaBlur, hpBlur, hanoiFx.blurBonus) * adverseFactor, 0, 1);

  // Extreme slow movement when stamina drops to 0 + progressive weight overload slow + snow/Hanoi storm slow
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

  let overloadSpeedMul = 0.7;
  if (totalWeightKg >= 35) {
    overloadSpeedMul = clamp(0.24 - (totalWeightKg - 35) * 0.008, 0.16, 0.24);
  } else if (totalWeightKg >= 20) {
    overloadSpeedMul = clamp(0.42 - (totalWeightKg - 20) * 0.012, 0.24, 0.42);
  } else if (totalWeightKg >= 10) {
    overloadSpeedMul = clamp(0.56 - (totalWeightKg - 10) * 0.014, 0.42, 0.56);
  } else if (totalWeightKg >= 5) {
    overloadSpeedMul = clamp(0.66 - (totalWeightKg - 5) * 0.02, 0.56, 0.66);
  }
  if (totalWeightKg >= 5 && heavySpeedBonusPct > 0) {
    overloadSpeedMul = clamp(overloadSpeedMul * (1 + heavySpeedBonusPct / 100), 0.16, 0.9);
  }
  if (totalWeightKg >= 10) {
    overloadSpeedMul = 0.7 - (0.7 - overloadSpeedMul) * adverseFactor;
  }

  const snowSlowPenalty =
    effSnow > 0 || thermal.coldStress > 0.25
      ? effSnow * 0.22 * (1 - snowShield * 0.7) + thermal.coldStress * 0.18
      : 0;
  const weatherSpeedMul = clamp(1 - (snowSlowPenalty + hanoiFx.speedPenalty) * adverseFactor, 0.58, 1.0);

  const speedMultiplier = Math.max(0.18, staminaSpeedMul * overloadSpeedMul * weatherSpeedMul);
  const fainted = state.hp <= 0 || (state.hunger <= 0 && state.stamina <= 1);

  return {
    thermal,
    blurIntensity,
    speedMultiplier,
    fainted,
    faintReason: fainted ? (dangerReason ?? "kiệt sức") : null,
  };
}
