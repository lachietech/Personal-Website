// Dependency-free ES module for browsers and Node.js 18+.
// Configure recipients in application code, never from visitor-entered form fields.
export class KonnectError extends Error {
  constructor(message, { status = 0, retryAfter = null, deliveryUnknown = false } = {}) {
    super(message);
    this.name = "KonnectError";
    this.status = status;
    this.retryAfter = retryAfter;
    this.deliveryUnknown = deliveryUnknown;
  }
}

export function createKonnectClient({ endpoint, username, usernames, fetchImpl = globalThis.fetch } = {}) {
  const url = new URL(endpoint);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.hash || url.search) {
    throw new TypeError("Use an HTTP(S) Konnect endpoint without credentials, query or fragment");
  }
  if ((username === undefined) === (usernames === undefined)) {
    throw new TypeError("Configure username or usernames, not both");
  }
  const recipients = username === undefined ? usernames : [username];
  if (!Array.isArray(recipients) || recipients.length < 1 || recipients.length > 20 ||
      recipients.some((value) => typeof value !== "string" || !/^[a-z0-9._-]{3,32}$/i.test(value))) {
    throw new TypeError("Configure 1 to 20 valid portal usernames");
  }
  const normalized = [...new Set(recipients.map((value) => value.toLowerCase()))];
  const destination = username === undefined ? { usernames: normalized } : { username: normalized[0] };
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required");

  async function submit({ name, email, subject, message, website = "" } = {}) {
    let response;
    try {
      response = await fetchImpl(url.href, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...destination, name, email, subject, message, website }),
      });
    } catch {
      throw new KonnectError("Delivery could not be confirmed. Check your connection before trying again.", { deliveryUnknown: true });
    }
    const result = await response.json().catch(() => null);
    const rawRetryAfter = response.headers.get("retry-after");
    const retryAfter = rawRetryAfter && /^\d+$/.test(rawRetryAfter) ? Number(rawRetryAfter) : null;
    if (response.status !== 201 || result?.success !== true) {
      throw new KonnectError(
        typeof result?.error === "string" ? result.error : "Delivery could not be confirmed.",
        { status: response.status, retryAfter, deliveryUnknown: response.ok || response.status >= 500 },
      );
    }
    return { success: true, message: typeof result.message === "string" ? result.message : "Your message has been delivered." };
  }
  return { submit };
}
