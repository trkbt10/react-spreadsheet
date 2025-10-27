/**
 * @file Tests for formula analysis helpers.
 */

import { parseTopLevelFunction } from "./analysis";

describe("parseTopLevelFunction", () => {
  it("parses top-level function name and arguments", () => {
    const result = parseTopLevelFunction("=SUM(A1:B2, C3)", { start: 6, end: 6 });
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("Failed to parse formula");
    }
    expect(result.name).toBe("SUM");
    expect(result.arguments).toHaveLength(2);
    expect(result.arguments[0]?.text).toBe("A1:B2");
    expect(result.arguments[1]?.text).toBe("C3");
  });

  it("tracks active argument index based on caret position", () => {
    const caret = { start: 12, end: 12 }; // inside second argument
    const result = parseTopLevelFunction("=IF(A1>0, SUM(B1:B5), 0)", caret);
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("Failed to parse formula");
    }
    expect(result.name).toBe("IF");
    expect(result.arguments).toHaveLength(3);
    expect(result.activeArgumentIndex).toBe(1);
    expect(result.arguments[1]?.text).toBe("SUM(B1:B5)");
  });

  it("handles incomplete argument lists", () => {
    const result = parseTopLevelFunction("=SUM(", { start: 5, end: 5 });
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("Failed to parse formula");
    }
    expect(result.name).toBe("SUM");
    expect(result.arguments).toHaveLength(0);
    expect(result.activeArgumentIndex).toBeNull();
  });
});
