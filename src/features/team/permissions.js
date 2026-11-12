/** Who can do what on the Team pages (04, 06, 07). Pure, so the server and every theme agree and tests are simple. */

/** @typedef {{ membershipId: string, role: string }} Viewer */

export const canEditMember = (viewer, member) =>
  ["OWNER", "ADMIN"].includes(viewer.role) || (viewer.role === "MANAGER" && member.reportsToId === viewer.membershipId);

export const canOpenMember = (viewer, member) => ["OWNER", "ADMIN", "MANAGER"].includes(viewer.role) || member.id === viewer.membershipId;

/** Role and manager changes are owner and admin only. */
export const canEditRoles = (viewer) => ["OWNER", "ADMIN"].includes(viewer.role);

export const canSeeAccessTab = (viewer) => ["OWNER", "ADMIN", "MANAGER"].includes(viewer.role);

/** Recent activity comes from the audit log: owners and admins read all of it; everyone else only their own and, for managers, their reports'. */
export const canSeeActivity = (viewer, member) =>
  ["OWNER", "ADMIN"].includes(viewer.role) || member.id === viewer.membershipId || (viewer.role === "MANAGER" && member.reportsToId === viewer.membershipId);

/** Owners and admins see every pending invite; managers the ones they sent. Nobody else has the tab. */
export const canSeeInvitesTab = (viewer) => ["OWNER", "ADMIN", "MANAGER"].includes(viewer.role);

/** Shared data (which apps read contacts, clients and projects) is for owners and admins only. */
export const canSeeSharedDataTab = (viewer) => ["OWNER", "ADMIN"].includes(viewer.role);
