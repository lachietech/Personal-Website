export function isAuthenticated(req, res, next) {
  if (req.session.logged_in && req.session.app === "meandersuite")
    return next();
  return res.redirect("/meandersuite/login");
}

export function requireApiAuthentication(req, res, next) {
  if (req.session.logged_in && req.session.app === "meandersuite")
    return next();
  return res.status(401).json({ error: "Please sign in to continue" });
}
