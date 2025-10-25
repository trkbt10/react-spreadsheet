/**
 * @file Row header component for spreadsheet.
 */

import type { ReactElement } from "react";
import { useMemo, useCallback } from "react";
import type { RowSizeMap } from "../../modules/spreadsheet/gridLayout";
import { calculateRowPosition } from "../../modules/spreadsheet/gridLayout";
import { rowIndexToLabel } from "../../utils/columnLabel";
import styles from "./RowHeader.module.css";

export type RowHeaderProps = {
  viewportTop: number;
  viewportHeight: number;
  defaultCellHeight: number;
  rowSizes: RowSizeMap;
  visibleStartRow: number;
  visibleEndRow: number;
  onResizeStart: (row: number, clientY: number) => void;
};

/**
 * Renders row headers with resize handles.
 * @param props - Component props
 * @returns RowHeader component
 */
export const RowHeader = ({
  viewportTop,
  viewportHeight,
  defaultCellHeight,
  rowSizes,
  visibleStartRow,
  visibleEndRow,
  onResizeStart,
}: RowHeaderProps): ReactElement => {
  const rows = useMemo(() => {
    const result: Array<{ row: number; y: number; height: number; label: string }> = [];

    for (let row = visibleStartRow; row < visibleEndRow; row++) {
      const y = calculateRowPosition(row, defaultCellHeight, rowSizes);
      const customHeight = rowSizes.get(row);
      const height = customHeight === undefined ? defaultCellHeight : customHeight;
      const label = rowIndexToLabel(row);

      result.push({ row, y, height, label });
    }

    return result;
  }, [visibleStartRow, visibleEndRow, defaultCellHeight, rowSizes]);

  const handleResizeMouseDown = useCallback(
    (row: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onResizeStart(row, e.clientY);
    },
    [onResizeStart],
  );

  return (
    <div className={styles.rowHeaderContainer}>
      {rows.map(({ row, y, height, label }) => {
        return (
          <div
            key={row}
            className={styles.rowHeader}
            style={{
              top: y - viewportTop,
              height,
            }}
          >
            <span className={styles.label}>{label}</span>
            <div
              className={styles.resizeHandle}
              onMouseDown={(e) => {
                return handleResizeMouseDown(row, e);
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
