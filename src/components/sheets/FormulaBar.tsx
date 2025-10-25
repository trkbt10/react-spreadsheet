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

/**
 * Converts column and row indices to A1 notation.
 * @param col - Column index
 * @param row - Row index
 * @returns A1 notation (e.g., "A1", "Z10")
 */
const getCellReference = (col: number, row: number): string => {
  let columnName = "";
  let tempCol = col;
  while (tempCol >= 0) {
    columnName = String.fromCharCode(65 + (tempCol % 26)) + columnName;
    tempCol = Math.floor(tempCol / 26) - 1;
  }
  return `${columnName}${row + 1}`;
};

/**
 * FormulaBar component for editing cell values and displaying cell references.
 * @returns FormulaBar component
 */
export const FormulaBar = (): ReactElement => {
  const { sheet, state, actions, onCellsUpdate } = useSheetContext();
  const { activeCell, editingCell, selectionRange } = state;
  const inputRef = useRef<HTMLInputElement>(null);
  const formulaEngine = useFormulaEngine();

  const currentCellStyle = useMemo(() => {
    if (activeCell) {
      return resolveStyle(state.styleRegistry, activeCell.col, activeCell.row);
    }
    return {};
  }, [activeCell, state.styleRegistry]);

  const toolbarStyle = useMemo(() => {
    return cellStyleToToolbarStyle(currentCellStyle);
  }, [currentCellStyle]);

  const cellReference = selectionRange
    ? `${getCellReference(selectionRange.startCol, selectionRange.startRow)}:${getCellReference(selectionRange.endCol - 1, selectionRange.endRow - 1)}`
    : activeCell
      ? getCellReference(activeCell.col, activeCell.row)
      : "";

  const currentValue = editingCell
    ? editingCell.value
    : activeCell
      ? (() => {
          const cellId = `${activeCell.col}:${activeCell.row}` as const;
          const cell = sheet.cells[cellId];
          if (!cell) {
            return "";
          }
          if (cell.type === "formula" && cell.formula) {
            return `=${cell.formula}`;
          }
          return cell.value === null ? "" : String(cell.value);
        })()
      : "";

  const isFormula = currentValue.startsWith("=");

  const handleInputChange = useCallback(
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
        inputRef.current?.blur();
      } else if (event.key === "Escape") {
        event.preventDefault();
        actions.cancelEdit();
        inputRef.current?.blur();
      }
    },
    [actions, editingCell, onCellsUpdate],
  );

  const handleFocus = useCallback(() => {
    if (!editingCell) {
      if (selectionRange) {
        // Start editing range
        actions.startEditingRange(selectionRange, "");
      } else if (activeCell) {
        // Start editing single cell
        const cellId = `${activeCell.col}:${activeCell.row}` as const;
        const cell = sheet.cells[cellId];
        let initialValue = "";
        if (cell) {
          if (cell.type === "formula" && cell.formula) {
            initialValue = `=${cell.formula}`;
          } else {
            initialValue = cell.value === null ? "" : String(cell.value);
          }
        }
        actions.startEditingCell(activeCell.col, activeCell.row, initialValue);
      }
    }
  }, [activeCell, editingCell, selectionRange, sheet.cells, actions]);

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
      actions.commitEdit();
    }
  }, [editingCell, actions, onCellsUpdate]);

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
        <div className={styles.cellReference}>{cellReference || "\u00A0"}</div>
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
