/// <reference types="vitest" />

/**
 * @file Tests for selection state helper functions
 */

import {
  createCellSelection,
  createRangeSelection,
  extendSelection,
  clearSelection,
  createRangeSelectionWithoutAnchor,
} from "./selectionState";
import type { CellSelectionTarget, RangeSelectionTarget } from "./sheetReducer";

describe("Selection state helpers", () => {
  describe("createCellSelection", () => {
    it("should create a cell selection with anchor", () => {
      const state = createCellSelection(3, 5);

      expect(state.selection).toEqual({
        kind: "cell",
        col: 3,
        row: 5,
      } satisfies CellSelectionTarget);
      expect(state.anchor).toEqual({ col: 3, row: 5 });
    });
  });

  describe("createRangeSelection", () => {
    it("should create a range selection with anchor at start", () => {
      const state = createRangeSelection(2, 5, 3, 7);

      expect(state.selection).toEqual({
        kind: "range",
        startCol: 2,
        endCol: 5,
        startRow: 3,
        endRow: 7,
      } satisfies RangeSelectionTarget);
      expect(state.anchor).toEqual({ col: 2, row: 3 });
    });
  });

  describe("extendSelection", () => {
    it("should extend from cell to range", () => {
      const currentState = createCellSelection(3, 3);
      const newState = extendSelection(currentState, 6, 8);

      expect(newState.selection).toEqual({
        kind: "range",
        startCol: 3,
        endCol: 7,
        startRow: 3,
        endRow: 9,
      } satisfies RangeSelectionTarget);
      expect(newState.anchor).toEqual({ col: 3, row: 3 });
    });

    it("should maintain anchor when extending multiple times", () => {
      const initialState = createCellSelection(5, 5);
      const firstExtension = extendSelection(initialState, 8, 8);
      expect(firstExtension.anchor).toEqual({ col: 5, row: 5 });

      const secondExtension = extendSelection(firstExtension, 2, 2);
      expect(secondExtension.anchor).toEqual({ col: 5, row: 5 });
      expect(secondExtension.selection).toEqual({
        kind: "range",
        startCol: 2,
        endCol: 6,
        startRow: 2,
        endRow: 6,
      } satisfies RangeSelectionTarget);
    });

    it("should return cell selection when extending to anchor position", () => {
      const state = createCellSelection(5, 5);
      const newState = extendSelection(state, 5, 5);

      expect(newState.selection).toEqual({
        kind: "cell",
        col: 5,
        row: 5,
      } satisfies CellSelectionTarget);
      expect(newState.anchor).toEqual({ col: 5, row: 5 });
    });

    it("should create new cell selection when no anchor exists", () => {
      const currentState = clearSelection();
      const newState = extendSelection(currentState, 4, 6);

      expect(newState.selection).toEqual({
        kind: "cell",
        col: 4,
        row: 6,
      } satisfies CellSelectionTarget);
      expect(newState.anchor).toEqual({ col: 4, row: 6 });
    });
  });

  describe("clearSelection", () => {
    it("should clear selection and anchor", () => {
      const state = clearSelection();

      expect(state.selection).toBeNull();
      expect(state.anchor).toBeNull();
    });
  });

  describe("createRangeSelectionWithoutAnchor", () => {
    it("should create range selection without anchor", () => {
      const state = createRangeSelectionWithoutAnchor(0, 10, 5, 6);

      expect(state.selection).toEqual({
        kind: "range",
        startCol: 0,
        endCol: 10,
        startRow: 5,
        endRow: 6,
      } satisfies RangeSelectionTarget);
      expect(state.anchor).toBeNull();
    });
  });
});
