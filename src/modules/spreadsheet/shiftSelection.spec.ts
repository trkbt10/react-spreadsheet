/// <reference types="vitest" />

/**
 * @file Tests for shift-click range selection behavior
 */

import { sheetReducer, initialSheetState } from "./sheetReducer";
import { sheetActions } from "./sheetActions";
import type { SheetState, SelectionTarget, RangeSelectionTarget } from "./sheetReducer";

describe("Shift-click range selection", () => {
  it("should select from anchor to target cell when extending selection", () => {
    // Start with a single cell selected at (2, 3)
    const initialState: SheetState = {
      ...initialSheetState,
      selection: {
        kind: "cell",
        col: 2,
        row: 3,
      },
      selectionAnchor: { col: 2, row: 3 },
    };

    const extendedState = sheetReducer(initialState, sheetActions.extendSelectionToCell(5, 7));

    expect(extendedState.selection).toEqual({
      kind: "range",
      startCol: 2,
      endCol: 6, // 5 + 1
      startRow: 3,
      endRow: 8, // 7 + 1
    } satisfies RangeSelectionTarget);
  });

  it("should keep the same anchor point for consecutive shift selections", () => {
    // Start with a single cell selected at (2, 3) - this is the anchor
    const initialState: SheetState = {
      ...initialSheetState,
      selection: {
        kind: "cell",
        col: 2,
        row: 3,
      },
      selectionAnchor: { col: 2, row: 3 },
    };

    // First shift+click: extend down to (2, 5)
    const firstExtension = sheetReducer(initialState, sheetActions.extendSelectionToCell(2, 5));

    expect(firstExtension.selection).toEqual({
      kind: "range",
      startCol: 2,
      endCol: 3,
      startRow: 3,
      endRow: 6, // 5 + 1
    } satisfies RangeSelectionTarget);

    // Second shift+click: extend up to (2, 1) - should still use (2, 3) as anchor
    const secondExtension = sheetReducer(firstExtension, sheetActions.extendSelectionToCell(2, 1));

    expect(secondExtension.selection).toEqual({
      kind: "range",
      startCol: 2,
      endCol: 3,
      startRow: 1, // Now includes row 1
      endRow: 4, // Up to row 3 (anchor) + 1
    } satisfies RangeSelectionTarget);
  });

  it("should maintain anchor when extending selection in different directions", () => {
    // Start with anchor at (5, 5)
    const initialState: SheetState = {
      ...initialSheetState,
      selection: {
        kind: "cell",
        col: 5,
        row: 5,
      },
      selectionAnchor: { col: 5, row: 5 },
    };

    // Extend right and down to (8, 8)
    const firstExtension = sheetReducer(initialState, sheetActions.extendSelectionToCell(8, 8));

    expect(firstExtension.selection).toEqual({
      kind: "range",
      startCol: 5,
      endCol: 9,
      startRow: 5,
      endRow: 9,
    } satisfies RangeSelectionTarget);

    // Extend left and up to (2, 2) - should still anchor at (5, 5)
    const secondExtension = sheetReducer(firstExtension, sheetActions.extendSelectionToCell(2, 2));

    expect(secondExtension.selection).toEqual({
      kind: "range",
      startCol: 2,
      endCol: 6, // 5 + 1
      startRow: 2,
      endRow: 6, // 5 + 1
    } satisfies RangeSelectionTarget);

    // Extend to opposite corner (8, 2) - should still anchor at (5, 5)
    const thirdExtension = sheetReducer(secondExtension, sheetActions.extendSelectionToCell(8, 2));

    expect(thirdExtension.selection).toEqual({
      kind: "range",
      startCol: 5,
      endCol: 9,
      startRow: 2,
      endRow: 6, // 5 + 1
    } satisfies RangeSelectionTarget);
  });

  it("should handle normal click resetting the anchor", () => {
    // Start with range selection
    const initialState: SheetState = {
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
    const afterClick = sheetReducer(initialState, sheetActions.setActiveCell(4, 4));

    expect(afterClick.selection).toEqual({
      kind: "cell",
      col: 4,
      row: 4,
    } satisfies SelectionTarget);

    // Now shift+click should use (4, 4) as the new anchor
    const extendedState = sheetReducer(afterClick, sheetActions.extendSelectionToCell(7, 7));

    expect(extendedState.selection).toEqual({
      kind: "range",
      startCol: 4,
      endCol: 8,
      startRow: 4,
      endRow: 8,
    } satisfies RangeSelectionTarget);
  });
});
