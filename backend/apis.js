import mainRouter, { initialise as initialiseMain } from "./main-api/index.js";
import konnectRouter, {
  publicRouter as konnectPublicRouter,
} from "./konnect-api/index.js";
import visitpulseRouter, {
  publicRouter as visitpulsePublicRouter,
  initialise as initialiseVisitpulse,
} from "./visitpulse-api/index.js";
import meandersuiteRouter from "./meandersuite-api/index.js";
import projectsRouter from "./projects-api/index.js";
import seniorCitzRouter from "./senior-citz-api/index.js";
import uniformsRouter, {
  initialise as initialiseUniforms,
} from "./hfssuniforms-api/index.js";

// Register API modules here. Keep existing URL prefixes stable for their clients.
// publicRouter is reserved for endpoints with their own origin/input/rate policies.
export const apis = [
  { name: "Sandgate Seniors API", path: "/senior-citz/api", router: seniorCitzRouter },
  {
    name: "Main API",
    path: "/",
    router: mainRouter,
    initialise: initialiseMain,
  },
  {
    name: "Projects API",
    path: "/clientportal/api/projects",
    router: projectsRouter,
  },
  {
    name: "Konnect API",
    path: "/clientportal/api/konnect",
    router: konnectRouter,
    publicRouter: konnectPublicRouter,
  },
  {
    name: "VisitPulse API",
    path: "/clientportal/api/analytics",
    router: visitpulseRouter,
    publicRouter: visitpulsePublicRouter,
    initialise: initialiseVisitpulse,
  },
  {
    name: "MeanderSuite API",
    path: "/meandersuite",
    router: meandersuiteRouter,
  },
  {
    name: "HFSS Uniforms API",
    path: "/hfssuniformsapp",
    router: uniformsRouter,
    initialise: initialiseUniforms,
  },
];
