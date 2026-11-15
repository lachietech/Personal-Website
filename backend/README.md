# Backend API

Sandgate Seniors is also available at `/senior-citz/api`. Set optional
`MONGO_URI_SENIOR_CITZ` to its existing database URI to enable it. Its `admins`,
`notices` and `timetables` collections remain isolated from the other APIs. See the
[integration guide and AI handoff](../docs/senior%20citz%20integration/README.md)
for configuration, the API contract and static frontend migration instructions.
Run `node --test backend/senior-citz-api/tests/integration.test.js` from the root
to verify the shared middleware and Sandgate workflows without a live database.

Express 5 application using ES modules and three MongoDB databases. It serves APIs
only; browser pages and static assets belong to `frontend/`. See the
[root README](../README.md) for deployment and the [API reference](../docs/backend-api.md)
for routes and authentication.

## Run locally

From the repository root, with Node 22.12+ and MongoDB available, run `npm ci`.
Create `backend/.env` with your local database URLs and three distinct random secrets:

```dotenv
NODE_ENV=development
PORT=5000
SECRET_KEY=replace-with-a-long-random-session-secret
CSRF_SECRET=replace-with-a-different-long-random-secret
JWT_SECRET=replace-with-another-long-random-secret
MONGO_URI_CLIENT=mongodb://127.0.0.1:27017/nielsen-client-portal
MONGO_URI_UNIFORMS=mongodb://127.0.0.1:27017/nielsen-uniforms
MONGO_URI_MEANDERSUITE=mongodb://127.0.0.1:27017/nielsen-meander
```

Then run `npm run dev:backend` and check `http://localhost:5000/health`.
Use root `npm run dev` to also build/watch the frontend and run its local proxy
on port 5173. `npm start` starts only the API without watching files.

Environment loading is owned by `shared/config/environment.js`. Process variables
take priority, followed by `backend/.env`, then the legacy root `.env` fallback.
Set `BACKEND_ENV_FILE` to use one explicit file instead of both defaults; relative
paths resolve from the process working directory. Restart after configuration changes.

## Configuration

| Variable                                                                           | Purpose / default                                                                                                    |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `SECRET_KEY`                                                                       | Required Express session secret.                                                                                     |
| `CSRF_SECRET`                                                                      | Required CSRF secret.                                                                                                |
| `JWT_SECRET`                                                                       | Required signing secret for Uniform Shop and portal JWTs.                                                            |
| `MONGO_URI_CLIENT`                                                                 | Required portal database URL: clients, billing, projects, Konnect, analytics.                                        |
| `MONGO_URI_UNIFORMS`                                                               | Required Uniform Shop database URL: accounts, sales, stock, orders, audits.                                          |
| `MONGO_URI_MEANDERSUITE`                                                           | Required Meander Suite database URL: users and weather records.                                                      |
| `PORT`                                                                             | `5000`; if specified, an integer from 1 to 65535.                                                                    |
| `NODE_ENV`                                                                         | Set `development` locally and `production` on the deployed API.                                                      |
| `TRUST_PROXY`                                                                      | `1` when `RENDER=true`, otherwise `loopback`; configure for your actual proxy.                                       |
| `TRUSTED_ORIGINS`                                                                  | Comma-separated exact browser origins, added to the website defaults and local development defaults.                 |
| `COOKIE_SAME_SITE`                                                                 | `none` in production, `strict` otherwise; accepts `strict`, `lax`, `none`. Production and `none` cookies are secure. |
| `PUBLIC_SITE_URL`                                                                  | Website origin for email links; falls back to legacy `SITE_URL`, then `https://nielseninnovations.com`.              |
| `RESEND_API_KEY`                                                                   | Optional outbound portal email credential; without it, sends return a skipped result.                                |
| `CLIENT_PORTAL_EMAIL_FROM`                                                         | Optional sender; defaults to `Nielsen Innovations <contactus@nielseninnovations.com>`.                               |
| `API_KEY`                                                                          | Weather API key; required for live Meander Suite weather data.                                                       |
| `GITHUB_TOKEN`                                                                     | Optional token for admin project import from GitHub.                                                                 |
| `CLIENT_PORTAL_BOOTSTRAP_ADMIN_USERNAME`, `CLIENT_PORTAL_BOOTSTRAP_ADMIN_PASSWORD` | Credentials for the first portal admin, used only if no admin exists.                                                |
| `CLIENT_PORTAL_AUTH_TTL`, `AUTH_TOKEN_TTL`                                         | JWT lifetimes: `8h` for portal and `12h` for uniforms. Cookie lifetimes stay fixed at 8h and 12h.                    |

