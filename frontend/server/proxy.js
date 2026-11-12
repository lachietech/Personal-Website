import http from "node:http";
import https from "node:https";

export function isApiPath(pathname) {
  pathname = pathname.replace(/\/$/, "");
  return (
    pathname === "/csrf-token" ||
    pathname === "/contact" ||
    /^\/(?:clientportal|hfssuniformsapp|meandersuite)\/api(?:\/|$)/.test(
      pathname,
    )
  );
}

const hopHeaders = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

function endToEndHeaders(headers) {
  const result = { ...headers };
  const connectionHeaders = String(headers.connection || "").split(",");
  for (const name of [...hopHeaders, ...connectionHeaders]) {
    delete result[name.trim().toLowerCase()];
  }
  return result;
}

export function createApiProxy(backendUrl) {
  const target = new URL(backendUrl);
  if (
    !["http:", "https:"].includes(target.protocol) ||
    target.username ||
    target.password ||
    target.pathname !== "/" ||
    target.search ||
    target.hash
  ) {
    throw new Error(
      "BACKEND_URL must be an HTTP(S) origin without credentials or a path",
    );
  }
  const transport = target.protocol === "https:" ? https : http;

  return (req, res, next) => {
    if (!isApiPath(req.path)) return next();
    const headers = endToEndHeaders(req.headers);
    // Replace forwarded headers so clients cannot spoof their address or scheme.
    for (const name of Object.keys(headers)) {
      if (name === "forwarded" || name.startsWith("x-forwarded-"))
        delete headers[name];
    }
    headers.host = target.host;
    headers["x-forwarded-for"] = req.ip;
    headers["x-forwarded-proto"] = req.protocol;
    headers["x-forwarded-host"] = req.get("host");

    const upstream = transport.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        method: req.method,
        path: req.originalUrl,
        headers,
      },
      (response) => {
        res.writeHead(response.statusCode, endToEndHeaders(response.headers));
        response.on("error", () => res.destroy());
        response.pipe(res);
      },
    );
    upstream.setTimeout(30_000, () =>
      upstream.destroy(new Error("Backend timeout")),
    );
    upstream.on("error", () => {
      if (res.headersSent) return res.destroy();
      res
        .status(502)
        .json({
          error: "The service is temporarily unavailable. Please try again.",
        });
    });
    req.on("aborted", () => upstream.destroy());
    res.on("close", () => {
      if (!res.writableFinished) upstream.destroy();
    });
    // Stream uploads and downloads without parsing or changing cookies or bodies.
    req.pipe(upstream);
  };
}
