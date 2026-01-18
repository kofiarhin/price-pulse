/* client/src/pages/HomePage/HomePage.jsx */
import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./home-page.styles.scss";

const HomePage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // Data structure for the "Intelligence Matrix"
  const modules = useMemo(() => [
    {
      id: "real-time",
      title: "Real-time Flash",
      desc: "Neural tracking of price fluctuations across 50+ UK retailers. Updated every 60 seconds.",
      icon: "bolt",
      to: "/products?sort=discount-desc&status=live"
    },
    {
      id: "volatility",
      title: "Price Volatility",
      desc: "Identify the most significant valuation drops in the last 24h. High-frequency data analysis.",
      icon: "query_stats",
      to: "/products?sort=price-asc"
    },
    {
      id: "curated",
      title: "Value Intelligence",
      desc: "Premium asset curation restricted to sub-£20 price points. Optimized for high-ROI finds.",
      icon: "insights",
      to: "/products?maxPrice=20"
    }
  ], []);

  const onSearch = (e) => {
    e.preventDefault();
    const query = search.trim();
    if (!query) return;
    navigate(`/products?search=${encodeURIComponent(query)}`);
  };

  return (
    <main className="hp">
      {/* Background Kinetic Layer */}
      <div className="hp-grid-overlay" />
      
      <div className="hp-container">
        {/* Hero Section */}
        <section className="hp-hero">
          <div className="hp-badge-wrapper">
            <span className="hp-badge">System Status: Operational</span>
            <span className="hp-version">V2.6.0</span>
          </div>
          
          <h1 className="hp-title">
            The Future of <br /> 
            <span className="hp-title-accent">Shopping Logic.</span>
          </h1>
          
          <p className="hp-lead">
            The architect's platform for fashion intelligence. We monitor market 
            inefficiencies to capture real-time price drops from the UK's elite retailers.
          </p>

          {/* Search Engine Interface */}
          <form className="hp-search-box" onSubmit={onSearch}>
            <div className="hp-search-inner">
              <span className="material-symbols-outlined hp-search-icon">terminal</span>
              <input 
                className="hp-input"
                placeholder="Initialize asset search (e.g. 'Stussy', 'Gorpcore')..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="hp-search-submit" aria-label="Execute search">
                <span className="material-symbols-outlined">north_east</span>
              </button>
            </div>
            <div className="hp-search-hint">Press ENTER to initialize query</div>
          </form>

          <div className="hp-cta-row">
            <Link to="/products" className="hp-browse-link">
              ACCESS FULL REPOSITORY
              <span className="material-symbols-outlined">arrow_right_alt</span>
            </Link>
          </div>
        </section>

        {/* Intelligence Matrix Grid */}
        <section className="hp-matrix">
          <div className="hp-section-header">
            <h2 className="hp-section-label">Core Intelligence Modules</h2>
          </div>
          
          <div className="hp-grid">
            {modules.map((m) => (
              <div key={m.id} className="hp-card" onClick={() => navigate(m.to)}>
                <div className="hp-card-content">
                  <span className="material-symbols-outlined hp-card-icon">{m.icon}</span>
                  <h3 className="hp-card-title">{m.title}</h3>
                  <p className="hp-card-desc">{m.desc}</p>
                </div>
                <div className="hp-card-border" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default HomePage;
