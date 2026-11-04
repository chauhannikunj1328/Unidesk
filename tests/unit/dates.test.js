import { describe, expect, it } from "vitest";
import { daysAgo, formatDate, formatRelative, formatTime } from "@/lib/dates";

const now = new Date("2026-11-03T18:00:00Z"); // 1 pm ET

describe("dates", () => {
  it("uses one format: 3 Nov 2026", () => {
    expect(formatDate("2026-11-03T18:00:00Z")).toBe("3 Nov 2026");
  });
  it("shows the zone when asked", () => {
    expect(formatTime("2026-11-03T14:40:00Z", "America/New_York", true)).toMatch(/9:40 AM E[SD]T/);
  });
  it("describes recent activity in plain words", () => {
    expect(formatRelative("2026-11-03T14:40:00Z", now)).toBe("Today, 9:40 AM");
    expect(formatRelative("2026-11-02T15:00:00Z", now)).toBe("Yesterday");
    expect(formatRelative("2026-10-31T15:00:00Z", now)).toBe("3 days ago");
    expect(formatRelative("2026-10-27T15:00:00Z", now)).toBe("Last week");
    expect(formatRelative("2026-09-01T15:00:00Z", now)).toBe("1 Sep 2026");
    expect(formatRelative(null, now)).toBe("");
  });
  it("says how long ago something was sent", () => {
    expect(daysAgo("2026-11-01T15:00:00Z", now)).toBe("2 days ago");
    expect(daysAgo("2026-11-03T15:00:00Z", now)).toBe("today");
  });
});
