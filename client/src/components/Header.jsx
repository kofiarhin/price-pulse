/* client/src/components/Header.jsx */
import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./header.styles.scss";

const HeaderIcon = ({ name }) => {
  const icons = {
    search: <path d="M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0z" />,
    user: <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />,
    heart: <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 000-7.78z" />,
    terminal: <path d="M4 17l6-6-6-6M12 19h8" />
  };

  return (
    <svg 
      width="20" height="20" viewBox="0 0 24 24" 
      fill="none" stroke="currentColor" strokeWidth="2" 
      strokeLinecap="round" strokeLinejoin="round"
    >
      {icons[name]}
    </svg>
  );
};

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [search, setSearch] = useState(params.get("search") || "");

  useEffect(() => {
    setSearch(new URLSearchParams(location.search).get("search") || "");
    setIsMobileSearchOpen(false); // Close mobile bar on navigation
  }, [location.search]);

  const handleSearch = (e) => {
    e.preventDefault();
    const nextParams = new URLSearchParams(location.search);
    const q = search.trim();
    q ? nextParams.set("search", q) : nextParams.delete("search");
    nextParams.set("page", "1");
    navigate(`/products?${nextParams.toString()}`);
  };

  return (
    <header className="phd-header">
      <div className="phd-header-container">
        {/* Logo - Stays visible */}
        <NavLink to="/" className="phd-logo">
          BangingPrices
        </NavLink>

        {/* Desktop Search / Collapsible Mobile Search */}
        <form 
          className={`phd-search-wrapper ${isMobileSearchOpen ? 'is-open' : ''}`} 
          onSubmit={handleSearch}
        >
          <div className="phd-search-bar">
            <div className="phd-search-icon-prefix">
              <HeaderIcon name="terminal" />
            </div>
            <input
              className="phd-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets..."
              aria-label="Search"
            />
            {isMobileSearchOpen && (
              <button 
                type="button" 
                className="phd-search-close" 
                onClick={() => setIsMobileSearchOpen(false)}
              >
                ✕
              </button>
            )}
            <div className="phd-search-kbd">⌘K</div>
          </div>
        </form>

        <div className="phd-actions">
          {/* Mobile Search Trigger */}
          <button 
            className="phd-action-btn mobile-only" 
            onClick={() => setIsMobileSearchOpen(true)}
          >
            <HeaderIcon name="search" />
          </button>
          
          <button className="phd-action-btn" onClick={() => navigate("/products")}>
            <HeaderIcon name="heart" />
          </button>
          
          <button className="phd-profile-trigger" onClick={() => navigate("/products")}>
            <div className="phd-avatar">
              <HeaderIcon name="user" />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
