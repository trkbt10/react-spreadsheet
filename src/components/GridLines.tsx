/**
 * @file GridLines component for rendering grid background with SVG.
 */

import type { ReactElement } from "react";
import { useMemo } from "react";
import type { ColumnSizeMap, RowSizeMap } from "../modules/spreadsheet/gridLayout";
import {
  calculateColumnPosition,
  calculateRowPosition,
  findColumnAtPosition,
  findRowAtPosition,
} from "../modules/spreadsheet/gridLayout";
import styles from "./GridLines.module.css";

export type GridLinesProps = {
  viewportTop: number;
  viewportLeft: number;
  viewportWidth: number;
  viewportHeight: number;
  defaultCellWidth: number;
  defaultCellHeight: number;
  columnSizes: ColumnSizeMap;
  rowSizes: RowSizeMap;
  maxColumns: number;
  maxRows: number;
};

/**
 * Renders grid lines as SVG background.
 * This avoids rendering borders on individual cells for better performance.
 * @param props - Component props
 * @returns GridLines component
 */
export const GridLines = ({
  viewportTop,
  viewportLeft,
  viewportWidth,
  viewportHeight,
  defaultCellWidth,
  defaultCellHeight,
  columnSizes,
  rowSizes,
  maxColumns,
  maxRows,
}: GridLinesProps): ReactElement => {
  const lines = useMemo(() => {
    const verticalLines: { x: number; key: string }[] = [];
    const horizontalLines: { y: number; key: string }[] = [];

    const startCol = findColumnAtPosition(viewportLeft, defaultCellWidth, columnSizes, maxColumns);
    const endCol = findColumnAtPosition(viewportLeft + viewportWidth, defaultCellWidth, columnSizes, maxColumns) + 1;

    const startRow = findRowAtPosition(viewportTop, defaultCellHeight, rowSizes, maxRows);
    const endRow = findRowAtPosition(viewportTop + viewportHeight, defaultCellHeight, rowSizes, maxRows) + 1;

    // Generate vertical lines (column separators)
    for (let col = startCol; col <= Math.min(endCol, maxColumns); col++) {
      const x = calculateColumnPosition(col, defaultCellWidth, columnSizes);
      verticalLines.push({
        x: x - viewportLeft,
        key: `v-${col}`,
      });
    }

    // Generate horizontal lines (row separators)
    for (let row = startRow; row <= Math.min(endRow, maxRows); row++) {
      const y = calculateRowPosition(row, defaultCellHeight, rowSizes);
      horizontalLines.push({
        y: y - viewportTop,
        key: `h-${row}`,
      });
    }

    return { verticalLines, horizontalLines };
  }, [
    viewportTop,
    viewportLeft,
    viewportWidth,
    viewportHeight,
    defaultCellWidth,
    defaultCellHeight,
    columnSizes,
    rowSizes,
    maxColumns,
    maxRows,
  ]);

  if (viewportWidth === 0 || viewportHeight === 0) {
    return <svg className={styles.gridLines} />;
  }

  return (
    <svg
      className={styles.gridLines}
      width={viewportWidth}
      height={viewportHeight}
      viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
    >
      {lines.verticalLines.map((line) => {
        return <line key={line.key} x1={line.x} y1={0} x2={line.x} y2={viewportHeight} className={styles.gridLine} />;
      })}
      {lines.horizontalLines.map((line) => {
        return <line key={line.key} x1={0} y1={line.y} x2={viewportWidth} y2={line.y} className={styles.gridLine} />;
      })}
    </svg>
  );
};
