import { useEffect, useState } from "react";
import { navigationItems } from "../../content/siteContent.js";
import { Brand } from "../Brand.jsx";
import { Icon } from "../Icon.jsx";

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const updateNavbar = () => setIsScrolled(window.scrollY > 24);
    updateNavbar();
    window.addEventListener("scroll", updateNavbar, { passive: true });

    return () => window.removeEventListener("scroll", updateNavbar);
  }, []);

  const closeMenu = () => setIsMenuOpen(false);
  const navbarClass = `navbar navbar-expand-lg navbar-dark fixed-top${
    isScrolled ? " scrolled" : ""
  }`;

  return (
    <nav className={navbarClass} aria-label="Primary navigation">
      <div className="container">
        <Brand className="navbar-brand" />
        <button
          className="navbar-toggler"
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation"
          aria-label="Toggle navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div
          id="primary-navigation"
          className={`collapse navbar-collapse${isMenuOpen ? " show" : ""}`}
        >
          <ul className="navbar-nav ms-auto align-items-lg-center">
            {navigationItems.map((item) => (
              <li className="nav-item" key={item.href}>
                <a className="nav-link" href={item.href} onClick={closeMenu}>
                  {item.label}
                </a>
              </li>
            ))}
            <li className="nav-item nav-portal">
              <a className="nav-link" href="/clientportal">
                Client portal <Icon name="bi-arrow-up-right" />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
