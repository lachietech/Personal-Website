import { useEffect } from "react";

const REVEAL_SELECTOR = ".fade-up:not(.visible)";

export function useRevealOnScroll() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion || !window.IntersectionObserver) {
      document
        .querySelectorAll(REVEAL_SELECTOR)
        .forEach((element) => element.classList.add("visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px" },
    );

    const observeNewElements = () => {
      document.querySelectorAll(REVEAL_SELECTOR).forEach((element) => {
        observer.observe(element);
      });
    };

    observeNewElements();
    const mutationObserver = new MutationObserver(observeNewElements);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);
}
