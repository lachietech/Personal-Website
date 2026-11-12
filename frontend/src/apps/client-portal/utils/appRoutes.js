export const portalApps = [
  {
    id: "billing",
    href: "/clientportal/billing",
    label: "Billing",
    icon: "bi-receipt",
    description: "Invoices, payments and business finances.",
    detail: "Keep every account in order.",
  },
  {
    id: "konnect",
    href: "/clientportal/konnect",
    label: "Konnect Mailbox",
    icon: "bi-inbox",
    description: "Contact enquiries, delivered to your inbox.",
    detail: "A home for every new conversation.",
  },
  {
    id: "visitpulse",
    href: "/clientportal/visitpulse",
    label: "VisitPulse Analytics",
    icon: "bi-graph-up-arrow",
    description: "Website traffic and visitor insights.",
    detail: "Understand the people behind the visits.",
  },
];
const allowedPaths = new Set([
  "/clientportal",
  "/clientportal/account",
  ...portalApps.map((app) => app.href),
]);
export function portalDestination(value) {
  return allowedPaths.has(value) ? value : "/clientportal";
}
