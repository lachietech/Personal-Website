# Nielsen Innovations

The application is split into two independently runnable and deployable services.
The repository uses npm workspaces to share a lockfile and development commands;
neither service imports source code from the other.

```text
Browser -> frontend (port 5173) -> backend API (port 5000) -> databases/integrations
```

`frontend/` owns React, HTML, styles, images, page routing, and the public web
server. Its build produces `frontend/dist/`. The web server also forwards the
existing API URLs to `BACKEND_URL`, keeping browser requests and authentication
cookies on the same origin.

`backend/` owns authentication, authorization, CSRF protection, validation,
MongoDB models, business logic, email, and external integrations. It returns
JSON and API attachments; it never serves frontend documents or assets.

## Layout

```text
frontend/
  src/                  React applications and browser assets
  public/               HTML documents, robots, sitemap, favicon
  server/               Page routing, static hosting, streaming API proxy
  scripts/              Static asset build support
  tests/                UI, page, utility and proxy tests
  dist/                 Generated deployable frontend assets (ignored)
  package.json          Frontend dependencies and commands
backend/
  src/                  API server, routes, middleware, models and services
  tests/                Backend utility and security tests
  package.json          Backend dependencies and commands
scripts/                Local process launcher and syntax checks
tests/                  Cross-service HTTP integration tests
```

## Local development

Use Node.js 22.12+ or 24 LTS. From the repository root:

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. The development command builds the frontend,
starts both services, and watches React/assets and server source. Refresh the
browser after frontend rebuilds. Restart after editing environment files.

For a new checkout, copy `backend/.env.example` to `backend/.env` and fill in
its secrets, MongoDB URLs and integration keys. Frontend defaults work locally;
copy `frontend/.env.example` to `frontend/.env` when changing ports or hosts.

Existing root `.env` files continue to work as a backend-only migration fallback.
Values in `backend/.env` take precedence over that fallback; process environment
variables take precedence over both. `BACKEND_ENV_FILE` selects a single explicit
backend environment file. The frontend loads only its own `.env` and must never
receive database credentials or server secrets.

Each service can also run separately:

```sh
npm run build
npm run start:backend
# In another terminal:
npm run start:frontend
```

Or run `npm start` inside `backend/` and `frontend/` respectively. Building the
frontend does not require a running API or database; starting the backend does
not require a frontend build. `npm start` at the root launches both services
using the existing frontend build.

| Root command                    | Purpose                                                                   |
| ------------------------------- | ------------------------------------------------------------------------- |
| `npm run build`                 | Build the website and application entry points, then copy static assets   |
| `npm run dev`                   | Build, then run and watch both services                                   |
| `npm run dev:frontend`          | Watch the frontend web server                                             |
| `npm run dev:client`            | Watch and rebuild browser source and assets                               |
| `npm run dev:backend`           | Watch the API server (`dev:server` is an alias)                           |
| `npm run start:frontend`        | Start only the frontend                                                   |
| `npm run start:backend`         | Start only the backend                                                    |
| `npm test`                      | Syntax checks, both service test suites, build and HTTP integration tests |
| `npm test --workspace frontend` | Frontend tests only                                                       |
| `npm test --workspace backend`  | Backend tests only                                                        |

## HTTP boundary

The frontend forwards these paths unchanged, including query strings, request
bodies, CSRF headers, cookies, downloads and status codes:

- `/csrf-token`
- `/contact`
- `/clientportal/api/*`
- `/hfssuniformsapp/api/*`
- `/meandersuite/api/*`

All other paths belong to frontend page/static routing. Each service exposes its
own `/health` liveness response. Unavailable upstream APIs return JSON with status
502; frontend pages remain available. A liveness response does not verify database
or external-service availability.

The frontend serves empty React page shells without consulting the database.
React checks the current user through the API and redirects to sign-in when
needed. Billing renders the appropriate role-specific workspace. The backend continues to enforce authorization on
every protected API, including when callers bypass the frontend.

