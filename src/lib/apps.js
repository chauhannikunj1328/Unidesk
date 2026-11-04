/** The seven apps: plain data, no React. Icons live in components/shell/app-icons.js. */
export const APP_LIST = [
  { code: "PROPOSALS", label: "Proposals", description: "Proposals and e-signatures", href: "/proposals", dot: "var(--app-proposals)", hex: "#F59E0B" },
  { code: "APPOINTMENT", label: "Appointment", description: "Booking and scheduling", href: "/appointment", dot: "var(--app-appointment)", hex: "#06B6D4" },
  { code: "CRM", label: "CRM", description: "Tasks, projects and time", href: "/crm", dot: "var(--app-crm)", hex: "#8B5CF6" },
  { code: "WORKDRIVE", label: "Workdrive", description: "Documents and compliance", href: "/workdrive", dot: "var(--app-workdrive)", hex: "#10B981" },
  { code: "SOP", label: "SOP", description: "Process guides", href: "/sop", dot: "var(--app-sop)", hex: "#EC4899" },
  { code: "INVOICING", label: "Invoicing", description: "Invoices and payments", href: "/invoicing", dot: "var(--app-invoicing)", hex: "#3B82F6" },
  { code: "ACCOUNTING", label: "Accounting", description: "Bookkeeping and reports", href: "/accounting", dot: "var(--app-accounting)", hex: "#EF4444" },
];

export const APP_CODES = APP_LIST.map((a) => a.code);
export const appByCode = (code) => APP_LIST.find((a) => a.code === code);

/** Apps a Client can be given (client portal views only). 07-team-app-access-matrix.md */
export const CLIENT_APPS = ["WORKDRIVE", "PROPOSALS", "INVOICING", "APPOINTMENT"];
