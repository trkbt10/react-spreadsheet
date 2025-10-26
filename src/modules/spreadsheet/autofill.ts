/**
 * @file Utilities for spreadsheet autofill calculations and preview handling.
 */

import type { SelectionRange } from "./sheetReducer";
import type { Sheet } from "../../types";

export type FillDirection = "up" | "down" | "left" | "right";

export type FillHandlePreview = {
  range: SelectionRange;
  direction: FillDirection;
  targetCell: { col: number; row: number };
};

export type AutofillRequest = {
  baseRange: SelectionRange;
  targetRange: SelectionRange;
  direction: FillDirection;
  sheet: Sheet;
};

export type AutofillUpdate = {
  col: number;
  row: number;
  value: string;
};

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

const widthOf = (range: SelectionRange): number => {
  return range.endCol - range.startCol;
};

const heightOf = (range: SelectionRange): number => {
  return range.endRow - range.startRow;
};

const isInsideRange = (range: SelectionRange, col: number, row: number): boolean => {
  return col >= range.startCol && col < range.endCol && row >= range.startRow && row < range.endRow;
};

/**
 * Derive the fill preview range and direction from a base range and pointer cell.
 * @param baseRange - Currently selected range
 * @param cell - Pointer cell coordinate
 * @returns Fill handle preview or null if no extension is required
 */
export const deriveFillHandlePreview = (
  baseRange: SelectionRange,
  cell: { col: number; row: number },
): FillHandlePreview | null => {
  const distanceLeft = cell.col < baseRange.startCol ? baseRange.startCol - cell.col : 0;
  const distanceRight = cell.col >= baseRange.endCol ? cell.col - (baseRange.endCol - 1) : 0;
  const distanceUp = cell.row < baseRange.startRow ? baseRange.startRow - cell.row : 0;
  const distanceDown = cell.row >= baseRange.endRow ? cell.row - (baseRange.endRow - 1) : 0;

  const horizontalDistance = distanceLeft > 0 ? distanceLeft : distanceRight;
  const verticalDistance = distanceUp > 0 ? distanceUp : distanceDown;

  if (horizontalDistance === 0 && verticalDistance === 0) {
    return null;
  }

  if (horizontalDistance >= verticalDistance) {
    if (distanceRight > 0) {
      const clampedRow = clamp(cell.row, baseRange.startRow, baseRange.endRow - 1);
      return {
        direction: "right",
        range: {
          startCol: baseRange.startCol,
          endCol: cell.col + 1,
          startRow: baseRange.startRow,
          endRow: baseRange.endRow,
        },
        targetCell: { col: cell.col, row: clampedRow },
      };
    }

    const clampedRow = clamp(cell.row, baseRange.startRow, baseRange.endRow - 1);
    return {
      direction: "left",
      range: {
        startCol: cell.col,
        endCol: baseRange.endCol,
        startRow: baseRange.startRow,
        endRow: baseRange.endRow,
      },
      targetCell: { col: cell.col, row: clampedRow },
    };
  }

  if (distanceDown > 0) {
    const clampedCol = clamp(cell.col, baseRange.startCol, baseRange.endCol - 1);
    return {
      direction: "down",
      range: {
        startCol: baseRange.startCol,
        endCol: baseRange.endCol,
        startRow: baseRange.startRow,
        endRow: cell.row + 1,
      },
      targetCell: { col: clampedCol, row: cell.row },
    };
  }

  const clampedCol = clamp(cell.col, baseRange.startCol, baseRange.endCol - 1);
  return {
    direction: "up",
    range: {
      startCol: baseRange.startCol,
      endCol: baseRange.endCol,
      startRow: cell.row,
      endRow: baseRange.endRow,
    },
    targetCell: { col: clampedCol, row: cell.row },
  };
};

const toCellId = (col: number, row: number): `${number}:${number}` => {
  return `${col}:${row}`;
};

