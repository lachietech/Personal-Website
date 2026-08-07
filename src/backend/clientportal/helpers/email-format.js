export function money(value) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD"
  }).format(value || 0);
}

export function escapeEmailHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function portalUrl(pathname = "") {
  const origin = process.env.PUBLIC_SITE_URL
    || process.env.SITE_URL
    || "https://nielseninnovations.com";
  return `${origin.replace(/\/$/, "")}/clientportal${pathname}`;
}
