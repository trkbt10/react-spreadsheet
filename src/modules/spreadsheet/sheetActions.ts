/**
 * @file Typed actions for sheet state management.
 */

import { createAction } from "../../utils/typedActions";
import type { StyleTarget, CellStyle, StyleKey } from "./cellStyle";

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
} as const;
