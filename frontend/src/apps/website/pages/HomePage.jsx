import { Footer } from "../components/layout/Footer.jsx";
import { Navigation } from "../components/layout/Navigation.jsx";
import { About } from "../components/sections/About.jsx";
import { Contact } from "../components/sections/Contact.jsx";
import { Hero } from "../components/sections/Hero.jsx";
import { IncludedProducts } from "../components/sections/IncludedProducts.jsx";
import { Pricing } from "../components/sections/Pricing.jsx";
import { Projects } from "../components/sections/Projects.jsx";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll.js";

export function HomePage() {
  useRevealOnScroll();
  return (
    <div className="site-canvas">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Navigation />
      <main id="main-content">
        <Hero />
        <About />
        <IncludedProducts />
        <Pricing />
        <Projects />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
