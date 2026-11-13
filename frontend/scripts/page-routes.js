// Every browser route must exist in the static build. Do not rely on hosting
// dashboard rewrites: existing Render sites do not automatically apply them.
export const pageRoutes = {
  "/clientportal": "clientportal.html",
  "/clientportal/login": "clientportal.html",
  "/clientportal/account": "clientportal.html",
  "/clientportal/admin": "clientportal.html",
  "/clientportal/client": "clientportal.html",
  "/clientportal/billing": "billing.html",
  "/clientportal/projects": "projects.html",
  "/clientportal/konnect": "konnect.html",
  "/clientportal/visitpulse": "visitpulse.html",
  "/meandersuite": "meander-suite.html",
  "/meandersuite/login": "meander-suite.html",
  "/meandersuite/register": "meander-suite.html",
  "/meandersuite/suite": "meander-suite.html",
  "/hfssuniformsapp/signin": "hfss-uniforms.html",
  "/hfssuniformsapp/dashboard": "hfss-uniforms.html",
  "/hfssuniformsapp/sales-records": "hfss-uniforms.html",
  "/hfssuniformsapp/pos": "hfss-uniforms.html",
  "/hfssuniformsapp/receipts": "hfss-uniforms.html",
  "/hfssuniformsapp/stock-manager": "hfss-uniforms.html",
  "/hfssuniformsapp/access-management": "hfss-uniforms.html",
  "/hfssuniformsapp/account": "hfss-uniforms.html",
};

export const pageRedirects = {
  "/hfssuniformsapp": "/hfssuniformsapp/dashboard",
  "/hfssuniformsapp/monthly-update": "/hfssuniformsapp/sales-records",
};
