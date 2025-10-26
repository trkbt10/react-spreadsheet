/**
 * @file Unit tests for showcase sample evaluation helpers.
 */

import { evaluateSample, formatSampleValue } from "./evaluateSample";

describe("evaluateSample", () => {
  it("evaluates eager functions with numeric arguments", () => {
    expect(evaluateSample("SUM(1, 2, 3)")).toBe("6");
  });

  it("evaluates lazy functions that rely on comparator helpers", () => {
    expect(evaluateSample('IF(10 > 5, "Yes", "No")')).toBe("Yes");
  });

  it("reports unsupported references as errors", () => {
    expect(evaluateSample("SUM(A1)")).toMatch(/^Error: Sample evaluation does not support cell references/);
  });
});

describe("formatSampleValue", () => {
  it("formats nested arrays recursively", () => {
    expect(formatSampleValue([[1, 2], [3, 4]])).toBe("[[1, 2], [3, 4]]");
  });

  it("formats booleans with spreadsheet semantics", () => {
    expect(formatSampleValue(true)).toBe("TRUE");
    expect(formatSampleValue(false)).toBe("FALSE");
  });
});
