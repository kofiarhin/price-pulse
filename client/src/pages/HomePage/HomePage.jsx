/* client/src/pages/HomePage/HomePage.jsx */
import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./home-page.styles.scss";

const HomePage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const tiles = useMemo(() => [
    {
      key: "flash-sales",
      title: "Flash Sales",
      sub: "Live markdowns from ASOS, Zara, and top retailers updated hourly.",
      icon: "bolt",
      to: "/products?sort=discount-desc&inStock=true",
    },
    {
      key: "deep-drops",
      title: "Deep Drops",
      sub: "Items with the most significant price adjustments across the UK.",
      icon: "trending_down",
      to: "/products?sort=discount-desc",
    },
    {
      key: "value-finds",
      title: "Value Finds",
      sub: "High-quality fashion picks curated for under £20.",
      icon: "payments",
      to: "/products?maxPrice=20&sort=price-asc",
    },
  ], []);

  const onSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    navigate(`/products?search=${encodeURIComponent(q)}&status=active`);
  };

  return (
    <main className="home-page">
      <div className="home-page-container">
        <header className="home-page-header">
          <button className="home-page-brand" onClick={() => navigate("/")}>
            BANGINGPRICES / ARCHIVE
          </button>

          <div className="home-page-nav-actions">
            <button className="home-page-icon-btn" onClick={() => navigate("/products")}>
              <span className="material-symbols-outlined">grid_view</span>
            </button>
            <button className="home-page-icon-btn" onClick={() => navigate("/products")}>
              <span className="material-symbols-outlined">person</span>
            </button>
          </div>
        </header>

        <section className="home-page-hero">
          <span className="home-page-badge">V2.6 Live Engine</span>
          <h1 className="home-page-title">
            The Future of <br /> <span>Shopping Logic.</span>
          </h1>
          <p className="home-page-sub">
            High-performance price tracking for the UK's biggest fashion retailers. 
            Data-driven savings, delivered in real-time.
          </p>

          <div className="home-page-search-wrap">
            <form className="home-page-search" onSubmit={onSearch}>
              <input
                className="home-page-search-input"
                placeholder="Search brand, category, or trend..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="home-page-search-btn" type="submit">
                <span className="material-symbols-outlined">north_east</span>
              </button>
            </form>
          </div>

          <div className="home-page-cta-row">
            <Link to="/products" className="home-page-browse-link">
              Explore Intelligence
              <span className="material-symbols-outlined">chevron_right</span>
            </Link>
          </div>
        </section>

        <span className="home-page-label">Curated Discovery</span>

        <section className="home-page-tiles" aria-label="Quick actions">
          {tiles.map((t) => (
            <button
              key={t.key}
              className="home-page-tile"
              type="button"
              onClick={() => navigate(t.to)}
            >
              <span className="material-symbols-outlined home-page-tile-icon">
                {t.icon}
              </span>
              <div className="home-page-tile-info">
                <div className="home-page-tile-title">{t.title}</div>
                <div className="home-page-tile-sub">{t.sub}</div>
              </div>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
};

export default HomePage;
