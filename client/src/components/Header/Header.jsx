import "./header.styles.scss";
import { Link } from "react-router-dom";
const Header = () => {
  return (
    <header id="header">
      <Link to="/">
        <div className="logo">PricePulse</div>
      </Link>
      <nav>
        <Link>Home</Link>
        <Link>New Monitor</Link>
      </nav>
    </header>
  );
};

export default Header;
