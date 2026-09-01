import { describe, expect, it } from "vitest";
import {
  avgCompletionTime,
  computeCompletionRate,
  formatDate,
  isDueToday,
  isOverdue,
} from "../src/lib/utils";

describe("isOverdue", () => {
  it("is true for past due uncompleted tasks", () => {
    expect(isOverdue("todo", "2020-01-01")).toBe(true);
    expect(isOverdue("in_progress", "2020-01-01")).toBe(true);
  });
  it("is false for completed or cancelled tasks regardless of date", () => {
    expect(isOverdue("completed", "2020-01-01")).toBe(false);
    expect(isOverdue("cancelled", "2020-01-01")).toBe(false);
  });
  it("is false for future or null due dates", () => {
    expect(isOverdue("todo", "2999-01-01")).toBe(false);
    expect(isOverdue("todo", null)).toBe(false);
  });
});

describe("isDueToday", () => {
  it("returns false for null", () => {
    expect(isDueToday(null)).toBe(false);
  });
  it("returns true for today", () => {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(isDueToday(iso)).toBe(true);
  });
});

describe("computeCompletionRate", () => {
  it("computes percentage", () => {
    expect(computeCompletionRate(4, 2)).toBe(50);
  });
  it("returns 0 when nothing assigned", () => {
    expect(computeCompletionRate(0, 0)).toBe(0);
  });
});

describe("avgCompletionTime", () => {
  it("formats days and hours", () => {
    const oneDay = 24 * 60 * 60 * 1000;
    expect(avgCompletionTime([oneDay])).toBe("1d");
    expect(avgCompletionTime([3 * oneDay, oneDay])).toBe("2d");
    expect(avgCompletionTime([30 * 60 * 1000])).toBe("0.5h");
  });
  it("returns null for empty array", () => {
    expect(avgCompletionTime([])).toBeNull();
  });
});

describe("formatDate", () => {
  it("handles null-ish values", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });
  it("formats a date", () => {
    const out = formatDate("2026-09-02T00:00:00Z");
    expect(out).toContain("Sep");
  });
});