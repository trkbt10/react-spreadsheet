/**
 * @file Typed actions for sheet state management.
 */

import { createAction } from "../../utils/typedActions";

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
} as const;
