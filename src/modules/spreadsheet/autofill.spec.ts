/**
 * @file Tests for spreadsheet autofill utilities.
 */

import type { SelectionRange } from "./sheetReducer";
import type { Sheet } from "../../types";
import { computeAutofillUpdates, deriveFillHandlePreview } from "./autofill";

const createSheet = (cells: Array<{ col: number; row: number; value: string | number }>): Sheet => {
  const cellEntries = cells.map(({ col, row, value }) => {
    const id = `${col}:${row}` as const;
    return [id, { id, x: col, y: row, type: typeof value === "number" ? "number" : "string", value }] as const;
  });
  return {
    name: "Test",
    id: "sheet-1",
    cells: Object.fromEntries(cellEntries),
  } satisfies Sheet;
};

const singleCellRange = (col: number, row: number): SelectionRange => {
  return {
    startCol: col,
    endCol: col + 1,
    startRow: row,
    endRow: row + 1,
  };
};

describe("deriveFillHandlePreview", () => {
  it("returns null when pointer stays inside the base range", () => {
    const range: SelectionRange = { startCol: 2, endCol: 4, startRow: 5, endRow: 7 };
    expect(deriveFillHandlePreview(range, { col: 3, row: 6 })).toBeNull();
  });

  it("detects downward extension", () => {
    const range: SelectionRange = { startCol: 0, endCol: 1, startRow: 0, endRow: 1 };
    const preview = deriveFillHandlePreview(range, { col: 0, row: 3 });
    expect(preview).not.toBeNull();
    expect(preview?.direction).toBe("down");
    expect(preview?.range.endRow).toBe(4);
  });
});

describe("computeAutofillUpdates", () => {
  it("increments numeric values when extending downward", () => {
    const sheet = createSheet([{ col: 0, row: 0, value: 1 }]);
    const baseRange = singleCellRange(0, 0);
    const targetRange: SelectionRange = { startCol: 0, endCol: 1, startRow: 0, endRow: 4 };

    const updates = computeAutofillUpdates({
      baseRange,
      targetRange,
      direction: "down",
      sheet,
    });

    expect(updates).toEqual([
      { col: 0, row: 1, value: "2" },
      { col: 0, row: 2, value: "3" },
      { col: 0, row: 3, value: "4" },
    ]);
  });

  it("decrements numeric values when extending left", () => {
    const sheet = createSheet([
      { col: 2, row: 0, value: 3 },
      { col: 3, row: 0, value: 4 },
    ]);
    const baseRange: SelectionRange = { startCol: 2, endCol: 4, startRow: 0, endRow: 1 };
    const targetRange: SelectionRange = { startCol: 0, endCol: 4, startRow: 0, endRow: 1 };

    const updates = computeAutofillUpdates({
      baseRange,
      targetRange,
      direction: "left",
      sheet,
    });

    expect(updates).toEqual([
      { col: 1, row: 0, value: "2" },
      { col: 0, row: 0, value: "1" },
    ]);
  });

  it("repeats string patterns when extending to the right", () => {
    const sheet = createSheet([
      { col: 0, row: 0, value: "A" },
      { col: 1, row: 0, value: "B" },
    ]);
    const baseRange: SelectionRange = { startCol: 0, endCol: 2, startRow: 0, endRow: 1 };
    const targetRange: SelectionRange = { startCol: 0, endCol: 4, startRow: 0, endRow: 1 };

    const updates = computeAutofillUpdates({
      baseRange,
      targetRange,
      direction: "right",
      sheet,
    });

    expect(updates).toEqual([
      { col: 2, row: 0, value: "A" },
      { col: 3, row: 0, value: "B" },
    ]);
  });
});
