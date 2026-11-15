# Instructions for the AI updating the Sandgate website

Work in `Sandgate Senior Citizens page`. Convert the existing React/Vite website to
static hosting and make every server operation call the Nielsen Innovations Sandgate
API. Preserve styling, content, notices, timetable, image uploads and admin workflows.
Read this folder's README and API client first. Do not create another application
backend, expose database secrets, or redesign the site.

1. **Configure the API.** Set the public build-time `VITE_SENIOR_CITZ_API_URL` to the
   deployed Nielsen API origin plus `/senior-citz/api` (documented host:
   `https://personal-website-53mf.onrender.com/senior-citz/api`). Confirm the target
   deployment has this revision and `MONGO_URI_SENIOR_CITZ` first. For an HTTP hosting
   proxy use `/senior-citz/api`. Values in Vite must be present at build time. Since
   this project sets Vite root to `frontend`, set `envDir` explicitly to the repository
   root if placing `.env.local` there, or provide the value through the build environment.
   Never prefix Mongo credentials or server secrets with `VITE_`.
2. **Replace transport.** Copy `api-client.js` to `frontend/src/senior-api.js`.
   In `frontend/src/api.js`, import and re-export `request` from that module, retaining
   `fetchTimetable`, its default fallback, and `formatPostDate`. All current relative
   paths in `useDashboard.js` and `Home.jsx` then map to the API without rewriting
   each call. Retain JSON headers for timetable/registration and FormData for images.
3. **Convert login.** In `frontend/src/pages/Login.jsx`, replace the native
   `action='/admin/login'` submission with an async `onSubmit`: prevent default,
   read username/password from FormData, await `login(username, password)`, then
   navigate to `/admin/dashboard`. Show errors in React state, disable duplicate
   submits, and remove the old `flash` cookie mechanism. Do not navigate until token
   refresh after login succeeds.
4. **Protect the dashboard experience.** Before rendering admin controls in
   `frontend/src/pages/Dashboard.jsx`, call `request('/auth/session')`. Show loading
   until it resolves. Redirect a 401 to `/admin/login`; show a retryable error for
   network/503 failures. This is a UI check; API authorization remains the real
   protection. Do not assume a public HTML dashboard file protects any data.
5. **Convert logout.** Replace the native `/admin/logout` form with an async handler
   that awaits `logout()` and navigates locally to `/admin/login`. Display failures
   instead of claiming logout succeeded. Keep redirects on the Sandgate origin.
6. **Handle expired sessions.** Preserve error status from the client. A 401 on admin
   operations should return the user to login. For 403, refresh the token and ask the
   user to retry; never automatically replay a write that may already have succeeded.
   Keep the notice/timetable forms intact on failures. Registration is available only
   to logged-in admins; add password length guidance matching the API contract.
7. **Make the build self-contained.** `vite.config.js` currently uses
   `publicDir: false` and Express serves `frontend/static` at `/static`. Configure Vite
   to copy those assets into `dist/static` (for example, a build script copying that
   directory after `vite build`), preserving the existing `/static/...` URLs. Ensure
   logos, CSS, images and all three HTML entry points exist in the final output.
8. **Remove the runtime server requirement.** Use Vite directly for development
   (`vite --host 127.0.0.1`) and build with `vite build` plus the static-asset copy.
   Configure a local Vite proxy for `/senior-citz/api` to the locally running Nielsen
   backend if using a relative API base. Remove `backend/server.js` from development,
   start and deployment commands. Remove backend-only dependencies and obsolete
   server code only after replacing dependent tests and verifying feature parity.
   Keep `shared/timetable.js`, which the frontend uses for fallback data.
9. **Configure static hosting.** Publish `dist`. Rewrite `/admin/login` to
   `/admin-login.html`, `/admin/dashboard` to `/admin-dashboard.html`, and `/` to
   `/index.html`. Retain direct `.html` entry URLs. Do not rewrite API or asset requests
   to HTML. Update `README.md`, environment examples and deployment commands to state
   that no Sandgate Node server or MongoDB credentials are required.
10. **Check CORS/cookies.** The Nielsen backend trusts Sandgate's production origins;
    have its operator append any preview origins to `TRUSTED_ORIGINS` and
    configure the database as described in the README. Test cookie persistence
    in the target browser. If third-party cookies are blocked,
    use the documented same-site API hostname or hosting reverse proxy. Do not
    disable CSRF or replace HttpOnly cookies with browser-stored admin credentials.
11. **Verify before cutover.** Update browser tests to use an isolated API fixture or
    staging Nielsen backend; never mutate production data in tests. Check public
    notices/images, timetable defaults and saved rows; successful/failed login;
    dashboard refresh and direct navigation; notice create/edit without image/edit
    with image/delete; invalid and oversized uploads; timetable validation; admin
    registration; logout and expired sessions. Check desktop/mobile visual parity,
    rejected untrusted origins, unauthorized mutations and missing CSRF tokens.
    Confirm the browser sends no data requests to a Sandgate application server.

Cut over only after staging verification: back up MongoDB, deploy Nielsen, deploy
the static frontend with the selected API URL, verify against the existing database,
then retire the old Sandgate backend service. Keep the previous deployment available
for rollback; avoid simultaneous admin edits during cutover. Report deployment and
live checks separately from local build/test results.
