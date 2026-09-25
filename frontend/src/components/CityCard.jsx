import { useState } from "react";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";
import { ComfortGauge } from "./ComfortGauge.jsx";
import { TrendChart } from "./TrendChart.jsx";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export function CityCard({ city }) {
  const { getAccessTokenSilently } = useAuth0();
  const [expanded, setExpanded] = useState(false);
  const [trend, setTrend] = useState(null);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [trendError, setTrendError] = useState(null);

  async function toggleTrend() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (trend) return; // already fetched once, no need to refetch
    try {
      setLoadingTrend(true);
      setTrendError(null);
      const token = await getAccessTokenSilently();
      const res = await axios.get(`${API_BASE}/api/forecast/${city.cityCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTrend(res.data.points);
    } catch (err) {
      setTrendError(err.response?.data?.error || err.message);
    } finally {
      setLoadingTrend(false);
    }
  }

  return (
    <div className="card">
      <div className="card-top">
        <div>
          <p className="city-name">{city.cityName}</p>
          <p className="city-desc">{city.description}</p>
        </div>
        <span className="rank-badge">#{city.rank}</span>
      </div>

      <div className="gauge-wrap">
        <ComfortGauge score={city.comfortIndex} />
      </div>

      <div className="metrics-row">
        <span>{city.temperatureC}°C</span>
        <span>{city.breakdown.humidity.valuePct}% hum</span>
        <span>{city.breakdown.wind.valueMs} m/s</span>
      </div>

      <button className="btn" style={{ fontSize: "0.78rem", padding: "6px 10px" }} onClick={toggleTrend}>
        {expanded ? "Hide 24h trend" : "Show 24h trend"}
      </button>

      {expanded && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          {loadingTrend && <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Loading trend...</p>}
          {trendError && <p style={{ color: "var(--accent-warm)", fontSize: "0.78rem" }}>{trendError}</p>}
          {trend && <TrendChart points={trend} />}
        </div>
      )}
    </div>
  );
}