The server validates required configuration before connecting. All three databases
are required by this combined API; integration credentials are optional for startup.
Never put backend secrets in frontend `VITE_*` variables or commit `.env` files.

## Code map

```text
backend/
  server.js                  Validate, connect, initialise, listen, shut down
  app.js                     Express middleware order and API mounting
  apis.js                    Registry of API routers, URL prefixes and startup hooks
  startup.js                 Runs registered API initialization hooks
  main-api/                  Website contact, portal accounts, clients, invoices, payment settings
  projects-api/              Published portfolio, project management and GitHub imports
  konnect-api/               Public contact intake, message delivery and private mailboxes
  visitpulse-api/            Analytics event collection, storage and reports
  meandersuite-api/          Accounts, weather data, analysis and zone presets
  hfssuniforms-api/          Accounts, sales, stock, POS and audits
  shared/
    config/                  Environment, database connections, cookies, HTTP settings
    middleware/              CSRF, origins, cache policy, rate limits, input guards, errors
    utils/                   Shared input validation and session helpers
```

Each feature follows the same conventions:

Every API folder has an `index.js` that exports its Express router. Modules with
startup work also export an `initialise` function. Konnect additionally exports
`publicRouter` for its credential-free contact intake. `apis.js` lists each module
once; both request mounting and startup use this registry.

| Folder        | Responsibility                                               |
| ------------- | ------------------------------------------------------------ |
| `routing/`    | URLs, access checks, request validation and HTTP responses.  |
| `services/`   | Database workflows, integrations and explicit startup tasks. |
| `models/`     | Mongoose schemas bound to the feature's database connection. |
| `middleware/` | Feature authentication and request policies.                 |
| `utils/`      | Validation, formatting and calculations.                     |

Keep feature-specific code beside its feature. Add shared helpers only when
several features need the same behavior. `app.js` shows middleware order while
`shared/config/http.js` contains security-header and session settings. Uniform Shop
delegates CSRF and rate limits to its middleware folder and applies authentication
once to protected API routes.

Konnect, VisitPulse and Projects use the account model and authentication middleware owned by
Main API. Their feature models, routes, services and utilities live
inside their own API folders. Main API's website contact route calls the Konnect
delivery service. These explicit imports reuse the existing account system without
duplicating identities or changing access rules.

The folder split does not change public URLs or move database collections. Konnect,
VisitPulse, Projects and Main API continue to share `MONGO_URI_CLIENT`; the other two APIs
retain their existing databases.

| API folder         | Existing URL prefixes                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `main-api`         | `/contact`, `/clientportal/api/auth`, `/clientportal/api/admin`, `/clientportal/api/client` |
| `projects-api`     | `/clientportal/api/projects`                                                                |
| `konnect-api`      | `/clientportal/api/konnect`                                                                 |
| `visitpulse-api`   | `/clientportal/api/analytics`                                                               |
| `meandersuite-api` | `/meandersuite/api`                                                                         |
| `hfssuniforms-api` | `/hfssuniformsapp/api`                                                                      |

The shared application owns `/health` and `/csrf-token`.

## Startup and shutdown

1. `server.js` validates configuration and opens all three database connections.
2. `startup.js` awaits portal admin bootstrap, analytics collection/index setup,
   and Uniform Shop seed/POS synchronization.
3. Express begins listening. `SIGINT` and `SIGTERM` stop accepting requests,
   allow active requests to finish and close database connections, with a
   10-second shutdown deadline.

