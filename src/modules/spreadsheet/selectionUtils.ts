import type { SelectionRange, SelectionTarget, EditingSelection } from "./sheetReducer";
import { selectionToRange } from "./sheetReducer";

export const getSelectionAnchor = (selection: SelectionTarget | EditingSelection): { col: number; row: number } => {
  if (selection.kind === "cell") {
    return { col: selection.col, row: selection.row };
  }
  return { col: selection.startCol, row: selection.startRow };
};

export const createUpdatesFromRange = (range: SelectionRange, value: string) => {
  const rowIndexes = Array.from({ length: range.endRow - range.startRow }, (_, index) => range.startRow + index);
  return rowIndexes.flatMap((row) => {
    const colIndexes = Array.from({ length: range.endCol - range.startCol }, (__, index) => range.startCol + index);
    return colIndexes.map((col) => ({ col, row, value }));
  });
};

export const createUpdatesFromSelection = (selection: SelectionTarget | EditingSelection, value: string) => {
  if (selection.kind === "cell") {
    return [{ col: selection.col, row: selection.row, value }];
  }
  return createUpdatesFromRange(selectionToRange(selection), value);
};
