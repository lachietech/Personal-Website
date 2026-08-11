import { createRoot } from "react-dom/client";
import { UniformShopApp } from "./apps/hfss-uniforms/UniformShopApp.jsx";
import { trackPageView } from "./analytics.js";

createRoot(document.getElementById("root")).render(<UniformShopApp />);
trackPageView();
