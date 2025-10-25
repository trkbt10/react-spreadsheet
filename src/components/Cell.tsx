/**
 * @file Cell component for rendering individual spreadsheet cells.
 */

import type { CSSProperties, ReactElement } from "react";
import type { Cell as CellType } from "../types";
import type { CellStyle } from "../modules/spreadsheet/cellStyle";
import { useFormulaEngine } from "../modules/formula/FormulaEngineContext";
import { resolveStyle } from "../modules/spreadsheet/styleResolver";
import { useSheetContext } from "../modules/spreadsheet/SheetContext";
import { getSelectionAnchor } from "../modules/spreadsheet/selectionUtils";
import styles from "./Cell.module.css";

export type CellProps = {
  cell: CellType | undefined;
  col: number;
  row: number;
  style?: CSSProperties;
  selected?: boolean;
};

/**
 * Resolves the display value for a cell, handling formulas.
 * @param cell - Cell to resolve
 * @param sheetId - Sheet ID
 * @param col - Column index
 * @param row - Row index
 * @param formulaEngine - Formula engine instance
 * @returns Display value string
 */
const resolveCellDisplayValue = (
  cell: CellType | undefined,
  sheetId: string,
  col: number,
  row: number,
  formulaEngine: ReturnType<typeof useFormulaEngine>,
): string => {
  if (!cell) {
    return "";
  }

  try {
    const computedValue = formulaEngine.resolveCellValueByCoords(sheetId, col, row);
    return computedValue === null ? "null" : String(computedValue);
  } catch {
    return "#ERROR";
  }
};

/**
 * Renders a single spreadsheet cell with type-appropriate formatting, formula resolution, and style application.
 * Note: Cell interaction (click, double-click) is handled by the Sheet component via pointer events.
 * @param props - Component props
 * @returns Cell component
 */
export const Cell = ({ cell, col, row, style, selected = false }: CellProps): ReactElement => {
  const { sheet, state } = useSheetContext();
  const { styleRegistry, selection, editingSelection } = state;
  const formulaEngine = useFormulaEngine();

  const displayValue = resolveCellDisplayValue(cell, sheet.id, col, row, formulaEngine);
  const cellType = cell?.type ?? null;
  const isEmpty = !cell;
  const cellId = cell?.id ?? null;

  const selectionAnchor = selection ? getSelectionAnchor(selection) : null;
  const editingAnchor = editingSelection ? getSelectionAnchor(editingSelection) : null;

  const isActive = selectionAnchor?.col === col && selectionAnchor?.row === row;
  const isEditing = editingAnchor?.col === col && editingAnchor?.row === row;

  // Resolve style for this cell
  const cellStyle: CellStyle = resolveStyle(styleRegistry, col, row);

  // Merge position/size style with cell style
  const mergedStyle: CSSProperties = {
    ...style,
    ...cellStyle,
  };

  // Hide cell content when editing
  if (isEditing) {
    return (
      <div
        className={styles.cell}
        style={mergedStyle}
        role="gridcell"
        data-selected={selected}
        data-empty={isEmpty}
        data-type={cellType}
        data-cell-id={cellId}
        data-active={isActive}
        data-col={col}
        data-row={row}
      />
    );
  }

  return (
    <div
      className={styles.cell}
      style={mergedStyle}
      role="gridcell"
      data-selected={selected}
      data-empty={isEmpty}
      data-type={cellType}
      data-cell-id={cellId}
      data-active={isActive}
      data-col={col}
      data-row={row}
    >
      {displayValue}
    </div>
  );
};
