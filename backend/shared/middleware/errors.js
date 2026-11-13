export function notFoundHandler(_req, res) {
  return res.status(404).json({ error: "Endpoint not found" });
}

export function errorHandler(error, req, res, next) {
  console.error("Unhandled request error:", {
    method: req.method,
    path: req.originalUrl,
    message: error?.message || "Unknown error",
  });

  if (res.headersSent) return next(error);

  if (error?.type === "entity.parse.failed") {
    return res
      .status(400)
      .json({ error: "Request body contains invalid JSON" });
  }
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large" });
  }
  if (error?.code === "EBADCSRFTOKEN" || error?.code === "INVALID_CSRF_TOKEN") {
    return res
      .status(403)
      .json({ error: "Security token is invalid or expired" });
  }
  return res.status(500).json({ error: "The request could not be completed" });
}
