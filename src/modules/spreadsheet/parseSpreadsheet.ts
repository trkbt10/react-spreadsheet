/**
 * @file Utilities for parsing raw spreadsheet JSON fixtures into typed structures.
 */

import type {
  Cell,
  CellId,
  Sheet,
  SpreadSheet,
  SheetVisualElementRegistry,
  SheetVisualElement,
  SheetVisualElementBase,
  SheetImageElement,
  SheetGraphElement,
  VisualElementPosition,
  VisualElementTransform,
  VisualElementVisibility,
  GraphType,
} from "../../types";
import type { GridRange } from "./gridLayout";

const CELL_ID_PATTERN = /^-?\d+:-?\d+$/u;

const CELL_TYPES: ReadonlyArray<Cell["type"]> = [
  "string",
  "number",
  "boolean",
  "null",
  "formula",
];

const GRAPH_TYPES: ReadonlyArray<GraphType> = ["line", "bar", "column", "pie", "area", "scatter"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toFiniteNumber = (value: unknown, label: string): number => {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
};

const toPositiveNumber = (value: unknown, label: string): number => {
  const numberValue = toFiniteNumber(value, label);
  if (numberValue <= 0) {
    throw new Error(`${label} must be greater than zero`);
  }
  return numberValue;
};

const toCellCoordinate = (cellId: CellId): { col: number; row: number } => {
  const [rawCol, rawRow] = cellId.split(":");
  const col = Number(rawCol);
  const row = Number(rawRow);
  if (!Number.isInteger(col) || !Number.isInteger(row)) {
    throw new Error(`Invalid cell coordinate for "${cellId}"`);
  }
  return { col, row };
};

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

const normalizeGridRange = (range: unknown, context: string): GridRange => {
  if (!isRecord(range)) {
    throw new Error(`${context} bounds must be an object`);
  }

  const startCol = toFiniteNumber(range.startCol, `${context} startCol`);
  const endCol = toFiniteNumber(range.endCol, `${context} endCol`);
  const startRow = toFiniteNumber(range.startRow, `${context} startRow`);
  const endRow = toFiniteNumber(range.endRow, `${context} endRow`);

  if (!Number.isInteger(startCol) || !Number.isInteger(endCol) || !Number.isInteger(startRow) || !Number.isInteger(endRow)) {
    throw new Error(`${context} range indices must be integers`);
  }

  if (endCol <= startCol) {
    throw new Error(`${context} endCol must be greater than startCol`);
  }

  if (endRow <= startRow) {
    throw new Error(`${context} endRow must be greater than startRow`);
  }

  return {
    startCol,
    endCol,
    startRow,
    endRow,
  };
};

const normalizeVisibility = (visibility: unknown, sheetName: string, elementId: string): VisualElementVisibility => {
  if (!isRecord(visibility)) {
    throw new Error(`Visual element "${elementId}" in sheet "${sheetName}" requires a visibility object`);
  }

  const hideWhenOutOfBounds = visibility.hideWhenOutOfBounds;
  if (typeof hideWhenOutOfBounds !== "boolean") {
    throw new Error(`Visual element "${elementId}" in sheet "${sheetName}" requires hideWhenOutOfBounds boolean`);
  }

  const bounds = visibility.bounds === undefined ? undefined : normalizeGridRange(visibility.bounds, `Visual element "${elementId}" bounds`);

  return {
    hideWhenOutOfBounds,
    bounds,
  };
};

const normalizePosition = (position: unknown, sheetName: string, elementId: string): VisualElementPosition => {
  if (!isRecord(position)) {
    throw new Error(`Visual element "${elementId}" in sheet "${sheetName}" requires a position object`);
  }

  const x = toFiniteNumber(position.x, `Visual element "${elementId}" position.x`);
  const y = toFiniteNumber(position.y, `Visual element "${elementId}" position.y`);

  const rawZIndex = position.zIndex;
  let zIndex: number | undefined;
  if (rawZIndex !== undefined) {
    zIndex = toFiniteNumber(rawZIndex, `Visual element "${elementId}" position.zIndex`);
  }

  return {
    x,
    y,
    zIndex,
  };
};

const normalizeTransform = (transform: unknown, sheetName: string, elementId: string): VisualElementTransform => {
  if (!isRecord(transform)) {
    throw new Error(`Visual element "${elementId}" in sheet "${sheetName}" requires a transform object`);
  }

  const width = toPositiveNumber(transform.width, `Visual element "${elementId}" width`);
  const height = toPositiveNumber(transform.height, `Visual element "${elementId}" height`);

  const rotation = transform.rotation;
  if (!isRecord(rotation)) {
    throw new Error(`Visual element "${elementId}" in sheet "${sheetName}" requires a rotation object`);
  }

  const angle = toFiniteNumber(rotation.angle, `Visual element "${elementId}" rotation angle`);
  const origin = rotation.origin;
  if (!isRecord(origin)) {
    throw new Error(`Visual element "${elementId}" in sheet "${sheetName}" requires a rotation origin`);
  }

  const { horizontal, vertical } = origin;
  if (horizontal !== "center" || vertical !== "center") {
    throw new Error(`Visual element "${elementId}" in sheet "${sheetName}" only supports center rotation origin`);
  }

  return {
    width,
    height,
    rotation: {
      angle,
      origin: {
        horizontal: "center",
        vertical: "center",
      },
    },
  };
};

const normalizeCellRangeReference = (range: unknown, sheetName: string, elementId: string): { start: CellId; end: CellId } => {
  if (!isRecord(range)) {
    throw new Error(`Graph "${elementId}" in sheet "${sheetName}" requires a range object`);
  }

  const rawStart = range.start;
  const rawEnd = range.end;

  if (typeof rawStart !== "string" || typeof rawEnd !== "string") {
    throw new Error(`Graph "${elementId}" in sheet "${sheetName}" range must provide start and end cell ids`);
  }

  const start = toCellId(rawStart);
  const end = toCellId(rawEnd);

  return {
    start,
    end,
  };
};

const normalizeGraphData = (data: unknown, sheetName: string, elementId: string): SheetGraphElement["data"] => {
  if (!isRecord(data)) {
    throw new Error(`Graph "${elementId}" in sheet "${sheetName}" requires a data object`);
  }

  const range = normalizeCellRangeReference(data.range, sheetName, elementId);

  const { start, end } = range;
  const startCoordinate = toCellCoordinate(start);
  const endCoordinate = toCellCoordinate(end);

  if (endCoordinate.col < startCoordinate.col || endCoordinate.row < startCoordinate.row) {
    throw new Error(`Graph "${elementId}" in sheet "${sheetName}" range end must not precede start`);
  }

  const rawLabelCell = data.labelCell;
  let labelCell: CellId | undefined;
  if (rawLabelCell !== undefined) {
    if (typeof rawLabelCell !== "string") {
      throw new Error(`Graph "${elementId}" in sheet "${sheetName}" labelCell must be a string when provided`);
    }
    labelCell = toCellId(rawLabelCell);
  }

  return {
    range,
    labelCell,
  };
};

const normalizeImageElement = (
  base: SheetVisualElementBase,
  rawElement: Record<string, unknown>,
  sheetName: string,
  elementId: string,
): SheetImageElement => {
  const source = rawElement.source;
  if (typeof source !== "string" || source.length === 0) {
    throw new Error(`Image "${elementId}" in sheet "${sheetName}" requires a non-empty source string`);
  }

  const altTextRaw = rawElement.altText;
  let altText: string | undefined;
  if (altTextRaw !== undefined) {
    if (typeof altTextRaw !== "string") {
      throw new Error(`Image "${elementId}" in sheet "${sheetName}" altText must be a string`);
    }
    altText = altTextRaw;
  }

  return {
    ...base,
    elementType: "image",
    source,
    altText,
  };
};

const normalizeGraphElement = (
  base: SheetVisualElementBase,
  rawElement: Record<string, unknown>,
  sheetName: string,
  elementId: string,
): SheetGraphElement => {
  const graphTypeRaw = rawElement.graphType;
  if (typeof graphTypeRaw !== "string") {
    throw new Error(`Graph "${elementId}" in sheet "${sheetName}" requires a graphType`);
  }
  if (!GRAPH_TYPES.includes(graphTypeRaw as GraphType)) {
    throw new Error(`Graph "${elementId}" in sheet "${sheetName}" uses unsupported graphType "${graphTypeRaw}"`);
  }
  const graphType = graphTypeRaw as GraphType;

  const data = normalizeGraphData(rawElement.data, sheetName, elementId);

  const optionsRaw = rawElement.options;
  let options: Record<string, unknown> | undefined;
  if (optionsRaw !== undefined) {
    if (!isRecord(optionsRaw)) {
      throw new Error(`Graph "${elementId}" in sheet "${sheetName}" options must be an object when provided`);
    }
    options = optionsRaw;
  }

  return {
    ...base,
    elementType: "graph",
    graphType,
    data,
    options,
  };
};

const normalizeVisualElementBase = (
  elementId: string,
  rawElement: unknown,
  sheetName: string,
): SheetVisualElementBase => {
  if (!isRecord(rawElement)) {
    throw new Error(`Visual element "${elementId}" in sheet "${sheetName}" must be an object`);
  }

  const id = rawElement.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`Visual element "${elementId}" in sheet "${sheetName}" requires an id`);
  }
  if (id !== elementId) {
    throw new Error(`Visual element id mismatch for "${elementId}" in sheet "${sheetName}"`);
  }

  const anchorCellRaw = rawElement.anchorCell;
  if (typeof anchorCellRaw !== "string") {
    throw new Error(`Visual element "${elementId}" in sheet "${sheetName}" requires an anchorCell`);
  }
  const anchorCell = toCellId(anchorCellRaw);

  const position = normalizePosition(rawElement.position, sheetName, elementId);
  const visibility = normalizeVisibility(rawElement.visibility, sheetName, elementId);
  const transform = normalizeTransform(rawElement.transform, sheetName, elementId);

  const base: SheetVisualElementBase = {
    id,
    anchorCell,
    position,
    visibility,
    transform,
  };

  return base;
};

