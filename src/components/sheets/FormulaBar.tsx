/**
 * @file FormulaBar component for spreadsheet input.
 */

import { useCallback, useRef, useMemo, useEffect } from "react";
import type { ReactElement, KeyboardEvent, ChangeEvent } from "react";
import { useSheetContext } from "../../modules/spreadsheet/SheetContext";
import { useFormulaEngine } from "../../modules/formula/FormulaEngineContext";
import { Toolbar } from "../toolbar/Toolbar";
import type { ToolbarStyle } from "../toolbar/Toolbar";
import { toolbarStyleToCellStyle, cellStyleToToolbarStyle } from "../toolbar/toolbarStyleConverter";
import { createCellTarget, createRangeTarget } from "../../modules/spreadsheet/cellStyle";
import { resolveStyle } from "../../modules/spreadsheet/styleResolver";
import { selectionToRange } from "../../modules/spreadsheet/sheetReducer";
import { createUpdatesFromSelection, getSelectionAnchor } from "../../modules/spreadsheet/selectionUtils";
import styles from "./FormulaBar.module.css";

const toColumnName = (index: number): string => {
  if (index < 0) {
    return "";
  }
  const parent = toColumnName(Math.floor(index / 26) - 1);
  const current = String.fromCharCode(65 + (index % 26));
  return `${parent}${current}`;
};

/**
 * Converts column and row indices to A1 notation.
 * @param col - Column index
 * @param row - Row index
 * @returns A1 notation (e.g., "A1", "Z10")
 */
const getCellReference = (col: number, row: number): string => {
  return `${toColumnName(col)}${row + 1}`;
};

/**
 * FormulaBar component for editing cell values and displaying cell references.
 * @returns FormulaBar component
 */
