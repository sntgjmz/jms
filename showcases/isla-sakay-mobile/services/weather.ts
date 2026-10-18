export type LiveWeatherSnapshot = {
  temperatureCelsius: number | null;
  weatherCode: number | null;
};

/** Illustrative sample weather only. No forecast or location request is sent. */
export async function fetchLiveWeather(): Promise<LiveWeatherSnapshot> {
  return { temperatureCelsius: 29, weatherCode: 2 };
}

export function resolveWeatherIconName(weatherCode: number | null) {
  const code = weatherCode ?? -1;
  if (code === 0) return "sunny" as const;
  if (code >= 1 && code <= 3) return "partly-sunny" as const;
  if ((code >= 45 && code <= 48) || (code >= 51 && code <= 67) || (code >= 80 && code <= 99)) return "rainy" as const;
  if (code >= 71 && code <= 77) return "snow" as const;
  return "cloudy" as const;
}
