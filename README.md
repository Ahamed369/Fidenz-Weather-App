# Weather Comfort Index

A full-stack app that ranks cities by a custom "Comfort Index" derived from live
OpenWeatherMap data, behind Auth0 authentication with MFA and a signup whitelist.

- **Backend**: Node.js / Express
- **Frontend**: React (Vite)
- **Auth**: Auth0 (Authorization Code Flow + PKCE, email MFA, whitelisted users only)
- **Caching**: in-memory TTL cache (5 min), raw + processed layers, debug endpoint

---

## 1. Setup

### Prerequisites
- Node.js 18+
- An OpenWeatherMap API key ([openweathermap.org/api](https://openweathermap.org/api))
- An Auth0 tenant (free tier is enough)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# edit .env: add OPENWEATHER_API_KEY, and later AUTH0_DOMAIN / AUTH0_AUDIENCE
npm run dev        # http://localhost:4000
```

`DISABLE_AUTH=true` in `.env` lets you build and test the weather/caching logic
before Auth0 is wired up. **Set it to `false` before submitting** — see section 4.

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# edit .env: VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, VITE_AUTH0_AUDIENCE
npm run dev         # http://localhost:5173
```

### Tests
```bash
cd backend
npm test            # unit tests for the Comfort Index formula
```

---

## 2. The Comfort Index formula

**Score = 0.45 × Temperature + 0.30 × Humidity + 0.15 × Wind + 0.10 × Cloudiness**
(each sub-score normalized to 0–100 first; see `backend/comfortIndex.js`)

| Parameter | Weight | Ideal condition | Why this weight |
|---|---|---|---|
| Temperature | 45% | ~22°C | The single biggest driver of how weather *feels*. Too hot or too cold dominates everything else. |
| Humidity | 30% | 30–60% | Second biggest factor — it's *why* heat feels worse or air feels drier than the raw temperature suggests. |
| Wind speed | 15% | ≤ 3 m/s | Matters mainly at extremes (strong wind is unpleasant); a light breeze barely registers. |
| Cloudiness | 10% | Clear | Mostly an aesthetic/mood factor rather than a physical-comfort one, so it gets the smallest weight. |

Each sub-score is a simple piecewise-linear function of "distance from ideal"
(see code comments in `comfortIndex.js` for the exact thresholds). Linear
functions were chosen over a smoother curve (e.g. Gaussian) specifically so
the reasoning stays easy to state and defend out loud — a deliberate
trade-off of mathematical elegance for explainability.

**What was left out, and why:**
- **Pressure** — no well-established direct effect on comfort for a general
  audience (it mainly matters to specific groups, e.g. people sensitive to
  migraines).
- **Visibility** — a safety/aesthetic factor, not a physical comfort one.
- **Dew point** — not returned directly by the API; deriving it from temp +
  humidity would double-count a signal humidity already captures, for
  limited extra accuracy.

---

## 3. Caching design

Two independent in-memory TTL caches (`backend/cache.js`), both 5 minutes by default:

- **Raw cache** — the untouched OpenWeatherMap response per city.
- **Processed cache** — the final `{ weather, comfortIndex, breakdown }` payload.

Keeping them separate means the Comfort Index formula can change and only the
processed cache needs invalidating — no need to re-hit OpenWeatherMap.

`GET /api/debug/cache` reports hit/miss counts and per-key expiry, so caching
behavior can be verified without instrumenting the client.

**Trade-off**: in-memory (not Redis). The assignment specifies a single
5-minute TTL for one running instance — Redis solves a problem (sharing
cache across multiple server instances) this app doesn't have yet. The cache
is isolated behind a small class so swapping in Redis later is a one-file
change, not a rewrite.

---

## 4. Authentication & Authorization (Auth0)

1. Create a **Regular Web App / SPA** application in Auth0, note the Domain
   and Client ID.
2. Create an **API** in Auth0 (Applications → APIs) to get an Audience value.
3. **MFA**: Auth0 Dashboard → Security → Multi-factor Auth → enable **Email**.
4. **Disable public signups**: Authentication → Database → your connection →
   turn off "Disable Sign Ups" toggle (i.e. signups become disabled).
5. **Whitelist users**: create users manually under User Management → Users
   (e.g. `careers@fidenz.com` / `Pass#fidenz`), rather than letting anyone
   register.
6. Fill in `AUTH0_DOMAIN` / `AUTH0_AUDIENCE` in `backend/.env` and
   `VITE_AUTH0_DOMAIN` / `VITE_AUTH0_CLIENT_ID` / `VITE_AUTH0_AUDIENCE` in
   `frontend/.env`.
7. Set `DISABLE_AUTH=false` in `backend/.env`.

The frontend uses Auth0's React SDK (Authorization Code Flow + PKCE) rather
than a hand-rolled OAuth implementation — token exchange, state/nonce
validation, and silent refresh are security-sensitive to get right, and the
SDK is the industry-standard way to avoid re-implementing them incorrectly.
The backend independently verifies the JWT on every request
(`backend/middleware/auth.js`) — authorization lives on the server, not just
in the UI, so the API can't be called directly without a valid token even if
someone bypasses the frontend.

---

## 5. Known limitations

- The in-memory cache resets on server restart and doesn't share state across
  multiple instances — fine for this assignment's scope, not production-ready
  at scale.
- `cities.json` in this repo is a representative sample (12 cities); replace
  it with Fidenz's actual file if a different one is supplied — the loader in
  `server.js` accepts either an array of `{CityCode, CityName}` objects or a
  plain array of numeric IDs.
- The temperature-trend chart is *forward-looking* (next 24h, via
  OpenWeatherMap's free 5-day/3-hour forecast endpoint), not historical —
  OpenWeatherMap's free tier doesn't expose past weather. Click "Show 24h
  trend" on any city card to load it; it's fetched lazily and cached
  separately so browsing the dashboard doesn't trigger extra forecast calls.
- Cloudiness scoring is a simplification (linear penalty for more cloud);
  in reality, "ideal" cloud cover is more subjective and could reasonably be
  modeled as a curve that peaks at partial cloud cover instead of clear sky.
