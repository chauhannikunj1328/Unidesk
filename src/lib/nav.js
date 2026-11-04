import { Building2, CalendarClock, Calculator, BookOpenCheck, Contact, CreditCard, FilePenLine, FolderOpen, Gift, LayoutDashboard, LayoutTemplate, Network, Plug, Receipt, ScrollText, SquareCheckBig, Users } from "lucide-react";

/** Sidebar navigation from 01-Hub/README.md. `roles` = who sees the item (omit = all staff roles). */
export const APPS = [
  { code: "PROPOSALS", label: "Proposals", href: "/proposals", icon: FilePenLine, dot: "var(--app-proposals)" },
  { code: "APPOINTMENT", label: "Appointment", href: "/appointment", icon: CalendarClock, dot: "var(--app-appointment)" },
  { code: "CRM", label: "CRM", href: "/crm", icon: SquareCheckBig, dot: "var(--app-crm)" },
  { code: "WORKDRIVE", label: "Workdrive", href: "/workdrive", icon: FolderOpen, dot: "var(--app-workdrive)" },
  { code: "SOP", label: "SOP", href: "/sop", icon: BookOpenCheck, dot: "var(--app-sop)" },
  { code: "INVOICING", label: "Invoicing", href: "/invoicing", icon: Receipt, dot: "var(--app-invoicing)" },
  { code: "ACCOUNTING", label: "Accounting", href: "/accounting", icon: Calculator, dot: "var(--app-accounting)" },
];

const ADMIN = ["OWNER", "ADMIN"];
const OVERVIEW = ["OWNER", "ADMIN", "MANAGER", "ACCOUNTANT"];

export const HUB_NAV = [
  { group: null, items: [{ label: "Dashboard", href: "/hub", icon: LayoutDashboard, exact: true, built: true }] },
  {
    group: "Organization",
    items: [
      { label: "Team", href: "/hub/team", icon: Users, built: true },
      { label: "Clients & projects", href: "/hub/clients", icon: Building2 },
      { label: "Contacts", href: "/hub/contacts", icon: Contact },
      { label: "Organization overview", href: "/hub/organization-overview", icon: Network, roles: OVERVIEW },
      { label: "Templates", href: "/hub/templates", icon: LayoutTemplate },
      { label: "Integrations", href: "/hub/integrations/organization", icon: Plug },
      { label: "Referrals", href: "/hub/referrals", icon: Gift },
      { label: "Billing", href: "/hub/billing", icon: CreditCard, roles: ADMIN },
    ],
  },
  { group: "Apps", apps: true },
  { group: "Monitoring", items: [{ label: "Audit log", href: "/hub/audit-log", icon: ScrollText, roles: ADMIN }] },
];

/** Hide pages whose flow is not built yet, so no link ever goes nowhere (UX rule 7). */
export const isBuilt = (item) => item.built === true;