const getBaseValuesForColumn = (sheet: Sheet, range: SelectionRange, col: number): Array<unknown> => {
  return Array.from({ length: heightOf(range) }, (_, offset) => {
    const row = range.startRow + offset;
    const cell = sheet.cells[toCellId(col, row)];
    if (!cell) {
      return "";
    }
    if (cell.value === null) {
      return "";
    }
    return cell.value;
  });
};

const getBaseValuesForRow = (sheet: Sheet, range: SelectionRange, row: number): Array<unknown> => {
  return Array.from({ length: widthOf(range) }, (_, offset) => {
    const col = range.startCol + offset;
    const cell = sheet.cells[toCellId(col, row)];
    if (!cell) {
      return "";
    }
    if (cell.value === null) {
      return "";
    }
    return cell.value;
  });
};

const toStringValue = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
};

const computeStepForward = (values: ReadonlyArray<number>): number => {
  if (values.length >= 2) {
    const lastIndex = values.length - 1;
    return values[lastIndex] - values[lastIndex - 1];
  }
  return 1;
};

const computeStepBackward = (values: ReadonlyArray<number>): number => {
  if (values.length >= 2) {
    return values[1] - values[0];
  }
  return 1;
};

const pushVerticalUpdates = (
  updates: AutofillUpdate[],
  sheet: Sheet,
  baseRange: SelectionRange,
  targetRange: SelectionRange,
  direction: FillDirection,
): void => {
  const columns = Array.from({ length: widthOf(baseRange) }, (_, offset) => baseRange.startCol + offset);
  if (direction === "down") {
    const fillRowCount = targetRange.endRow - baseRange.endRow;
    if (fillRowCount <= 0) {
      return;
    }
    columns.forEach((col) => {
      const values = getBaseValuesForColumn(sheet, baseRange, col);
      const numericValues = values.every((value) => typeof value === "number")
        ? (values as number[])
        : null;

      if (numericValues) {
        const step = computeStepForward(numericValues);
        const startValue = numericValues[numericValues.length - 1] + step;
        Array.from({ length: fillRowCount }, (_, index) => startValue + step * index).forEach((value, index) => {
          const row = baseRange.endRow + index;
          updates.push({ col, row, value: String(value) });
        });
        return;
      }

      const repeatingValues = values.map(toStringValue);
      if (repeatingValues.length === 0) {
        return;
      }
      Array.from({ length: fillRowCount }, (_, index) => index % repeatingValues.length).forEach((cycleIndex, index) => {
        const row = baseRange.endRow + index;
        updates.push({ col, row, value: repeatingValues[cycleIndex] });
      });
    });
    return;
  }

  const fillRowCount = baseRange.startRow - targetRange.startRow;
  if (fillRowCount <= 0) {
    return;
  }
  columns.forEach((col) => {
    const values = getBaseValuesForColumn(sheet, baseRange, col);
    const numericValues = values.every((value) => typeof value === "number")
      ? (values as number[])
      : null;

    if (numericValues) {
      const step = computeStepBackward(numericValues);
      const startValue = numericValues[0] - step;
      Array.from({ length: fillRowCount }, (_, index) => startValue - step * index).forEach((value, index) => {
        const row = baseRange.startRow - 1 - index;
        updates.push({ col, row, value: String(value) });
      });
      return;
    }

    const repeatingValues = values.map(toStringValue);
    if (repeatingValues.length === 0) {
      return;
    }
    Array.from({ length: fillRowCount }, (_, index) => index % repeatingValues.length).forEach((cycleIndex, index) => {
      const row = baseRange.startRow - 1 - index;
      const valueIndex = (repeatingValues.length - 1 - cycleIndex + repeatingValues.length) % repeatingValues.length;
      updates.push({ col, row, value: repeatingValues[valueIndex] });
    });
  });
};

