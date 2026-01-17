import React from "react";
import { Link } from "react-router-dom";
import "./footer.styles.scss";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="pp-footer">
      <div className="pp-footer-container">
        <div className="pp-footer-top">
          <div className="pp-footer-brand">
            <div className="pp-footer-logo">PRICEPULSE</div>
            <p className="pp-footer-tagline">
              Track prices. Catch drops. Save money.
            </p>
          </div>

          <div className="pp-footer-cols">
            <div className="pp-footer-col">
              <div className="pp-footer-title">Explore</div>
              <Link className="pp-footer-link" to="/products">
                Products
              </Link>
              <Link
                className="pp-footer-link"
                to="/products?sort=discount-desc"
              >
                Top deals
              </Link>
              <Link className="pp-footer-link" to="/products?category=women">
                Women
              </Link>
              <Link className="pp-footer-link" to="/products?category=men">
                Men
              </Link>
              <Link className="pp-footer-link" to="/products?category=kids">
                Kids
              </Link>
              <Link className="pp-footer-link" to="/products?category=home">
                Home
              </Link>
              <Link
                className="pp-footer-link"
                to="/products?category=electronics"
              >
                Electronics
              </Link>
            </div>

            <div className="pp-footer-col">
              <div className="pp-footer-title">Support</div>
              <a className="pp-footer-link" href="#top">
                Back to top
              </a>
              <a
                className="pp-footer-link"
                href="mailto:devkofi@gmail.com"
                target="_blank"
                rel="noreferrer"
              >
                Contact
              </a>
              <a
                className="pp-footer-link"
                href="#"
                onClick={(e) => e.preventDefault()}
              >
                Terms
              </a>
              <a
                className="pp-footer-link"
                href="#"
                onClick={(e) => e.preventDefault()}
              >
                Privacy
              </a>
            </div>

            <div className="pp-footer-col">
              <div className="pp-footer-title">Status</div>
              <a
                className="pp-footer-link"
                href={import.meta.env.VITE_API_URL || "#"}
                target="_blank"
                rel="noreferrer"
              >
                API
              </a>
              <a
                className="pp-footer-link"
                href={(import.meta.env.VITE_API_URL || "") + "/health"}
                target="_blank"
                rel="noreferrer"
              >
                Health check
              </a>
              <a
                className="pp-footer-link"
                href="https://github.com/kofiarhin/price-pulse"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>

        <div className="pp-footer-bottom">
          <div className="pp-footer-copy">
            © {year} PricePulse. All rights reserved.
          </div>

          <div className="pp-footer-mini">
            <span className="pp-footer-pill">Live deals</span>
            <span className="pp-footer-pill">Price tracking</span>
            <span className="pp-footer-pill">Alerts soon</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
