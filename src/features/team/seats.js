import { ALL_APPS } from "./constants";

/**
 * The one rule for seats (07-Data-and-Permissions.md): a person uses one seat in each app they can open; Clients do not
 * use seats; removed people do not. The owner can open every app whether or not rows exist for them.
 * Used by the Team screens (numbers shown) and by changeAppAccess (limit enforced), so the two always agree.
 * @param {{ role: string, status: string, apps: string[] }[]} people  status in any case
 */
export function seatUsage(people) {
  const billable = people.filter((p) => p.role !== "CLIENT" && p.status.toLowerCase() !== "inactive");
  const perApp = Object.fromEntries(
    ALL_APPS.map((a) => [a, billable.filter((p) => p.role === "OWNER" || p.apps.includes(a)).length])
  );
  return { perApp, people: billable.length };
}
