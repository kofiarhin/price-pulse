// client/src/pages/ProductsPage/ProductsPage.jsx
import React, { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./products.styles.scss";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

const fetchProducts = async ({
  search,
  store,
  category,
  sort,
  page,
  limit,
}) => {
  const qs = buildQueryString({ search, store, category, sort, page, limit });
  const res = await fetch(`${API_URL}/api/products${qs}`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
};

// expects: { stores: [{ value:"asos", label:"ASOS" }, ...] }
const fetchStores = async ({ category }) => {
  const qs = buildQueryString({ category });
  const res = await fetch(`${API_URL}/api/products/stores${qs}`);
  if (!res.ok) throw new Error("Failed to fetch stores");
  return res.json();
};

// expects: { categories: ["jeans","tops", ...] }
const fetchCategories = async ({ store }) => {
  const qs = buildQueryString({ store });
  const res = await fetch(`${API_URL}/api/products/categories${qs}`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
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
    [location.search],
  );

  const searchParam = params.get("search") || "";
  const storeParam = params.get("store") || "";
  const categoryParam = params.get("category") || "";
  const sortParam = params.get("sort") || "newest";
  const pageParam = Number(params.get("page") || 1);
  const limitParam = Number(params.get("limit") || 24);

  const setParamAndGo = (next = {}) => {
    const nextParams = new URLSearchParams(location.search);

    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === null || String(v).trim() === "")
        nextParams.delete(k);
      else nextParams.set(k, String(v));
    });

    const qs = nextParams.toString();
    navigate(qs ? `/products?${qs}` : "/products");
  };

  const onClear = () => navigate("/products");
  const goToPage = (p) => setParamAndGo({ page: p });

  // stores depend on category (NOT search)
  const {
    data: storesData,
    isLoading: storesLoading,
    isError: storesError,
  } = useQuery({
    queryKey: ["stores", categoryParam],
    queryFn: () => fetchStores({ category: categoryParam }),
    staleTime: 60_000,
  });

  const stores = storesData?.stores || [];

  // categories depend on store (NOT search)
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useQuery({
    queryKey: ["categories", storeParam],
    queryFn: () => fetchCategories({ store: storeParam }),
    staleTime: 60_000,
  });

  const categories = categoriesData?.categories || [];

  // auto-clear invalid store/category params (prevents “looks broken” states)
  useEffect(() => {
    if (!storesLoading && !storesError && storeParam) {
      const ok = stores.some((s) => s.value === storeParam);
      if (!ok) setParamAndGo({ store: "", page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storesLoading, storesError, storeParam, stores]);

  useEffect(() => {
    if (!categoriesLoading && !categoriesError && categoryParam) {
      const ok = categories.includes(
        String(categoryParam).toLowerCase().trim(),
      );
      if (!ok) setParamAndGo({ category: "", page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesLoading, categoriesError, categoryParam, categories]);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: [
      "products",
      searchParam,
      storeParam,
      categoryParam,
      sortParam,
      pageParam,
      limitParam,
    ],
    queryFn: () =>
      fetchProducts({
        search: searchParam,
        store: storeParam,
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
        <div className="pp-toolbar">
          <div className="pp-toolbar-left" aria-label="Filter by category">
            <div className="pp-chip-row">
              <button
                type="button"
                className={`pp-chip ${!categoryParam ? "is-active" : ""}`}
                onClick={() => setParamAndGo({ category: "", page: 1 })}
              >
                All
              </button>

              {!categoriesLoading && !categoriesError
                ? categories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`pp-chip ${
                        categoryParam.toLowerCase() === c ? "is-active" : ""
                      }`}
                      onClick={() => setParamAndGo({ category: c, page: 1 })}
                      title={c}
                    >
                      {c}
                    </button>
                  ))
                : null}
            </div>
          </div>

          <div className="pp-toolbar-right">
            <select
              className="pp-sort-select"
              value={storeParam}
              onChange={(e) =>
                setParamAndGo({ store: e.target.value, page: 1 })
              }
              title="Filter by store"
            >
              <option value="">All stores</option>
              {!storesLoading && !storesError
                ? stores.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))
                : null}
            </select>

            <select
              className="pp-sort-select"
              value={sortParam}
              onChange={(e) => setParamAndGo({ sort: e.target.value, page: 1 })}
              title="Sort"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="price-asc">Price (Low)</option>
              <option value="price-desc">Price (High)</option>
              <option value="discount-desc">Discount (High)</option>
              <option value="store-asc">Store (A–Z)</option>
              <option value="store-desc">Store (Z–A)</option>
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
                  {isFetching ? (
                    <span className="pp-dotlive"> • updating…</span>
                  ) : null}
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
