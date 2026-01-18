import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./home-page.styles.scss";

const HomePage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const tiles = useMemo(
    () => [
      {
        key: "daily-deals",
        title: "Flash Sales",
        sub: "Live markdowns from ASOS, Zara, and top retailers updated hourly.",
        icon: "bolt",
        to: "/products?sort=discount-desc&inStock=true",
      },
      {
        key: "biggest-discounts",
        title: "Deep Drops",
        sub: "Items with the most significant price adjustments across the UK.",
        icon: "trending_down",
        to: "/products?sort=discount-desc",
      },
      {
        key: "under-20",
        title: "Value Finds",
        sub: "High-quality fashion picks curated for under £20.",
        icon: "payments",
        to: "/products?maxPrice=20&sort=price-asc",
      },
    ],
    [],
  );

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
            BANGINGPRICES
          </button>

          <div className="home-page-nav-actions">
            <button
              className="home-page-icon-btn"
              onClick={() => navigate("/products")}
              aria-label="Favorites"
            >
              <span className="material-symbols-outlined">favorite</span>
            </button>
            <button
              className="home-page-icon-btn"
              onClick={() => navigate("/products")}
              aria-label="Profile"
            >
              <span className="material-symbols-outlined">person</span>
            </button>
          </div>
        </header>

        <section className="home-page-hero">
          <span className="home-page-badge">Real-time Tracker</span>
          <h1 className="home-page-title">
            Smart Fashion <br /> Intelligence.
          </h1>
          <p className="home-page-sub">
            We track thousands of products across major UK retailers to find
            hidden price drops. Never pay full price again.
          </p>

          <div className="home-page-search-wrap">
            <form className="home-page-search" onSubmit={onSearch}>
              <input
                className="home-page-search-input"
                placeholder="Search brands or items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="home-page-search-btn" type="submit">
                <span className="material-symbols-outlined">search</span>
              </button>
            </form>
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
              <div className="home-page-tile-icon">
                <span className="material-symbols-outlined">{t.icon}</span>
              </div>
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