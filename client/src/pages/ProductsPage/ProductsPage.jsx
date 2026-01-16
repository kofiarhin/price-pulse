import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./products.styles.scss";

const buildQueryString = (obj) => {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const val = String(v).trim();
    if (!val) return;
    params.set(k, val);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

const fetchProducts = async ({ search, category, sort, page, limit }) => {
  const qs = buildQueryString({ search, category, sort, page, limit });
  const res = await fetch(`http://localhost:5000/api/products${qs}`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json(); // { items, pagination }
};

const formatMoney = (currency, value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return `${currency} ${value}`;
  return `${currency} ${n.toFixed(2)}`;
};

export default function ProductsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const searchParam = params.get("search") || "";
  const categoryParam = params.get("category") || "";
  const sortParam = params.get("sort") || "newest";
  const pageParam = Number(params.get("page") || 1);
  const limitParam = Number(params.get("limit") || 24);

  const [searchInput, setSearchInput] = useState(searchParam);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: [
      "products",
      searchParam,
      categoryParam,
      sortParam,
      pageParam,
      limitParam,
    ],
    queryFn: () =>
      fetchProducts({
        search: searchParam,
        category: categoryParam,
        sort: sortParam,
        page: pageParam,
        limit: limitParam,
      }),
    keepPreviousData: true,
  });

  const items = data?.items || [];
  const pagination = data?.pagination || {
    total: 0,
    page: 1,
    pages: 1,
    limit: limitParam,
  };

  const setParamAndGo = (next = {}) => {
    const nextParams = new URLSearchParams(location.search);
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === null || String(v).trim() === "")
        nextParams.delete(k);
      else nextParams.set(k, String(v));
    });
    navigate(`/products?${nextParams.toString()}`);
  };

  const onSearch = (e) => {
    e.preventDefault();
    setParamAndGo({ search: searchInput.trim(), page: 1 });
  };

  const onClear = () => {
    setSearchInput("");
    navigate("/products");
  };

  const goToPage = (p) => setParamAndGo({ page: p });

  const title = useMemo(() => {
    if (categoryParam)
      return `${categoryParam[0].toUpperCase()}${categoryParam.slice(1)} Deals`;
    if (searchParam) return `Results for “${searchParam}”`;
    return "Latest Deals";
  }, [categoryParam, searchParam]);

  if (isError) {
    return (
      <div className="pp-products">
        <div className="pp-container">
          <div className="pp-error">
            <div className="pp-error-title">Couldn’t load products</div>
            <div className="pp-error-msg">{error.message}</div>
            <button className="pp-btn" onClick={() => window.location.reload()}>
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pp-products">
      <div className="pp-container">
        <div className="pp-hero">
          <div>
            <h1 className="pp-title">{title}</h1>
            <p className="pp-subtitle">
              Showing <b>{items.length}</b> of <b>{pagination.total}</b>
              {isFetching ? (
                <span className="pp-dotlive"> • updating…</span>
              ) : null}
            </p>
          </div>

          <form className="pp-searchbar" onSubmit={onSearch}>
            <input
              className="pp-searchbar-input"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products, stores, categories…"
            />
            <button className="pp-searchbar-btn" type="submit">
              Search
            </button>
            <button
              className="pp-searchbar-clear"
              type="button"
              onClick={onClear}
            >
              Clear
            </button>
          </form>
        </div>

        <div className="pp-toolbar">
          <div className="pp-filters">
            <button
              type="button"
              className={`pp-chip ${!categoryParam ? "is-active" : ""}`}
              onClick={() => setParamAndGo({ category: "", page: 1 })}
            >
              All
            </button>
            <button
              type="button"
              className={`pp-chip ${
                categoryParam === "women" ? "is-active" : ""
              }`}
              onClick={() => setParamAndGo({ category: "women", page: 1 })}
            >
              Women
            </button>
            <button
              type="button"
              className={`pp-chip ${
                categoryParam === "men" ? "is-active" : ""
              }`}
              onClick={() => setParamAndGo({ category: "men", page: 1 })}
            >
              Men
            </button>
            <button
              type="button"
              className={`pp-chip ${
                categoryParam === "kids" ? "is-active" : ""
              }`}
              onClick={() => setParamAndGo({ category: "kids", page: 1 })}
            >
              Kids
            </button>
            <button
              type="button"
              className={`pp-chip ${
                categoryParam === "home" ? "is-active" : ""
              }`}
              onClick={() => setParamAndGo({ category: "home", page: 1 })}
            >
              Home
            </button>
            <button
              type="button"
              className={`pp-chip ${
                categoryParam === "electronics" ? "is-active" : ""
              }`}
              onClick={() =>
                setParamAndGo({ category: "electronics", page: 1 })
              }
            >
              Electronics
            </button>
          </div>

          <div className="pp-sort">
            <span className="pp-sort-label">Sort</span>

            <select
              className="pp-sort-select"
              value={sortParam}
              onChange={(e) => setParamAndGo({ sort: e.target.value, page: 1 })}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="price-asc">Price (Low)</option>
              <option value="price-desc">Price (High)</option>
              <option value="discount-desc">Discount (High)</option>
            </select>

            <select
              className="pp-sort-select"
              value={String(limitParam)}
              onChange={(e) =>
                setParamAndGo({ limit: e.target.value, page: 1 })
              }
              title="Items per page"
            >
              <option value="24">24</option>
              <option value="36">36</option>
              <option value="48">48</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="pp-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div className="pp-card pp-skeleton" key={i}>
                <div className="pp-skel-img" />
                <div className="pp-skel-line" />
                <div className="pp-skel-line short" />
                <div className="pp-skel-line tiny" />
              </div>
            ))}
          </div>
        ) : !items.length ? (
          <div className="pp-empty">
            <div className="pp-empty-title">No products found</div>
            <div className="pp-empty-sub">
              Try a different search or clear filters.
            </div>
            <button className="pp-btn" onClick={onClear}>
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="pp-grid">
              {items.map((p) => {
                const id = p._id || p.id;
                return (
                  <Link key={id} to={`/products/${id}`} className="pp-card">
                    <div className="pp-card-media">
                      <img src={p.image} alt={p.title} loading="lazy" />
                      {p.discountPercent ? (
                        <div className="pp-badge">-{p.discountPercent}%</div>
                      ) : null}
                    </div>

                    <div className="pp-card-body">
                      <div className="pp-card-meta">
                        <span className="pp-card-store">
                          {p.storeName || p.store}
                        </span>
                        <span className="pp-card-sep">•</span>
                        <span className="pp-card-cat">
                          {p.category || "uncategorized"}
                        </span>
                      </div>

                      <div className="pp-card-title" title={p.title}>
                        {p.title}
                      </div>

                      <div className="pp-card-price">
                        <span className="pp-card-now">
                          {formatMoney(p.currency, p.price)}
                        </span>
                        {p.originalPrice ? (
                          <span className="pp-card-was">
                            {formatMoney(p.currency, p.originalPrice)}
                          </span>
                        ) : null}
                      </div>

                      <div className="pp-card-foot">
                        <span
                          className={`pp-stock ${
                            p.inStock ? "is-in" : "is-out"
                          }`}
                        >
                          {p.inStock ? "In stock" : "Out of stock"}
                        </span>
                        <span className="pp-open">View →</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {pagination.pages > 1 ? (
              <div className="pp-pager">
                <button
                  className="pp-btn pp-btn-ghost"
                  onClick={() => goToPage(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page <= 1}
                >
                  Prev
                </button>

                <div className="pp-pager-mid">
                  Page <b>{pagination.page}</b> of <b>{pagination.pages}</b>
                </div>

                <button
                  className="pp-btn pp-btn-ghost"
                  onClick={() =>
                    goToPage(Math.min(pagination.pages, pagination.page + 1))
                  }
                  disabled={pagination.page >= pagination.pages}
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
