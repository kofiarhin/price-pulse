// client/src/components/Header.jsx
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

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const [search, setSearch] = useState(params.get("search") || "");

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setSearch(p.get("search") || "");
  }, [location.search]);

  const setParamAndGo = (next = {}) => {
    const nextParams = new URLSearchParams(location.search);

    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === null || String(v).trim() === "")
        nextParams.delete(k);
      else nextParams.set(k, String(v));
    });

    nextParams.set("page", "1");

    const qs = nextParams.toString();
    navigate(qs ? `/products?${qs}` : "/products");
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setParamAndGo({ search: search.trim() });
  };

  return (
    <header className="pp-header">
      <div className="pp-top-row">
        <div className="pp-container pp-top-inner">
          <NavLink to="/products" className="pp-logo">
            PricePulse
          </NavLink>

          <form className="pp-search" onSubmit={onSubmit}>
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
          </form>

          <div className="pp-actions">
            <button
              type="button"
              className="pp-icon-btn"
              aria-label="Watchlist"
            >
              <Icon name="heart" />
            </button>
            <button type="button" className="pp-icon-btn" aria-label="Account">
              <Icon name="user" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
