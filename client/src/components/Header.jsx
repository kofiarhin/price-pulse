import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./header.styles.scss";

const Icon = ({ name }) => {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
  };

  if (name === "search")
    return (
      <svg {...common}>
        <path
          d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M16.5 16.5 21 21"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );

  if (name === "menu")
    return (
      <svg {...common}>
        <path
          d="M4 7h16M4 12h16M4 17h16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );

  if (name === "user")
    return (
      <svg {...common}>
        <path
          d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M4 21a8 8 0 0 1 16 0"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );

  if (name === "bell")
    return (
      <svg {...common}>
        <path
          d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M10 19a2 2 0 0 0 4 0"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );

  if (name === "heart")
    return (
      <svg {...common}>
        <path
          d="M12 21s-7-4.35-9.33-8.4C.61 9.1 2.33 6 6 6c1.77 0 3.1.8 4 2 0.9-1.2 2.23-2 4-2 3.67 0 5.39 3.1 3.33 6.6C19 16.65 12 21 12 21Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );

  return null;
};

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const [navOpen, setNavOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () => [
      { label: "All", value: "all" },
      { label: "Women", value: "women" },
      { label: "Men", value: "men" },
      { label: "Kids", value: "kids" },
      { label: "Home", value: "home" },
      { label: "Electronics", value: "electronics" },
    ],
    []
  );

  useEffect(() => {
    // close dropdowns when route changes
    setNavOpen(false);
    setCategoriesOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setSearch(p.get("search") || "");
    setCategory(p.get("category") || "all");
  }, [location.search]);

  const goProducts = (next = {}) => {
    const params = new URLSearchParams();

    const nextSearch = (next.search ?? search).trim();
    const nextCategory = next.category ?? category;

    if (nextSearch) params.set("search", nextSearch);
    if (nextCategory && nextCategory !== "all")
      params.set("category", nextCategory);

    const qs = params.toString();
    navigate(qs ? `/products?${qs}` : "/products");
    setNavOpen(false);
    setCategoriesOpen(false);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    goProducts();
  };

  return (
    <header className="pp-header">
      <div className="pp-promo-bar">
        <div className="pp-container">
          Track prices. Catch drops. Save money.
        </div>
      </div>

      <div className="pp-top-row">
        <div className="pp-container pp-top-inner">
          <button
            type="button"
            className="pp-icon-btn pp-mobile-only"
            onClick={() => setNavOpen((v) => !v)}
            aria-label="Open menu"
          >
            <Icon name="menu" />
          </button>

          <NavLink to="/products" className="pp-logo">
            PricePulse
          </NavLink>

          <form className="pp-search" onSubmit={onSubmit}>
            <button
              type="button"
              className="pp-search-category"
              onClick={() => setCategoriesOpen((v) => !v)}
              aria-label="Choose category"
            >
              <span className="pp-search-category-text">
                {categories.find((c) => c.value === category)?.label || "All"}
              </span>
              <span className="pp-caret">▾</span>
            </button>

            <input
              className="pp-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, stores, categories..."
              aria-label="Search products"
            />

            <button className="pp-search-btn" type="submit" aria-label="Search">
              <Icon name="search" />
            </button>

            {categoriesOpen ? (
              <div className="pp-category-dropdown" role="menu">
                {categories.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className="pp-category-item"
                    onClick={() => {
                      setCategory(c.value);
                      goProducts({ category: c.value });
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            ) : null}
          </form>

          <div className="pp-actions">
            <button type="button" className="pp-icon-btn" aria-label="Account">
              <Icon name="user" />
            </button>
            <button type="button" className="pp-icon-btn" aria-label="Alerts">
              <Icon name="bell" />
            </button>
            <button
              type="button"
              className="pp-icon-btn"
              aria-label="Watchlist"
            >
              <Icon name="heart" />
            </button>
          </div>
        </div>
      </div>

      <div className={`pp-nav-row ${navOpen ? "is-open" : ""}`}>
        <div className="pp-container">
          <nav className="pp-nav">
            <button
              type="button"
              className="pp-nav-link pp-nav-link-btn"
              onClick={() => setCategoriesOpen((v) => !v)}
            >
              Categories <span className="pp-caret">▾</span>
            </button>

            <NavLink className="pp-nav-link" to="/products?sort=newest">
              New In
            </NavLink>

            <NavLink className="pp-nav-link" to="/products?sort=discount-desc">
              Top Deals
            </NavLink>

            <button
              type="button"
              className="pp-nav-link pp-nav-link-btn"
              onClick={() => goProducts({ category: "women" })}
            >
              Women
            </button>

            <button
              type="button"
              className="pp-nav-link pp-nav-link-btn"
              onClick={() => goProducts({ category: "men" })}
            >
              Men
            </button>

            <button
              type="button"
              className="pp-nav-link pp-nav-link-btn"
              onClick={() => goProducts({ category: "kids" })}
            >
              Kids
            </button>

            <button
              type="button"
              className="pp-nav-link pp-nav-link-btn"
              onClick={() => goProducts({ category: "home" })}
            >
              Home
            </button>

            <button
              type="button"
              className="pp-nav-link pp-nav-link-btn"
              onClick={() => goProducts({ category: "electronics" })}
            >
              Electronics
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
