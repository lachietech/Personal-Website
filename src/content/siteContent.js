export const navigationItems = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Pricing", href: "#pricing" },
  { label: "Work", href: "#portfolio" },
];

export const aboutValues = [
  {
    title: "Think broadly",
    description: "Explore the real problem before reaching for a solution.",
  },
  {
    title: "Build thoughtfully",
    description: "Create clear, maintainable experiences with purpose.",
  },
  {
    title: "Keep improving",
    description: "Learn from feedback and evolve the product over time.",
  },
];

export const services = [
  {
    icon: "bi-code-slash",
    title: "Full-stack development",
    description:
      "Responsive websites and custom applications, from polished front ends to dependable backend systems.",
    tags: ["JavaScript", "Node.js", "Python"],
  },
  {
    icon: "bi-bezier2",
    title: "Product & interface design",
    description:
      "Clear information architecture and intuitive interfaces that make complex workflows feel simple.",
    tags: ["UI/UX", "Prototyping", "Accessibility"],
  },
  {
    icon: "bi-cpu",
    title: "AI exploration",
    description:
      "Thoughtful AI integration and research grounded in genuine product value.",
    tags: ["Integration", "Research", "Responsible AI"],
  },
  {
    icon: "bi-cloud-check",
    title: "Hosting & ongoing support",
    description:
      "Managed hosting, maintenance, technical support, and practical improvements after launch.",
    tags: ["Hosting", "Maintenance", "Support"],
  },
];

export const hostingPlans = [
  {
    icon: "bi-box",
    label: "Hosting 01",
    title: "Basic assisted",
    price: "$40",
    features: [
      "Technical support",
      "Maintenance",
      "Email forms",
      "Database & web hosting",
    ],
  },
  {
    icon: "bi-layers",
    label: "Hosting 02",
    title: "Standard assisted",
    price: "$90",
    popular: true,
    features: [
      "Technical support",
      "Audits & maintenance",
      "Database hosting",
      "Email server & web hosting",
    ],
  },
  {
    icon: "bi-stack",
    label: "Hosting 03",
    title: "Advanced assisted",
    price: "$120",
    features: [
      "Technical support",
      "Audits & maintenance",
      "Database & email server",
      "Increased usage limits",
    ],
  },
];
