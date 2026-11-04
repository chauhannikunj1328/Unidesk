import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney } from "@/lib/money";

describe("money", () => {
  it("formats whole cents", () => {
    expect(formatMoney(123456)).toBe("$1,234.56");
    expect(formatMoney(0)).toBe("$0.00");
  });
  it("refuses fractional cents", () => {
    expect(() => formatMoney(10.5)).toThrow();
  });
  it("parses typed amounts into cents without float errors", () => {
    expect(parseMoney("12.34")).toBe(1234);
    expect(parseMoney("$1,234.5")).toBe(123450);
    expect(parseMoney("0.07")).toBe(7);
    expect(parseMoney("19.99")).toBe(1999);
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("1.234")).toBeNull();
  });
});
