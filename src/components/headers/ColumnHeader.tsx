/**
 * @file Column header component for spreadsheet.
 */

import type { ReactElement } from "react";
import { useMemo, useCallback } from "react";
import type { ColumnSizeMap } from "../../modules/spreadsheet/gridLayout";
import { calculateColumnPosition } from "../../modules/spreadsheet/gridLayout";
import { columnIndexToLabel } from "../../utils/columnLabel";
import styles from "./ColumnHeader.module.css";

export type ColumnHeaderProps = {
  viewportLeft: number;
  viewportWidth: number;
  defaultCellWidth: number;
  columnSizes: ColumnSizeMap;
  visibleStartCol: number;
  visibleEndCol: number;
  onResizeStart: (col: number, clientX: number) => void;
};

/**
 * Renders column headers with resize handles.
 * @param props - Component props
 * @returns ColumnHeader component
 */
export const ColumnHeader = ({
  viewportLeft,
  viewportWidth,
  defaultCellWidth,
  columnSizes,
  visibleStartCol,
  visibleEndCol,
  onResizeStart,
}: ColumnHeaderProps): ReactElement => {
  const columns = useMemo(() => {
    const result: Array<{ col: number; x: number; width: number; label: string }> = [];

    for (let col = visibleStartCol; col < visibleEndCol; col++) {
      const x = calculateColumnPosition(col, defaultCellWidth, columnSizes);
      const customWidth = columnSizes.get(col);
      const width = customWidth === undefined ? defaultCellWidth : customWidth;
      const label = columnIndexToLabel(col);

      result.push({ col, x, width, label });
    }

    return result;
  }, [visibleStartCol, visibleEndCol, defaultCellWidth, columnSizes]);

  const handleResizeMouseDown = useCallback(
    (col: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onResizeStart(col, e.clientX);
    },
    [onResizeStart],
  );

  return (
    <div className={styles.columnHeaderContainer}>
      {columns.map(({ col, x, width, label }) => {
        return (
          <div
            key={col}
            className={styles.columnHeader}
            style={{
              left: x - viewportLeft,
              width,
            }}
          >
            <span className={styles.label}>{label}</span>
            <div
              className={styles.resizeHandle}
              onMouseDown={(e) => {
                return handleResizeMouseDown(col, e);
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
