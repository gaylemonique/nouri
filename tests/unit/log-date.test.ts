import { describe, expect, it } from "vitest";
import { parseLogDate, toLogDate } from "@/utils/format";

describe("log dates", () => {
  it("formats the local calendar day, not UTC", () => {
    // 00:30 local on 21 Nov is still 20 Nov in UTC for any zone east of UTC.
    expect(toLogDate(new Date(2026, 10, 21, 0, 30))).toBe("2026-11-21");
    expect(toLogDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("parses only real dates", () => {
    expect(parseLogDate("2026-11-20")?.getDate()).toBe(20);
    expect(parseLogDate("2026-02-30")).toBeNull();
    expect(parseLogDate("20-11-2026")).toBeNull();
    expect(parseLogDate(null)).toBeNull();
  });
});
