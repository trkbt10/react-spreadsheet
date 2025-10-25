/**
 * @file Cell component for rendering individual spreadsheet cells.
 */

import type { CSSProperties, ReactElement } from "react";
import type { Cell as CellType } from "../types";
import styles from "./Cell.module.css";

export type CellProps = {
  cell: CellType | null;
  style?: CSSProperties;
  selected?: boolean;
};

/**
 * Determines the display value for a cell.
 * @param cell - Cell to get display value for
 * @returns Display value string
 */
const getCellDisplayValue = (cell: CellType | null): string => {
  if (!cell) {
    return "";
  }
  if (cell.type === "formula" && cell.formula) {
    return `=${cell.formula}`;
  }
  if (cell.value === null) {
    return "null";
  }
  return String(cell.value);
};

/**
 * Renders a single spreadsheet cell with type-appropriate formatting.
 * @param props - Component props
 * @returns Cell component
 */
export const Cell = ({ cell, style, selected = false }: CellProps): ReactElement => {
  const displayValue = getCellDisplayValue(cell);
  const cellType = cell?.type ?? null;
  const isEmpty = !cell;
  const cellId = cell?.id ?? null;

  return (
    <div
      className={styles.cell}
      style={style}
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
