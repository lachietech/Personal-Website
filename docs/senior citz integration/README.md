# Sandgate Seniors integration

The Nielsen Innovations backend now contains `backend/senior-citz-api/`, mounted at
`/senior-citz/api`. Sandgate can become a static Vite/React site whose data and admin
operations run entirely through this API. The Sandgate repository has not yet been
changed: follow [AI-INSTRUCTIONS.md](./AI-INSTRUCTIONS.md) to perform that cutover.

## Existing structure recorded

Source reviewed: `Sandgate Senior Citizens page`, November 15, 2026.

| Existing source | Responsibility | Nielsen implementation |
| --- | --- | --- |
| `backend/server.js` | Mongo connection and HTTP listener | Existing Nielsen server lifecycle |
| `backend/app.js` | Sessions, route mounting, static assets and Vite | Nielsen shared security/session stack; static pages remain on Sandgate hosting |
| `backend/models/admin.js` | `admins`: username and bcrypt password | Same model fields, collection and bcrypt cost 12 |
| `backend/models/notice.js` | `notices`: title, content, postedAt, image Buffer/contentType | Same schema and collection |
| `backend/models/timetable.js` | `timetables`: entries and updatedAt | Same schema and collection |
| `shared/timetable.js` | Seven default weekday rows | Copied into API `utils/timetable.js` |
| `backend/routes/{admin,auth,notices,timetable}.js` | Login, logout, registration, notice CRUD, timetable | API router with JSON responses |
| `frontend/src/api.js`, `useDashboard.js` | Relative fetch calls and FormData uploads | Replace transport with the supplied API client |
| `frontend/src/pages/{Login,Dashboard}.jsx` | Native login/logout forms, server-protected dashboard | Async API calls and client session check |

Public reads retain the original array responses. Notice images remain inline data
URLs. Editing without a new image retains the old image. There is no image-removal
operation, matching the original backend. An empty timetable returns the original
seven-day defaults. The new API deliberately requires authentication for the legacy
`POST /notices` and `POST /auth/register` routes. Login/logout return JSON instead of
redirecting or setting a flash cookie. Session identity is `seniorCitzAdmin`, separate
from Nielsen portal/uniform identities; those identities do not grant Sandgate access.

## Backend deployment

1. Deploy this Nielsen backend revision and install from the updated lockfile (`npm ci`).
2. Set `MONGO_URI_SENIOR_CITZ` in the **Nielsen backend environment** to the existing
   Sandgate `MONGO_URI`, including its database name. Allow the Nielsen service to
   access that database. Never place the URI in the frontend or documentation.
3. Append the exact Sandgate production and preview origins to `TRUSTED_ORIGINS`,
   retaining existing Nielsen origins. Origins have no path or trailing slash.
4. Retain Nielsen's existing `SECRET_KEY`, `CSRF_SECRET`, and other required settings.
   For HTTPS direct cross-site requests use `COOKIE_SAME_SITE=none` and
   `NODE_ENV=production`; configure `TRUST_PROXY` for the real hosting proxy.
5. Restart Nielsen. The optional Sandgate connection is included in startup and
   shutdown. When configured, a connection failure fails startup; when omitted,
   other APIs still start and Sandgate routes return 503. `/health` alone does not
   verify Sandgate storage; check `/senior-citz/api/notices` and `/timetable` too.

The currently documented Nielsen API host is
`https://personal-website-53mf.onrender.com`; confirm the deployed host before setting
the frontend value. This implementation has not been deployed by this change.

Use the existing `admins`, `notices`, and `timetables` collections without exporting,
renaming, or rehashing passwords. Back up the database before cutover. Existing admins
log in with their current passwords and create additional admins through the dashboard.
If intentionally using a fresh database, provision its initial admin with a controlled
database/admin script using the API's Admin model; there is no public bootstrap route.

## API contract

All paths below are relative to `/senior-citz/api`. All mutations require cookies
and `X-CSRF-Token`, including login. Only public reads and token issuance are anonymous.

| Method | Path | Input | Success |
| --- | --- | --- | --- |
| GET | `/csrf-token` | None | `{ csrfToken }`, session + CSRF cookies |
| GET | `/notices` | None | `[{ _id, title, content, postedAt, imageUrl }]`, newest first |
| GET | `/timetable` | None | `[{ day, hours, activities }]` |
| POST | `/admin/login` | JSON `{ username, password }` | `{ success: true }`; session rotates |
| GET | `/auth/session` | Admin cookie | `{ authenticated: true, admin: { id, username } }` |
| POST | `/admin/logout` | No body | `{ success: true }` |
| POST | `/auth/register` | JSON `{ username, password }` | 201 `{ success: true }` |
| POST | `/admin/notice` (also `/notices`) | FormData `title`, `content`, optional `image`; JSON supported without image | 201 `{ success: true }` |
| PUT | `/admin/notice/:id` | Same fields as creation | `{ success: true, updated: <formatted notice> }` |
| DELETE | `/admin/notice/:id` | None | `{ success: true }` |
| PUT | `/admin/timetable` | JSON `{ entries: [...] }` | `{ success: true, entries }` |

Validation limits: title 200 characters; content 20,000; image 5 MiB, JPEG/PNG/GIF/WebP;
timetable 1–31 rows, day 40 characters, hours 200, activities 2,000. Username up to
100 characters. New passwords require at least 12 characters and at most 72 UTF-8
bytes. Existing shorter passwords still work for login. The shared JSON limit is
50 KiB; multipart images use the upload limit. SVG uploads are not accepted.

Errors are JSON (usually `{ error }`): 400 invalid fields/ID/upload, 401 no admin or
bad credentials, 403 CSRF/origin rejection, 404 missing notice, 409 duplicate username,
413 oversized body/image, 429 rate limit, 503 database unavailable. Shared middleware
may use `message` instead of `error`; the supplied client handles both. Login is limited
to 10 attempts per 15 minutes per IP, plus shared application rate limits.

## Cookies and hosting

Always use `credentials: 'include'`. Fetch a token before mutations and fetch a fresh
token immediately after successful login because login regenerates the session.
Do not put credentials, session tokens or CSRF tokens in localStorage or URLs.

Direct calls from Sandgate to an unrelated Render domain use third-party cookies.
`SameSite=None; Secure` and CORS are necessary but do not override browsers that block
third-party cookies. For reliable admin access, use an API custom hostname under the
same registrable domain as Sandgate, pointing to Nielsen, or a hosting reverse proxy
for `/senior-citz/api/*` to Nielsen that forwards cookies, request bodies, methods and
`Set-Cookie` unchanged. That proxy requires no Sandgate application backend. The client
supports a relative base URL for this arrangement. Do not use a static page rewrite
as a substitute for an HTTP reverse proxy. Set the website CSP `connect-src` to permit
the selected API origin; allow `data:` and `blob:` in `img-src` for notice images/previews.

Nielsen currently uses in-memory sessions/rate counters. Restarts sign admins out;
multiple instances require shared session storage or sticky routing. No new persistent
session store is introduced here.

## Verification

Run `node --test backend/senior-citz-api/tests/integration.test.js` from Nielsen.
The test uses the combined Express stack and isolated database model doubles; it
does not connect to or modify production MongoDB. Verify real database permissions,
existing passwords, data and browser cookie behavior in staging before switching hosts.