const pushHorizontalUpdates = (
  updates: AutofillUpdate[],
  sheet: Sheet,
  baseRange: SelectionRange,
  targetRange: SelectionRange,
  direction: FillDirection,
): void => {
  const rows = Array.from({ length: heightOf(baseRange) }, (_, offset) => baseRange.startRow + offset);
  if (direction === "right") {
    const fillColumnCount = targetRange.endCol - baseRange.endCol;
    if (fillColumnCount <= 0) {
      return;
    }
    rows.forEach((row) => {
      const values = getBaseValuesForRow(sheet, baseRange, row);
      const numericValues = values.every((value) => typeof value === "number")
        ? (values as number[])
        : null;

      if (numericValues) {
        const step = computeStepForward(numericValues);
        const startValue = numericValues[numericValues.length - 1] + step;
        Array.from({ length: fillColumnCount }, (_, index) => startValue + step * index).forEach((value, index) => {
          const col = baseRange.endCol + index;
          updates.push({ col, row, value: String(value) });
        });
        return;
      }

      const repeatingValues = values.map(toStringValue);
      if (repeatingValues.length === 0) {
        return;
      }
      Array.from({ length: fillColumnCount }, (_, index) => index % repeatingValues.length).forEach((cycleIndex, index) => {
        const col = baseRange.endCol + index;
        updates.push({ col, row, value: repeatingValues[cycleIndex] });
      });
    });
    return;
  }

  const fillColumnCount = baseRange.startCol - targetRange.startCol;
  if (fillColumnCount <= 0) {
    return;
  }
  rows.forEach((row) => {
    const values = getBaseValuesForRow(sheet, baseRange, row);
    const numericValues = values.every((value) => typeof value === "number")
      ? (values as number[])
      : null;

    if (numericValues) {
      const step = computeStepBackward(numericValues);
      const startValue = numericValues[0] - step;
      Array.from({ length: fillColumnCount }, (_, index) => startValue - step * index).forEach((value, index) => {
        const col = baseRange.startCol - 1 - index;
        updates.push({ col, row, value: String(value) });
      });
      return;
    }

    const repeatingValues = values.map(toStringValue);
    if (repeatingValues.length === 0) {
      return;
    }
    Array.from({ length: fillColumnCount }, (_, index) => index % repeatingValues.length).forEach((cycleIndex, index) => {
      const col = baseRange.startCol - 1 - index;
      const valueIndex = (repeatingValues.length - 1 - cycleIndex + repeatingValues.length) % repeatingValues.length;
      updates.push({ col, row, value: repeatingValues[valueIndex] });
    });
  });
};

/**
 * Compute autofill updates for a target range.
 * @param request - Autofill request parameters
 * @returns Updates for the newly covered cells
 */
export const computeAutofillUpdates = (request: AutofillRequest): AutofillUpdate[] => {
  const { baseRange, targetRange, direction, sheet } = request;

  if (
    widthOf(baseRange) <= 0 ||
    heightOf(baseRange) <= 0 ||
    widthOf(targetRange) <= 0 ||
    heightOf(targetRange) <= 0
  ) {
    return [];
  }

  if (
    isInsideRange(baseRange, targetRange.startCol, targetRange.startRow) &&
    isInsideRange(baseRange, targetRange.endCol - 1, targetRange.endRow - 1) &&
    widthOf(baseRange) === widthOf(targetRange) &&
    heightOf(baseRange) === heightOf(targetRange)
  ) {
    return [];
  }

  const updates: AutofillUpdate[] = [];

  if (direction === "up" || direction === "down") {
    pushVerticalUpdates(updates, sheet, baseRange, targetRange, direction);
    return updates;
  }

  pushHorizontalUpdates(updates, sheet, baseRange, targetRange, direction);
  return updates;
};

// Notes:
// - Reviewed src/modules/spreadsheet/selectionState.ts to align fill range calculations with selection anchoring semantics.
// - Reviewed src/types.ts to confirm Sheet cell value typing when deriving autofill sequences.
