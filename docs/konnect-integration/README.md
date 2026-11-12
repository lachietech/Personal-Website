# Send contact enquiries to Konnect Mailbox

Send one JSON request containing the recipient's portal **username** and the
visitor's enquiry. No admin setup, registered form, form key, API key, login or
origin verification is needed. The recipient must already have an active client
portal account. Messages appear in their Konnect inbox; they are not sent by email.

## Quick start

```http
POST /clientportal/api/konnect/contact HTTP/1.1
Host: nielseninnovations.com
Content-Type: application/json

{
  "username": "nielseninnovations",
  "name": "Alex Morgan",
  "email": "alex@example.com",
  "subject": "Project enquiry",
  "message": "I would like to discuss a new website."
}
```

Replace `nielseninnovations` with your client's portal username. Use the public
frontend hostname for your deployment; the frontend forwards requests to the
backend, including when the backend is a private Render service.

### JavaScript (browser or Node.js)

```js
const response = await fetch(
  "https://nielseninnovations.com/clientportal/api/konnect/contact",
  {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "nielseninnovations", // Replace with your client's username.
      name: "Alex Morgan",
      email: "alex@example.com",
      subject: "Project enquiry",
      message: "I would like to discuss a new website.",
    }),
  },
);
const result = await response.json().catch(() => ({}));
if (!response.ok) throw new Error(result.error || "Unable to deliver enquiry");
console.log(result.message);
```

### curl

Save the JSON from the quick start as `contact.json`, then run:

```sh
curl --request POST "https://nielseninnovations.com/clientportal/api/konnect/contact" --header "Content-Type: application/json" --data-binary "@contact.json"
```

On Windows PowerShell, use `curl.exe` instead of `curl`. No `Origin` header is
required for server or command-line requests.

## Request fields

| Field       | Required                  | Rules                                                                           |
| ----------- | ------------------------- | ------------------------------------------------------------------------------- |
| `username`  | Yes, or use `usernames`   | Recipient's portal username, 3?32 letters, digits, dots, underscores or hyphens |
| `name`      | Yes                       | Visitor's name; nonempty text, maximum 120 characters                           |
| `email`     | Yes                       | Visitor's email; valid format, maximum 254 characters                           |
| `subject`   | Yes                       | Nonempty text, maximum 160 characters                                           |
| `message`   | Yes                       | Nonempty plain text, maximum 4,000 characters                                   |
| `usernames` | Alternative to `username` | Array of 1?20 usernames for multiple recipients                                 |
| `website`   | No                        | Optional honeypot; omit or leave empty for real visitors                        |

Use **either** `username` **or** `usernames`, never both. Usernames are
case-insensitive; duplicates in an array are removed. User IDs and email addresses
are not recipient identifiers. Extra fields are rejected. Total JSON size is
limited to 16 KB; attachments are not supported.

To deliver the same enquiry to two accounts, replace `username` with:

```json
{ "usernames": ["client.owner", "client.manager"] }
```

Only the named accounts receive the message. If any account is missing or inactive,
the whole request fails with HTTP 400, with no partial delivery or fallback to an
administrator. Renaming an account requires updating its username in your website
integration. Previously delivered messages remain associated with the account.

## Connect an existing contact form

Give your form the ID `contact-form` and fields named `name`, `email`, `subject`
and `message`. Add a submit button and a status element such as
`<p id="contact-status" role="status" aria-live="polite"></p>`.
Load this JavaScript after the form or as a module:

```js
const form = document.querySelector("#contact-form");
const button = form.querySelector('[type="submit"]');
const status = document.querySelector("#contact-status");
let sending = false;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (sending) return;
  sending = true;
  button.disabled = true;
  status.textContent = "Sending...";
  const fields = new FormData(form);

  try {
    const response = await fetch(
      "https://nielseninnovations.com/clientportal/api/konnect/contact",
      {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "nielseninnovations", // Replace with your client's username.
          name: fields.get("name"),
          email: fields.get("email"),
          subject: fields.get("subject"),
          message: fields.get("message"),
        }),
      },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(result.error || "Unable to deliver enquiry");
    status.textContent = result.message;
    form.reset();
  } catch (error) {
    status.textContent =
      error instanceof TypeError
        ? "Delivery could not be confirmed. Check your connection before trying again."
        : error.message;
  } finally {
    sending = false;
    button.disabled = false;
  }
});
```

Configure the recipient in your website code; visitors enter their own details and
enquiry. Display server messages as text and retain fields on failure. If your
website uses a Content Security Policy, allow the API host in `connect-src`.

## Responses and browser access

HTTP **201** means the message and all recipient deliveries have been stored:

```json
{
  "success": true,
  "message": "Your message has been delivered. Thank you for getting in touch."
}
```

A nonempty honeypot returns the same response but is discarded. Errors normally
return `{ "error": "..." }`.

| Status | Meaning                                                                                    |
| ------ | ------------------------------------------------------------------------------------------ |
| 400    | Invalid fields, missing recipient, conflicting recipient fields, or an unavailable account |
| 405    | Unsupported method; submit with POST                                                       |
| 413    | Request exceeds 16 KB                                                                      |
| 415    | Content type must be `application/json`                                                    |
| 429    | Rate limit reached; wait for the number of seconds in `Retry-After`                        |
| 500    | Server/storage error; delivery was not confirmed                                           |

The public endpoint returns `Access-Control-Allow-Origin: *`. Any website can
submit, and requests with no Origin header are accepted. The browser handles
OPTIONS preflight automatically. Do not use `mode: "no-cors"` or send cookies,
authorization headers or CSRF tokens. Origin, if supplied, is stored only as
unverified metadata; it does not control delivery. The endpoint is public, so
sender names and email addresses are unverified visitor input.

Limits are 60 public intake requests per minute per IP and 10 submissions per
15 minutes per IP, shared across current and compatibility intake URLs. Server-side
integrations share limits across callers using their server IP. Preflights count
toward the first limit. There is no idempotency key: do not automatically retry a
timeout, because the original write may have succeeded.

## Check delivery

Submit a clearly labelled test enquiry, sign in as the recipient and open
`/clientportal/konnect`. Only recipients can read their messages. The public intake
endpoint does not grant mailbox access. Konnect supports reading, searching,
starring and archiving, with no reply or outbound-email feature.

The Nielsen Innovations homepage uses the same endpoint with
`"username": "nielseninnovations"`.

## Upgrading an existing integration

- Use `/clientportal/api/konnect/contact` and supply `username` or `usernames`.
- Remove form registration and origin-allowlist setup. The admin Contact forms
  screen and `/sources` configuration endpoints have been removed.
- Existing `/clientportal/api/konnect/forms/{key}/messages` URLs still accept
  submissions without registration or origin checks. The old key no longer grants
  permissions or selects recipients; supply them in the request body.
- The reserved `/forms/website/messages` alias still targets only
  `nielseninnovations` and accepts omitted recipients for compatibility. It rejects
  other usernames and returns 503 if that account is unavailable.
- The old `/contact` route remains a CSRF-protected homepage compatibility route;
  external websites should use the new public endpoint above.
- Existing messages remain in `konnect_messages`. Old `konnect_sources` records are
  unused and are not deleted automatically. Old allowlists and paused-form settings
  no longer affect delivery.

See the [API reference](../konnect-api.md) and
[OpenAPI contract](../konnect.openapi.yaml) for authenticated mailbox operations.