## Deployment on Render from GitHub

Connect the GitHub repository to two Render services using the native **Node**
runtime. Leave **Root Directory** blank for both so npm can access the root
workspace manifest and shared lockfile. Select the deployment branch and enable
automatic deploys for each service. See Render's
[monorepo documentation](https://render.com/docs/monorepo-support).

| Setting           | Frontend                                                     | Backend                                 |
| ----------------- | ------------------------------------------------------------ | --------------------------------------- |
| Service type      | Web Service                                                  | Private Service                         |
| Build command     | `npm ci --workspace frontend --include=dev && npm run build` | `npm ci --workspace backend --omit=dev` |
| Start command     | `npm run start:frontend`                                     | `npm run start:backend`                 |
| Health check path | `/health`                                                    | `/health`                               |

Use the same region and workspace for both services. Render's
[private services](https://render.com/docs/private-services) keep the API off the
public internet. Set the frontend's `BACKEND_URL` to the backend's internal HTTP
address, including its listening port, without a path. Both servers read `PORT`;
if you set a backend port explicitly, use the same port in `BACKEND_URL`.

Attach the public domain to the frontend Web Service, which serves the built pages
and proxies API requests. It needs its Node server, so deploy it as a Web Service.
The browser continues to call relative URLs; moving the API does not require a
frontend rebuild.

Configure environment variables in Render using `frontend/.env.example` and
`backend/.env.example` as references. Set a supported Node version consistently on
both services using Render's [Node version settings](https://render.com/docs/node-version).
Keep database credentials and integration secrets on the backend service only,
and use database URLs reachable from Render. Do not commit environment files.

For production, set `NODE_ENV=production` on both services and use HTTPS. Configure
frontend `TRUST_PROXY` with the trusted TLS ingress address/subnet so it can forward
the original HTTPS scheme and client address. Configure backend `TRUST_PROXY` with
the frontend proxy address/subnet (default: `loopback` for same-host processes).
Restrict network access to those proxies; do not trust arbitrary public clients.
Add your frontend origin to backend `TRUSTED_ORIGINS` and set `PUBLIC_SITE_URL` to
that same public origin for email links. The Nielsen Innovations production origins
remain allowed by default; localhost origins are included only outside production.

Sessions still use the existing in-memory Express store. A backend restart requires
new CSRF sessions, and multiple backend replicas require a shared session store or
sticky routing. This change separates the services but does not migrate session
storage or the databases.

## Migration and verification

The previous `src/backend/` is now `backend/src/`; browser source, assets and
`public/` are under `frontend/`. Existing page/API URLs and cookie paths are retained.
Deployment commands that previously started `src/backend/server.js` must now start
the two services. Generated bundles are built into `frontend/dist/` rather than
committed under `public/static/react/`.

Integration tests run the real frontend and backend HTTP stacks with database
operations stubbed. They cover page/API separation, built assets, session and CSRF
cookies, login/logout, authorization, origin checks and backend outages. Proxy tests
cover multipart uploads, binary downloads and spoofed forwarding headers. These
tests do not send email or connect to live databases.

## Portal applications and Konnect

The portal now launches three separate browser applications, each with its own
HTML document, JavaScript entry point and URL:

- Billing: `/clientportal/billing` (including all existing invoice/account email tools).
- Konnect Mailbox: `/clientportal/konnect` (incoming enquiries, search, stars and archive; no replies).
- VisitPulse Analytics: `/clientportal/visitpulse` (existing analytics permissions retained).

Contact forms submit to Konnect and are stored in `konnect_messages` in the
client portal database. Websites submit directly to
`POST /clientportal/api/konnect/contact` with a recipient `username` (or `usernames`
for multiple recipients). No admin setup, registered form or origin verification
is needed. The homepage sends to `nielseninnovations`. Start with the
[website integration README](docs/konnect-integration/README.md), [API guide](docs/konnect-api.md) and
[OpenAPI contract](docs/konnect.openapi.yaml) for setup, requests and responses.
