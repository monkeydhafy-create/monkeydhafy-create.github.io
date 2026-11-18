export type WeatherCondition =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "storm";

export type EnvironmentPreset =
  | "live"
  | "dawn"
  | "sunny"
  | "sunset"
  | "night"
  | "rain"
  | "windy";

export interface EnvironmentState {
  preset: EnvironmentPreset;
  isLive: boolean;
  hanoiTimeText: string;
  fractionalHour: number; // 0..24 in Asia/Ho_Chi_Minh
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

/**
 * Fetches live Hanoi weather from Open-Meteo (no API key, CORS enabled)
 * paired with accurate Asia/Ho_Chi_Minh clock & instant preview presets.
 */
export class HanoiWeatherService {
  private preset: EnvironmentPreset = "live";
  private apiConnected = false;

  private liveTempC = 24;
  private liveHumidity = 76;
  private liveCloudCover = 25;
  private liveWindSpeed = 11;
  private liveWindDeg = 125;
  private liveRainMm = 0;
  private liveCode = 1;

  private refreshTimer: number | null = null;
  private readonly timeFormatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  public start(): void {
    void this.fetchHanoiWeather();
    if (this.refreshTimer !== null) {
      window.clearInterval(this.refreshTimer);
    }
    // Refresh live Hanoi telemetry every 10 minutes
    this.refreshTimer = window.setInterval(() => {
      void this.fetchHanoiWeather();
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

  public getEnvironmentState(): EnvironmentState {
    if (this.preset !== "live") {
      return this.buildPresetState(this.preset);
    }

    const { hour, minute, timeText } = this.getHanoiClock();
    const fractionalHour = hour + minute / 60;
    const condition = this.mapWmoCondition(this.liveCode, this.liveRainMm, this.liveCloudCover);

    return this.computeDerivedState({
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

  private async fetchHanoiWeather(): Promise<void> {
    try {
      const res = await fetch(HANOI_API_URL);
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

  private getHanoiClock(): { hour: number; minute: number; timeText: string } {
    const now = new Date();
    const parts = this.timeFormatter.formatToParts(now);
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
      | "windIntensity"
      | "dustIntensity"
      | "leafIntensity"
      | "nightFactor"
    >,
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

    const sunIntensity =
      Math.max(0, 1 - nightFactor) *
      Math.max(0.08, 1 - base.cloudCoverPct / 115) *
      (1 - rainIntensity * 0.85);

    const windIntensity = Math.max(0.15, Math.min(1, base.windSpeedKmh / 32));
    const dustIntensity = Math.max(0.25, 0.4 + sunIntensity * 0.45 + windIntensity * 0.35) * (1 - rainIntensity * 0.7);
    const leafIntensity = Math.max(0.25, 0.25 + windIntensity * 0.75);

    return {
      ...base,
      conditionLabel: this.getConditionLabel(base.condition),
      sunIntensity,
      rainIntensity,
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
    }
  }
}
