import test from "node:test";
import assert from "node:assert/strict";
import { computeComfortIndex } from "../comfortIndex.js";

function mockWeather({ tempC = 22, humidity = 45, wind = 1, clouds = 0 }) {
  return {
    main: { temp: tempC + 273.15, humidity },
    wind: { speed: wind },
    clouds: { all: clouds },
  };
}

test("ideal conditions score at or near 100", () => {
  const { score } = computeComfortIndex(mockWeather({ tempC: 22, humidity: 45, wind: 1, clouds: 0 }));
  assert.ok(score >= 95, `expected near-perfect score, got ${score}`);
});

test("extreme heat drags the score down heavily", () => {
  const { score } = computeComfortIndex(mockWeather({ tempC: 45, humidity: 45, wind: 1, clouds: 0 }));
  assert.ok(score < 60, `expected a low score for extreme heat, got ${score}`);
});

test("extreme cold drags the score down heavily", () => {
  const { score } = computeComfortIndex(mockWeather({ tempC: -10, humidity: 45, wind: 1, clouds: 0 }));
  assert.ok(score < 60, `expected a low score for extreme cold, got ${score}`);
});

test("high humidity alone should not fully tank the score (weighted, not binary)", () => {
  const { score } = computeComfortIndex(mockWeather({ tempC: 22, humidity: 90, wind: 1, clouds: 0 }));
  assert.ok(score > 60 && score < 100, `expected a partial penalty, got ${score}`);
});

test("strong wind reduces the score less than extreme temperature does", () => {
  const windy = computeComfortIndex(mockWeather({ tempC: 22, humidity: 45, wind: 15, clouds: 0 })).score;
  const hot = computeComfortIndex(mockWeather({ tempC: 45, humidity: 45, wind: 1, clouds: 0 })).score;
  assert.ok(windy > hot, "wind (15% weight) should hurt less than temperature (45% weight) at similar extremity");
});

test("score is always clamped between 0 and 100", () => {
  const { score } = computeComfortIndex(mockWeather({ tempC: 60, humidity: 100, wind: 40, clouds: 100 }));
  assert.ok(score >= 0 && score <= 100);
});

test("breakdown reports each sub-score and weight for transparency", () => {
  const { breakdown } = computeComfortIndex(mockWeather({ tempC: 22, humidity: 45, wind: 1, clouds: 0 }));
  assert.ok("temperature" in breakdown && "humidity" in breakdown && "wind" in breakdown && "cloudiness" in breakdown);
  const totalWeight = Object.values(breakdown).reduce((sum, b) => sum + b.weight, 0);
  assert.ok(Math.abs(totalWeight - 1) < 1e-9, "weights should sum to 1.0");
});