Missing configuration, connection failures and listen failures exit with a nonzero
status. Failed connection attempts close all database handles. Application data
initialization errors are logged but remain nonfatal, matching existing behavior;
review startup logs even when the health endpoint succeeds.

Importing `app.js` or calling `createApp()` does not connect databases, seed data,
initialize analytics storage or listen on a port. Models register on disconnected
handles from `shared/config/databases.js`. Connection and process lifecycle management
remain explicit. Only `server.js` starts the process.

Portal bootstrap runs only when no admin exists. Production requires both bootstrap
credentials; otherwise creation is skipped. Development retains the existing
`admin` / `password` fallback with password change required. Uniform Shop creates
its first admin through `/hfssuniformsapp/api/auth/setup`.

The optional legacy `hfssuniforms-api/sales.json` seed is imported only into an
empty sales collection. It is not bundled in the repository. POS synchronization
runs after that import completes so it sees newly inserted sales records.
Analytics requests retry storage initialization if startup initialization failed.

## Request flow and operational limits

Security headers and the shared IP rate limit run first, before any body parsing,
session creation or routing. Every path and method shares a budget of 1,000
requests per 15 minutes, including public intake, health checks, OPTIONS and
unknown paths. Exhausted budgets return JSON HTTP 429 with `Retry-After` and
standard rate-limit headers. Existing stricter feature limits also apply.
Public Konnect intake is mounted before cookie,
trusted-origin, session and CSRF middleware; it has its own parser and rate limits.
Other requests use the common stack. `/health` runs before body/session middleware.
Feature routes run after shared CSRF protection, with separate CSRF middleware for
Uniform Shop. Shared handlers finish unknown endpoints and unhandled failures.

Rate limits remain enabled in development. The default local proxy replaces
forwarded headers with the actual client address. Keep `TRUST_PROXY` restricted
to your real proxy topology; trusting arbitrary forwarded addresses lets callers
evade IP limits. Counters are per process: use a shared counter store before
running multiple backend instances if a deployment-wide budget is required.

`/health` reports process liveness, not ongoing database or integration readiness.
Startup waits for database connections, but a later outage does not change this
response. Sessions and rate-limit counters remain in memory. Restarts invalidate
sessions; multiple instances need shared stores or appropriate routing. See the
root README for cross-domain cookie deployment.

## Changes and verification

Add endpoints to the relevant API's `routing/` folder and mount them from its
`index.js` (Main API groups portal routes in `routing/portal.js`).
Keep initialization out of module-level route code. Reuse authentication, role
checks and input validators; never pass request objects directly into database
queries. Extract reusable workflows into services and preserve response formats
used by the frontend.

To add an API:

1. Create a sibling `<name>-api/` folder with an `index.js` exporting an Express router.
2. Keep its routes, models, services and utilities inside that folder. Reuse shared
   infrastructure through explicit imports from `shared/`.
3. Import the router into `apis.js` and add a unique `name`, URL `path` and `router`.
   Add `initialise` only if the API needs startup work after database connection.
4. Use the normal router for session/CSRF-protected routes. A `publicRouter` bypasses
   shared origin, body, session and CSRF middleware, so it must supply its own
   parsing, validation, CORS and rate-limit policy, as Konnect does.
5. Document the new endpoints and required environment variables. If it uses a new
   database, add its connection and lifecycle handling in `shared/config/databases.js`.

Update the [API reference](../docs/backend-api.md) when routes or access rules change.
Konnect also has its own [OpenAPI contract](../docs/konnect.openapi.yaml).

Build the frontend from the repository root:

```sh
npm run build
```

Run `npm run dev:backend` with local configuration, check `GET /health`, and verify
the affected API flows through the frontend. For authentication changes, check
sign-in, sign-out and rejection of missing credentials or invalid CSRF tokens.
Sandgate and VisitPulse include Node test suites in their API folders. Run them with `node --test backend/senior-citz-api/tests/*.test.js backend/visitpulse-api/tests/*.test.js` from the repository root.
