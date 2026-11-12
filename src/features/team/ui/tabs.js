import { canSeeInvitesTab, canSeeSharedDataTab } from "../permissions";
import { rolesTabCount } from "../roles-rules";

/**
 * The Team tabs, the same on every Team page so the counts always agree. Glass keeps App access inside each person's
 * panel, so it has People, Invites and Shared data only.
 */
export function teamTabs({ theme, viewer, team, canAccess }) {
  return [
    { href: "/hub/team", label: "People", count: team.members.length },
    ...(theme !== "glass" && canAccess ? [{ href: "/hub/team/access", label: "App access" }] : []),
    ...(canSeeInvitesTab(viewer) ? [{ href: "/hub/team/invites", label: "Invites", count: team.pendingInvites }] : []),
    // Pastel shows roles as a drawer from a pill on the People page, so it has no Roles tab.
    ...(theme !== "pastel" ? [{ href: "/hub/team/roles", label: "Roles", count: rolesTabCount }] : []),
    ...(canSeeSharedDataTab(viewer) ? [{ href: "/hub/team/shared-data", label: "Shared data" }] : []),
  ];
}
