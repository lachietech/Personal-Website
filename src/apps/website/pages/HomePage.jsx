import { Footer } from "../components/layout/Footer.jsx";
import { Navigation } from "../components/layout/Navigation.jsx";
import { About } from "../components/sections/About.jsx";
import { Contact } from "../components/sections/Contact.jsx";
import { Hero } from "../components/sections/Hero.jsx";
import { Pricing } from "../components/sections/Pricing.jsx";
import { Projects } from "../components/sections/Projects.jsx";
import { Services } from "../components/sections/Services.jsx";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll.js";

export function HomePage() {
  useRevealOnScroll();
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Navigation />
      <main id="main-content">
        <Hero />
        <About />
        <Services />
        <Pricing />
        <Projects />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
