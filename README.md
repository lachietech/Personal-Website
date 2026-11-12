# Nielsen Innovations

The frontend is a **static site**. It builds HTML, JavaScript, CSS and assets into
`frontend/dist` and has no production start command or running Node server.
The backend is a separate Express API hosted at
`https://personal-website-53mf.onrender.com`.

```text
Browser -> Render Static Site (frontend/dist)
Browser -> Render Web Service (backend API) -> databases/integrations
```

## Production deployment on Render

Deploy the frontend as a **Static Site**, with these settings:

| Setting           | Value                                                        |
| ----------------- | ------------------------------------------------------------ |
| Repository        | This GitHub repository                                       |
| Root Directory    | Leave blank (npm workspaces use the root lockfile)           |
| Build command     | `npm ci --workspace frontend --include=dev && npm run build` |
| Publish directory | `frontend/dist`                                              |
| Start command     | None                                                         |
| `VITE_API_URL`    | `https://personal-website-53mf.onrender.com`                 |

[render.yaml](render.yaml) defines the static frontend, page rewrites and security
headers. It does not create another backend service. Apply it through a Render
Blueprint, or copy its routes and headers into an existing Static Site's settings.
A Git push does not apply Blueprint settings to an independently configured service.
See Render's [Static Sites guide](https://render.com/docs/static-sites) and
[rewrite documentation](https://render.com/docs/redirects-rewrites).

If the frontend is currently a Web Service with a start command, create a Static
Site and move the frontend domain to it after verifying the deployment. Do not run
`npm start`, `npm run dev`, `vite preview` or a Node server for the frontend in
production. Root `npm start` now launches **only the backend**.

Keep the existing backend as a Node **Web Service**:

| Setting            | Value                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Root Directory     | Leave blank                                                                                                         |
| Build command      | `npm ci --workspace backend --omit=dev`                                                                             |
| Start command      | `npm run start:backend` (or root `npm start`)                                                                       |
| Health check       | `/health`                                                                                                           |
| `NODE_ENV`         | `production`                                                                                                        |
| `PUBLIC_SITE_URL`  | `https://nielseninnovations.com`                                                                                    |
| `TRUSTED_ORIGINS`  | `https://nielseninnovations.com,https://www.nielseninnovations.com` plus any exact frontend preview origins you use |
| `COOKIE_SAME_SITE` | `none` for the current separate website/API domains (production default)                                            |
| `TRUST_PROXY`      | `1`, or omit on Render to use its ingress default                                                                   |

Keep existing MongoDB URLs, session/JWT/CSRF secrets and integration keys on the
backend only; see [backend/.env.example](backend/.env.example). Never place secrets
in `VITE_*` variables: they are included in public browser bundles. Both services
require Node 22.12+ or 24 LTS. Do not commit `.env` files.

The browser calls the public backend directly. `VITE_API_URL` is a build-time value;
rebuild after changing it and update the static site's CSP `connect-src` header
in `render.yaml` or the Render dashboard. With no override, production builds use
the backend URL above. The frontend no longer uses `BACKEND_URL`, `PORT` or
`TRUST_PROXY` in production.

Authentication requests include backend cookies, and protected APIs still enforce
exact trusted origins and CSRF tokens. Production cookies use `Secure` and
`SameSite=None` for the current different domains. Browsers that block third-party
cookies can still block sign-in with this arrangement; for reliable cookie access,
attach `api.nielseninnovations.com` to the same backend service, use that as
`VITE_API_URL`, update the static CSP, and set `COOKIE_SAME_SITE=strict`. This uses
the same site for both hosts without introducing a frontend server.

Sessions use the existing in-memory Express store. Backend restarts require new
CSRF sessions; multiple backend replicas need shared session storage or sticky
routing. Databases remain separate from both deployments.

## Page routing

The static site's rewrites serve each application document at its existing URL:

- `/` serves the public homepage.
- `/clientportal`, `/clientportal/login` and `/clientportal/account` serve the portal.
- `/clientportal/billing`, `/clientportal/konnect` and `/clientportal/visitpulse` each
  serve their separate application bundle.
- `/hfssuniformsapp/*` and `/meandersuite/*` use the explicit routes in `render.yaml`.

Do not add a catch-all rewrite to `/index.html`: these applications have different
HTML entry points. API calls go to the backend host, not the static site. The
frontend cannot access a private Render service directly.

## Local development

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. This command builds in development mode and runs a
**local-only** frontend preview/proxy, the API and the asset watcher. The development
proxy keeps local requests on one origin; it is not deployed or started by the
production commands. Its startup explicitly refuses `NODE_ENV=production`.

Copy `backend/.env.example` to `backend/.env` and enter your local database URLs and
secrets. Keep `NODE_ENV=development` locally. The backend also supports a root `.env`
as a migration fallback; process environment variables take priority. Use
`BACKEND_ENV_FILE` to select one explicit backend environment file.

The optional [frontend/.env.example](frontend/.env.example) documents the public
API override and local preview settings. Development builds use relative API URLs
unless `VITE_API_URL` is set. For direct local API calls, set it to
`http://localhost:5000` and use `http://localhost:5173` for the frontend.

| Command                               | Purpose                                                                |
| ------------------------------------- | ---------------------------------------------------------------------- |
| `npm run build`                       | Build the static production frontend and exit                          |
| `npm start` / `npm run start:backend` | Start only the backend API                                             |
| `npm run dev`                         | Build/watch browser code and run both local development processes      |
| `npm run dev:frontend`                | Run the local frontend preview/proxy                                   |
| `npm run dev:backend`                 | Watch the backend API                                                  |
| `npm run dev:client`                  | Watch/rebuild development browser assets                               |
| `npm test`                            | Syntax checks, unit tests, production build and HTTP integration tests |

## Layout and verification

`frontend/src` contains browser applications and assets; `frontend/public` contains
HTML documents. `frontend/server` is for local development and HTTP tests only.
`backend/src` contains the API, authentication, models and business logic.
`render.yaml` configures the production static site. Generated `frontend/dist`
output is ignored by Git and rebuilt during deployment.

Tests exercise frontend/backend separation, direct API requests, CORS and cookie
settings, CSRF, authentication, public Konnect delivery, uploads and local proxy
behavior. Database operations are stubbed; tests do not send real email or connect
to production databases. Verify live login and message delivery after deployment.

## Portal applications and Konnect

- Billing: `/clientportal/billing`, including invoice/account email tools.
- Konnect Mailbox: `/clientportal/konnect`, incoming messages without replies.
- VisitPulse: `/clientportal/visitpulse`, analytics with existing account permissions.

Websites submit directly to
`https://personal-website-53mf.onrender.com/clientportal/api/konnect/contact` with a
recipient `username` or `usernames`. No admin setup or origin verification is
needed for this public intake endpoint. Messages are stored in `konnect_messages`
in the client portal database. Homepage enquiries go to `nielseninnovations`.
See the [integration README](docs/konnect-integration/README.md),
[API guide](docs/konnect-api.md) and [OpenAPI contract](docs/konnect.openapi.yaml).
