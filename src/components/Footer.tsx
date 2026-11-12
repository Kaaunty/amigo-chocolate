import { Link } from "react-router-dom";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <p className="footer-text">
          © {new Date().getFullYear()} Rainha das Sete. Amigo Chocolate.
        </p>
        <Link to="/regras" className="footer-link">
          Regras do jogo
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
