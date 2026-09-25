/**
 * In-memory TTL cache.
 *
 * WHY IN-MEMORY (not Redis) FOR THIS ASSIGNMENT:
 * The requirement is "cache for 5 minutes" for a single-instance app. Redis
 * is the right call once you have multiple server instances that need to
 * share a cache, but it's unnecessary infrastructure for this scope. The
 * cache is wrapped behind a small class so swapping in Redis later only
 * means changing this file, not any call sites.
 *
 * Two separate namespaces are kept, per the assignment's suggestion:
 *  - "raw"       : the untouched OpenWeatherMap response per city
 *  - "processed" : the final { weather, comfortIndex, rank } payload
 * Keeping them separate means if the Comfort Index formula changes, you can
 * invalidate just "processed" without re-fetching from OpenWeatherMap.
 */

export class TTLCache {
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
    this.store = new Map(); // key -> { value, expiresAt }
    this.stats = { hits: 0, misses: 0 };
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.stats.misses += 1;
      return { hit: false, value: null };
    }
    this.stats.hits += 1;
    return { hit: true, value: entry.value };
  }

  set(key, value) {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  status() {
    const entries = [...this.store.entries()].map(([key, entry]) => ({
      key,
      expiresInMs: Math.max(0, entry.expiresAt - Date.now()),
    }));
    return { ...this.stats, size: this.store.size, entries };
  }
}
