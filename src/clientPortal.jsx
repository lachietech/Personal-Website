import { createRoot } from "react-dom/client";
import { ClientPortalApp } from "./apps/client-portal/ClientPortalApp.jsx";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The Client Portal root element was not found.");
}

document.body.classList.toggle(
  "login-body",
  window.location.pathname === "/clientportal/login",
);

createRoot(rootElement).render(<ClientPortalApp />);
