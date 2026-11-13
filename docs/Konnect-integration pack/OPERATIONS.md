# Konnect operations and verification

## Central service

The API already exists at `https://personal-website-53mf.onrender.com/clientportal/api/konnect/contact`. Consumer websites integrate the client; they do not deploy another Konnect backend. Existing service credentials and `MONGO_URI_CLIENT` stay on the central server. No new backend environment variable is required for external form submissions.

Source repository map:
- backend/apis.js, backend/app.js and backend/konnect-api/index.js: public intake mounted before portal session/CSRF middleware; mailbox routes retain portal security.
- backend/konnect-api/routing/contact.js: CORS, rate limits, JSON parsing and contact delivery.
- backend/konnect-api/utils/konnect.js: accepted fields, recipient normalization, mailbox filters, per-recipient state and serialization.
- backend/konnect-api/services/konnect.js: active account resolution and single-write delivery.
- backend/konnect-api/models/KonnectMessage.js: konnect_messages schema and mailbox index.
- backend/konnect-api/routing/messages.js: authenticated listing, reading and read/star/archive updates.

A single MongoDB document stores the enquiry and all recipients atomically. Each delivery uses a stable portal user ID. Renaming an account preserves its history but requires updating the public website's username configuration. Deleting and recreating a username does not transfer previous deliveries. Sender identity and supplied Origin are unverified. Messages are retained without automatic TTL; archiving changes only that recipient's state and does not delete the message.

## Limits and rollout

The canonical API and compatibility intake aliases share in-memory rate limits: 60 requests/minute/IP (including preflight) and 10 submissions/15 minutes/IP. These limits apply per service process; multi-instance deployments need shared rate limiting if global quotas are required. Server-to-server integrations share their outbound IP quota. JSON limit: 16 KB. Maximum message: 4,000 characters. No attachments, idempotency key, email delivery or push notifications. Inbox UI refreshes every 30 seconds and on focus.

Use `/contact` under the Konnect API prefix for new integrations. Old `/forms/{key}/messages` aliases remain supported but keys no longer select recipients. The reserved website alias routes only to nielseninnovations. The root `/contact` endpoint is a different CSRF-protected compatibility route; do not use it for new external forms. Old konnect_sources records are unused.

This pack requires no backend behavior change or database migration. Configure the receiving website, build it and deploy it. New accounts must exist before testing delivery. The pack's API.md and openapi.yaml are snapshots of the current service contract: update both the original docs and the pack when changing the API.

## Offline tests

From repository root (quotes are required around the path with spaces):

```sh
node --test "docs/Konnect-integration pack/client.test.mjs"
```

The portable test imports the client through a data URL so it works even when the receiving project has no ESM package.json. Tests use fake fetch and never contact the live service. They cover recipient configuration, payload mapping, credential omission, API failures, Retry-After, uncertain delivery and absence of automatic retry.

## Deployment acceptance checks

1. Confirm the intended active portal username and HTTPS endpoint.
2. Load the contact page: no submission should occur before the visitor presses Send.
3. With permission, submit one clearly labelled test; check OPTIONS 204 if present and POST 201 with success true. Keep the honeypot empty. Repeated clicks while pending should send only one request.
4. Open `/clientportal/konnect` as the recipient and check the sender, subject and body. Refresh if necessary. Confirm another account cannot read that message; admins have no global inbox access.
5. Test local validation and simulated network failure without sending extra live enquiries. Fields should remain and the button should recover. Check error text and rate-limit feedback through mocks.
6. Record live verification separately from build/offline test results.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| No request | Submit handler, browser validation, CSP connect-src, module URL and browser console |
| Browser CORS error | Use the public Konnect endpoint, credentials omit, Content-Type only; remove no-cors and auth headers |
| 400 | Exact allowed fields, exactly one recipient field, active account, text limits and email format |
| 413 / 415 | JSON must be at most 16 KB with application/json content type |
| 429 | Respect Retry-After; do not automatically resend |
| 500 / lost response | Backend/database logs; delivery may have committed, check inbox before manual resubmission |
| 201 but no message | Nonempty honeypot, wrong recipient login, inbox/archive filter, refresh delay |
| Changed username | Update and redeploy consumer configuration; existing messages remain with the same account ID |

Display untrusted sender/message/error content as text. Do not store enquiry contents in browser logs or analytics as part of the integration.
