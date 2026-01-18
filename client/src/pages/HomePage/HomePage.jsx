/* client/src/pages/HomePage/HomePage.jsx */
import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./home-page.styles.scss";

const HomePage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const tiles = useMemo(() => [
    {
      key: "matrix-flash",
      title: "Real-time Flash",
      sub: "Neural tracking of price fluctuations across 50+ UK retailers.",
      icon: "bolt",
      to: "/products?sort=discount-desc&status=live",
    },
    {
      key: "matrix-drops",
      title: "Price Volatility",
      sub: "Identify the most significant valuation drops in the last 24h.",
      icon: "query_stats",
      to: "/products?sort=discount-desc",
    },
    {
      key: "matrix-curated",
      title: "Value Intelligence",
      sub: "Premium asset curation restricted to sub-£20 price points.",
      icon: "insights",
      to: "/products?maxPrice=20",
    },
  ], []);

  const handleSearch = (e) => {
    e.preventDefault();
    const query = search.trim();
    if (!query) return;
    navigate(`/products?q=${encodeURIComponent(query)}`);
  };

  return (
    <main className="home-page">
      <div className="home-page-container">
        <header className="home-page-header">
          <button className="home-page-brand" onClick={() => navigate("/")}>
            BANGINGPRICES // CORE_V2.6
          </button>

          <div className="home-page-nav-actions">
            {["terminal", "layers", "account_circle"].map((icon) => (
              <button key={icon} className="home-page-icon-btn" onClick={() => navigate("/products")}>
                <span className="material-symbols-outlined">{icon}</span>
              </button>
            ))}
          </div>
        </header>

        <section className="home-page-hero">
          <div className="home-page-badge">Live Intelligence Engine</div>
          <h1 className="home-page-title">
            Arbitrage <br /> <span>Refined.</span>
          </h1>
          <p className="home-page-sub">
            The architect's tool for fashion intelligence. We monitor market 
            inefficiencies to capture real-time price drops.
          </p>

          <div className="home-page-search-wrap">
            <form className="home-page-search" onSubmit={handleSearch}>
              <input
                className="home-page-search-input"
                placeholder="Initialize asset search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="home-page-search-btn" type="submit">
                <span className="material-symbols-outlined">api</span>
              </button>
            </form>
          </div>

          <div className="home-page-cta-row">
            <Link to="/products" className="home-page-browse-link">
              ACCESS REPOSITORY
              <span className="material-symbols-outlined">arrow_right_alt</span>
            </Link>
          </div>
        </section>

        <section className="home-page-tiles" aria-label="System modules">
          {tiles.map((t) => (
            <div
              key={t.key}
              className="home-page-tile"
              onClick={() => navigate(t.to)}
            >
              <span className="material-symbols-outlined home-page-tile-icon">
                {t.icon}
              </span>
              <div className="home-page-tile-info">
                <h3 className="home-page-tile-title">{t.title}</h3>
                <p className="home-page-tile-sub">{t.sub}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
};

export default HomePage;
