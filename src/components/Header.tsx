import { Link } from 'react-router-dom';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="header-logo">
          <span className="logo-image">Amigo Chocolate</span>
        </Link>
        <nav className="header-nav">
          <Link to="/regras" className="nav-link">
            Regras
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;

