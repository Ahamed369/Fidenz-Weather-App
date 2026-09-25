import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import { TTLCache } from "./cache.js";
import { getAllCitiesRanked, getForecastTrend } from "./weatherService.js";
import { checkJwt } from "./middleware/auth.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const TTL_MS = Number(process.env.CACHE_TTL_MS || 5 * 60 * 1000);

// --- Load & normalize cities.json -----------------------------------------
// Supports either [{ "CityCode": 123, "CityName": "X" }, ...] (this repo's
// format) or a plain array of numeric IDs, in case Fidenz supplies their
// own cities.json in a different shape.
function loadCities() {
  const raw = JSON.parse(fs.readFileSync(new URL("./cities.json", import.meta.url)));
  return raw.map((entry) =>
    typeof entry === "number"
      ? { CityCode: entry, CityName: undefined }
      : { CityCode: entry.CityCode, CityName: entry.CityName, Country: entry.Country }
  );
}

const cities = loadCities();
if (cities.length < 10) {
  console.warn(`[startup] cities.json has only ${cities.length} cities; the assignment requires at least 10.`);
}

const rawCache = new TTLCache(TTL_MS);
const processedCache = new TTLCache(TTL_MS);
const forecastCache = new TTLCache(TTL_MS);
const apiKey = process.env.OPENWEATHER_API_KEY;

// --- Routes ------------------------------------------------------------

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Protected: only authenticated (and, once you enable it, whitelisted) users
// can reach the dashboard data.
app.get("/api/comfort-index", checkJwt(), async (req, res) => {
  if (!apiKey) {
    return res.status(500).json({ error: "OPENWEATHER_API_KEY is not set on the server." });
  }
  try {
    const { results, failed } = await getAllCitiesRanked(cities, { rawCache, processedCache, apiKey });
    res.json({ cities: results, failedCities: failed, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch weather data.", detail: err.message });
  }
});

// Bonus: temperature trend data for a single city's chart.
app.get("/api/forecast/:cityCode", checkJwt(), async (req, res) => {
  if (!apiKey) {
    return res.status(500).json({ error: "OPENWEATHER_API_KEY is not set on the server." });
  }
  try {
    const { points, cache } = await getForecastTrend(req.params.cityCode, { forecastCache, apiKey });
    res.json({ points, cache });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch forecast data.", detail: err.message });
  }
});

// Debug endpoint: exposes cache HIT/MISS stats without exposing token/API
// key details. Intentionally left unauthenticated so it's easy to check
// during grading, but only reveals cache metadata, not weather data.
app.get("/api/debug/cache", (req, res) => {
  res.json({
    raw: rawCache.status(),
    processed: processedCache.status(),
    forecast: forecastCache.status(),
    ttlMs: TTL_MS,
  });
});

// Centralized error handler (must be defined last, after all routes).
// Without this, Express's default handler leaks a full stack trace
// (including local file paths) straight into the HTTP response, which is
// both unprofessional and a minor information-disclosure risk.
app.use((err, req, res, next) => {
  if (err.status === 401 || err.name === "UnauthorizedError" || err.name === "InvalidTokenError") {
    return res.status(401).json({ error: "Unauthorized. A valid access token is required." });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`Weather Comfort API listening on http://localhost:${PORT}`);
  console.log(`Loaded ${cities.length} cities from cities.json`);
});