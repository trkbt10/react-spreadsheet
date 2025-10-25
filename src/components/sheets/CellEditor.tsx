/**
 * @file CellEditor component for inline cell editing.
 */

import { useCallback, useEffect, useRef } from "react";
import type { ReactElement, KeyboardEvent, ChangeEvent } from "react";
import { useVirtualScrollContext } from "../scrollarea/VirtualScrollContext";
import { useSheetContext } from "../../modules/spreadsheet/SheetContext";
import { calculateColumnPosition, calculateRowPosition } from "../../modules/spreadsheet/gridLayout";
import styles from "./CellEditor.module.css";

const HEADER_ROW_HEIGHT = 24;
const HEADER_COLUMN_WIDTH = 48;

/**
 * CellEditor component for inline cell editing.
 * @returns CellEditor component or null if not editing
 */
export const CellEditor = (): ReactElement | null => {
  const { viewportRect } = useVirtualScrollContext();
  const { state, actions, onCellsUpdate } = useSheetContext();
  const { editingCell, columnSizes, rowSizes, defaultCellWidth, defaultCellHeight } = state;
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      actions.updateEditingValue(event.target.value);
    },
    [actions],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (editingCell && onCellsUpdate) {
          const { value, range } = editingCell;
          if (range) {
            // Apply to all cells in range
            const updates: Array<{ col: number; row: number; value: string }> = [];
            for (let row = range.startRow; row < range.endRow; row++) {
              for (let col = range.startCol; col < range.endCol; col++) {
                updates.push({ col, row, value });
              }
            }
            onCellsUpdate(updates);
          } else {
            // Apply to single cell
            onCellsUpdate([{ col: editingCell.col, row: editingCell.row, value }]);
          }
        }
        actions.commitEdit();
      } else if (event.key === "Escape") {
        event.preventDefault();
        actions.cancelEdit();
      }
    },
    [actions, editingCell, onCellsUpdate],
  );

  const handleBlur = useCallback(() => {
    if (editingCell && onCellsUpdate) {
      const { value, range } = editingCell;
      if (range) {
        // Apply to all cells in range
        const updates: Array<{ col: number; row: number; value: string }> = [];
        for (let row = range.startRow; row < range.endRow; row++) {
          for (let col = range.startCol; col < range.endCol; col++) {
            updates.push({ col, row, value });
          }
        }
        onCellsUpdate(updates);
      } else {
        // Apply to single cell
        onCellsUpdate([{ col: editingCell.col, row: editingCell.row, value }]);
      }
    }
    actions.commitEdit();
  }, [actions, editingCell, onCellsUpdate]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  if (!editingCell) {
    return null;
  }

  const { col, row, value, range } = editingCell;

  const x = calculateColumnPosition(col, defaultCellWidth, columnSizes);
  const y = calculateRowPosition(row, defaultCellHeight, rowSizes);

  const customWidth = columnSizes.get(col);
  const width = customWidth === undefined ? defaultCellWidth : customWidth;
  const customHeight = rowSizes.get(row);
  const height = customHeight === undefined ? defaultCellHeight : customHeight;

  const isFormula = value.startsWith("=");
  const isRangeEdit = range !== null && range !== undefined;
  const placeholder = isRangeEdit ? "Edit all cells in range" : "";

  return (
    <div
      className={styles.editor}
      style={{
        left: x - viewportRect.left + HEADER_COLUMN_WIDTH,
        top: y - viewportRect.top + HEADER_ROW_HEIGHT,
        width,
        height,
      }}
    >
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        data-is-formula={isFormula}
        placeholder={placeholder}
      />
    </div>
  );
};
