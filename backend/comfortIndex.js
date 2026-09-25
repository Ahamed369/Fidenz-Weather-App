/**
 * Comfort Index Score
 * ====================
 * A 0–100 score estimating how physically pleasant a city's current weather
 * feels to an average person, based on 4 parameters from the OpenWeatherMap
 * response: Temperature, Humidity, Wind Speed, and Cloudiness.
 *
 * DESIGN PHILOSOPHY
 * Each parameter is converted into its own 0-100 "sub-score" using a simple,
 * explainable rule ("how close is this to the ideal range"), then combined
 * with weights that reflect how much each factor actually affects perceived
 * comfort. This keeps every step traceable — you can look at any city's
 * breakdown and see exactly why it scored the way it did, instead of a
 * black-box formula.
 *
 * WEIGHTS (must sum to 1.0) and WHY:
 *   Temperature  45% - the single biggest driver of how "comfortable" weather
 *                      feels; too hot or too cold dominates perception.
 *   Humidity     30% - strongly affects how temperature actually *feels*
 *                      (high humidity makes heat feel worse, dry air makes
 *                      cold feel sharper) — second most influential.
 *   Wind Speed   15% - matters, but mostly at extremes (strong wind is
 *                      unpleasant); mild breeze is barely noticed.
 *   Cloudiness   10% - smallest effect: mostly aesthetic/mood, not physical
 *                      discomfort, so it gets the lowest weight.
 *
 * TRADE-OFFS CONSIDERED
 * - Left out Pressure and Visibility: neither has a strong, well-known
 *   direct effect on physical comfort for a general audience (pressure
 *   mainly matters to specific people, e.g. migraine sufferers; visibility
 *   is a safety/aesthetic factor, not a comfort one).
 * - Dew Point isn't returned directly by the API and would need to be
 *   derived from temp + humidity — skipped here in favor of using humidity
 *   directly, which captures most of the same signal more simply.
 * - Used simple piecewise-linear scoring functions instead of a Gaussian
 *   curve: easier to explain and defend live, at a small cost to smoothness
 *   near the "ideal" point.
 */

const WEIGHTS = {
  temperature: 0.40,
  humidity: 0.25,
  wind: 0.15,
  cloudiness: 0.10,
  pressure: 0.10,
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

/** Ideal ~22°C. Score drops linearly 4 points per °C away from ideal. */
function temperatureScore(kelvin) {
  const celsius = kelvin - 273.15;
  const idealC = 22;
  const diff = Math.abs(celsius - idealC);
  return clamp(100 - diff * 4);
}

/** Ideal range 30–60% relative humidity. Penalize distance outside that band. */
function humidityScore(humidityPct) {
  const [low, high] = [30, 60];
  let diff = 0;
  if (humidityPct < low) diff = low - humidityPct;
  else if (humidityPct > high) diff = humidityPct - high;
  return clamp(100 - diff * 2);
}

/** Ideal calm-to-light breeze, <= 3 m/s. Penalize 10 points per m/s above that. */
function windScore(speedMs) {
  const idealMax = 3;
  const diff = Math.max(0, speedMs - idealMax);
  return clamp(100 - diff * 10);
}

/** Clear skies score highest; full overcast (100% cloud) bottoms out at 50. */
function cloudinessScore(cloudPct) {
  return clamp(100 - cloudPct * 0.5);
}

function pressureScore(hpa) {
  const idealHpa = 1013;
  const diff = Math.abs(hpa - idealHpa);
  return clamp(100 - diff * 0.5);
}

/**
 * @param {object} weather - raw OpenWeatherMap /weather response for one city
 * @returns {{ score: number, breakdown: object }}
 */
export function computeComfortIndex(weather) {
  const tempK = weather.main?.temp ?? 0;
  const humidity = weather.main?.humidity ?? 0;
  const wind = weather.wind?.speed ?? 0;
  const clouds = weather.clouds?.all ?? 0;
  const pressure = weather.main?.pressure ?? 1013;

  const sub = {
    temperature: temperatureScore(tempK),
    humidity: humidityScore(humidity),
    wind: windScore(wind),
    cloudiness: cloudinessScore(clouds),
    pressure: pressureScore(pressure),
  };

  const rawScore =
    sub.temperature * WEIGHTS.temperature +
    sub.humidity * WEIGHTS.humidity +
    sub.wind * WEIGHTS.wind +
    sub.cloudiness * WEIGHTS.cloudiness;
    sub.pressure * WEIGHTS.pressure;

  return {
    score: Math.round(clamp(rawScore)),
    breakdown: {
      temperature: { valueC: +(tempK - 273.15).toFixed(1), subScore: Math.round(sub.temperature), weight: WEIGHTS.temperature },
      humidity: { valuePct: humidity, subScore: Math.round(sub.humidity), weight: WEIGHTS.humidity },
      wind: { valueMs: wind, subScore: Math.round(sub.wind), weight: WEIGHTS.wind },
      cloudiness: { valuePct: clouds, subScore: Math.round(sub.cloudiness), weight: WEIGHTS.cloudiness },
      pressure : { valueHpa: pressure, subScore: Math.round(sub.pressure), weight: WEIGHTS.pressure },
    },
  };
}

export const COMFORT_WEIGHTS = WEIGHTS;
