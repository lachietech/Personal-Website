// Static hosts can serve a clean path, a directory index or an explicit HTML
// document. Treat all three as the same application route.
export function pagePath(pathname) {
  return (
    pathname
      .replace(/\/index\.html$/, "/")
      .replace(/\.html$/, "")
      .replace(/\/+$/, "") || "/"
  );
}
