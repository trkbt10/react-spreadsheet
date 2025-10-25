/**
 * @file Utilities for parsing raw spreadsheet JSON fixtures into typed structures.
 */

import type { Cell, CellId, Sheet, SpreadSheet } from "../../types";

const CELL_ID_PATTERN = /^-?\d+:-?\d+$/u;

const CELL_TYPES: ReadonlyArray<Cell["type"]> = [
  "string",
  "number",
  "boolean",
  "null",
  "formula",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toCellId = (value: string): CellId => {
  if (!CELL_ID_PATTERN.test(value)) {
    throw new Error(`Invalid cell identifier "${value}"`);
  }
  return value as CellId;
};

const toCellType = (value: unknown): Cell["type"] => {
  if (typeof value !== "string") {
    throw new Error(`Unsupported cell type "${String(value)}"`);
  }
  if (!CELL_TYPES.includes(value as Cell["type"])) {
    throw new Error(`Unsupported cell type "${value}"`);
  }
  return value as Cell["type"];
};

const normalizeValue = (type: Cell["type"], value: unknown): Cell["value"] => {
  if (type === "null") {
    if (value !== null) {
      throw new Error("Null cell must use null value");
    }
    return null;
  }

  if (type === "boolean") {
    if (typeof value !== "boolean") {
      throw new Error("Boolean cell must use boolean value");
    }
    return value;
  }

  if (type === "number") {
    if (typeof value !== "number") {
      throw new Error("Number cell must use numeric value");
    }
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  throw new Error(`Unsupported value for cell type "${type}"`);
};

const normalizeCell = (cellId: CellId, cell: unknown): Cell => {
  if (!isRecord(cell)) {
    throw new Error(`Cell "${cellId}" must be an object`);
  }

  const { id, x, y, value, formula } = cell;
  const rawType: unknown = cell.type;

  if (typeof id !== "string") {
    throw new Error(`Cell "${cellId}" is missing an id`);
  }

  if (id !== cellId) {
    throw new Error(`Cell id mismatch: expected "${cellId}", got "${id}"`);
  }

  if (typeof x !== "number" || Number.isNaN(x)) {
    throw new Error(`Cell "${cellId}" has invalid x coordinate`);
  }

  if (typeof y !== "number" || Number.isNaN(y)) {
    throw new Error(`Cell "${cellId}" has invalid y coordinate`);
  }

  const cellType = toCellType(rawType);

  if (formula !== undefined && typeof formula !== "string") {
    throw new Error(`Cell "${cellId}" formula must be a string when present`);
  }

  return {
    id: cellId,
    x,
    y,
    type: cellType,
    value: normalizeValue(cellType, value),
    formula,
  };
};

const normalizeCells = (cells: unknown, sheetName: string): Sheet["cells"] => {
  if (!isRecord(cells)) {
    throw new Error(`Cells for sheet "${sheetName}" must be an object map`);
  }

  const normalizedCells: Sheet["cells"] = {};

  for (const [rawCellId, cellValue] of Object.entries(cells)) {
    const cellId = toCellId(rawCellId);
    normalizedCells[cellId] = normalizeCell(cellId, cellValue);
  }

  return normalizedCells;
};

const normalizeSheet = (sheet: unknown, index: number): Sheet => {
  if (!isRecord(sheet)) {
    throw new Error(`Sheet at index ${index} must be an object`);
  }

  const { name, id, cells } = sheet;

  if (typeof name !== "string" || name.length === 0) {
    throw new Error(`Sheet at index ${index} requires a name`);
  }

  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`Sheet "${name}" requires an id`);
  }

  return {
    name,
    id,
    cells: normalizeCells(cells, name),
  };
};

export const parseSpreadsheet = (raw: unknown): SpreadSheet => {
  if (!isRecord(raw)) {
    throw new Error("Spreadsheet data must be an object");
  }

  const { name, meta, sheets, createdAt, updatedAt } = raw;

  if (typeof name !== "string" || name.length === 0) {
    throw new Error("Spreadsheet requires a name");
  }

  if (typeof createdAt !== "string" || typeof updatedAt !== "string") {
    throw new Error("Spreadsheet timestamps must be ISO strings");
  }

  if (!Array.isArray(sheets)) {
    throw new Error("Spreadsheet sheets must be an array");
  }

  return {
    name,
    meta: isRecord(meta) ? meta : undefined,
    sheets: sheets.map(normalizeSheet),
    createdAt,
    updatedAt,
  };
};
