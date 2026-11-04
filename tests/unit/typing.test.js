import { describe, expect, it } from "vitest";
import { ECHO_WINDOW_MS, shouldTakeFromUrl } from "@/lib/typing";

describe("shouldTakeFromUrl", () => {
  it("ignores the URL while the person is typing (the URL is only echoing what they typed)", () => {
    expect(shouldTakeFromUrl(10_000, 10_000 + 50)).toBe(false);
    expect(shouldTakeFromUrl(10_000, 10_000 + ECHO_WINDOW_MS - 1)).toBe(false);
  });
  it("takes the URL once typing has stopped (back button, Clear filters)", () => {
    expect(shouldTakeFromUrl(10_000, 10_000 + ECHO_WINDOW_MS)).toBe(true);
    expect(shouldTakeFromUrl(0, 5_000_000)).toBe(true); // never typed
  });
});
