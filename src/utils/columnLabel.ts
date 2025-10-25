/**
 * @file Utilities for converting column indices to Excel-style labels.
 */

/**
 * Convert a column index to an Excel-style label (A, B, ..., Z, AA, AB, ...).
 * @param col - Zero-based column index
 * @returns Excel-style column label
 */
export const columnIndexToLabel = (col: number): string => {
  const buildLabel = (num: number, acc: string): string => {
    if (num < 0) {
      return acc;
    }
    const char = String.fromCharCode((num % 26) + 65);
    const nextNum = Math.floor(num / 26) - 1;
    return buildLabel(nextNum, char + acc);
  };

  return buildLabel(col, "");
};

/**
 * Convert a row index to a 1-based label.
 * @param row - Zero-based row index
 * @returns 1-based row label
 */
export const rowIndexToLabel = (row: number): string => {
  return String(row + 1);
};
