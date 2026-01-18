/* client/src/pages/HomePage/HomePage.jsx */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./home-page.styles.scss";

const HomePage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const modules = useMemo(() => [
    {
      id: "real-time",
      title: "Real-time Flash",
      desc: "Neural tracking of price fluctuations across 50+ UK retailers.",
      icon: "bolt",
      to: "/products?sort=discount-desc"
    },
    {
      id: "volatility",
      title: "Price Volatility",
      desc: "Identify the most significant valuation drops in the last 24h.",
      icon: "query_stats",
      to: "/products?sort=price-asc"
    }
  ], []);

  const onSearch = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    navigate(`/products?search=${encodeURIComponent(search.trim())}`);
  };

  return (
    <main className="hp">
      <div className="hp-container">
        <section className="hp-hero">
          <div className="hp-badge">System Status: Live</div>
          <h1 className="hp-title">
            The Future of <br /> 
            <span className="hp-title-accent">Shopping Logic.</span>
          </h1>
          <p className="hp-lead">
            High-performance price tracking for the UK's elite fashion retailers. 
            Data-driven intelligence, delivered in real-time.
          </p>

          <form className="hp-search-box" onSubmit={onSearch}>
            <div className="hp-search-inner">
              <span className="material-symbols-outlined hp-search-icon">terminal</span>
              <input 
                className="hp-input"
                placeholder="Initialize asset search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="hp-search-submit">
                <span className="material-symbols-outlined">north_east</span>
              </button>
            </div>
          </form>
        </section>

        <section className="hp-grid">
          {modules.map((m) => (
            <div key={m.id} className="hp-card" onClick={() => navigate(m.to)}>
              <div className="hp-card-glow" />
              <span className="material-symbols-outlined hp-card-icon">{m.icon}</span>
              <h3 className="hp-card-title">{m.title}</h3>
              <p className="hp-card-desc">{m.desc}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
};

export default HomePage;
