import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import "./product-details.styles.scss";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

  const [activeIdx, setActiveIdx] = useState(0);

  if (isLoading) return <div className="pd-state">Loading...</div>;
  if (isError) return <div className="pd-state">{error.message}</div>;
  if (!p) return <div className="pd-state">Product not found.</div>;

  const activeImageUrl = gallery[activeIdx] || p.image;

  return (
    <div className="pd-page">
      <div className="pd-top">
        <Link className="pd-back" to="/products">
          ← Back
        </Link>
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
            </div>

            <div className="pd-badges">
              {p.storeName || p.store ? (
                <span className="pd-badge">{p.storeName || p.store}</span>
              ) : null}

              <span className={`pd-badge ${p.inStock ? "is-good" : "is-bad"}`}>
                {p.inStock ? "In stock" : "Out of stock"}
              </span>
            </div>

            <div className="pd-cta">
              <a
                className="pd-btn pd-btn-primary"
                href={p.productUrl}
                target="_blank"
                rel="noreferrer"
              >
                View on store
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ProductDetailsPage;
