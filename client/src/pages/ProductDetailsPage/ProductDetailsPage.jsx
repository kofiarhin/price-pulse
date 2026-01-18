import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import "./product-details.styles.scss";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const formatMoney = (currency, value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return `${currency} ${value}`;
  return `${currency} ${n.toFixed(2)}`;
};

const formatTimeAgo = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const fetchProductById = async (id) => {
  const res = await fetch(`${API_URL}/api/products/${id}`);
  if (!res.ok) throw new Error("Failed to fetch product");
  return res.json();
};

const fetchSimilar = async (p) => {
  const params = new URLSearchParams({
    status: "active",
    inStock: "true",
    limit: "8",
    sort: "discount-desc",
  });
  if (p?.category) params.set("category", p.category);
  if (p?.gender) params.set("gender", p.gender);

  const res = await fetch(`${API_URL}/api/products?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch similar items");
  const data = await res.json();
  return data?.items || [];
};

const ProductDetailsPage = () => {
  const { id } = useParams();
  const qc = useQueryClient();

  // Queries
  const {
    data: p,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProductById(id),
    enabled: !!id,
  });

  const { data: similarItems = [] } = useQuery({
    queryKey: ["similar", p?._id],
    queryFn: () => fetchSimilar(p),
    enabled: !!p?._id,
  });

  // State
  const [activeIdx, setActiveIdx] = useState(0);
  const [saved, setSaved] = useState(false);
  const [shareDone, setShareDone] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState("price");
  const [targetPrice, setTargetPrice] = useState("");
  const [targetPercent, setTargetPercent] = useState("10");
  const [alertSaved, setAlertSaved] = useState(false);

  const gallery = useMemo(() => {
    if (!p) return [];
    return Array.from(new Set([p.image, ...(p.images || [])])).filter(Boolean);
  }, [p]);

  const activeImageUrl = gallery[activeIdx] || p?.image;

  // Actions
  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareDone(true);
      setTimeout(() => setShareDone(false), 2000);
    } catch (err) {
      console.error("Clipboard failed", err);
    }
  };

  const saveAlert = () => {
    setAlertSaved(true);
    setTimeout(() => {
      setAlertSaved(false);
      setAlertOpen(false);
    }, 1500);
  };

  if (isLoading) return <div className="pd-state">Syncing PricePulse...</div>;
  if (isError) return <div className="pd-state">{error.message}</div>;
  if (!p) return <div className="pd-state">Listing unavailable.</div>;

  const discount =
    p.originalPrice && p.price
      ? Math.round(
          ((Number(p.originalPrice) - Number(p.price)) /
            Number(p.originalPrice)) *
            100,
        )
      : p.discountPercent;

  return (
    <div className="pd-page">
      <nav className="pd-top">
        <Link className="pd-back" to="/products">
          <span className="material-symbols-outlined">arrow_back</span>
          <span>Feed</span>
        </Link>
        <div className="pd-top-actions">
          <button className="pd-icon-btn" onClick={onShare} title="Share deal">
            <span className="material-symbols-outlined">share</span>
          </button>
          <button
            className={`pd-icon-btn ${saved ? "is-active" : ""}`}
            onClick={() => setSaved(!saved)}
          >
            <span className="material-symbols-outlined">
              {saved ? "favorite" : "favorite_border"}
            </span>
          </button>
        </div>
      </nav>

      {shareDone && <div className="pd-toast">Link copied to clipboard</div>}

      <div className="pd-layout">
        <section className="pd-media">
          <div className="pd-thumbs">
            {gallery.map((url, idx) => (
              <button
                key={idx}
                className={`pd-thumb ${idx === activeIdx ? "is-active" : ""}`}
                onClick={() => setActiveIdx(idx)}
              >
                <img src={url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
          <div className="pd-main">
            <img src={activeImageUrl} alt={p.title} />
          </div>
          {/* Desktop scroll-snap helper: renders images in sequence if in lookbook mode */}
          <div className="pd-lookbook-helper">
            {gallery.slice(1).map((url, i) => (
              <div key={i} className="pd-main">
                <img src={url} alt="" />
              </div>
            ))}
          </div>
        </section>

        <aside className="pd-panel">
          <h1 className="pd-title">{p.title}</h1>

          <div className="pd-price-card">
            <div className="pd-price-row">
              <div className="pd-price">
                <span className="pd-price-now">
                  {formatMoney(p.currency, p.price)}
                </span>
                {p.originalPrice && (
                  <span className="pd-price-was">
                    {formatMoney(p.currency, p.originalPrice)}
                  </span>
                )}
              </div>
              {discount > 0 && (
                <span className="pd-discount-tag">-{discount}%</span>
              )}
            </div>

            <div className="pd-badges">
              <span className={`pd-badge ${p.inStock ? "is-good" : "is-bad"}`}>
                {p.inStock ? "In Stock" : "Out of Stock"}
              </span>
              <span className="pd-badge pd-badge-muted">
                Updated {formatTimeAgo(p.lastSeenAt)}
              </span>
            </div>
          </div>

          <div className="pd-meta-grid">
            <div className="pd-meta-item">
              <span className="pd-meta-label">Retailer</span>
              <span className="pd-meta-value">{p.storeName || p.store}</span>
            </div>
            <div className="pd-meta-item">
              <span className="pd-meta-label">Category</span>
              <span className="pd-meta-value">{p.category || "General"}</span>
            </div>
            <div className="pd-meta-item">
              <span className="pd-meta-label">Gender</span>
              <span className="pd-meta-value">{p.gender || "Unisex"}</span>
            </div>
            <div className="pd-meta-item">
              <span className="pd-meta-label">ID</span>
              <span className="pd-meta-value">#{p._id.slice(-6)}</span>
            </div>
          </div>

          <div className="pd-cta">
            <a
              className="pd-btn pd-btn-primary"
              href={p.productUrl}
              target="_blank"
              rel="noreferrer"
            >
              View on Store
            </a>
            <button
              className="pd-btn pd-btn-secondary"
              onClick={() => {
                setAlertOpen(true);
                setTargetPrice(p.price);
              }}
            >
              Monitor Price
            </button>
            <button
              className="pd-btn pd-btn-ghost"
              onClick={() => qc.invalidateQueries(["product", id])}
            >
              Refresh Deal
            </button>
          </div>
        </aside>
      </div>

      <section className="pd-similar">
        <h2 className="pd-section-title">Similar Drops</h2>
        <p className="pd-section-sub">
          Deals you might have missed in {p.category}
        </p>
        <div className="pd-similar-grid">
          {similarItems
            .filter((x) => x._id !== p._id)
            .slice(0, 4)
            .map((x) => (
              <Link key={x._id} to={`/products/${x._id}`} className="pd-card">
                <div className="pd-card-img">
                  <img src={x.image} alt={x.title} />
                  {x.discountPercent && (
                    <span className="pd-card-badge">-{x.discountPercent}%</span>
                  )}
                </div>
                <div className="pd-card-title">{x.title}</div>
                <div className="pd-card-now">
                  {formatMoney(x.currency, x.price)}
                </div>
              </Link>
            ))}
        </div>
      </section>

      {alertOpen && (
        <div
          className="pd-modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setAlertOpen(false)}
        >
          <div className="pd-modal">
            <div className="pd-modal-head">
              <h3 className="pd-modal-title">Track Pricing</h3>
              <button
                className="pd-icon-btn"
                onClick={() => setAlertOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="pd-modal-tabs">
              {["price", "percent", "stock"].map((t) => (
                <button
                  key={t}
                  className={`pd-tab ${alertType === t ? "is-active" : ""}`}
                  onClick={() => setAlertType(t)}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="pd-modal-body">
              {alertType === "price" && (
                <div className="pd-field">
                  <label className="pd-label">Notify me when price hits:</label>
                  <div className="pd-input-row">
                    <span className="pd-prefix">{p.currency}</span>
                    <input
                      className="pd-input"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      type="number"
                    />
                  </div>
                </div>
              )}
              {alertType === "percent" && (
                <div className="pd-field">
                  <label className="pd-label">Notify on drop of:</label>
                  <div className="pd-input-row">
                    <input
                      className="pd-input"
                      value={targetPercent}
                      onChange={(e) => setTargetPercent(e.target.value)}
                      type="number"
                    />
                    <span className="pd-suffix">%</span>
                  </div>
                </div>
              )}
              {alertType === "stock" && (
                <p className="pd-hint">
                  We'll ping you as soon as inventory is detected.
                </p>
              )}
            </div>
            <button className="pd-btn pd-btn-primary" onClick={saveAlert}>
              Activate Tracker
            </button>
            {alertSaved && (
              <div className="pd-toast-inline">Tracker Active</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailsPage;
