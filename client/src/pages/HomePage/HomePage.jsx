/* client/src/pages/HomePage/HomePage.jsx */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./home-page.styles.scss";

const HomePage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const sections = [
    {
      id: "flash",
      title: "Flash Sales",
      desc: "Live markdowns from top UK retailers updated in real-time.",
      icon: "bolt",
      path: "/products?sort=discount-desc"
    },
    {
      id: "drops",
      title: "Deep Drops",
      desc: "Massive price corrections detected by our tracking engine.",
      icon: "trending_down",
      path: "/products?minDiscount=50"
    },
    {
      id: "curated",
      title: "Under £20",
      desc: "Premium fashion aesthetics curated for the budget-conscious.",
      icon: "auto_awesome",
      path: "/products?maxPrice=20"
    }
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    navigate(`/products?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <main className="home-page">
      <div className="home-page-container">
        <header className="home-page-header">
          <div className="home-page-brand" onClick={() => navigate("/")}>
            BANGINGPRICES / ARCHIVE
          </div>
          <nav className="home-page-nav-actions">
            <button className="home-page-icon-btn" onClick={() => navigate("/products")}>
              <span className="material-symbols-outlined">grid_view</span>
            </button>
          </nav>
        </header>

        <section className="home-page-hero">
          <span className="home-page-badge">V2.6 Live Engine</span>
          <h1 className="home-page-title">
            The Future of <br /> <span>Shopping Logic.</span>
          </h1>
          <p className="home-page-sub">
            High-performance price tracking for the UK's biggest fashion retailers. 
            Data-driven savings, delivered in real-time.
          </p>

          <div className="home-page-search-wrap">
            <form className="home-page-search" onSubmit={handleSearch}>
              <input
                className="home-page-search-input"
                placeholder="Search brand, category, or trend..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="home-page-search-btn" type="submit">
                <span className="material-symbols-outlined">arrow_outward</span>
              </button>
            </form>
          </div>
          
          <div className="home-page-cta-row">
            <Link to="/products" className="home-page-browse-link">
              Explore Intelligence
              <span className="material-symbols-outlined">chevron_right</span>
            </Link>
          </div>
        </section>

        <section className="home-page-tiles">
          {sections.map((item) => (
            <div 
              key={item.id} 
              className="home-page-tile" 
              onClick={() => navigate(item.path)}
            >
              <span className="material-symbols-outlined home-page-tile-icon">
                {item.icon}
              </span>
              <h3 className="home-page-tile-title">{item.title}</h3>
              <p className="home-page-tile-sub">{item.desc}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
};

export default HomePage;
