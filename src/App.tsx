/**
 * @file React application entry component used for Vite preview.
 */

import type { ReactElement } from "react";
import type { Cell, CellId, Sheet, SpreadSheet } from "./types";
import { SpreadSheet as SpreadSheetView } from "./components/SpreadSheet.tsx";
import rawSpreadsheet from "../__mocks__/spreadsheet.basic.json";

const CELL_ID_PATTERN = /^-?\d+:-?\d+$/;
const CELL_TYPES: Cell["type"][] = [
  "string",
  "number",
  "boolean",
  "null",
  "formula",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function assertCellId(value: string): asserts value is CellId {
  if (!CELL_ID_PATTERN.test(value)) {
    throw new Error(`Invalid cell identifier "${value}"`);
  }
}

function assertCellType(value: unknown): asserts value is Cell["type"] {
  if (
    typeof value !== "string" ||
    !CELL_TYPES.some((cellType) => cellType === value)
  ) {
    throw new Error(`Unsupported cell type "${String(value)}"`);
  }
}

const normalizeValue = (
  type: Cell["type"],
  value: unknown,
): Cell["value"] => {
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

  const {
    id,
    x,
    y,
    type: unknownType,
    value,
    formula,
  } = cell;

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

  assertCellType(unknownType);
  const cellType: Cell["type"] = unknownType;

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
    assertCellId(rawCellId);
    const cellId: CellId = rawCellId;
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

const parseSpreadsheet = (raw: unknown): SpreadSheet => {
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

const spreadsheet = parseSpreadsheet(rawSpreadsheet);

/**
 * Minimal spreadsheet preview component.
 */
export function App(): ReactElement {
  return <SpreadSheetView spreadsheet={spreadsheet} />;
}
