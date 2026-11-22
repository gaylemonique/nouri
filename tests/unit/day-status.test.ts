import { describe, expect, it } from "vitest";
import { dayStatus, summarizeDays } from "@/domain/goals/day-status";

describe("dayStatus", () => {
  const target = 2000;
  it("uses a 10% band either side of the target", () => {
    expect(dayStatus({ calories: 1800, itemCount: 3 }, target)).toBe("in");
    expect(dayStatus({ calories: 2200, itemCount: 3 }, target)).toBe("in");
    expect(dayStatus({ calories: 1799, itemCount: 3 }, target)).toBe("under");
    expect(dayStatus({ calories: 2201, itemCount: 3 }, target)).toBe("over");
  });

  it("treats a day with nothing logged as not tracked", () => {
    expect(dayStatus({ calories: 0, itemCount: 0 }, target)).toBe("none");
  });
});

describe("summarizeDays", () => {
  it("averages and counts logged days only", () => {
    const s = summarizeDays(
      [
        { calories: 1900, itemCount: 4 },
        { calories: 0, itemCount: 0 },
        { calories: 2500, itemCount: 5 },
        { calories: 1000, itemCount: 1 },
      ],
      2000,
    );
    expect(s).toEqual({ logged: 3, average: 1800, within: 1, over: 1 });
  });

  it("has no average when nothing was logged", () => {
    expect(summarizeDays([{ calories: 0, itemCount: 0 }], 2000).average).toBeNull();
  });
});
