let csrfToken = "";

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  const response = await fetch("/csrf-token", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to start a secure session.");
  csrfToken = (await response.json()).csrfToken;
  return csrfToken;
}

export async function meanderRequest(path, options = {}) {
  const requestOptions = {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
  };
  if (
    requestOptions.method &&
    !["GET", "HEAD"].includes(requestOptions.method.toUpperCase())
  ) {
    requestOptions.headers = {
      ...requestOptions.headers,
      "X-CSRF-Token": await getCsrfToken(),
    };
  }
  const response = await fetch(`/meandersuite${path}`, requestOptions);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : { error: await response.text() };
  if (!response.ok)
    throw new Error(body.error || body.message || "Request failed.");
  return body;
}
