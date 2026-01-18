// client/src/pages/HomePage/HomePage.jsx
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
        title: "Daily Deals",
        sub: "Fresh picks with big % off today",
        icon: "sell",
        to: "/products?sort=discount-desc&inStock=true&status=active",
      },
      {
        key: "biggest-discounts",
        title: "Biggest Discounts",
        sub: "Top markdowns across all stores",
        icon: "percent",
        to: "/products?sort=discount-desc&status=active",
      },
      {
        key: "under-20",
        title: "Under £20",
        sub: "Best value finds under £20",
        icon: "savings",
        to: "/products?maxPrice=20&sort=price-asc&status=active",
      },
      {
        key: "price-drops",
        title: "Price Drops",
        sub: "Items that just got cheaper",
        icon: "trending_down",
        to: "/products?sort=discount-desc&status=active",
      },
      {
        key: "stores",
        title: "Stores",
        sub: "Browse deals by retailer",
        icon: "storefront",
        to: "/products?sort=store-asc&status=active",
      },
      {
        key: "saved-alerts",
        title: "Saved Alerts",
        sub: "Track items and get drop alerts",
        icon: "notifications_active",
        to: "/products?status=active",
      },
    ],
    [],
  );

  const onSubmit = (e) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    navigate(`/products?search=${encodeURIComponent(q)}&status=active`);
  };

  return (
    <main className="home-page">
      <div className="home-page-container">
        <header className="home-page-header">
          <button
            type="button"
            className="home-page-brand"
            onClick={() => navigate("/")}
            aria-label="Go to home"
          >
            PRICEPULSE
          </button>

          <form className="home-page-search" onSubmit={onSubmit}>
            <input
              className="home-page-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for items and brands"
              aria-label="Search for items and brands"
            />
            <button
              className="home-page-search-btn"
              type="submit"
              aria-label="Search"
            >
              <span className="material-symbols-outlined">search</span>
            </button>
          </form>

          <div className="home-page-actions">
            <button
              className="home-page-icon-btn"
              type="button"
              aria-label="Saved"
              onClick={() => navigate("/products?status=active")}
            >
              <span className="material-symbols-outlined">favorite</span>
            </button>

            <button
              className="home-page-icon-btn"
              type="button"
              aria-label="Account"
              onClick={() => navigate("/products?status=active")}
            >
              <span className="material-symbols-outlined">person</span>
            </button>
          </div>
        </header>

        <section className="home-page-hero">
          <h1 className="home-page-title">
            Track deals across UK fashion stores
          </h1>
          <p className="home-page-sub">
            Search deals, save alerts, and get notified when prices change.
          </p>
        </section>

        <section className="home-page-tiles" aria-label="Quick actions">
          {tiles.map((t) => (
            <button
              key={t.key}
              className="home-page-tile"
              type="button"
              onClick={() => navigate(t.to)}
              aria-label={t.title}
            >
              <div className="home-page-tile-icon">
                <span className="material-symbols-outlined">{t.icon}</span>
              </div>

              <div className="home-page-tile-text">
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
