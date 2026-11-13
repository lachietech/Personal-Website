# Konnect Mailbox API

Konnect is an incoming-message application with its own frontend entry point at
`/clientportal/konnect`. The client portal lives at `/clientportal/billing`; VisitPulse lives
at `/clientportal/visitpulse`. `/clientportal` is the application launcher. The
applications share portal sign-in, but do not load one another's screens or data.

Konnect supports reading, searching, starring, marking unread and archiving.
There is no compose, reply, forwarding, outbound email or SMTP endpoint. Account
emails, invoice emails, payment reminders and receipts remain in the client portal.

The machine-readable contract is [openapi.yaml](openapi.yaml).
For a complete contact-form example, see the [integration README](README.md).

## Public username delivery

Send JSON to `POST /clientportal/api/konnect/contact`:

```json
{
  "username": "nielseninnovations",
  "name": "Alex Morgan",
  "email": "alex@example.com",
  "subject": "A website enquiry",
  "message": "I would like to discuss a project."
}
```

Replace `username` with any active portal account's username. For multiple
recipients, use `usernames: ["client.owner", "client.manager"]` instead. Do not send
both fields. Usernames are case-insensitive and deduplicated. Only the requested
accounts receive the message; an unknown or inactive account rejects the whole
request with 400. Accounts can have either portal role.

No registered source, form key, admin configuration, API key, login, CSRF token or
Origin header is required. Public intake returns `Access-Control-Allow-Origin: *`
and handles OPTIONS. Browsers should use `credentials: "omit"`; server callers
need only the JSON content type and request body. Any supplied Origin is stored
as unverified metadata, bounded to 512 characters, and is never used for routing
or authorization. Sender names and email addresses are also unverified input.

The homepage sends `username: "nielseninnovations"` through the same public
endpoint. Missing/inactive recipients return 400 on this endpoint. A successful
response follows the database write; there are no outbound email notifications.

## Compatibility and migration

The admin Contact forms screen and `/sources` configuration endpoints have been
removed. Existing `konnect_sources` database records are retained but unused;
their allowlists, selected recipients and enabled flags no longer affect delivery.
No data migration is required for existing messages.

Old `/forms/{key}/messages` URLs remain aliases without registration or origin
checks. They route by the submitted usernames, except for the reserved
`/forms/website/messages` alias: it delivers only to `nielseninnovations`, permits
omitted recipients, rejects other usernames, and returns 503 if that account is
missing or inactive. The older `POST /contact` remains a CSRF-protected homepage
compatibility route with that same fixed recipient. Use the new public endpoint
for external website integrations.

## Endpoints

All paths below are relative to `/clientportal/api/konnect`.

| Method         | Path                    | Access                    | Behavior                                                  |
| -------------- | ----------------------- | ------------------------- | --------------------------------------------------------- |
| POST           | `/contact`              | Public, any/no origin     | Validate and store a message for the supplied username(s) |
| OPTIONS        | `/contact`              | Public                    | Credential-free CORS preflight                            |
| POST / OPTIONS | `/forms/{key}/messages` | Public                    | Compatibility intake alias; no source lookup              |
| GET            | `/messages`             | Signed-in user            | Paginated mailbox, search and folder counts               |
| GET            | `/messages/{id}`        | Assigned recipient        | Full plain-text message; does not change read state       |
| PATCH          | `/messages/{id}`        | Assigned recipient + CSRF | Change only the caller's read/star/archive state          |

List query parameters: `folder` is `inbox` (default), `unread`, `starred`, `archive`,
or `all`; `q` is a literal case-insensitive search of sender, subject and body (up to
120 characters); `page` starts at 1. Pages contain at most 25 messages, newest first.
`unread` excludes archived messages; `starred` includes starred archived messages.
Counts cover the user's full mailbox and do not inherit the search text.

```json
{
  "messages": [
    {
      "id": "507f1f77bcf86cd799439011",
      "sender": { "name": "Alex Morgan", "email": "alex@example.com" },
      "subject": "A website enquiry",
      "preview": "I would like to discuss a project.",
      "source": {
        "key": "contact",
        "name": "Contact enquiry",
        "origin": "https://acme.example"
      },
      "createdAt": "2026-11-12T01:00:00.000Z",
      "read": false,
      "starred": false,
      "archived": false
    }
  ],
  "page": 1,
  "pageSize": 25,
  "total": 1,
  "counts": { "inbox": 1, "unread": 1, "starred": 0, "archive": 0, "all": 1 }
}
```

Full-message responses add `body`. PATCH accepts one or more boolean fields:
`{ "read": true, "starred": false, "archived": true }`. It cannot change the sender,
message content or recipient list. Other recipients' identities and delivery state
are never included in mailbox responses. Administrators cannot read messages
unless they are recipients themselves.

Authenticated mutations use the existing portal cookie plus the session/CSRF
cookies and `X-CSRF-Token` returned by `GET /csrf-token`. The frontend handles this
automatically. Public intake has an isolated, credential-free route and does not
weaken CSRF or origin checks on authenticated APIs.

## Storage and delivery semantics

Messages use `konnect_messages` on the existing `clientPortalDb` connection
(`MONGO_URI_CLIENT`). Documents retain a source label, optional unverified origin,
sender, subject, body, timestamp and a delivery array with `userId`, `readAt`,
`starred` and `archived` per recipient. Recipient usernames are resolved against
active portal users at submission time, then stored as stable user IDs.

A single document write atomically stores a message and every recipient delivery;
this works without requiring MongoDB transactions or a replica set. There is a
compound mailbox index on recipient ID, creation time and message ID. Message
queries bind recipient identity and state using `$elemMatch`; updates change only
that matched recipient's array element. Mongoose initializes the collections and
indexes using the existing application database configuration.

Archiving is personal and reversible. The recipients in each request determine its
deliveries. Messages are retained; no deletion or automatic retention policy is
introduced. Successful retries are separate messages: clients should disable
double submission and must not automatically retry a timed-out submission, since
the original database write may already have committed. Exactly-once delivery and
external email notifications are not part of this version.

## Responses and limits

Public intake returns 201 with `success: true` and a visitor-facing confirmation.
It accepts only JSON, up to 16 KB: name 120 characters, email 254, subject 160,
message 4,000 and a username (or up to 20 usernames). Honeypot submissions return
the same generic success response without storing a message.

Errors use `{ "error": "..." }`: 400 for invalid fields or unavailable recipients;
401 for missing portal authentication; 403 for forbidden origins or invalid CSRF
on protected APIs (public intake has no origin checks);
404 for unknown routes or messages outside the caller's inbox; 405 for an
unsupported intake method; 413 for oversized bodies; 415 for non-JSON intake; 429
for rate limits; 500 for storage failure; 503 for an unavailable homepage account
on the legacy aliases.

Public intake requests are limited to 60 per minute per IP, with 10 submissions per
15 minutes per IP across the canonical and alias URLs. Authenticated mailbox requests use the existing
portal API limits. The UI refreshes every 30 seconds and on window focus.

The integration pack includes offline tests for its portable client. These do not verify live MongoDB delivery or mailbox authentication; verify those against the deployed service using the checklist in OPERATIONS.md.
