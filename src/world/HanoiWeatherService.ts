import { withFreshBust } from "../assetUrl.ts";
import type { MapId } from "./types.ts";

export type WeatherCondition =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "storm"
  | "snow"
  | "blizzard";

export type EnvironmentPreset =
  | "live"
  | "dawn"
  | "sunny"
  | "sunset"
  | "night"
  | "rain"
  | "windy";

export interface EnvironmentState {
  mapId?: MapId;
  preset: EnvironmentPreset;
  isLive: boolean;
  hanoiTimeText: string;
  fractionalHour: number; // 0..24 in Asia/Ho_Chi_Minh or Asia/Tokyo
  temperatureC: number;
  humidityPct: number;
  cloudCoverPct: number;
  windSpeedKmh: number;
  windDirectionDeg: number; // Meteorological degrees (direction wind blows FROM)
  rainMm: number;
  condition: WeatherCondition;
  conditionLabel: string;
  sunIntensity: number; // 0..1
  rainIntensity: number; // 0..1
  snowIntensity?: number; // 0..1
  windIntensity: number; // 0..1
  dustIntensity: number; // 0..1
  leafIntensity: number; // 0..1
  nightFactor: number; // 0 (full day) .. 1 (deep readable night)
  apiConnected: boolean;
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    rain?: number;
    showers?: number;
    weather_code?: number;
    cloud_cover?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
  };
}

const HANOI_API_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&timezone=Asia%2FHo_Chi_Minh";

export const ENVIRONMENT_PRESETS: ReadonlyArray<{ id: EnvironmentPreset; label: string }> = [
  { id: "live", label: "📍 Live Hà Nội" },
  { id: "dawn", label: "🌅 Bình Minh" },
  { id: "sunny", label: "☀️ Trưa Nắng" },
  { id: "sunset", label: "🌇 Hoàng Hôn" },
  { id: "night", label: "🌙 Đêm Sáng" },
  { id: "rain", label: "🌧️ Mưa Gió" },
  { id: "windy", label: "🍃 Gió Lá Bay" },
];

export type JapanWeatherRegion = "city" | "plains" | "snow-mountain" | "fishing-island";

/**
 * Fetches live Hanoi weather from Open-Meteo (no API key, CORS enabled)
 * paired with accurate Asia/Ho_Chi_Minh clock & instant preview presets.
 */
export class HanoiWeatherService {
  private activeMapId: MapId = "vietnam";
  private preset: EnvironmentPreset = "live";
  private apiConnected = false;

  private liveTempC = 24;
  private liveHumidity = 76;
  private liveCloudCover = 25;
  private liveWindSpeed = 11;
  private liveWindDeg = 125;
  private liveRainMm = 0;
  private liveCode = 1;

  // Japan regional + smooth-interpolated procedural weather
  private jpRegion: JapanWeatherRegion = "city";
  private jpCondition: WeatherCondition = "partly-cloudy";
  private jpTargetTempC = 20;
  private jpTargetHumidity = 60;
  private jpTargetCloudCover = 28;
  private jpTargetWindSpeed = 12;
  private jpTargetWindDeg = 145;
  private jpTargetRainMm = 0;
  private jpTargetSnowIntensity = 0;

  private jpCurTempC = 20;
  private jpCurHumidity = 60;
  private jpCurCloudCover = 28;
  private jpCurWindSpeed = 12;
  private jpCurWindDeg = 145;
  private jpCurRainMm = 0;
  private jpCurSnowIntensity = 0;
  private jpLastSmoothMs = 0;
  private nextJpWeatherShiftAt = 0;

  private refreshTimer: number | null = null;
  private readonly timeFormatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  private readonly tokyoTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  public setActiveMap(mapId: MapId): void {
    this.activeMapId = mapId;
    if (mapId === "japan") {
      if (this.nextJpWeatherShiftAt === 0 || Date.now() >= this.nextJpWeatherShiftAt) {
        this.rollJapanProceduralWeather();
      }
    } else if (!this.apiConnected) {
      void this.fetchHanoiWeather();
    }
  }

  public getActiveMap(): MapId {
    return this.activeMapId;
  }

