/**
 * @file Cell component for rendering individual spreadsheet cells.
 */

import type { CSSProperties, ReactElement } from "react";
import type { Cell as CellType } from "../types";
import type { CellStyle } from "../modules/spreadsheet/cellStyle";
import { useFormulaEngine } from "../modules/formula/FormulaEngineContext";
import { resolveStyle } from "../modules/spreadsheet/styleResolver";
import { useSheetContext } from "../modules/spreadsheet/SheetContext";
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
 * @param props - Component props
 * @returns Cell component
 */
export const Cell = ({ cell, col, row, style, selected = false }: CellProps): ReactElement => {
  const { sheet, state } = useSheetContext();
  const { styleRegistry } = state;
  const formulaEngine = useFormulaEngine();

  const displayValue = resolveCellDisplayValue(cell, sheet.id, col, row, formulaEngine);
  const cellType = cell?.type ?? null;
  const isEmpty = !cell;
  const cellId = cell?.id ?? null;

  // Resolve style for this cell
  const cellStyle: CellStyle = resolveStyle(styleRegistry, col, row);

  // Merge position/size style with cell style
  const mergedStyle: CSSProperties = {
    ...style,
    ...cellStyle,
  };

  return (
    <div
      className={styles.cell}
      style={mergedStyle}
      role="gridcell"
      tabIndex={0}
      data-selected={selected}
      data-empty={isEmpty}
      data-type={cellType}
      data-cell-id={cellId}
    >
      {displayValue}
    </div>
  );
};
