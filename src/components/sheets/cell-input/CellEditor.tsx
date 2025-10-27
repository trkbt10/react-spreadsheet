/**
 * @file CellEditor component for inline cell editing.
 */

import { useCallback, useEffect, useRef } from "react";
import type { ReactElement, KeyboardEvent, ChangeEvent, CompositionEvent } from "react";
import { useVirtualScrollContext } from "../../scrollarea/VirtualScrollContext";
import { useSheetContext } from "../../../modules/spreadsheet/SheetContext";
import { calculateColumnPosition, calculateRowPosition } from "../../../modules/spreadsheet/gridLayout";
import { getSelectionAnchor } from "../../../modules/spreadsheet/selectionUtils";
import { useEditingCommit } from "./useEditingCommit";
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
  const isComposingRef = useRef(false);
  const hasCommittedRef = useRef(false);

  useEffect(() => {
    if (!editingSelection) {
      return;
    }
    hasCommittedRef.current = false;
  }, [editingSelection]);
  const handleSelectionChange = useCallback(() => {
    if (isComposingRef.current) {
      return;
    }
    const input = inputRef.current;
    if (!input) {
      return;
    }
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;
    actions.setEditingCaretRange(start, end);
  }, [actions]);
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const input = inputRef.current;
      if (input) {
        input.setCustomValidity("");
      }
      const { value: nextValue, selectionStart, selectionEnd } = event.target;
      actions.updateEditingValue(nextValue);
      if (!isComposingRef.current) {
        const start = selectionStart ?? nextValue.length;
        const end = selectionEnd ?? start;
        actions.setEditingCaretRange(start, end);
      }
    },
    [actions],
  );

  const { applyEditingUpdates, commitEditingValue } = useEditingCommit({
    editingSelection,
    actions: {
      commitEdit: actions.commitEdit,
      updateEditingValue: actions.updateEditingValue,
    },
    inputRef,
    hasCommittedRef,
    onCellsUpdate,
    onValidationFailure: () => {
      const input = inputRef.current;
      if (!input) {
        return;
      }
      requestAnimationFrame(() => {
        input.focus({ preventScroll: true });
      });
    },
  });

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (!editingSelection) {
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
          const applied = applyEditingUpdates();
          if (applied) {
            commitEditingValue();
          }
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          actions.cancelEdit();
      }
    },
    [actions, applyEditingUpdates, commitEditingValue, editingSelection],
  );

  const handleBlur = useCallback(() => {
    if (!editingSelection) {
      return;
    }
    if (!applyEditingUpdates()) {
      return;
    }
    commitEditingValue();
  }, [applyEditingUpdates, commitEditingValue, editingSelection]);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(
    (event: CompositionEvent<HTMLInputElement>) => {
      isComposingRef.current = false;
      const input = event.currentTarget;
      const valueLength = input.value.length;
      const start = input.selectionStart ?? valueLength;
      const end = input.selectionEnd ?? start;
      actions.setEditingCaretRange(start, end);
    },
    [actions],
  );

  useEffect(() => {
    const input = inputRef.current;
    if (!editingSelection || !input) {
      return;
    }

    input.focus({ preventScroll: true });

    if (!editingSelection.isDirty) {
      input.select();
      actions.setEditingCaretRange(0, input.value.length);
      return;
    }

    const caretPosition = input.value.length;
    input.setSelectionRange(caretPosition, caretPosition);
    actions.setEditingCaretRange(caretPosition, caretPosition);
  }, [actions, editingSelection]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) {
      return;
    }
    if (!editingSelection) {
      return;
    }
    const { start, end } = state.editingCaret;
    if (input.selectionStart === start && input.selectionEnd === end) {
      return;
    }
    input.setSelectionRange(start, end);
  }, [editingSelection, state.editingCaret]);

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
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onSelect={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        onMouseUp={handleSelectionChange}
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
 * - Inspected src/components/Sheet.tsx and src/components/SpreadSheet.tsx to verify rendering order and avoid focus contention with the formula bar.
 * - Cross-checked src/modules/formula/errors.ts and src/modules/spreadsheet/SpreadSheetContext.tsx to align validation feedback wiring with provider behaviour.
 * - Revisited src/modules/spreadsheet/cellUpdates.ts to ensure local inference matches spreadsheet-level validation.
 */
