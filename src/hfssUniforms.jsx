import { createRoot } from "react-dom/client";
import { UniformShopApp } from "./apps/hfss-uniforms/UniformShopApp.jsx";
import { capturePageMarkup } from "./apps/shared/legacyRuntime.js";

const isSignInPage = window.location.pathname === "/hfssuniformsapp/signin";
const snapshot = isSignInPage ? null : capturePageMarkup();
const rootElement = document.createElement("div");

rootElement.id = "root";
document.body.replaceChildren(rootElement);

createRoot(rootElement).render(<UniformShopApp snapshot={snapshot} />);
