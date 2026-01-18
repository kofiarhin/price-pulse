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
              Premium price intelligence for modern curators.
            </p>
          </div>

          <div className="pp-footer-cols">
            <div className="pp-footer-col">
              <div className="pp-footer-title">Curation</div>
              <Link className="pp-footer-link" to="/products">
                All Drops
              </Link>
              <Link
                className="pp-footer-link"
                to="/products?sort=discount-desc"
              >
                Top Deals
              </Link>
              <Link
                className="pp-footer-link"
                to="/products?category=electronics"
              >
                Tech
              </Link>
            </div>

            <div className="pp-footer-col">
              <div className="pp-footer-title">Platform</div>
              <a
                className="pp-footer-link"
                href="https://github.com/kofiarhin/price-pulse"
                target="_blank"
                rel="noreferrer"
              >
                Open Source
              </a>
              <a className="pp-footer-link" href="/health" target="_blank">
                Network Status
              </a>
              <a className="pp-footer-link" href="mailto:devkofi@gmail.com">
                Direct Contact
              </a>
            </div>

            <div className="pp-footer-col">
              <div className="pp-footer-title">Legal</div>
              <Link className="pp-footer-link" to="/terms">
                Terms
              </Link>
              <Link className="pp-footer-link" to="/privacy">
                Privacy
              </Link>
            </div>
          </div>
        </div>

        <div className="pp-footer-bottom">
          <div className="pp-footer-mini">
            <span className="pp-footer-pill">Real-time Sync</span>
            <span className="pp-footer-pill">Global Retailers</span>
          </div>

          <div className="pp-footer-copy">
            &copy; {year} PricePulse / Built by DevKofi.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
