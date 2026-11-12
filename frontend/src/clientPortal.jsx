import { createRoot } from "react-dom/client";
import { ClientPortalApp } from "./apps/client-portal/ClientPortalApp.jsx";
import { trackPageView } from "./analytics.js";
import { pagePath } from "./pagePath.js";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The Client Portal root element was not found.");
}

document.body.classList.toggle(
  "login-body",
  pagePath(window.location.pathname) === "/clientportal/login",
);

createRoot(rootElement).render(<ClientPortalApp />);
trackPageView();
