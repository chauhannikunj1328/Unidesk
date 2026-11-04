import { describe, expect, it } from "vitest";
import { descendantIds, filterMembers, roleCounts, statusCounts } from "@/features/team/filters";

const people = [
  { id: "p", name: "Paul Smith", email: "demo@unidesk.com", role: "OWNER", status: "active", reportsToId: null },
  { id: "m", name: "Maya Chen", email: "maya@x.com", role: "ADMIN", status: "active", reportsToId: "p" },
  { id: "s", name: "Sofia Alvarez", email: "sofia@x.com", role: "MANAGER", status: "active", reportsToId: "m" },
  { id: "u", name: "Sumit Okafor", email: "sumit@x.com", role: "MEMBER", status: "active", reportsToId: "s" },
  { id: "j", name: "Jordan Lee", email: "jordan@n.com", role: "CLIENT", status: "active", reportsToId: "s" },
  { id: "l", name: "Lena Fischer", email: "lena@x.com", role: "MEMBER", status: "invited", reportsToId: "s" },
];

describe("team filters", () => {
  it("search matches name and email, case-insensitively", () => {
    expect(filterMembers(people, { q: "SOFIA" }).map((m) => m.id)).toEqual(["s"]);
    expect(filterMembers(people, { q: "jordan@n" }).map((m) => m.id)).toEqual(["j"]);
  });
  it("filters by role, status and group", () => {
    expect(filterMembers(people, { role: "member" }).map((m) => m.id)).toEqual(["u", "l"]);
    expect(filterMembers(people, { status: "invited" }).map((m) => m.id)).toEqual(["l"]);
    expect(filterMembers(people, { group: "staff" })).toHaveLength(5);
    expect(filterMembers(people, { group: "admins" }).map((m) => m.id)).toEqual(["p", "m"]);
  });
  it("tile counts equal the rows each filter returns (one source of truth)", () => {
    const counts = roleCounts(people);
    for (const role of ["OWNER", "ADMIN", "MANAGER", "MEMBER", "CLIENT"]) {
      expect(counts[role]).toBe(filterMembers(people, { role }).length);
    }
    expect(statusCounts(people).invited).toBe(filterMembers(people, { status: "invited" }).length);
    expect(counts.all).toBe(filterMembers(people, {}).length);
  });
  it("finds everyone below a person so reporting loops can be blocked", () => {
    expect([...descendantIds(people, "m")].sort()).toEqual(["j", "l", "s", "u"]);
    expect([...descendantIds(people, "u")]).toEqual([]);
  });
});
