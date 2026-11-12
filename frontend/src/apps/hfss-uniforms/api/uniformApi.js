import { apiFetch } from "../../../api/http.js";
const BASE_PATH = "/hfssuniformsapp";

let csrfToken = "";
let preparing;

export async function uniformRequest(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  const isMutation = !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method);

  if (isMutation) {
    if (!csrfToken) await prepareUniformSession();
    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
    }
  }

  const response = await apiFetch(`${BASE_PATH}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });
  csrfToken = response.headers.get("X-CSRF-Token") || csrfToken;
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || "Request failed.");
    error.status = response.status;
    error.code = data.code || "";
    throw error;
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
  if (!preparing) {
    preparing = (async () => {
      const response = await apiFetch(`${BASE_PATH}/api/csrf-token`, {
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.csrfToken) {
        const error = new Error(
          data.error || "Unable to initialise the secure session.",
        );
        error.status = response.status;
        throw error;
      }
      csrfToken = data.csrfToken;
    })().finally(() => {
      preparing = undefined;
    });
  }
  return preparing;
}
