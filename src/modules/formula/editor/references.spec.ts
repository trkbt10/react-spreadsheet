/**
 * @file Tests for formula reference utilities.
 */

import { parseReferenceToCellRange, formatReferenceFromRange } from "./references";

describe("parseReferenceToCellRange", () => {
  it("parses single cell references", () => {
    const result = parseReferenceToCellRange("A1");
    expect(result).not.toBeNull();
    expect(result?.range).toEqual({ startCol: 0, startRow: 0, endCol: 1, endRow: 1 });
    expect(result?.sheetName).toBeNull();
  });

    it("parses quoted sheet range references", () => {
    const result = parseReferenceToCellRange("'Sheet 2'!B3:D5");
    expect(result).not.toBeNull();
    expect(result?.sheetName).toBe("Sheet 2");
    expect(result?.range).toEqual({ startCol: 1, startRow: 2, endCol: 4, endRow: 5 });
  });
});

describe("formatReferenceFromRange", () => {
  it("formats single cell references without sheet name", () => {
    const reference = formatReferenceFromRange(
      { startCol: 2, startRow: 3, endCol: 3, endRow: 4 },
      null,
    );
    expect(reference).toBe("C4");
  });

  it("formats range references with sheet prefix", () => {
    const reference = formatReferenceFromRange(
      { startCol: 0, startRow: 0, endCol: 2, endRow: 3 },
      "Data Sheet",
    );
    expect(reference).toBe("'Data Sheet'!A1:B3");
  });
});
