/**
 * @file Tests for shift-click range selection behavior
 */

import { describe, it, expect } from "vitest";
import { sheetReducer, initialSheetState } from "./sheetReducer";
import { sheetActions } from "./sheetActions";
import type { SheetState, SelectionTarget, RangeSelectionTarget } from "./sheetReducer";

describe("Shift-click range selection", () => {
  it("should select from anchor to target cell when extending selection", () => {
    // Start with a single cell selected at (2, 3)
    let state: SheetState = {
      ...initialSheetState,
      selection: {
        kind: "cell",
        col: 2,
        row: 3,
      },
      selectionAnchor: { col: 2, row: 3 },
    };

    // Shift+click on cell (5, 7) should create range from (2,3) to (5,7)
    state = sheetReducer(state, sheetActions.extendSelectionToCell(5, 7));

    expect(state.selection).toEqual({
      kind: "range",
      startCol: 2,
      endCol: 6, // 5 + 1
      startRow: 3,
      endRow: 8, // 7 + 1
    } satisfies RangeSelectionTarget);
  });

  it("should keep the same anchor point for consecutive shift selections", () => {
    // Start with a single cell selected at (2, 3) - this is the anchor
    let state: SheetState = {
      ...initialSheetState,
      selection: {
        kind: "cell",
        col: 2,
        row: 3,
      },
      selectionAnchor: { col: 2, row: 3 },
    };

    // First shift+click: extend down to (2, 5)
    state = sheetReducer(state, sheetActions.extendSelectionToCell(2, 5));

    expect(state.selection).toEqual({
      kind: "range",
      startCol: 2,
      endCol: 3,
      startRow: 3,
      endRow: 6, // 5 + 1
    } satisfies RangeSelectionTarget);

    // Second shift+click: extend up to (2, 1) - should still use (2, 3) as anchor
    state = sheetReducer(state, sheetActions.extendSelectionToCell(2, 1));

    expect(state.selection).toEqual({
      kind: "range",
      startCol: 2,
      endCol: 3,
      startRow: 1, // Now includes row 1
      endRow: 4,   // Up to row 3 (anchor) + 1
    } satisfies RangeSelectionTarget);
  });

  it("should maintain anchor when extending selection in different directions", () => {
    // Start with anchor at (5, 5)
    let state: SheetState = {
      ...initialSheetState,
      selection: {
        kind: "cell",
        col: 5,
        row: 5,
      },
      selectionAnchor: { col: 5, row: 5 },
    };

    // Extend right and down to (8, 8)
    state = sheetReducer(state, sheetActions.extendSelectionToCell(8, 8));

    expect(state.selection).toEqual({
      kind: "range",
      startCol: 5,
      endCol: 9,
      startRow: 5,
      endRow: 9,
    } satisfies RangeSelectionTarget);

    // Extend left and up to (2, 2) - should still anchor at (5, 5)
    state = sheetReducer(state, sheetActions.extendSelectionToCell(2, 2));

    expect(state.selection).toEqual({
      kind: "range",
      startCol: 2,
      endCol: 6, // 5 + 1
      startRow: 2,
      endRow: 6, // 5 + 1
    } satisfies RangeSelectionTarget);

    // Extend to opposite corner (8, 2) - should still anchor at (5, 5)
    state = sheetReducer(state, sheetActions.extendSelectionToCell(8, 2));

    expect(state.selection).toEqual({
      kind: "range",
      startCol: 5,
      endCol: 9,
      startRow: 2,
      endRow: 6, // 5 + 1
    } satisfies RangeSelectionTarget);
  });

  it("should handle normal click resetting the anchor", () => {
    // Start with range selection
    let state: SheetState = {
      ...initialSheetState,
      selection: {
        kind: "range",
        startCol: 2,
        endCol: 6,
        startRow: 3,
        endRow: 8,
      },
      selectionAnchor: { col: 2, row: 3 },
    };

    // Normal click on (4, 4) should reset anchor
    state = sheetReducer(state, sheetActions.setActiveCell(4, 4));

    expect(state.selection).toEqual({
      kind: "cell",
      col: 4,
      row: 4,
    } satisfies SelectionTarget);

    // Now shift+click should use (4, 4) as the new anchor
    state = sheetReducer(state, sheetActions.extendSelectionToCell(7, 7));

    expect(state.selection).toEqual({
      kind: "range",
      startCol: 4,
      endCol: 8,
      startRow: 4,
      endRow: 8,
    } satisfies RangeSelectionTarget);
  });
});
