/**
 * @file Helpers for addressing spreadsheet coordinates and resolving sheet-qualified references.
 */

import type { CellAddress, CellCoordinate, CellAddressKey, WorkbookIndex } from "./types";

const COLUMN_LABEL_PATTERN = /^[A-Z]+$/u;
const CELL_LABEL_PATTERN = /^[A-Z]+[0-9]+$/u;

const normalizeSheetIdentifier = (value: string): string => value.trim().toUpperCase();

export const columnLabelToIndex = (label: string): number => {
  const normalized = label.trim().toUpperCase();
  if (!COLUMN_LABEL_PATTERN.test(normalized)) {
    throw new Error(`Invalid column label "${label}"`);
  }

  return normalized.split("").reduce((accumulator, character) => {
    const charCode = character.codePointAt(0);
    if (charCode === undefined) {
      throw new Error(`Unable to read column label "${label}"`);
    }
    const position = charCode - 64; // "A" => 1
    return accumulator * 26 + position - 1;
  }, 0);
};

export const indexToColumnLabel = (index: number): string => {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Column index must be a non-negative integer, got "${index}"`);
  }

  if (index === 0) {
    return "A";
  }

  let remainder = index;
  const characters: string[] = [];

  while (remainder >= 0) {
    const modulo = remainder % 26;
    const charCode = 65 + modulo; // "A"
    characters.unshift(String.fromCharCode(charCode));
    remainder = Math.floor(remainder / 26) - 1;
    if (remainder < 0) {
      break;
    }
  }

  return characters.join("");
};

export const parseCellLabel = (label: string): CellCoordinate => {
  const trimmed = label.trim().toUpperCase();
  if (!CELL_LABEL_PATTERN.test(trimmed)) {
    throw new Error(`Invalid cell label "${label}"`);
  }

  const match = trimmed.match(/^([A-Z]+)([0-9]+)$/u);
  if (!match) {
    throw new Error(`Failed to parse cell label "${label}"`);
  }

  const [, columnLabel, rowLabel] = match;
  const column = columnLabelToIndex(columnLabel);
  const rowNumber = Number.parseInt(rowLabel, 10);
  if (!Number.isInteger(rowNumber) || rowNumber <= 0) {
    throw new Error(`Row in cell label "${label}" must be positive`);
  }

  return {
    column,
    row: rowNumber - 1,
  };
};

const resolveSheetIndex = (sheetIdentifier: string, index: WorkbookIndex): { sheetId: string; sheetName: string } => {
  const normalized = normalizeSheetIdentifier(sheetIdentifier);
  const byNameEntry = index.byName.get(normalized);
  if (byNameEntry) {
    return {
      sheetId: byNameEntry.id,
      sheetName: byNameEntry.name,
    };
  }

  const byIdEntry = index.byId.get(sheetIdentifier);
  if (byIdEntry) {
    return {
      sheetId: byIdEntry.id,
      sheetName: byIdEntry.name,
    };
  }

  throw new Error(`Unknown sheet reference "${sheetIdentifier}"`);
};

const stripQuotedSheet = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/gu, "'");
  }
  return trimmed;
};

export const createCellAddressKey = ({ sheetId, column, row }: CellAddress): CellAddressKey => {
  return `${sheetId}|${column}:${row}`;
};

export const parseCellAddressKeyParts = (key: CellAddressKey): { sheetId: string; column: number; row: number } => {
  const [sheetPart, coordinatePart] = key.split("|");
  if (!sheetPart || !coordinatePart) {
    throw new Error(`Invalid cell address key "${key}"`);
  }
  const [columnPart, rowPart] = coordinatePart.split(":");
  if (columnPart === undefined || rowPart === undefined) {
    throw new Error(`Invalid cell coordinate encoding in "${key}"`);
  }
  const column = Number.parseInt(columnPart, 10);
  const row = Number.parseInt(rowPart, 10);
  if (!Number.isInteger(column) || !Number.isInteger(row)) {
    throw new Error(`Invalid numeric coordinates in address key "${key}"`);
  }
  return {
    sheetId: sheetPart,
    column,
    row,
  };
};

export type ParseCellReferenceDependencies = {
  defaultSheetId: string;
  defaultSheetName: string;
  workbookIndex: WorkbookIndex;
};

export const parseCellReference = (
  reference: string,
  { defaultSheetId, defaultSheetName, workbookIndex }: ParseCellReferenceDependencies,
): CellAddress => {
  const exclamationIndex = reference.indexOf("!");
  if (exclamationIndex === -1) {
    const coordinate = parseCellLabel(reference);
    return {
      sheetId: defaultSheetId,
      sheetName: defaultSheetName,
      row: coordinate.row,
      column: coordinate.column,
    };
  }

  const sheetPart = reference.slice(0, exclamationIndex);
  const cellPart = reference.slice(exclamationIndex + 1);
  if (cellPart.length === 0) {
    throw new Error(`Cell reference "${reference}" is missing cell coordinates`);
  }

  const resolvedSheet = resolveSheetIndex(stripQuotedSheet(sheetPart), workbookIndex);
  const coordinate = parseCellLabel(cellPart);
  return {
    sheetId: resolvedSheet.sheetId,
    sheetName: resolvedSheet.sheetName,
    row: coordinate.row,
    column: coordinate.column,
  };
};
