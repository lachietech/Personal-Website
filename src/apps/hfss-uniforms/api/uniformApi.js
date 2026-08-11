const BASE_PATH = "/hfssuniformsapp";

function readCookie(name) {
  const cookie = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : "";
}

export async function uniformRequest(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  const isMutation = !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method);

  if (isMutation) {
    const csrfToken = readCookie("uniform_shop_csrf_token");
    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
    }
  }

  const response = await fetch(`${BASE_PATH}${path}`, {
    ...options,
    method,
    headers,
    credentials: "same-origin",
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

export function uniformMoney(value) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(Number(value || 0));
}

export async function prepareUniformSession() {
  await fetch(`${BASE_PATH}/api/csrf-token`, {
    credentials: "same-origin",
    cache: "no-store",
  });
}
