# Backend API reference

Local base URL: `http://localhost:5000`. Production uses the backend URL in the
[deployment README](../README.md). Paths below are relative to the API host, not
the static frontend host. Existing URLs and response shapes are preserved.
This is a route and access reference; request field validation lives in the linked
routers and feature utilities. See [backend setup and architecture](../backend/README.md).

Implementation is split into `backend/main-api`, `backend/konnect-api`,
`backend/visitpulse-api`, `backend/projects-api`, `backend/meandersuite-api` and
`backend/hfssuniforms-api`.
The [API registry](../backend/apis.js) defines their mount paths and startup hooks.
The `/clientportal/api/konnect` and `/clientportal/api/analytics` prefixes remain
compatible with existing clients while their implementations live in separate APIs.

## Requests and authentication

Use `Content-Type: application/json` for JSON requests. Shared parsers accept up to
50 KB; public Konnect intake accepts 16 KB.

Browser requests to session-based APIs use `credentials: "include"`. Credentialed
CORS accepts only exact trusted origins. POST/PUT/PATCH/DELETE requests require
CSRF, including login and registration, except public Konnect intake.

For portal, website contact and Meander Suite:

1. `GET /csrf-token`, preserving response cookies.
2. Send the returned `csrfToken` in `X-CSRF-Token` on mutations with the same cookies.
3. Sign in at the relevant login endpoint. Portal uses the `client_portal_session`
   JWT cookie; Meander Suite uses the Express session.
4. Retrieve a new token after session regeneration (Meander login/register) or
   an expired-session/CSRF error.

Uniform Shop uses `GET /hfssuniformsapp/api/csrf-token`, its own scoped CSRF cookies,
and the same `X-CSRF-Token` header. Its authentication cookie is `uniform_shop_session`.
Sales/POS routes also require completion of any required password change.

Example for an existing portal account, from a trusted frontend origin or the
development proxy. Supply the API base URL and credentials from your application:

