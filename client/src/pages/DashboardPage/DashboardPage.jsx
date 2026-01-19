import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, UserButton } from "@clerk/clerk-react";
import "./dashboard-page.styles.scss";

const safeJson = (val, fallback) => {
  try {
    const parsed = JSON.parse(val);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { isLoaded, user } = useUser();

  const email = user?.primaryEmailAddress?.emailAddress || "";
  const fullName =
    user?.fullName || user?.firstName || user?.username || "User";

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : "";

  const favoritesCount = useMemo(() => {
    const raw = localStorage.getItem("bp:favorites");
    const arr = safeJson(raw, []);
    return Array.isArray(arr) ? arr.length : 0;
  }, []);

  if (!isLoaded) {
    return (
      <main className="bp-dashboard">
        <div className="bp-dashboard-container">
          <p className="bp-muted">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="bp-dashboard">
      <div className="bp-dashboard-container">
        <div className="bp-dash-top">
          <div className="bp-dash-titleblock">
            <p className="bp-dash-kicker">Account</p>
            <h1 className="bp-dash-title">Dashboard</h1>
            <p className="bp-dash-subtitle">
              Welcome back, <span className="bp-accent">{fullName}</span>
            </p>
          </div>

          <div className="bp-dash-actions">
            <button
              className="bp-btn"
              onClick={() => navigate("/products")}
              type="button"
            >
              Browse products
            </button>

            <div className="bp-userbutton">
              <UserButton />
            </div>
          </div>
        </div>

        <section className="bp-grid">
          <article className="bp-card">
            <h2 className="bp-card-title">Profile</h2>

            <div className="bp-row">
              <span className="bp-label">Email</span>
              <span className="bp-value">{email || "—"}</span>
            </div>

            <div className="bp-row">
              <span className="bp-label">Member since</span>
              <span className="bp-value">{memberSince || "—"}</span>
            </div>

            <div className="bp-card-footer">
              <button
                className="bp-btn bp-btn-ghost"
                onClick={() => navigate("/products")}
                type="button"
              >
                Continue browsing
              </button>
            </div>
          </article>

          <article className="bp-card">
            <h2 className="bp-card-title">Saved</h2>

            <div className="bp-metric">
              <div className="bp-metric-num">{favoritesCount}</div>
              <div className="bp-metric-label">Favorites</div>
            </div>

            <div className="bp-card-footer">
              <button
                className="bp-btn bp-btn-ghost"
                onClick={() => navigate("/products")}
                type="button"
              >
                View products
              </button>
            </div>
          </article>

          <article className="bp-card">
            <h2 className="bp-card-title">Alerts</h2>

            <div className="bp-metric">
              <div className="bp-metric-num">0</div>
              <div className="bp-metric-label">Active alerts</div>
            </div>

            <p className="bp-muted bp-small">
              Next: wire alerts to your backend (email / price drop triggers).
            </p>

            <div className="bp-card-footer">
              <button className="bp-btn bp-btn-ghost" type="button">
                Create alert
              </button>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
};

export default DashboardPage;
