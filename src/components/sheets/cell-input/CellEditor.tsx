/**
 * @file CellEditor component for inline cell editing.
 */

import { useCallback, useEffect, useRef } from "react";
import type { ReactElement, KeyboardEvent } from "react";
import { useVirtualScrollContext } from "../../scrollarea/VirtualScrollContext";
import { useSheetContext } from "../../../modules/spreadsheet/SheetContext";
import { calculateColumnPosition, calculateRowPosition } from "../../../modules/spreadsheet/gridLayout";
import { getSelectionAnchor } from "../../../modules/spreadsheet/selectionUtils";
import { useEditingCommit } from "./useEditingCommit";
import { useSpreadsheetEditorInput } from "./useSpreadsheetEditorInput";
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
  const hasCommittedRef = useRef(false);

  useEffect(() => {
    if (!editingSelection) {
      return;
    }
    hasCommittedRef.current = false;
  }, [editingSelection]);
  const { handleChange, handleSelectionChange, handleCompositionStart, handleCompositionEnd, syncCaretFromState } =
    useSpreadsheetEditorInput({
      editingSelection,
      inputRef,
      actions: {
        updateEditingValue: actions.updateEditingValue,
        setEditingCaretRange: actions.setEditingCaretRange,
      },
    });

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
    if (!editingSelection) {
      return;
    }
    syncCaretFromState(state.editingCaret);
  }, [editingSelection, state.editingCaret, syncCaretFromState]);

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
 * - Re-read src/modules/spreadsheet/useSheetPointerEvents.ts to verify formula-targeting mode continues to react to caret updates.
 * - Referenced src/modules/spreadsheet/formulaTargetingUtils.ts while reconciling caret placement expectations for range arguments.
 */
