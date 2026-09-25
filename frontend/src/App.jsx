import { useAuth0 } from "@auth0/auth0-react";
import { Dashboard } from "./components/Dashboard.jsx";

function LoginGate() {
  const { loginWithRedirect, isLoading } = useAuth0();

  return (
    <div className="app-shell">
      <div className="center-msg">
        <div className="brand" style={{ fontSize: "1.6rem" }}>
          <span className="brand-dot" />
          Weather Comfort Index
        </div>
        <p>Sign in to view live comfort rankings across cities, computed server-side from real-time weather data.</p>
        <button className="btn btn-primary" onClick={() => loginWithRedirect()} disabled={isLoading}>
          {isLoading ? "Loading..." : "Log in"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, isLoading, error } = useAuth0();

  if (isLoading) {
    return (
      <div className="app-shell">
        <div className="center-msg">
          <p>Checking session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-shell">
        <div className="center-msg">
          <p style={{ color: "var(--accent-warm)" }}>Authentication error: {error.message}</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Dashboard /> : <LoginGate />;
}
