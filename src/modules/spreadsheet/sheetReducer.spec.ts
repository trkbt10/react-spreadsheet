/**
 * @file Unit tests for sheetReducer commit and pending update behaviour.
 */

import { sheetReducer, initialSheetState } from "./sheetReducer";
import { sheetActions } from "./sheetActions";
import type { EditingSelection, SheetState } from "./sheetReducer";

const createStateWithEditingSelection = (selection: EditingSelection): SheetState => ({
  ...initialSheetState,
  editingSelection: selection,
  editorActivity: {
    formulaBar: selection.kind === "range" ? true : false,
    cellEditor: selection.kind === "cell",
  },
});

describe("sheetReducer.commitEdit", () => {
  it("records pending updates for dirty single-cell edits", () => {
    const state = createStateWithEditingSelection({
      kind: "cell",
      col: 2,
      row: 3,
      value: "hello",
      isDirty: true,
    });

    const nextState = sheetReducer(state, sheetActions.commitEdit());

    expect(nextState.pendingUpdates).toEqual([{ col: 2, row: 3, value: "hello" }]);
    expect(nextState.optimisticUpdates).toEqual([{ col: 2, row: 3, value: "hello" }]);
    expect(nextState.editingSelection).toBeNull();
    expect(nextState.editorActivity).toEqual({ formulaBar: false, cellEditor: false });
  });

  it("skips creating updates for untouched edits while still clearing editor state", () => {
    const state = createStateWithEditingSelection({
      kind: "cell",
      col: 0,
      row: 0,
      value: "unchanged",
      isDirty: false,
    });

    const nextState = sheetReducer(state, sheetActions.commitEdit());

    expect(nextState.pendingUpdates).toEqual([]);
    expect(nextState.optimisticUpdates).toEqual([]);
    expect(nextState.editingSelection).toBeNull();
  });

  it("allows explicit range commits without an editing selection", () => {
    const state = {
      ...initialSheetState,
      pendingUpdates: [],
    };

    const range = {
      startCol: 1,
      startRow: 1,
      endCol: 3,
      endRow: 2,
    } as const;

    const nextState = sheetReducer(state, sheetActions.commitEdit("ok", range));

    expect(nextState.pendingUpdates).toEqual([
      { col: 1, row: 1, value: "ok" },
      { col: 2, row: 1, value: "ok" },
    ]);
    expect(nextState.optimisticUpdates).toEqual([
      { col: 1, row: 1, value: "ok" },
      { col: 2, row: 1, value: "ok" },
    ]);
    expect(nextState.editingSelection).toBeNull();
  });
});

describe("sheetReducer.clearPendingUpdates", () => {
  it("clears pending updates when requested", () => {
    const state: SheetState = {
      ...initialSheetState,
      pendingUpdates: [{ col: 0, row: 0, value: "value" }],
      optimisticUpdates: [{ col: 0, row: 0, value: "value" }],
    };

    const nextState = sheetReducer(state, sheetActions.clearPendingUpdates());

    expect(nextState.pendingUpdates).toEqual([]);
    expect(nextState.optimisticUpdates).toEqual([{ col: 0, row: 0, value: "value" }]);
  });
});

describe("sheetReducer optimistic update helpers", () => {
  it("records optimistic updates without duplicating identical values", () => {
    const baseState: SheetState = {
      ...initialSheetState,
      optimisticUpdates: [{ col: 1, row: 1, value: "first" }],
    };

    const nextState = sheetReducer(
      baseState,
      sheetActions.recordOptimisticUpdates([
        { col: 1, row: 1, value: "first" },
        { col: 2, row: 2, value: "second" },
      ]),
    );

    expect(nextState.optimisticUpdates).toEqual([
      { col: 1, row: 1, value: "first" },
      { col: 2, row: 2, value: "second" },
    ]);
  });

  it("removes optimistic updates by cell coordinate", () => {
    const baseState: SheetState = {
      ...initialSheetState,
      optimisticUpdates: [
        { col: 0, row: 0, value: "keep" },
        { col: 1, row: 1, value: "remove" },
      ],
    };

    const nextState = sheetReducer(
      baseState,
      sheetActions.removeOptimisticUpdates([{ col: 1, row: 1, value: "" }]),
    );

    expect(nextState.optimisticUpdates).toEqual([{ col: 0, row: 0, value: "keep" }]);
  });
});

/**
 * Notes:
 * - Referenced src/modules/spreadsheet/SheetContext.tsx to mirror the pendingUpdates contract verified here.
 * - Consulted src/modules/spreadsheet/selectionUtils.ts to align range iteration with helper expectations.
 */
