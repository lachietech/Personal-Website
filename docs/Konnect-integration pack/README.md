# Konnect integration pack

Give this entire folder to an AI and ask it to follow `AI-INSTRUCTIONS.md`. This pack integrates a website's contact form with the existing **Konnect Mailbox** service. Visitors submit enquiries; the named portal account receives them in `/clientportal/konnect`. Konnect does not send email notifications or provide SMTP, compose, reply or forwarding.

## Quick setup

1. Identify an existing **active** portal account. This website uses `nielseninnovations`; replace it for other customers. Any portal role can receive messages. There is no form registration, API key, origin allowlist or extra server environment variable to configure.
2. Copy `konnect-client.js` into the receiving application's source folder. It is a dependency-free ES module and works with browser fetch or Node.js 18+.
3. Copy `frontend.env.example` values into your frontend environment file, adapt the username, and initialize the client once. Environment values are public configuration, not secrets.

```js
import { createKonnectClient } from './konnect-client.js';
const konnect = createKonnectClient({
  endpoint: import.meta.env.VITE_KONNECT_ENDPOINT,
  username: import.meta.env.VITE_KONNECT_USERNAME,
});

// Call from your form's submit handler, not on page load.
const result = await konnect.submit({
  name: 'Alex Morgan',
  email: 'alex@example.com',
  subject: 'Project enquiry',
  message: 'I would like to discuss a website.',
  website: '', // Optional honeypot; empty for real visitors.
});
```

4. Disable duplicate submission while pending; display errors as text and keep form fields on failure. Reset only after confirmed success. Do not automatically retry failures: a timed-out request may already have stored a message. `example.html` + `example.js` provide a complete accessible form handler.
5. Build/deploy the receiving application, submit a labelled test enquiry when authorized, and sign into the recipient's Konnect inbox to verify delivery. A live test stores a real message.

For plain HTML serve example.html, example.js and konnect-client.js together over HTTP(S), after replacing the example recipient. Raw HTML does not load `.env`; configure the values in example.js or inject public runtime configuration. Vite loads VITE_* values at build time; Next.js client code can use NEXT_PUBLIC_* equivalents. Rebuild after changing build-time values. Allow the API origin in CSP `connect-src`. Use HTTPS in production.

For multiple recipients, configure `usernames: ['client.owner', 'client.manager']` **instead of** username. All accounts must be active; one unavailable account rejects the entire submission. Do not let public form fields choose recipients. The client only sends supported fields, so application metadata must not be blindly spread into the API payload.

## Client contract

`createKonnectClient({endpoint, username | usernames, fetchImpl?})` validates configuration and returns `{submit}`. `submit({name, email, subject, message, website?})` resolves to `{success: true, message}` only for a valid HTTP 201 response. Required field validation is enforced by the API; use matching HTML validation for visitor feedback.

Failures throw `KonnectError` with `status` (0 for network errors), `retryAfter` (seconds or null), and `deliveryUnknown`. A true deliveryUnknown means delivery cannot safely be assumed to have failed; it is not a retry signal. No automatic retry, timeout, persistence or deduplication is built in. The caller prevents double submission. A nonempty honeypot returns generic success but is intentionally discarded.

## Pack contents

| File | Purpose |
| --- | --- |
| AI-INSTRUCTIONS.md | Checklist for an AI integrating another application |
| konnect-client.js | Copyable browser/Node ES module |
| frontend.env.example | Public endpoint and recipient settings |
| example.html + example.js | Working form and submission handler |
| API.md | Public intake and authenticated mailbox reference |
| openapi.yaml | Machine-readable OpenAPI 3.1 contract |
| OPERATIONS.md | Architecture, rollout, checks and troubleshooting |
| client.test.mjs | Offline tests using fake fetch; no messages sent |

Unlike VisitPulse, Konnect intake accepts any/no Origin and requires no per-site registration. The public intake does not grant access to mailbox contents. External contact forms should use only the public endpoint; portal authentication and CSRF remain required for private mailbox operations.