export const FormulaBar = (): ReactElement => {
  const { sheet, state, actions, onCellsUpdate } = useSheetContext();
  const { selection, editingSelection, editorActivity } = state;
  const inputRef = useRef<HTMLInputElement>(null);
  useFormulaEngine();

  const focusInput = useCallback((options?: { selectAll?: boolean }) => {
    const shouldSelectAll = options?.selectAll ?? true;
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) {
        return;
      }
      input.focus({ preventScroll: true });
      if (shouldSelectAll) {
        input.select();
        return;
      }
      const caretPosition = input.value.length;
      input.setSelectionRange(caretPosition, caretPosition);
    });
  }, []);

  useEffect(() => {
    if (!editingSelection || !editorActivity.formulaBar) {
      return;
    }
    focusInput({ selectAll: !editingSelection.isDirty });
  }, [editingSelection, editorActivity.formulaBar, focusInput]);

  const readCellDisplayValue = useCallback(
    (col: number, row: number): string => {
      const cellId = `${col}:${row}` as const;
      const cell = sheet.cells[cellId];
      if (!cell) {
        return "";
      }
      if (cell.type === "formula" && cell.formula) {
        return `=${cell.formula}`;
      }
      if (cell.value === null || cell.value === undefined) {
        return "";
      }
      return String(cell.value);
    },
    [sheet.cells],
  );

  const selectionAnchor = useMemo(() => {
    if (!selection) {
      return null;
    }
    return getSelectionAnchor(selection);
  }, [selection]);

  const editingAnchor = useMemo(() => {
    if (!editingSelection) {
      return null;
    }
    return getSelectionAnchor(editingSelection);
  }, [editingSelection]);

  const anchorForDisplay = editingAnchor ?? selectionAnchor;

  const currentCellStyle = useMemo(() => {
    if (!anchorForDisplay) {
      return {};
    }
    return resolveStyle(state.styleRegistry, anchorForDisplay.col, anchorForDisplay.row);
  }, [anchorForDisplay, state.styleRegistry]);

  const toolbarStyle = useMemo(() => {
    return cellStyleToToolbarStyle(currentCellStyle);
  }, [currentCellStyle]);

  const cellReference = useMemo(() => {
    if (!selection) {
      return "";
    }
    if (selection.kind === "cell") {
      return getCellReference(selection.col, selection.row);
    }
    const range = selectionToRange(selection);
    const start = getCellReference(range.startCol, range.startRow);
    const end = getCellReference(range.endCol - 1, range.endRow - 1);
    return `${start}:${end}`;
  }, [selection]);

  const currentValue = useMemo(() => {
    if (!editingSelection) {
      if (!selection) {
        return "";
      }
      if (selection.kind === "range") {
        return "";
      }
      return readCellDisplayValue(selection.col, selection.row);
    }
    return editingSelection.value;
  }, [editingSelection, selection, readCellDisplayValue]);

  const isFormula = currentValue.startsWith("=");
  const displayedReference = cellReference === "" ? "\u00A0" : cellReference;

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      actions.updateEditingValue(event.target.value);
    },
    [actions],
  );

  const commitEditingValue = useCallback(() => {
    if (!editingSelection) {
      return;
    }
    if (editingSelection.isDirty && onCellsUpdate) {
      const updates = createUpdatesFromSelection(editingSelection, editingSelection.value);
      onCellsUpdate(updates);
    }
    actions.commitEdit();
  }, [actions, editingSelection, onCellsUpdate]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitEditingValue();
        inputRef.current?.blur();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        actions.cancelEdit();
        inputRef.current?.blur();
      }
    },
    [actions, commitEditingValue],
  );

  const handleFocus = useCallback(() => {
    if (editingSelection || !selection) {
      return;
    }
    if (selection.kind === "range") {
      actions.startEditingRange(selectionToRange(selection), "", "formulaBar");
      focusInput({ selectAll: true });
      return;
    }
    const anchor = getSelectionAnchor(selection);
    const initialValue = readCellDisplayValue(anchor.col, anchor.row);
    actions.startEditingCell(anchor.col, anchor.row, initialValue, "formulaBar");
    focusInput({ selectAll: true });
  }, [actions, editingSelection, selection, readCellDisplayValue, focusInput]);

  const handleBlur = useCallback(() => {
    commitEditingValue();
  }, [commitEditingValue]);

  const handleStyleChange = useCallback(
    (newToolbarStyle: ToolbarStyle) => {
      if (!selection) {
        return;
      }

      const cellStyle = toolbarStyleToCellStyle(newToolbarStyle);

      if (selection.kind === "range") {
        const targetRange = selectionToRange(selection);
        const target = createRangeTarget(
          targetRange.startCol,
          targetRange.startRow,
          targetRange.endCol,
          targetRange.endRow,
        );
        actions.applyStyle(target, cellStyle);
        return;
      }

      const target = createCellTarget(selection.col, selection.row);
      actions.applyStyle(target, cellStyle);
    },
    [selection, actions],
  );

  const placeholder = !selection
    ? "Select a cell to edit"
    : selection.kind === "range"
      ? "Enter value for selected cells"
      : "Enter value or formula (=...)";
  const isDisabled = !selection;

  return (
    <div className={styles.formulaBarContainer}>
      <Toolbar currentStyle={toolbarStyle} onStyleChange={handleStyleChange} isDisabled={isDisabled} />
      <div className={styles.formulaBar}>
        <div className={styles.cellReference}>{displayedReference}</div>
        <div className={styles.inputWrapper}>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            value={currentValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            data-is-formula={isFormula}
            placeholder={placeholder}
            disabled={isDisabled}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Notes:
 * - Reviewed src/modules/spreadsheet/sheetReducer.ts to align with the unified selection state shape.
 * - Checked src/components/sheets/CellEditor.tsx and src/components/sheets/SelectionHighlight.tsx to ensure shared editing/selection behavior remained consistent after refactoring.
 * - Inspected src/modules/spreadsheet/SpreadSheetContext.tsx and formula engine utilities while integrating update propagation for formula bar edits.
 * - Re-validated pointer handling across src/modules/spreadsheet/useSheetPointerEvents.ts to ensure overlay interactions stop conflicting with formula bar focus.
 */