const normalizeVisualElement = (
  elementId: string,
  rawElement: unknown,
  sheetName: string,
): SheetVisualElement => {
  if (!isRecord(rawElement)) {
    throw new Error(`Visual element "${elementId}" in sheet "${sheetName}" must be an object`);
  }

  const base = normalizeVisualElementBase(elementId, rawElement, sheetName);

  const elementType = rawElement.elementType;
  if (elementType === "image") {
    return normalizeImageElement(base, rawElement, sheetName, elementId);
  }
  if (elementType === "graph") {
    return normalizeGraphElement(base, rawElement, sheetName, elementId);
  }

  throw new Error(`Visual element "${elementId}" in sheet "${sheetName}" uses unsupported elementType "${String(elementType)}"`);
};

const normalizeVisualElements = (
  visualElements: unknown,
  sheetName: string,
): SheetVisualElementRegistry | undefined => {
  if (visualElements === undefined) {
    return undefined;
  }

  if (!isRecord(visualElements)) {
    throw new Error(`Visual elements for sheet "${sheetName}" must be an object map`);
  }

  const normalized: SheetVisualElementRegistry = {};
  for (const [elementId, rawElement] of Object.entries(visualElements)) {
    normalized[elementId] = normalizeVisualElement(elementId, rawElement, sheetName);
  }

  return normalized;
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

  const visualElements = normalizeVisualElements(sheet.visualElements, name);

  return {
    name,
    id,
    cells: normalizeCells(cells, name),
    visualElements,
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
