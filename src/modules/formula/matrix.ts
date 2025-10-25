/**
 * @file Utilities for converting spreadsheet data into a 3D matrix used by the formula engine.
 */

import type { Sheet, SpreadSheet } from "../../types";
import type {
  FormulaWorkbookGrid,
  FormulaSheetGrid,
  FormulaCellData,
  WorkbookIndex,
  WorkbookSheetIndex,
} from "./types";

const normalizeSheetKey = (value: string): string => value.trim().toUpperCase();

const populateRows = (sheet: Sheet): {
  rows: Map<number, Map<number, FormulaCellData>>;
  maxColumn: number;
  maxRow: number;
} => {
  const rows = new Map<number, Map<number, FormulaCellData>>();
  let maxColumn = -1;
  let maxRow = -1;

  for (const cell of Object.values(sheet.cells)) {
    if (!cell) {
      continue;
    }
    const { x: column, y: row } = cell;
    if (column < 0 || row < 0) {
      throw new Error(`Cell "${cell.id}" coordinates must be non-negative`);
    }

    const rowMap = rows.get(row) ?? new Map<number, FormulaCellData>();
    rowMap.set(column, {
      type: cell.type,
      value: cell.value,
      formula: cell.formula,
    });
    rows.set(row, rowMap);

    if (column > maxColumn) {
      maxColumn = column;
    }
    if (row > maxRow) {
      maxRow = row;
    }
  }

  return {
    rows,
    maxColumn,
    maxRow,
  };
};

const createSheetGrid = (sheet: Sheet): FormulaSheetGrid => {
  const { rows, maxColumn, maxRow } = populateRows(sheet);

  return {
    sheetId: sheet.id,
    sheetName: sheet.name,
    rows,
    maxColumn,
    maxRow,
  };
};

const buildWorkbookIndex = (sheets: ReadonlyArray<Sheet>): WorkbookIndex => {
  const byId = new Map<string, WorkbookSheetIndex>();
  const byName = new Map<string, WorkbookSheetIndex>();

  sheets.forEach((sheet, index) => {
    const entry: WorkbookSheetIndex = {
      id: sheet.id,
      name: sheet.name,
      index,
    };
    byId.set(sheet.id, entry);
    byName.set(normalizeSheetKey(sheet.name), entry);
  });

  return {
    byId,
    byName,
  };
};

export const buildWorkbookMatrix = (spreadsheet: SpreadSheet): {
  matrix: FormulaWorkbookGrid;
  index: WorkbookIndex;
} => {
  const sheets = spreadsheet.sheets as ReadonlyArray<Sheet>;
  const index = buildWorkbookIndex(sheets);
  const matrix: FormulaWorkbookGrid = sheets.map(createSheetGrid);
  return {
    matrix,
    index,
  };
};
