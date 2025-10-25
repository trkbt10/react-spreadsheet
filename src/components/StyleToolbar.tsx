/**
 * @file Style toolbar for applying styles to selections.
 */

import type { ReactElement } from "react";
import { useCallback } from "react";
import { useSelectionStyle } from "../modules/spreadsheet/useSelectionStyle";
import styles from "./StyleToolbar.module.css";

/**
 * Toolbar for applying styles to the current selection.
 * @returns StyleToolbar component
 */
export const StyleToolbar = (): ReactElement => {
  const { selectionType, selectionRange, applyStyleToSelection } = useSelectionStyle();

  const handleBold = useCallback(() => {
    applyStyleToSelection({ fontWeight: "bold" });
  }, [applyStyleToSelection]);

  const handleItalic = useCallback(() => {
    applyStyleToSelection({ fontStyle: "italic" });
  }, [applyStyleToSelection]);

  const handleBackgroundYellow = useCallback(() => {
    applyStyleToSelection({ backgroundColor: "yellow" });
  }, [applyStyleToSelection]);

  const handleBackgroundRed = useCallback(() => {
    applyStyleToSelection({ backgroundColor: "#ffcccc" });
  }, [applyStyleToSelection]);

  const handleBackgroundGreen = useCallback(() => {
    applyStyleToSelection({ backgroundColor: "#ccffcc" });
  }, [applyStyleToSelection]);

  const handleBackgroundBlue = useCallback(() => {
    applyStyleToSelection({ backgroundColor: "#ccccff" });
  }, [applyStyleToSelection]);

  const handleTextRed = useCallback(() => {
    applyStyleToSelection({ color: "red" });
  }, [applyStyleToSelection]);

  const handleTextBlue = useCallback(() => {
    applyStyleToSelection({ color: "blue" });
  }, [applyStyleToSelection]);

  const hasSelection = selectionType !== "none";

  const getSelectionInfo = (): string => {
    if (!selectionRange) {
      return "No selection";
    }

    switch (selectionType) {
      case "sheet":
        return "Entire sheet";
      case "column": {
        const colStart = selectionRange.startCol;
        const colEnd = selectionRange.endCol - 1;
        if (colStart === colEnd) {
          return `Column ${colStart}`;
        }
        return `Columns ${colStart}-${colEnd}`;
      }
      case "row": {
        const rowStart = selectionRange.startRow;
        const rowEnd = selectionRange.endRow - 1;
        if (rowStart === rowEnd) {
          return `Row ${rowStart}`;
        }
        return `Rows ${rowStart}-${rowEnd}`;
      }
      case "range": {
        const start = `${selectionRange.startCol},${selectionRange.startRow}`;
        const end = `${selectionRange.endCol - 1},${selectionRange.endRow - 1}`;
        return `${start} - ${end}`;
      }
      default:
        return "No selection";
    }
  };

  const selectionInfo = getSelectionInfo();

  return (
    <div className={styles.toolbar}>
      <div className={styles.selectionInfo}>
        <strong>Selection:</strong> {selectionType} ({selectionInfo})
      </div>

      <div className={styles.buttonGroup}>
        <button
          className={styles.button}
          onClick={handleBold}
          disabled={!hasSelection}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          className={styles.button}
          onClick={handleItalic}
          disabled={!hasSelection}
          title="Italic"
        >
          <em>I</em>
        </button>
      </div>

      <div className={styles.buttonGroup}>
        <button
          className={styles.button}
          onClick={handleTextRed}
          disabled={!hasSelection}
          title="Red text"
          style={{ color: "red" }}
        >
          A
        </button>
        <button
          className={styles.button}
          onClick={handleTextBlue}
          disabled={!hasSelection}
          title="Blue text"
          style={{ color: "blue" }}
        >
          A
        </button>
      </div>

      <div className={styles.buttonGroup}>
        <button
          className={styles.button}
          onClick={handleBackgroundYellow}
          disabled={!hasSelection}
          title="Yellow background"
          style={{ backgroundColor: "yellow" }}
        >
          ▢
        </button>
        <button
          className={styles.button}
          onClick={handleBackgroundRed}
          disabled={!hasSelection}
          title="Red background"
          style={{ backgroundColor: "#ffcccc" }}
        >
          ▢
        </button>
        <button
          className={styles.button}
          onClick={handleBackgroundGreen}
          disabled={!hasSelection}
          title="Green background"
          style={{ backgroundColor: "#ccffcc" }}
        >
          ▢
        </button>
        <button
          className={styles.button}
          onClick={handleBackgroundBlue}
          disabled={!hasSelection}
          title="Blue background"
          style={{ backgroundColor: "#ccccff" }}
        >
          ▢
        </button>
      </div>
    </div>
  );
};
