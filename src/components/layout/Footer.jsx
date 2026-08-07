import { Brand } from "../Brand.jsx";
import { Icon } from "../Icon.jsx";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <Brand className="footer-brand" compact />
        <p>
          © {new Date().getFullYear()} Nielsen Innovations. Built in Brisbane
          with curiosity and care.
        </p>
        <a href="#home" className="back-to-top">
          Back to top <Icon name="bi-arrow-up" />
        </a>
      </div>
    </footer>
  );
}
