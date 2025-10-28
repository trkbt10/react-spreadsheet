/**
 * @file Shared input handlers for spreadsheet editing surfaces.
 */

import { useCallback, useRef } from "react";
import type { ChangeEvent, CompositionEvent, RefObject } from "react";
import type { EditingSelection } from "../../../modules/spreadsheet/sheetReducer";

type SpreadsheetEditorActions = {
  updateEditingValue: (value: string) => void;
  setEditingCaretRange: (start: number, end: number) => void;
};

type UseSpreadsheetEditorInputParams = {
  editingSelection: EditingSelection | null;
  inputRef: RefObject<HTMLInputElement | null>;
  actions: SpreadsheetEditorActions;
};

type UseSpreadsheetEditorInputResult = {
  handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleSelectionChange: () => void;
  handleCompositionStart: () => void;
  handleCompositionEnd: (event: CompositionEvent<HTMLInputElement>) => void;
  syncCaretFromState: (caret: { start: number; end: number }) => void;
};

export const useSpreadsheetEditorInput = ({
  editingSelection,
  inputRef,
  actions,
}: UseSpreadsheetEditorInputParams): UseSpreadsheetEditorInputResult => {
  const isComposingRef = useRef(false);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const input = inputRef.current;
      if (input) {
        input.setCustomValidity("");
      }
      const { value, selectionStart, selectionEnd } = event.target;
      actions.updateEditingValue(value);
      if (isComposingRef.current) {
        return;
      }
      const start = selectionStart ?? value.length;
      const end = selectionEnd ?? start;
      actions.setEditingCaretRange(start, end);
    },
    [actions, inputRef],
  );

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
  }, [actions, inputRef]);

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

  const syncCaretFromState = useCallback(
    (caret: { start: number; end: number }) => {
      if (!editingSelection) {
        return;
      }
      const input = inputRef.current;
      if (!input) {
        return;
      }
      if (input.selectionStart === caret.start && input.selectionEnd === caret.end) {
        return;
      }
      input.setSelectionRange(caret.start, caret.end);
    },
    [editingSelection, inputRef],
  );

  return {
    handleChange,
    handleSelectionChange,
    handleCompositionStart,
    handleCompositionEnd,
    syncCaretFromState,
  };
};

/**
 * Notes:
 * - Reviewed src/modules/spreadsheet/sheetReducer.ts to mirror caret range semantics shared across editors.
 * - Cross-referenced src/components/sheets/cell-input/CellEditor.tsx and FormulaBar.tsx to centralise duplicated input handlers.
 */