```js
async function login(apiBase, username, password) {
  const tokenResponse = await fetch(`${apiBase}/csrf-token`, {
    credentials: "include",
  });
  if (!tokenResponse.ok) throw new Error("Unable to initialise session");
  const { csrfToken } = await tokenResponse.json();
  const response = await fetch(`${apiBase}/clientportal/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ username, password }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Sign-in failed");
  return result;
}
```

Common statuses: `400` invalid input, `401` missing/expired authentication,
`403` origin/CSRF/role/password-change rejection, `404` missing resource or endpoint,
`413` oversized body, `429` rate limit, and `500`/`503` operation or service failure.
Most errors contain `{ error }`; some legacy contact/token responses use `{ message }`
and some shared rate-limit responses are plain text. Check status and content type
instead of assuming every failure has one JSON shape.

## Shared and public routes

| Method        | Path                                            | Access / purpose                                                                         |
| ------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| GET           | `/health`                                       | Process liveness: `{ status: "ok", service: "backend" }`; trusted-origin policy applies. |
| GET           | `/csrf-token`                                   | Issue shared CSRF token and save session.                                                |
| POST          | `/contact`                                      | Website enquiry; no login, shared CSRF required.                                         |
| POST, OPTIONS | `/clientportal/api/konnect/contact`             | Public JSON intake; no cookies, login or CSRF.                                           |
| POST, OPTIONS | `/clientportal/api/konnect/forms/:key/messages` | Legacy public intake alias.                                                              |

Konnect intake supports any origin without credentials and requires recipient
`username` or `usernames` (the legacy `website` key supplies the website recipient).
See its [integration guide](konnect-integration/README.md), [API guide](konnect-api.md)
and [OpenAPI contract](konnect.openapi.yaml).

## Client portal

Paths below start with `/clientportal/api`. “Admin” means a portal admin; “client”
means a portal user with the `client` role and a linked client record.

| Method      | Relative path                   | Access / purpose                                    |
| ----------- | ------------------------------- | --------------------------------------------------- |
| POST        | `/auth/login`                   | No login; sign in with `username`, `password`.      |
| POST        | `/auth/logout`                  | Portal user; clear auth cookie.                     |
| GET         | `/auth/me`                      | Portal user; current account.                       |
| PUT         | `/auth/account`                 | Portal user; account/password update.               |
| GET         | `/client/dashboard`             | Client; own dashboard and billing data.             |
| GET         | `/projects`                     | No login; published website projects.               |
| GET, POST   | `/projects/admin`               | Admin; list/create projects.                        |
| PUT, DELETE | `/projects/admin/:projectId`    | Admin; edit/delete project.                         |
| POST        | `/projects/admin/import-github` | Admin; import public repositories.                  |
| POST        | `/analytics/event`              | No login; record event, shared CSRF required.       |
| GET         | `/analytics/summary`            | Admin; VisitPulse report, optional `days` query.    |
| GET         | `/konnect/messages`             | Portal user; own mailbox, filtering and pagination. |
| GET, PATCH  | `/konnect/messages/:messageId`  | Portal user; read/update own delivery state.        |

Sources: [auth](../backend/main-api/routing/auth.js),
[client](../backend/main-api/routing/client.js),
[projects](../backend/projects-api/routing/projects.js),
[analytics](../backend/visitpulse-api/routing/analytics.js),
[mailbox](../backend/konnect-api/routing/messages.js).

Project routes are owned by the separate Projects API. Its administrator interface
is `/clientportal/projects`; public website project listings retain the existing
`/clientportal/api/projects` endpoint. Client, invoice and payment-setting routes
remain in Main API and are presented together at `/clientportal/billing`.

### Admin clients and billing

All routes require admin and start with `/clientportal/api/admin`.

| Method      | Relative path                                     | Purpose                          |
| ----------- | ------------------------------------------------- | -------------------------------- |
| GET, POST   | `/clients`                                        | List/create clients.             |
| PUT, DELETE | `/clients/:clientId`                              | Update/delete client.            |
| PUT         | `/settings/billing`                               | Business/payment settings.       |
| POST        | `/clients/:clientId/invoices`                     | Create invoice.                  |
| PUT, DELETE | `/clients/:clientId/invoices/:invoiceId`          | Update/delete invoice.           |
| POST        | `/clients/:clientId/emails/account`               | Send account email.              |
| POST        | `/clients/:clientId/invoices/:invoiceId/email`    | Send invoice.                    |
| POST        | `/clients/:clientId/invoices/:invoiceId/reminder` | Send payment reminder.           |
| POST        | `/clients/:clientId/invoices/:invoiceId/receipt`  | Send receipt for a paid invoice. |

Source: [admin router](../backend/main-api/routing/admin.js).
Inspect the returned `email` result for a skipped send when Resend credentials are absent.

## Uniform Shop

Paths below start with `/hfssuniformsapp/api`. “Admin” means a Uniform Shop admin,
independent of portal roles. Sales/POS routes require authentication and completion
of any required password change; sales/product mutations also require admin.

| Method           | Relative path                          | Access / purpose                                     |
| ---------------- | -------------------------------------- | ---------------------------------------------------- |
| GET              | `/csrf-token`                          | No login; issue Uniform Shop CSRF token.             |
| GET              | `/auth/setup-status`                   | No login; initial account setup availability.        |
| POST             | `/auth/setup`                          | No login; first admin setup when no users exist.     |
| POST             | `/auth/login`                          | No login; sign in.                                   |
| POST             | `/auth/logout`                         | Signed-in user; sign out.                            |
| GET              | `/auth/me`                             | Signed-in user; current account.                     |
| POST             | `/auth/change-password`                | Signed-in user; change password.                     |
| GET, POST        | `/auth/users`                          | Admin; list/create users.                            |
| PUT              | `/auth/users/:id`                      | Admin; update user.                                  |
| GET              | `/auth/audit-logs`                     | Admin; audit trail.                                  |
| GET              | `/dashboard`                           | Sales analytics and forecast.                        |
| GET, POST        | `/sales`                               | List/create sales records; POST requires admin.      |
| GET, PUT, DELETE | `/sales/:id`                           | Read/edit/delete record; mutations require admin.    |
| POST             | `/sales/:id/add-month`                 | Admin; append month.                                 |
| PATCH            | `/sales/:id/month/:monthIndex`         | Admin; update monthly value.                         |
| GET              | `/metadata/months`                     | Month labels.                                        |
| GET              | `/metadata/categories`                 | Categories.                                          |
| GET              | `/metadata/categories/:category/sizes` | Sizes in category.                                   |
| GET, POST        | `/pos/products`                        | Active products/create product; POST requires admin. |
| GET              | `/pos/products/stock`                  | Active stock.                                        |
| GET              | `/pos/products/all`                    | All products, including inactive.                    |
| POST             | `/pos/products/sync-from-sales`        | Admin; synchronize products with sales records.      |
| PUT, DELETE      | `/pos/products/:id`                    | Admin; edit/delete product.                          |
| POST             | `/pos/products/:id/transfer`           | Admin; transfer stock.                               |
| POST             | `/pos/products/:id/add-stock`          | Admin; receive stock.                                |
| GET, POST        | `/pos/orders`                          | List/create orders.                                  |
| GET              | `/pos/orders/receipts`                 | Receipt list.                                        |
| GET              | `/pos/orders/:id/receipt`              | Receipt text/HTML inside JSON.                       |

Sources: [auth](../backend/hfssuniforms-api/routing/auth.js),
[sales](../backend/hfssuniforms-api/routing/sales.js),
[products](../backend/hfssuniforms-api/routing/posProducts.js),
[orders](../backend/hfssuniforms-api/routing/posOrders.js).

## Meander Suite

Paths below start with `/meandersuite/api`.

| Method | Relative path    | Access / purpose                                           |
| ------ | ---------------- | ---------------------------------------------------------- |
| POST   | `/auth/register` | No login; register account and establish session.          |
| POST   | `/auth/login`    | No login; establish session.                               |
| GET    | `/suite-data`    | Meander-authenticated session; weather/condition analysis. |

Registration accepts `username`, `password`, `passwordconf`, `email`, optional
`first_name`, `last_name`, and location fields `locationl`, `locations`, `locationc`.
Login accepts `username`, `password`. Both regenerate the session; retrieve a fresh
shared CSRF token before the next mutation.

Sources: [auth](../backend/meandersuite-api/routing/auth.js),
[suite data](../backend/meandersuite-api/routing/suite.js).
## Sandgate Seniors API

`/senior-citz/api` provides public notices/timetable reads and authenticated admin
login, session checks, logout, notice CRUD, timetable updates and admin registration.
It uses shared cookie sessions, trusted origins and CSRF protection with a separate
Sandgate identity and optional `MONGO_URI_SENIOR_CITZ` database connection.
See [the full contract and integration instructions](./senior%20citz%20integration/README.md).
