import path from "node:path";

const notFoundDocument = path.resolve(
  import.meta.dirname,
  "../../../public/404.html",
);
const serverErrorDocument = path.resolve(
  import.meta.dirname,
  "../../../public/500.html",
);

function isApiRequest(req) {
  return (
    req.path === "/csrf-token" ||
    /(?:^|\/)api(?:\/|$)/.test(req.path) ||
    req.accepts(["html", "json"]) === "json"
  );
}

export function notFoundHandler(req, res) {
  if (isApiRequest(req)) {
    return res.status(404).json({ error: "Endpoint not found" });
  }
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  return res.status(404).sendFile(notFoundDocument);
}

export function errorHandler(error, req, res, _next) {
  console.error("Unhandled request error:", {
    method: req.method,
    path: req.originalUrl,
    message: error?.message || "Unknown error",
  });

  if (res.headersSent) return;

  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body contains invalid JSON" });
  }
  if (error?.code === "EBADCSRFTOKEN" || error?.code === "INVALID_CSRF_TOKEN") {
    return res.status(403).json({ error: "Security token is invalid or expired" });
  }
  if (isApiRequest(req)) {
    return res.status(500).json({ error: "The request could not be completed" });
  }
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  return res.status(500).sendFile(serverErrorDocument);
}
