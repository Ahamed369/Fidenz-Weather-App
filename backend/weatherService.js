import axios from "axios";
import { computeComfortIndex } from "./comfortIndex.js";

const OWM_WEATHER = "https://api.openweathermap.org/data/2.5/weather";
const OWM_FORECAST = "https://api.openweathermap.org/data/2.5/forecast";

/**
 * Fetches (or serves from cache) the raw weather data for one city, then
 * computes its Comfort Index. Raw and processed results are cached
 * separately so a formula change doesn't require re-hitting the API.
 */
export async function getCityWeatherWithComfort(city, { rawCache, processedCache, apiKey }) {
  const cacheKey = String(city.CityCode);

  // 1. Try the processed cache first (fastest path).
  const processedHit = processedCache.get(cacheKey);
  if (processedHit.hit) {
    return { ...processedHit.value, cache: "HIT" };
  }

  // 2. Try the raw weather cache before calling OpenWeatherMap.
  let raw;
  const rawHit = rawCache.get(cacheKey);
  if (rawHit.hit) {
    raw = rawHit.value;
  } else {
    const response = await axios.get(OWM_WEATHER, {
      params: { id: city.CityCode, appid: apiKey },
      timeout: 8000,
    });
    raw = response.data;
    rawCache.set(cacheKey, raw);
  }

  // 3. Compute Comfort Index from the raw data.
  const { score, breakdown } = computeComfortIndex(raw);

  const processed = {
    cityCode: city.CityCode,
    cityName: raw.name || city.CityName,
    country: raw.sys?.country || city.Country,
    description: raw.weather?.[0]?.description ?? "unknown",
    icon: raw.weather?.[0]?.icon ?? null,
    temperatureC: +(raw.main.temp - 273.15).toFixed(1),
    comfortIndex: score,
    breakdown,
  };

  processedCache.set(cacheKey, processed);
  // Per the assignment spec, cache status is reported as HIT or MISS.
  // "MISS" here means the Comfort Index was (re)computed this request;
  // "HIT" (returned above, at the processed-cache check) means neither
  // OpenWeatherMap nor the Comfort Index calculation ran at all.
  return { ...processed, cache: "MISS" };
}

/**
 * Temperature trend graph (bonus).
 *
 * The current-weather endpoint used above returns one snapshot, so it can't
 * plot a trend on its own. OpenWeatherMap's free-tier /forecast endpoint
 * returns a 5-day / 3-hour-step forecast, which is used here to plot a
 * forward-looking trend line rather than history OpenWeatherMap's free tier
 * doesn't expose. Cached under its own key/TTL so a chart open doesn't
 * compete with or evict the main dashboard's cache entries.
 */
export async function getForecastTrend(cityCode, { forecastCache, apiKey }) {
  const cacheKey = `forecast:${cityCode}`;
  const cached = forecastCache.get(cacheKey);
  if (cached.hit) return { points: cached.value, cache: "HIT" };

  const response = await axios.get(OWM_FORECAST, {
    params: { id: cityCode, appid: apiKey, cnt: 8 }, // next 24h in 3h steps
    timeout: 8000,
  });

  const points = response.data.list.map((entry) => ({
    time: entry.dt_txt,
    temperatureC: +(entry.main.temp - 273.15).toFixed(1),
  }));

  forecastCache.set(cacheKey, points);
  return { points, cache: "MISS" };
}

export async function getAllCitiesRanked(cities, caches) {
  const results = await Promise.allSettled(
    cities.map((city) => getCityWeatherWithComfort(city, caches))
  );

  const succeeded = [];
  const failed = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      succeeded.push(result.value);
    } else {
      failed.push({ city: cities[i], error: result.reason?.message || "unknown error" });
    }
  });

  // Rank from most comfortable (highest score) to least.
  succeeded.sort((a, b) => b.comfortIndex - a.comfortIndex);
  succeeded.forEach((city, index) => {
    city.rank = index + 1;
  });

  return { results: succeeded, failed };
}
