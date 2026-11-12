export const PRODUCTION_API_ORIGIN =
  "https://personal-website-53mf.onrender.com";

export function resolveApiOrigin(value, production = false) {
  if (!value) return production ? PRODUCTION_API_ORIGIN : "";
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (production && url.protocol !== "https:")
  ) {
    throw new Error(
      "VITE_API_URL must be an HTTPS API origin without a path or credentials (HTTP is allowed locally).",
    );
  }
  return url.origin;
}

const origin = resolveApiOrigin(
  import.meta.env?.VITE_API_URL,
  import.meta.env?.MODE === "production",
);
export function apiUrl(path) {
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//")
  )
    throw new Error("API paths must begin with a single slash");
  return origin + path;
}
export function apiFetch(path, options = {}) {
  return fetch(apiUrl(path), {
    ...options,
    credentials: options.credentials === "omit" ? "omit" : "include",
  });
}
