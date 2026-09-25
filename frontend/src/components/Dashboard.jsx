import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";
import { CityCard } from "./CityCard.jsx";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export function Dashboard() {
  const { getAccessTokenSilently, logout, user } = useAuth0();
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("rank");
  const [query, setQuery] = useState("");
  const [lightMode, setLightMode] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("light-mode", lightMode);
  }, [lightMode]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const token = await getAccessTokenSilently();
        const res = await axios.get(`${API_BASE}/api/comfort-index`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCities(res.data.cities);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getAccessTokenSilently]);

  const visibleCities = useMemo(() => {
    let list = cities.filter((c) => c.cityName.toLowerCase().includes(query.toLowerCase()));
    if (sortBy === "comfort-desc") list = [...list].sort((a, b) => b.comfortIndex - a.comfortIndex);
    if (sortBy === "comfort-asc") list = [...list].sort((a, b) => a.comfortIndex - b.comfortIndex);
    if (sortBy === "temp-desc") list = [...list].sort((a, b) => b.temperatureC - a.temperatureC);
    if (sortBy === "name") list = [...list].sort((a, b) => a.cityName.localeCompare(b.cityName));
    return list;
  }, [cities, sortBy, query]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          Weather Comfort Index
        </div>
        <div className="topbar-actions">
          <button className="btn" onClick={() => setLightMode((v) => !v)}>
            {lightMode ? "Dark mode" : "Light mode"}
          </button>
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{user?.email}</span>
          <button className="btn" onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
            Log out
          </button>
        </div>
      </header>

      <main className="main">
        <div className="controls">
          <input
            className="search"
            placeholder="Filter by city..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="rank">Sort: Rank (default)</option>
            <option value="comfort-desc">Sort: Most comfortable first</option>
            <option value="comfort-asc">Sort: Least comfortable first</option>
            <option value="temp-desc">Sort: Warmest first</option>
            <option value="name">Sort: City name</option>
          </select>
        </div>

        {loading && <p style={{ color: "var(--text-muted)" }}>Loading weather data...</p>}
        {error && <p style={{ color: "var(--accent-warm)" }}>Error: {error}</p>}

        {!loading && !error && (
          <div className="grid">
            {visibleCities.map((city) => (
              <CityCard key={city.cityCode} city={city} />
            ))}
          </div>
        )}
      </main>

      <p className="footnote">Comfort Index cached server-side for 5 minutes · data via OpenWeatherMap</p>
    </div>
  );
}
