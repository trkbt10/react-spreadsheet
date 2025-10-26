/**
 * @file Typed actions for sheet state management.
 */

import { createAction } from "../../utils/typedActions";
import type { StyleTarget, CellStyle, StyleKey } from "./cellStyle";
import type { EditingOrigin } from "./sheetReducer";

export const sheetActions = {
  setColumnWidth: createAction("sheet/setColumnWidth", (col: number, width: number) => ({ col, width })),
  setRowHeight: createAction("sheet/setRowHeight", (row: number, height: number) => ({ row, height })),
  startRectSelection: createAction(
    "sheet/startRectSelection",
    (x: number, y: number) => ({ x, y }),
  ),
  updateRectSelection: createAction(
    "sheet/updateRectSelection",
    (x: number, y: number) => ({ x, y }),
  ),
  endRectSelection: createAction("sheet/endRectSelection"),
  clearSelection: createAction("sheet/clearSelection"),
  selectRow: createAction("sheet/selectRow", (row: number) => ({ row })),
  selectColumn: createAction("sheet/selectColumn", (col: number) => ({ col })),
  selectSheet: createAction("sheet/selectSheet"),
  applyStyle: createAction(
    "sheet/applyStyle",
    (target: StyleTarget, style: CellStyle) => ({ target, style }),
  ),
  removeStyle: createAction(
    "sheet/removeStyle",
    (key: StyleKey) => ({ key }),
  ),
  clearAllStyles: createAction("sheet/clearAllStyles"),
  startEditingCell: createAction(
    "sheet/startEditingCell",
    (col: number, row: number, initialValue: string, origin: EditingOrigin) => ({ col, row, initialValue, origin }),
  ),
  startEditingRange: createAction(
    "sheet/startEditingRange",
    (
      range: { startCol: number; startRow: number; endCol: number; endRow: number },
      initialValue: string,
      origin: EditingOrigin,
    ) => ({ range, initialValue, origin }),
  ),
  updateEditingValue: createAction(
    "sheet/updateEditingValue",
    (value: string) => ({ value }),
  ),
  commitEdit: createAction("sheet/commitEdit", (value?: string, range?: { startCol: number; startRow: number; endCol: number; endRow: number } | null) => ({ value, range })),
  cancelEdit: createAction("sheet/cancelEdit"),
  setActiveCell: createAction(
    "sheet/setActiveCell",
    (col: number, row: number) => ({ col, row }),
  ),
  clearActiveCell: createAction("sheet/clearActiveCell"),
  extendSelectionToCell: createAction(
    "sheet/extendSelectionToCell",
    (col: number, row: number) => ({ col, row }),
  ),
} as const;
