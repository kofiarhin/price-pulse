import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import "./product-details.styles.scss";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const COLOR_MAP = {
  black: "#0b0b0b",
  white: "#f5f5f5",
  grey: "#8a8a8a",
  gray: "#8a8a8a",
  charcoal: "#2b2b2b",
  navy: "#0b1b3a",
  blue: "#1f5aa6",
  red: "#b81d24",
  green: "#1f7a4f",
  khaki: "#8b7d4a",
  brown: "#6b4b2a",
  beige: "#d7c7a6",
  cream: "#efe6cf",
  ecru: "#e7dfc8",
  pink: "#e36aa5",
  purple: "#6e48aa",
  yellow: "#f3d55b",
  orange: "#f08b2b",
  tan: "#c2a079",
  stone: "#c8c2b6",
};

const normalizeColor = (c = "") => {
  const raw = String(c).toLowerCase().trim();
  const token = raw
    .replace(/[()]/g, "")
    .split(/[\/,|-]/g)[0]
    .trim()
    .split(/\s+/g)[0]
    .trim();
  return COLOR_MAP[token] || "#2a2a2a";
};

const formatMoney = (currency, value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return `${currency} ${value}`;
  return `${currency} ${n.toFixed(2)}`;
};

const fetchProductById = async (id) => {
  const res = await fetch(`${API_URL}/api/products/${id}`);
  if (!res.ok) throw new Error("Failed to fetch product");
  return res.json();
};

const ProductDetailsPage = () => {
  const { id } = useParams();

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

  const gallery = useMemo(() => {
    if (!p) return [];
    const primary = p.image ? [p.image] : [];
    const extra = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    const merged = [...primary, ...extra].filter(Boolean);
    return Array.from(new Set(merged));
  }, [p]);

  const sizes = useMemo(() => (Array.isArray(p?.sizes) ? p.sizes : []), [p]);
  const colors = useMemo(() => (Array.isArray(p?.colors) ? p.colors : []), [p]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [qty, setQty] = useState(1);

  if (isLoading) return <div className="pd-state">Loading...</div>;
  if (isError) return <div className="pd-state">{error.message}</div>;
  if (!p) return <div className="pd-state">Product not found.</div>;

  const activeImageUrl = gallery[activeIdx] || p.image;

  const needsSize = sizes.length > 0;
  const canProceed = !needsSize || !!selectedSize;

  return (
    <div className="pd-page">
      <div className="pd-top">
        <Link className="pd-back" to="/products">
          ← Back
        </Link>

        <div
          className="pd-crumbs"
          title={`${p.storeName || p.store} / ${p.category || "uncategorized"}`}
        >
          <span className="pd-crumb">{p.storeName || p.store}</span>
          <span className="pd-sep">/</span>
          <span className="pd-crumb">{p.category || "uncategorized"}</span>
          <span className="pd-sep">/</span>
          <span className="pd-crumb pd-crumb-muted">{p.gender || "N/A"}</span>
        </div>
      </div>

      <div className="pd-layout">
        <section className="pd-media">
          <div className="pd-thumbs" aria-label="Product images">
            {gallery.slice(0, 12).map((url, idx) => (
              <button
                key={`${url}-${idx}`}
                type="button"
                className={`pd-thumb ${idx === activeIdx ? "is-active" : ""}`}
                onClick={() => setActiveIdx(idx)}
                aria-label={`Image ${idx + 1}`}
              >
                <img src={url} alt="" loading="lazy" />
              </button>
            ))}
          </div>

          <div className="pd-main">
            <img src={activeImageUrl} alt={p.title} />
          </div>
        </section>

        <aside className="pd-panel">
          <div className="pd-panel-inner">
            <h1 className="pd-title">{p.title}</h1>

            <div className="pd-price-row">
              <div className="pd-price">
                <div className="pd-price-now">
                  {formatMoney(p.currency, p.price)}
                </div>
                {p.originalPrice ? (
                  <div className="pd-price-was">
                    {formatMoney(p.currency, p.originalPrice)}
                  </div>
                ) : null}
              </div>

              {p.discountPercent ? (
                <div className="pd-discount">-{p.discountPercent}%</div>
              ) : null}
            </div>

            <div className="pd-badges">
              <span className={`pd-badge ${p.inStock ? "is-good" : "is-bad"}`}>
                {p.inStock ? "In stock" : "Out of stock"}
              </span>
              {p.status ? <span className="pd-badge">{p.status}</span> : null}
              {p.storeName ? (
                <span className="pd-badge">{p.storeName}</span>
              ) : null}
            </div>

            <div className="pd-grid">
              <div className="pd-grid-row">
                <span className="pd-grid-k">Product key</span>
                <span className="pd-grid-v">{p.canonicalKey || "—"}</span>
              </div>
              <div className="pd-grid-row">
                <span className="pd-grid-k">Last seen</span>
                <span className="pd-grid-v">
                  {p.lastSeenAt ? new Date(p.lastSeenAt).toLocaleString() : "—"}
                </span>
              </div>
            </div>

            <div className="pd-section">
              <div className="pd-label">Colour</div>
              {colors.length ? (
                <div className="pd-swatches">
                  {colors.slice(0, 10).map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`pd-swatch ${
                        selectedColor === c ? "is-selected" : ""
                      }`}
                      onClick={() => setSelectedColor(c)}
                      aria-label={`Select colour ${c}`}
                    >
                      <span
                        className="pd-swatch-dot"
                        style={{ background: normalizeColor(c) }}
                      />
                      <span className="pd-swatch-text">{c}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="pd-empty">N/A</div>
              )}
            </div>

            <div className="pd-section">
              <div className="pd-label">
                Size{" "}
                {needsSize ? (
                  <span className="pd-required">Required</span>
                ) : null}
              </div>

              {sizes.length ? (
                <div className="pd-sizes">
                  {sizes.slice(0, 16).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`pd-size ${
                        selectedSize === s ? "is-selected" : ""
                      }`}
                      onClick={() => setSelectedSize(s)}
                      aria-label={`Select size ${s}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="pd-empty">N/A</div>
              )}
            </div>

            <div className="pd-section">
              <div className="pd-label">Quantity</div>
              <div className="pd-qty">
                <button
                  type="button"
                  className="pd-qty-btn"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <div className="pd-qty-val">{qty}</div>
                <button
                  type="button"
                  className="pd-qty-btn"
                  onClick={() => setQty((q) => Math.min(99, q + 1))}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            <div className="pd-cta">
              <a
                className={`pd-btn pd-btn-primary ${
                  !canProceed ? "is-disabled" : ""
                }`}
                href={canProceed ? p.productUrl : undefined}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!canProceed}
                onClick={(e) => {
                  if (!canProceed) e.preventDefault();
                }}
              >
                {needsSize && !selectedSize ? "Select size" : "View product"}
              </a>

              <a
                className="pd-btn pd-btn-ghost"
                href={p.saleUrl}
                target="_blank"
                rel="noreferrer"
              >
                Store sale page
              </a>
            </div>

            {needsSize && !selectedSize ? (
              <div className="pd-hint">Pick a size to continue.</div>
            ) : (
              <div className="pd-hint">
                {selectedSize ? `Size: ${selectedSize}` : null}
                {selectedSize && selectedColor ? " • " : null}
                {selectedColor ? `Colour: ${selectedColor}` : null}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ProductDetailsPage;
