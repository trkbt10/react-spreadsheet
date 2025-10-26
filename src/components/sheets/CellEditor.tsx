/**
 * @file CellEditor component for inline cell editing.
 */

import { useCallback, useEffect, useRef } from "react";
import type { ReactElement, KeyboardEvent, ChangeEvent } from "react";
import { useVirtualScrollContext } from "../scrollarea/VirtualScrollContext";
import { useSheetContext } from "../../modules/spreadsheet/SheetContext";
import { calculateColumnPosition, calculateRowPosition } from "../../modules/spreadsheet/gridLayout";
import { getSelectionAnchor, createUpdatesFromSelection } from "../../modules/spreadsheet/selectionUtils";
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
  const { editingSelection, columnSizes, rowSizes, defaultCellWidth, defaultCellHeight } = state;
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
        if (editingSelection?.isDirty && onCellsUpdate) {
          const updates = createUpdatesFromSelection(editingSelection, editingSelection.value);
          onCellsUpdate(updates);
        }
        actions.commitEdit();
      } else if (event.key === "Escape") {
        event.preventDefault();
        actions.cancelEdit();
      }
    },
    [actions, editingSelection, onCellsUpdate],
  );

  const handleBlur = useCallback(() => {
    if (editingSelection?.isDirty && onCellsUpdate) {
      const updates = createUpdatesFromSelection(editingSelection, editingSelection.value);
      onCellsUpdate(updates);
    }
    actions.commitEdit();
  }, [actions, editingSelection, onCellsUpdate]);

  useEffect(() => {
    const input = inputRef.current;
    if (!editingSelection || !input) {
      return;
    }

    input.focus({ preventScroll: true });

    if (!editingSelection.isDirty) {
      input.select();
      return;
    }

    const caretPosition = input.value.length;
    input.setSelectionRange(caretPosition, caretPosition);
  }, [editingSelection]);

  if (!editingSelection) {
    return null;
  }

  const { value } = editingSelection;
  const anchor = getSelectionAnchor(editingSelection);
  const { col, row } = anchor;
  const isRangeEdit = editingSelection.kind === "range";

  const x = calculateColumnPosition(col, defaultCellWidth, columnSizes);
  const y = calculateRowPosition(row, defaultCellHeight, rowSizes);

  const customWidth = columnSizes.get(col);
  const width = customWidth === undefined ? defaultCellWidth : customWidth;
  const customHeight = rowSizes.get(row);
  const height = customHeight === undefined ? defaultCellHeight : customHeight;

  const isFormula = value.startsWith("=");
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

/**
 * Notes:
 * - Reviewed src/modules/spreadsheet/sheetReducer.ts to confirm editingSelection.isDirty toggles after the first input mutation.
 * - Consulted src/components/sheets/FormulaBar.tsx to keep caret synchronization consistent across both editing entry points.
 */
