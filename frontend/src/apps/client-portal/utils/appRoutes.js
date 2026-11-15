import { pagePath } from "../../../pagePath.js";
import { productBrands } from "../../../components/productBrands.js";

export const portalApps = [
  {
    id: "billing",
    href: "/clientportal/billing",
    label: "Client portal",
    kind: "Clients & payments",
    icon: "bi-receipt",
    description: "Clients, invoices and payment settings in one workspace.",
    detail: "Keep client accounts and payments together.",
  },
  {
    id: "projects",
    href: "/clientportal/projects",
    label: "Projects",
    kind: "Portfolio",
    icon: "bi-kanban",
    description: "Manage your website projects and GitHub imports.",
    detail: "Keep your published work up to date.",
    adminOnly: true,
  },
  {
    id: "konnect",
    href: "/clientportal/konnect",
    label: "Konnect Mailbox",
    kind: "Communications",
    icon: productBrands.konnect.icon,
    description: "Contact enquiries, delivered to your inbox.",
    detail: "A home for every new conversation.",
  },
  {
    id: "visitpulse",
    href: "/clientportal/visitpulse",
    label: "VisitPulse Analytics",
    kind: "Insights",
    icon: productBrands.visitpulse.icon,
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
  const pathname = typeof value === "string" ? pagePath(value) : "";
  return allowedPaths.has(pathname) ? pathname : "/clientportal";
}
