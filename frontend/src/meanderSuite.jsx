import { createRoot } from "react-dom/client";
import { MeanderSuiteApp } from "./apps/meander-suite/MeanderSuiteApp.jsx";
import { trackPageView } from "./analytics.js";

createRoot(document.getElementById("root")).render(<MeanderSuiteApp />);
trackPageView();
