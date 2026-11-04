/** Pure list helpers shared by all three Team screens, so counts and rows always agree (HUB-01). */

/** @typedef {{ role?: string, status?: string, group?: string, q?: string, manager?: string }} TeamFilters */

export function matchesFilters(member, { role, status, group, q, manager } = {}) {
  if (role && member.role.toLowerCase() !== role.toLowerCase()) return false;
  if (status && member.status.toLowerCase() !== status.toLowerCase()) return false;
  if (group === "staff" && member.role === "CLIENT") return false;
  if (group === "admins" && !["OWNER", "ADMIN"].includes(member.role)) return false;
  if (manager && member.reportsToId !== manager) return false;
  if (q) {
    const needle = q.trim().toLowerCase();
    if (needle && !(member.name.toLowerCase().includes(needle) || member.email.toLowerCase().includes(needle))) return false;
  }
  return true;
}

export const filterMembers = (members, filters) => members.filter((m) => matchesFilters(m, filters));

export function roleCounts(members) {
  const counts = { all: members.length };
  for (const m of members) counts[m.role] = (counts[m.role] ?? 0) + 1;
  return counts;
}

export function statusCounts(members) {
  const counts = { all: members.length };
  for (const m of members) counts[m.status] = (counts[m.status] ?? 0) + 1;
  return counts;
}

/** Everyone below `id` in the reporting tree, so "Reports to" can never create a loop. */
export function descendantIds(members, id) {
  const out = new Set();
  const walk = (parent) => {
    for (const m of members) {
      if (m.reportsToId === parent && !out.has(m.id)) {
        out.add(m.id);
        walk(m.id);
      }
    }
  };
  walk(id);
  return out;
}
