import { createRoot } from "react-dom/client";
import { UniformShopApp } from "./apps/hfss-uniforms/UniformShopApp.jsx";
import { UniformErrorBoundary } from "./apps/hfss-uniforms/components/UniformErrorBoundary.jsx";
import { trackPageView } from "./analytics.js";

createRoot(document.getElementById("root")).render(
  <UniformErrorBoundary>
    <UniformShopApp />
  </UniformErrorBoundary>,
);
trackPageView();
