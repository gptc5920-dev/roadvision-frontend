import { describe, expect, it } from "vitest";
import { formatDuration, formatPercent, titleCase } from "./format";

describe("format helpers", () => {
  it("formats playback duration", () =>
    expect(formatDuration(125.9)).toBe("2:05"));
  it("formats missing percentages safely", () =>
    expect(formatPercent(null)).toBe("—"));
  it("humanizes status labels", () =>
    expect(titleCase("in-progress")).toBe("In Progress"));
});
