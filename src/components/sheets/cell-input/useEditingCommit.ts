/**
 * @file Shared helpers for committing spreadsheet cell edits.
 */

import { useCallback } from "react";
import type { MutableRefObject, RefObject } from "react";
import { createUpdatesFromSelection } from "../../../modules/spreadsheet/selectionUtils";
import type { EditingSelection } from "../../../modules/spreadsheet/sheetReducer";
import type { CellUpdate } from "../../../modules/spreadsheet/cellUpdates";
import type { CellUpdateRequestOptions, CellUpdateResult } from "../../../modules/spreadsheet/SpreadSheetContext";

type EditingActions = {
  commitEdit: (value?: string) => void;
  updateEditingValue: (value: string) => void;
};

type UseEditingCommitParams = {
  editingSelection: EditingSelection | null;
  actions: EditingActions;
  inputRef: RefObject<HTMLInputElement | null>;
  hasCommittedRef: MutableRefObject<boolean>;
  onCellsUpdate?: (updates: Array<CellUpdate>, options?: CellUpdateRequestOptions) => CellUpdateResult | void;
  onValidationFailure?: () => void;
};

type UseEditingCommitResult = {
  applyEditingUpdates: () => boolean;
  commitEditingValue: () => void;
};

const extractCommittedValue = (
  selection: EditingSelection | null,
  inputRef: RefObject<HTMLInputElement | null>,
): string | null => {
  const input = inputRef.current;
  if (input) {
    return input.value;
  }
  if (!selection) {
    return null;
  }
  return selection.value;
};

export const useEditingCommit = ({
  editingSelection,
  actions,
  inputRef,
  hasCommittedRef,
  onCellsUpdate,
  onValidationFailure,
}: UseEditingCommitParams): UseEditingCommitResult => {
  const applyEditingUpdates = useCallback((): boolean => {
    if (!editingSelection) {
      return true;
    }
    if (!editingSelection.isDirty) {
      return true;
    }
    if (!onCellsUpdate) {
      return true;
    }
    const committedValue = extractCommittedValue(editingSelection, inputRef);
    if (committedValue === null) {
      return true;
    }
    const updates = createUpdatesFromSelection(editingSelection, committedValue);
    const result = onCellsUpdate(updates);
    if (!result || result.status === "applied" || result.status === "unchanged") {
      if (editingSelection.value !== committedValue) {
        actions.updateEditingValue(committedValue);
      }
      return true;
    }
    if (result.status === "rejected") {
      const input = inputRef.current;
      if (input) {
        input.setCustomValidity(result.error.message);
        if (typeof input.reportValidity === "function") {
          input.reportValidity();
        }
      }
      onValidationFailure?.();
      return false;
    }
    return true;
  }, [actions, editingSelection, inputRef, onCellsUpdate, onValidationFailure]);

  const commitEditingValue = useCallback(() => {
    if (!editingSelection) {
      return;
    }
    if (!applyEditingUpdates()) {
      return;
    }
    if (hasCommittedRef.current) {
      return;
    }
    hasCommittedRef.current = true;
    const committedValue = extractCommittedValue(editingSelection, inputRef);
    if (committedValue === null) {
      return;
    }
    actions.commitEdit(committedValue);
  }, [actions, applyEditingUpdates, editingSelection, hasCommittedRef, inputRef]);

  return {
    applyEditingUpdates,
    commitEditingValue,
  };
};
