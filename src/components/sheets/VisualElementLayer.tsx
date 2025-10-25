/**
 * @file Overlay layer for rendering sheet visual elements such as images and graphs.
 */

import { useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";
import type {
  CellId,
  Sheet,
  SheetGraphElement,
  SheetImageElement,
  SheetVisualElement,
  SheetVisualElementRegistry,
} from "../../types";
import type { ViewportRect } from "../../hooks/useVirtualScroll";
import { GraphRenderer, type GraphDataPoint } from "../graph/GraphRenderer";
import styles from "./VisualElementLayer.module.css";

const HEADER_ROW_HEIGHT = 24;
const HEADER_COLUMN_WIDTH = 48;

const DEFAULT_ELEMENT_Z_INDEX = 12;

const parseCellId = (cellId: CellId): { col: number; row: number } => {
  const [rawCol, rawRow] = cellId.split(":");
  const col = Number(rawCol);
  const row = Number(rawRow);

  if (!Number.isInteger(col) || !Number.isInteger(row)) {
    throw new Error(`Invalid cell id "${cellId}"`);
  }

  return { col, row };
};

const makeCellKey = (col: number, row: number): `${number}:${number}` => {
  return `${col}:${row}` as `${number}:${number}`;
};

const isNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

const computeGraphDataPoints = (sheet: Sheet, element: SheetGraphElement): GraphDataPoint[] => {
  const { range } = element.data;
  const start = parseCellId(range.start);
  const end = parseCellId(range.end);

  const startCol = Math.min(start.col, end.col);
  const endCol = Math.max(start.col, end.col);
  const startRow = Math.min(start.row, end.row);
  const endRow = Math.max(start.row, end.row);

  const labelColumn = startCol !== endCol ? startCol : undefined;
  const valueColumn = endCol;

  const points: GraphDataPoint[] = [];

  for (let row = startRow; row <= endRow; row++) {
    const valueCell = sheet.cells[makeCellKey(valueColumn, row)];
    if (!valueCell || !isNumber(valueCell.value)) {
      continue;
    }

    const labelCell = labelColumn !== undefined ? sheet.cells[makeCellKey(labelColumn, row)] : undefined;
    const fallbackLabelIndex = points.length + 1;
    const label =
      typeof labelCell?.value === "string" && labelCell.value.length > 0 ? labelCell.value : `Row ${fallbackLabelIndex}`;

    points.push({ label, value: valueCell.value });
  }

  return points;
};

const extractGraphTitle = (sheet: Sheet, element: SheetGraphElement): string | undefined => {
  const labelCellId = element.data.labelCell;
  if (!labelCellId) {
    return undefined;
  }

  const cell = sheet.cells[labelCellId];
  if (cell && typeof cell.value === "string" && cell.value.length > 0) {
    return cell.value;
  }

  return undefined;
};

const withinBounds = (element: SheetVisualElement, coordinates: { col: number; row: number }): boolean => {
  const bounds = element.visibility.bounds;
  if (!bounds) {
    return true;
  }

  const { startCol, endCol, startRow, endRow } = bounds;
  return (
    coordinates.col >= startCol &&
    coordinates.col < endCol &&
    coordinates.row >= startRow &&
    coordinates.row < endRow
  );
};

const intersectsViewport = (
  element: SheetVisualElement,
  viewport: ViewportRect,
): boolean => {
  const width = element.transform.width;
  const height = element.transform.height;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  const left = element.position.x - halfWidth;
  const right = element.position.x + halfWidth;
  const top = element.position.y - halfHeight;
  const bottom = element.position.y + halfHeight;

  const viewportRight = viewport.left + viewport.width;
  const viewportBottom = viewport.top + viewport.height;

  return !(right < viewport.left || left > viewportRight || bottom < viewport.top || top > viewportBottom);
};

const createElementStyle = (
  element: SheetVisualElement,
  viewport: ViewportRect,
): CSSProperties => {
  const { position, transform } = element;

  return {
    left: position.x - viewport.left + HEADER_COLUMN_WIDTH,
    top: position.y - viewport.top + HEADER_ROW_HEIGHT,
    width: transform.width,
    height: transform.height,
    transform: `translate(-50%, -50%) rotate(${transform.rotation.angle}deg)`,
    zIndex: position.zIndex ?? DEFAULT_ELEMENT_Z_INDEX,
  };
};

const renderImageElement = (
  element: SheetImageElement,
  sheet: Sheet,
  viewport: ViewportRect,
): ReactElement | null => {
  const anchorCoordinates = parseCellId(element.anchorCell);
  if (!withinBounds(element, anchorCoordinates)) {
    return null;
  }

  if (element.visibility.hideWhenOutOfBounds && (viewport.width === 0 || viewport.height === 0)) {
    return null;
  }

  if (element.visibility.hideWhenOutOfBounds && !intersectsViewport(element, viewport)) {
    return null;
  }

  const style = createElementStyle(element, viewport);

  return (
    <div
      key={element.id}
      className={styles.element}
      data-element-type="image"
      style={style}
      aria-label={element.altText}
    >
      <img className={styles.image} src={element.source} alt={element.altText ?? ""} draggable={false} />
    </div>
  );
};

const renderGraphElement = (
  element: SheetGraphElement,
  sheet: Sheet,
  viewport: ViewportRect,
): ReactElement | null => {
  const anchorCoordinates = parseCellId(element.anchorCell);
  if (!withinBounds(element, anchorCoordinates)) {
    return null;
  }

  if (element.visibility.hideWhenOutOfBounds && (viewport.width === 0 || viewport.height === 0)) {
    return null;
  }

  if (element.visibility.hideWhenOutOfBounds && !intersectsViewport(element, viewport)) {
    return null;
  }

  const dataPoints = computeGraphDataPoints(sheet, element);
  if (dataPoints.length === 0) {
    return null;
  }

  const style = createElementStyle(element, viewport);
  const title = extractGraphTitle(sheet, element);

  return (
    <div key={element.id} className={`${styles.element} ${styles.graph}`} data-element-type="graph" style={style}>
      <GraphRenderer element={element} data={dataPoints} title={title} />
    </div>
  );
};

const renderVisualElement = (
  element: SheetVisualElement,
  sheet: Sheet,
  viewport: ViewportRect,
): ReactElement | null => {
  if (element.elementType === "image") {
    return renderImageElement(element, sheet, viewport);
  }
  if (element.elementType === "graph") {
    return renderGraphElement(element, sheet, viewport);
  }
  return null;
};

const sortVisualElements = (visualElements: SheetVisualElementRegistry): SheetVisualElement[] => {
  return Object.values(visualElements)
    .filter((element): element is SheetVisualElement => element !== undefined)
    .sort((a, b) => {
      const zIndexA = a.position.zIndex ?? DEFAULT_ELEMENT_Z_INDEX;
      const zIndexB = b.position.zIndex ?? DEFAULT_ELEMENT_Z_INDEX;
      if (zIndexA === zIndexB) {
        return a.id.localeCompare(b.id);
      }
      return zIndexA - zIndexB;
    });
};

export type VisualElementLayerProps = {
  sheet: Sheet;
  viewport: ViewportRect;
};

/**
 * Overlay layer for sheet visual elements.
 * @param props - Component props
 * @returns Visual element layer or null when no elements exist
 */
export const VisualElementLayer = ({ sheet, viewport }: VisualElementLayerProps): ReactElement | null => {
  const elements = useMemo(() => {
    if (!sheet.visualElements) {
      return [];
    }
    return sortVisualElements(sheet.visualElements);
  }, [sheet.visualElements]);

  if (elements.length === 0) {
    return null;
  }

  return (
    <div className={styles.layer}>
      {elements.map((element) => renderVisualElement(element, sheet, viewport))}
    </div>
  );
};
