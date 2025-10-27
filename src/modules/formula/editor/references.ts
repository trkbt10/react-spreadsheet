/**
 * @file Utilities for parsing and formatting formula references for editor interactions.
 */

import type { CellRange } from "../../spreadsheet/formulaTargetingTypes";

type ParsedReference = {
  readonly range: CellRange;
  readonly sheetName: string | null;
};

const SINGLE_REFERENCE_PATTERN =
  /^(?<sheet>(?:'[^']+'|[^'!]+)!)?(?<cell>\$?[A-Za-z]+\$?\d+)$/u;
const RANGE_REFERENCE_PATTERN =
  /^(?<sheet>(?:'[^']+'|[^'!]+)!)?(?<start>\$?[A-Za-z]+\$?\d+)\s*:\s*(?<end>\$?[A-Za-z]+\$?\d+)$/u;

const stripQuotes = (value: string): string => {
  if (!value.startsWith("'")) {
    return value;
  }
  const withoutLeading = value.slice(1);
  if (!withoutLeading.endsWith("'")) {
    return withoutLeading;
  }
  const withoutTrailing = withoutLeading.slice(0, -1);
  return withoutTrailing.replace(/''/gu, "'");
};

const normalizeSheetSegment = (segment: string | undefined): string | null => {
  if (!segment) {
    return null;
  }
  const withoutSuffix = segment.endsWith("!") ? segment.slice(0, -1) : segment;
  return stripQuotes(withoutSuffix);
};

const stripAbsoluteMarkers = (label: string): string => label.replace(/\$/gu, "");

const columnLabelToIndex = (label: string): number => {
  const normalized = stripAbsoluteMarkers(label).toUpperCase();
  const characters = Array.from(normalized);
  const base = characters.reduce((accumulator, character) => {
    const value = character.codePointAt(0);
    if (value === undefined) {
      return accumulator;
    }
    const next = accumulator * 26 + (value - 64);
    return next;
  }, 0);
  return base - 1;
};

const rowLabelToIndex = (label: string): number => {
  const digits = stripAbsoluteMarkers(label);
  return Number.parseInt(digits, 10) - 1;
};

const createCellRange = (
  startColumn: number,
  startRow: number,
  endColumn: number,
  endRow: number,
): CellRange => {
  const minColumn = Math.min(startColumn, endColumn);
  const maxColumn = Math.max(startColumn, endColumn);
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);

  return {
    startCol: minColumn,
    startRow: minRow,
    endCol: maxColumn + 1,
    endRow: maxRow + 1,
  };
};

export const parseReferenceToCellRange = (reference: string): ParsedReference | null => {
  const trimmed = reference.trim();
  const rangeMatch = trimmed.match(RANGE_REFERENCE_PATTERN);
  if (rangeMatch?.groups) {
    const sheetName = normalizeSheetSegment(rangeMatch.groups.sheet);
    const start = stripAbsoluteMarkers(rangeMatch.groups.start);
    const end = stripAbsoluteMarkers(rangeMatch.groups.end);
    const columnPattern = /[A-Za-z]+/u;
    const rowPattern = /\d+/u;

    const startColumnMatch = start.match(columnPattern);
    const startRowMatch = start.match(rowPattern);
    const endColumnMatch = end.match(columnPattern);
    const endRowMatch = end.match(rowPattern);

    if (!startColumnMatch || !startRowMatch || !endColumnMatch || !endRowMatch) {
      return null;
    }

    const startColumn = columnLabelToIndex(startColumnMatch[0] ?? "");
    const startRow = rowLabelToIndex(startRowMatch[0] ?? "");
    const endColumn = columnLabelToIndex(endColumnMatch[0] ?? "");
    const endRow = rowLabelToIndex(endRowMatch[0] ?? "");

    return {
      range: createCellRange(startColumn, startRow, endColumn, endRow),
      sheetName,
    };
  }

  const singleMatch = trimmed.match(SINGLE_REFERENCE_PATTERN);
  if (singleMatch?.groups) {
    const sheetName = normalizeSheetSegment(singleMatch.groups.sheet);
    const cell = stripAbsoluteMarkers(singleMatch.groups.cell);
    const columnPattern = /[A-Za-z]+/u;
    const rowPattern = /\d+/u;

    const columnMatch = cell.match(columnPattern);
    const rowMatch = cell.match(rowPattern);

    if (!columnMatch || !rowMatch) {
      return null;
    }

    const column = columnLabelToIndex(columnMatch[0] ?? "");
    const row = rowLabelToIndex(rowMatch[0] ?? "");

    return {
      range: {
        startCol: column,
        startRow: row,
        endCol: column + 1,
        endRow: row + 1,
      },
      sheetName,
    };
  }

  return null;
};

const indexToColumnLabel = (index: number): string => {
  if (index < 0) {
    return "";
  }
  const quotient = Math.floor(index / 26) - 1;
  const remainder = index % 26;
  const current = String.fromCharCode(65 + remainder);
  const prefix = quotient >= 0 ? indexToColumnLabel(quotient) : "";
  return `${prefix}${current}`;
};

const formatCellLabel = (column: number, row: number): string => {
  const columnLabel = indexToColumnLabel(column);
  const rowLabel = String(row + 1);
  return `${columnLabel}${rowLabel}`;
};

export const formatReferenceFromRange = (range: CellRange, sheetName: string | null): string => {
  const isSingleColumn = range.endCol - range.startCol === 1;
  const isSingleRow = range.endRow - range.startRow === 1;
  const sheetPrefix = sheetName ? `${sheetName.includes(" ") ? `'${sheetName.replace(/'/gu, "''")}'` : sheetName}!` : "";

  if (isSingleColumn && isSingleRow) {
    return `${sheetPrefix}${formatCellLabel(range.startCol, range.startRow)}`;
  }

  const startLabel = formatCellLabel(range.startCol, range.startRow);
  const endLabel = formatCellLabel(range.endCol - 1, range.endRow - 1);
  return `${sheetPrefix}${startLabel}:${endLabel}`;
};
