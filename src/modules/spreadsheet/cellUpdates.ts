/**
 * @file Helpers for applying cell updates to a sheet instance.
 */

import type { Sheet, Cell, CellId } from "../../types";

export type CellUpdate = {
  readonly col: number;
  readonly row: number;
  readonly value: string;
};

const NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/u;
const BOOLEAN_PATTERN = /^(true|false)$/iu;

const createCellId = (col: number, row: number): CellId => `${col}:${row}` as CellId;

const inferCellFromValue = (col: number, row: number, rawValue: string, previous?: Cell): Cell | null => {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const id = createCellId(col, row);

  if (trimmed.startsWith("=")) {
    return {
      id,
      x: col,
      y: row,
      type: "formula",
      value: previous?.type === "formula" ? previous.value : null,
      formula: trimmed,
    } satisfies Cell;
  }

  if (NUMBER_PATTERN.test(trimmed)) {
    return {
      id,
      x: col,
      y: row,
      type: "number",
      value: Number.parseFloat(trimmed),
    } satisfies Cell;
  }

  if (BOOLEAN_PATTERN.test(trimmed)) {
    const normalized = trimmed.toLowerCase();
    return {
      id,
      x: col,
      y: row,
      type: "boolean",
      value: normalized === "true",
    } satisfies Cell;
  }

  if (trimmed.toLowerCase() === "null") {
    return {
      id,
      x: col,
      y: row,
      type: "null",
      value: null,
    } satisfies Cell;
  }

  return {
    id,
    x: col,
    y: row,
    type: "string",
    value: rawValue,
  } satisfies Cell;
};

const cellsEqual = (left: Cell | undefined, right: Cell | undefined): boolean => {
  if (left === right) {
    return true;
  }
  if (!left) {
    return false;
  }
  if (!right) {
    return false;
  }
  if (left.type !== right.type) {
    return false;
  }
  if (!Object.is(left.value, right.value)) {
    return false;
  }
  return left.formula === right.formula;
};

type ReductionResult = {
  readonly cells: Sheet["cells"];
  readonly mutated: boolean;
};

/**
 * Applies a list of cell updates to a sheet, returning the original sheet if no changes occurred.
 * @param sheet - Sheet to update
 * @param updates - Updates to apply
 * @returns Updated sheet or the original sheet when no modifications were necessary
 */
export const applyUpdatesToSheet = (sheet: Sheet, updates: ReadonlyArray<CellUpdate>): Sheet => {
  if (updates.length === 0) {
    return sheet;
  }

  const result = updates.reduce<ReductionResult>(
    (acc, { col, row, value }) => {
      const cellId = createCellId(col, row);
      const previous = acc.cells[cellId];
      const next = inferCellFromValue(col, row, value, previous);

      if (!next) {
        if (!previous) {
          return acc;
        }
        const nextCells = { ...acc.cells };
        delete nextCells[cellId];
        return {
          cells: nextCells,
          mutated: true,
        };
      }

      if (cellsEqual(previous, next)) {
        return acc;
      }

      return {
        cells: {
          ...acc.cells,
          [cellId]: next,
        },
        mutated: true,
      };
    },
    {
      cells: sheet.cells,
      mutated: false,
    },
  );

  if (!result.mutated) {
    return sheet;
  }

  return {
    ...sheet,
    cells: result.cells,
  } satisfies Sheet;
};

export const isUpdateApplied = (sheet: Sheet, update: CellUpdate): boolean => {
  const cellId = createCellId(update.col, update.row);
  const previous = sheet.cells[cellId];
  const next = inferCellFromValue(update.col, update.row, update.value, previous);

  if (!next) {
    return previous === undefined;
  }

  if (!previous) {
    return false;
  }

  return cellsEqual(previous, next);
};

/**
 * Debug notes:
 * - Pulled logic from src/modules/spreadsheet/SpreadSheetContext.tsx to share update behaviour between contexts.
 * - Reviewed src/modules/spreadsheet/SheetContext.tsx to ensure helper functions awaited stable references for provider state updates.
 */
