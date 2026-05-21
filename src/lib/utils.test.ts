import { describe, it, expect } from "vitest";
import { formatCurrency, getInitials } from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats positive numbers with dollar sign", () => {
    expect(formatCurrency(1000)).toBe("$1,000");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("formats decimals", () => {
    expect(formatCurrency(99.99)).toBe("$100");
  });

  it("formats large numbers", () => {
    expect(formatCurrency(1000000)).toBe("$1,000,000");
  });
});

describe("getInitials", () => {
  it("returns initials for full name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("returns single initial for single name", () => {
    expect(getInitials("John")).toBe("J");
  });

  it("handles empty string", () => {
    expect(getInitials("")).toBe("");
  });

  it("handles multiple words", () => {
    expect(getInitials("John William Doe")).toBe("JW");
  });
});