  public start(): void {
    if (this.activeMapId === "vietnam") {
      void this.fetchHanoiWeather();
    } else {
      this.rollJapanProceduralWeather();
    }
    if (this.refreshTimer !== null) {
      window.clearInterval(this.refreshTimer);
    }
    // Refresh live Hanoi telemetry every 10 minutes when in Vietnam map
    this.refreshTimer = window.setInterval(() => {
      if (this.activeMapId === "vietnam") {
        void this.fetchHanoiWeather();
      }
    }, 600_000);
  }

  public stop(): void {
    if (this.refreshTimer !== null) {
      window.clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  public setPreset(next: EnvironmentPreset): void {
    this.preset = next;
  }

  public getPreset(): EnvironmentPreset {
    return this.preset;
  }

  public cyclePreset(): EnvironmentPreset {
    const idx = ENVIRONMENT_PRESETS.findIndex((p) => p.id === this.preset);
    const nextIdx = (idx + 1) % ENVIRONMENT_PRESETS.length;
    this.preset = ENVIRONMENT_PRESETS[nextIdx].id;
    return this.preset;
  }

  public setJapanRegion(region: JapanWeatherRegion): void {
    if (this.jpRegion === region) return;
    this.jpRegion = region;
    this.rollJapanProceduralWeather(Date.now());
  }

  public getEnvironmentState(): EnvironmentState {
    if (this.preset !== "live") {
      return this.buildPresetState(this.preset);
    }

    if (this.activeMapId === "japan") {
      const nowMs = Date.now();
      if (this.nextJpWeatherShiftAt === 0 || nowMs >= this.nextJpWeatherShiftAt) {
        this.rollJapanProceduralWeather(nowMs);
      }
      // Chuyển đổi thời tiết TỪ TỪ (smooth exponential lerp ~12-16s) thay vì đổi đột ngột 1 phát
      const dtSec = this.jpLastSmoothMs > 0 ? Math.min(0.5, Math.max(0, (nowMs - this.jpLastSmoothMs) / 1000)) : 0;
      this.jpLastSmoothMs = nowMs;
      if (dtSec > 0) {
        const alpha = 1 - Math.exp(-dtSec / 5.5);
        this.jpCurTempC += (this.jpTargetTempC - this.jpCurTempC) * alpha;
        this.jpCurHumidity += (this.jpTargetHumidity - this.jpCurHumidity) * alpha;
        this.jpCurCloudCover += (this.jpTargetCloudCover - this.jpCurCloudCover) * alpha;
        this.jpCurWindSpeed += (this.jpTargetWindSpeed - this.jpCurWindSpeed) * alpha;
        this.jpCurWindDeg += (this.jpTargetWindDeg - this.jpCurWindDeg) * alpha;
        this.jpCurRainMm += (this.jpTargetRainMm - this.jpCurRainMm) * alpha;
        this.jpCurSnowIntensity += (this.jpTargetSnowIntensity - this.jpCurSnowIntensity) * alpha;
      }

      const { hour, minute, timeText } = this.getClock(this.tokyoTimeFormatter);
      const fractionalHour = hour + minute / 60;
      const diurnalCurve = Math.sin(((fractionalHour - 9) / 24) * Math.PI * 2);
      const temperatureC = Math.round(this.jpCurTempC + diurnalCurve * 2.5);

      return this.computeDerivedState(
        {
          mapId: "japan",
          preset: "live",
          isLive: true,
          hanoiTimeText: timeText,
          fractionalHour,
          temperatureC,
          humidityPct: Math.round(this.jpCurHumidity),
          cloudCoverPct: Math.round(this.jpCurCloudCover),
          windSpeedKmh: Math.round(this.jpCurWindSpeed),
          windDirectionDeg: Math.round(this.jpCurWindDeg),
          rainMm: Number(this.jpCurRainMm.toFixed(1)),
          condition: this.jpCondition,
          apiConnected: false,
        },
        this.jpCurSnowIntensity,
      );
    }

    const { hour, minute, timeText } = this.getClock(this.timeFormatter);
    const fractionalHour = hour + minute / 60;
    const condition = this.mapWmoCondition(this.liveCode, this.liveRainMm, this.liveCloudCover);

    return this.computeDerivedState({
      mapId: "vietnam",
      preset: "live",
      isLive: true,
      hanoiTimeText: timeText,
      fractionalHour,
      temperatureC: this.liveTempC,
      humidityPct: this.liveHumidity,
      cloudCoverPct: this.liveCloudCover,
      windSpeedKmh: this.liveWindSpeed,
      windDirectionDeg: this.liveWindDeg,
      rainMm: this.liveRainMm,
      condition,
      apiConnected: this.apiConnected,
    });
  }

  public rollJapanProceduralWeather(nowMs = Date.now()): void {
    const r = Math.random();
    const region = this.jpRegion;
    let cond: WeatherCondition = "partly-cloudy";

    if (region === "fishing-island") {
      // Đảo Làng Chài: đảo biển ôn hòa, ấm áp, KHÔNG tuyết rơi
      if (r < 0.36) cond = "clear";
      else if (r < 0.72) cond = "partly-cloudy";
      else if (r < 0.88) cond = "cloudy";
      else cond = "drizzle";
      this.jpTargetTempC = cond === "clear" ? 24 : cond === "partly-cloudy" ? 22 : cond === "cloudy" ? 20 : 19;
      this.jpTargetHumidity = cond === "drizzle" ? 82 : 66;
      this.jpTargetCloudCover = cond === "clear" ? 12 : cond === "partly-cloudy" ? 32 : 70;
      this.jpTargetWindSpeed = cond === "drizzle" ? 18 : 12;
      this.jpTargetRainMm = cond === "drizzle" ? 0.8 : 0;
      this.jpTargetSnowIntensity = 0;
    } else if (region === "city") {
      // Thành phố Tokyo: ấm áp ôn đới dễ chịu (17..23°C), không tuyết
      if (r < 0.34) cond = "clear";
      else if (r < 0.70) cond = "partly-cloudy";
      else if (r < 0.88) cond = "cloudy";
      else cond = "drizzle";
      this.jpTargetTempC = cond === "clear" ? 22 : cond === "partly-cloudy" ? 20 : cond === "cloudy" ? 18 : 17;
      this.jpTargetHumidity = cond === "drizzle" ? 80 : 60;
      this.jpTargetCloudCover = cond === "clear" ? 14 : cond === "partly-cloudy" ? 34 : 72;
      this.jpTargetWindSpeed = cond === "drizzle" ? 15 : 10;
      this.jpTargetRainMm = cond === "drizzle" ? 0.6 : 0;
      this.jpTargetSnowIntensity = 0;
    } else if (region === "plains") {
      // Vùng Vàng Kyoto: mát mẻ ôn đới (14..20°C), sương nhẹ hoặc mưa nhẹ, không tuyết
      if (r < 0.25) cond = "clear";
      else if (r < 0.56) cond = "partly-cloudy";
      else if (r < 0.76) cond = "cloudy";
      else if (r < 0.90) cond = "fog";
      else cond = "rain";
      this.jpTargetTempC = cond === "clear" ? 19 : cond === "partly-cloudy" ? 17 : cond === "fog" ? 15 : 14;
      this.jpTargetHumidity = cond === "fog" || cond === "rain" ? 84 : 65;
      this.jpTargetCloudCover = cond === "clear" ? 16 : cond === "partly-cloudy" ? 38 : 78;
      this.jpTargetWindSpeed = cond === "rain" ? 20 : 13;
      this.jpTargetRainMm = cond === "rain" ? 2.4 : 0;
      this.jpTargetSnowIntensity = 0;
    } else {
      // Vùng Núi Tuyết Bắc: dưới chân núi lạnh vừa vừa (+1..+6°C), lên cao mới rét đậm theo elevation
      if (r < 0.14) cond = "fog";
      else if (r < 0.65) cond = "snow";
      else cond = "blizzard";
      this.jpTargetTempC = cond === "fog" ? 6 : cond === "snow" ? 3 : -1;
      this.jpTargetHumidity = 84;
      this.jpTargetCloudCover = cond === "blizzard" ? 95 : 78;
      this.jpTargetWindSpeed = cond === "blizzard" ? 34 : 20;
      this.jpTargetRainMm = 0;
      this.jpTargetSnowIntensity = cond === "blizzard" ? 1.0 : cond === "snow" ? 0.72 : 0.3;
    }

    this.jpCondition = cond;
    this.jpTargetWindDeg = Math.floor(Math.random() * 360);
    // Re-roll randomly every 3 to 5 minutes during exploration
    this.nextJpWeatherShiftAt = nowMs + 180_000 + Math.floor(Math.random() * 120_000);
  }

  private async fetchHanoiWeather(): Promise<void> {
    try {
      const res = await fetch(withFreshBust(HANOI_API_URL), { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as OpenMeteoResponse;
      const cur = json.current;
      if (!cur) return;

      this.liveTempC = Math.round(cur.temperature_2m ?? this.liveTempC);
      this.liveHumidity = Math.round(cur.relative_humidity_2m ?? this.liveHumidity);
      this.liveCloudCover = Math.round(cur.cloud_cover ?? this.liveCloudCover);
      this.liveWindSpeed = Math.round(cur.wind_speed_10m ?? this.liveWindSpeed);
      this.liveWindDeg = Math.round(cur.wind_direction_10m ?? this.liveWindDeg);
      this.liveRainMm = Number(cur.rain ?? cur.showers ?? cur.precipitation ?? 0);
      this.liveCode = Number(cur.weather_code ?? 1);
      this.apiConnected = true;
    } catch {
      // Keep safe baseline values when offline or blocked
    }
  }

  private getClock(formatter: Intl.DateTimeFormat): { hour: number; minute: number; timeText: string } {
    const now = new Date();
    const parts = formatter.formatToParts(now);
    const hourStr = parts.find((p) => p.type === "hour")?.value ?? "12";
    const minStr = parts.find((p) => p.type === "minute")?.value ?? "00";
    const hour = Number(hourStr);
    const minute = Number(minStr);
    return {
      hour: Number.isFinite(hour) ? hour : 12,
      minute: Number.isFinite(minute) ? minute : 0,
      timeText: `${hourStr.padStart(2, "0")}:${minStr.padStart(2, "0")}`,
    };
  }

  private buildPresetState(preset: Exclude<EnvironmentPreset, "live">): EnvironmentState {
    switch (preset) {
      case "dawn":
        return this.computeDerivedState({
          preset,
          isLive: false,
          hanoiTimeText: "06:00",
          fractionalHour: 6.0,
          temperatureC: 22,
          humidityPct: 84,
          cloudCoverPct: 20,
          windSpeedKmh: 9,
          windDirectionDeg: 110,
          rainMm: 0,
          condition: "partly-cloudy",
          apiConnected: this.apiConnected,
        });
      case "sunny":
        return this.computeDerivedState({
          preset,
          isLive: false,
          hanoiTimeText: "11:30",
          fractionalHour: 11.5,
          temperatureC: 31,
          humidityPct: 58,
          cloudCoverPct: 12,
          windSpeedKmh: 10,
          windDirectionDeg: 140,
          rainMm: 0,
          condition: "clear",
          apiConnected: this.apiConnected,
        });
      case "sunset":
        return this.computeDerivedState({
          preset,
          isLive: false,
          hanoiTimeText: "17:45",
          fractionalHour: 17.75,
          temperatureC: 27,
          humidityPct: 68,
          cloudCoverPct: 30,
          windSpeedKmh: 14,
          windDirectionDeg: 95,
          rainMm: 0,
          condition: "partly-cloudy",
          apiConnected: this.apiConnected,
        });
      case "night":
        return this.computeDerivedState({
          preset,
          isLive: false,
          hanoiTimeText: "22:30",
          fractionalHour: 22.5,
          temperatureC: 21,
          humidityPct: 78,
          cloudCoverPct: 15,
          windSpeedKmh: 8,
          windDirectionDeg: 45,
          rainMm: 0,
          condition: "clear",
          apiConnected: this.apiConnected,
        });
      case "rain":
        return this.computeDerivedState({
          preset,
          isLive: false,
          hanoiTimeText: "15:20",
          fractionalHour: 15.33,
          temperatureC: 23,
          humidityPct: 93,
          cloudCoverPct: 92,
          windSpeedKmh: 24,
          windDirectionDeg: 65,
          rainMm: 6.5,
          condition: "rain",
          apiConnected: this.apiConnected,
        });
      case "windy":
        return this.computeDerivedState({
          preset,
          isLive: false,
          hanoiTimeText: "16:15",
          fractionalHour: 16.25,
          temperatureC: 25,
          humidityPct: 62,
          cloudCoverPct: 48,
          windSpeedKmh: 30,
          windDirectionDeg: 35,
          rainMm: 0,
          condition: "partly-cloudy",
          apiConnected: this.apiConnected,
        });
    }
  }

  private computeDerivedState(
    base: Omit<
      EnvironmentState,
      | "conditionLabel"
      | "sunIntensity"
      | "rainIntensity"
      | "snowIntensity"
      | "windIntensity"
      | "dustIntensity"
      | "leafIntensity"
      | "nightFactor"
    >,
    overrideSnowIntensity?: number,
  ): EnvironmentState {
    const h = base.fractionalHour;

    // Smooth night factor: 0 during full day (07:30..16:30), 1 during night (19:30..05:00)
    let nightFactor = 0;
    if (h < 5.0 || h >= 19.5) {
      nightFactor = 1;
    } else if (h >= 5.0 && h < 7.5) {
      nightFactor = 1 - (h - 5.0) / 2.5;
    } else if (h >= 16.5 && h < 19.5) {
      nightFactor = (h - 16.5) / 3.0;
    }

    let rainIntensity = 0;
    if (base.condition === "drizzle") rainIntensity = 0.35;
    else if (base.condition === "rain") rainIntensity = Math.max(0.68, Math.min(0.95, 0.55 + base.rainMm * 0.08));
    else if (base.condition === "storm") rainIntensity = 1.0;

    let snowIntensity = overrideSnowIntensity !== undefined ? overrideSnowIntensity : 0;
    if (overrideSnowIntensity === undefined) {
      if (base.condition === "snow") snowIntensity = 0.78;
      else if (base.condition === "blizzard") snowIntensity = 1.0;
    }

    const sunIntensity =
      Math.max(0, 1 - nightFactor) *
      Math.max(0.08, 1 - base.cloudCoverPct / 115) *
      (1 - Math.max(rainIntensity, snowIntensity * 0.85) * 0.85);

    const windIntensity = Math.max(0.15, Math.min(1, base.windSpeedKmh / 32));
    const dustIntensity = Math.max(0.25, 0.4 + sunIntensity * 0.45 + windIntensity * 0.35) * (1 - Math.max(rainIntensity, snowIntensity * 0.5) * 0.7);
    const leafIntensity = snowIntensity > 0 ? 0 : Math.max(0.25, 0.25 + windIntensity * 0.75);

    return {
      ...base,
      mapId: base.mapId ?? this.activeMapId,
      conditionLabel: this.getConditionLabel(base.condition),
      sunIntensity,
      rainIntensity,
      snowIntensity,
      windIntensity,
      dustIntensity,
      leafIntensity,
      nightFactor,
    };
  }

  private mapWmoCondition(code: number, rainMm: number, cloudCover: number): WeatherCondition {
    if (code >= 95) return "storm";
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82) || rainMm >= 1.2) return "rain";
    if ((code >= 51 && code <= 57) || rainMm > 0.05) return "drizzle";
    if (code === 45 || code === 48) return "fog";
    if (code === 3 || cloudCover >= 75) return "cloudy";
    if (code === 1 || code === 2 || cloudCover >= 30) return "partly-cloudy";
    return "clear";
  }

  private getConditionLabel(condition: WeatherCondition): string {
    switch (condition) {
      case "clear":
        return "Trời Quang";
      case "partly-cloudy":
        return "Có Mây Nhẹ";
      case "cloudy":
        return "Nhiều Mây";
      case "fog":
        return "Sương Mù";
      case "drizzle":
        return "Mưa Phùn";
      case "rain":
        return "Mưa Rào";
      case "storm":
        return "Giông Bão";
      case "snow":
        return "Tuyết Rơi";
      case "blizzard":
        return "Bão Tuyết Lạnh Cóng";
    }
  }
}
