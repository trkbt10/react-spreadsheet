/**
 * @file FormulaBar component for spreadsheet input.
 */

import { useCallback, useEffect, useRef, useMemo } from "react";
import type { ReactElement, KeyboardEvent, ChangeEvent } from "react";
import { useSheetContext } from "../../modules/spreadsheet/SheetContext";
import { useFormulaEngine } from "../../modules/formula/FormulaEngineContext";
import { Toolbar } from "./Toolbar";
import type { ToolbarStyle } from "./Toolbar";
import { toolbarStyleToCellStyle, cellStyleToToolbarStyle } from "./toolbarStyleConverter";
import { createCellTarget, createRangeTarget } from "../../modules/spreadsheet/cellStyle";
import { resolveStyle } from "../../modules/spreadsheet/styleResolver";
import styles from "./FormulaBar.module.css";

type EditingRange = {
  endCol: number;
  endRow: number;
  startCol: number;
  startRow: number;
};

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

const createRangeUpdates = (range: EditingRange, value: string) => {
  const rowIndexes = Array.from({ length: range.endRow - range.startRow }, (_, index) => range.startRow + index);
  return rowIndexes.flatMap((row) => {
    const colIndexes = Array.from({ length: range.endCol - range.startCol }, (__, index) => range.startCol + index);
    return colIndexes.map((col) => ({ col, row, value }));
  });
};

/**
 * FormulaBar component for editing cell values and displaying cell references.
 * @returns FormulaBar component
 */
export const FormulaBar = (): ReactElement => {
  const { sheet, state, actions, onCellsUpdate } = useSheetContext();
  const { activeCell, editingCell, selectionRange } = state;
  const inputRef = useRef<HTMLInputElement>(null);
  useFormulaEngine();

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

  const currentCellStyle = useMemo(() => {
    if (activeCell) {
      return resolveStyle(state.styleRegistry, activeCell.col, activeCell.row);
    }
    return {};
  }, [activeCell, state.styleRegistry]);

  const toolbarStyle = useMemo(() => {
    return cellStyleToToolbarStyle(currentCellStyle);
  }, [currentCellStyle]);

  const cellReference = useMemo(() => {
    if (selectionRange) {
      const start = getCellReference(selectionRange.startCol, selectionRange.startRow);
      const end = getCellReference(selectionRange.endCol - 1, selectionRange.endRow - 1);
      return `${start}:${end}`;
    }
    if (activeCell) {
      return getCellReference(activeCell.col, activeCell.row);
    }
    return "";
  }, [activeCell, selectionRange]);

  const currentValue = useMemo(() => {
    if (editingCell) {
      return editingCell.value;
    }
    if (!activeCell) {
      return "";
    }
    return readCellDisplayValue(activeCell.col, activeCell.row);
  }, [activeCell, editingCell, readCellDisplayValue]);

  const isFormula = currentValue.startsWith("=");
  const displayedReference = cellReference === "" ? "\u00A0" : cellReference;

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      actions.updateEditingValue(event.target.value);
    },
    [actions],
  );

  const commitEditingValue = useCallback(() => {
    if (!editingCell || !onCellsUpdate) {
      return;
    }
    const { value } = editingCell;
    const updates = editingCell.range
      ? createRangeUpdates(editingCell.range, value)
      : [{ col: editingCell.col, row: editingCell.row, value }];
    onCellsUpdate(updates);
    actions.commitEdit();
  }, [actions, editingCell, onCellsUpdate]);

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
    if (editingCell) {
      return;
    }
    if (selectionRange) {
      actions.startEditingRange(selectionRange, "");
      return;
    }
    if (!activeCell) {
      return;
    }
    const initialValue = readCellDisplayValue(activeCell.col, activeCell.row);
    actions.startEditingCell(activeCell.col, activeCell.row, initialValue);
  }, [actions, activeCell, editingCell, readCellDisplayValue, selectionRange]);

  const handleBlur = useCallback(() => {
    commitEditingValue();
  }, [commitEditingValue]);

  useEffect(() => {
    if (editingCell && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const handleStyleChange = useCallback(
    (newToolbarStyle: ToolbarStyle) => {
      if (!activeCell && !selectionRange) {
        return;
      }

      const cellStyle = toolbarStyleToCellStyle(newToolbarStyle);

      if (selectionRange) {
        const target = createRangeTarget(
          selectionRange.startCol,
          selectionRange.startRow,
          selectionRange.endCol,
          selectionRange.endRow,
        );
        actions.applyStyle(target, cellStyle);
      } else if (activeCell) {
        const target = createCellTarget(activeCell.col, activeCell.row);
        actions.applyStyle(target, cellStyle);
      }
    },
    [activeCell, selectionRange, actions],
  );

  return (
    <div className={styles.formulaBarContainer}>
      <Toolbar
        currentStyle={toolbarStyle}
        onStyleChange={handleStyleChange}
        isDisabled={!activeCell && !selectionRange}
      />
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
            placeholder={activeCell ? "Enter value or formula (=...)" : "Select a cell to edit"}
            disabled={!activeCell}
          />
        </div>
      </div>
    </div>
  );
};
