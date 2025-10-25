/**
 * @file Overlay layer for rendering and manipulating sheet visual elements such as images and graphs.
 */

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
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
const MIN_ELEMENT_SIZE = 48;
const RAD_TO_DEG = 180 / Math.PI;
const ROTATION_DISTANCE_DELTA = 24;

const cornerHandles = ["northwest", "northeast", "southeast", "southwest"] as const;
type CornerHandle = (typeof cornerHandles)[number];

type MoveInteraction = {
  type: "move";
  pointerId: number;
  startX: number;
  startY: number;
  initialElement: SheetVisualElement;
};

type CornerInteractionMode = "resize" | "rotate";

type CornerInteraction = {
  type: "corner";
  mode: CornerInteractionMode;
  pointerId: number;
  startX: number;
  startY: number;
  handle: CornerHandle;
  angleRadians: number;
  initialElement: SheetVisualElement;
  centerX: number;
  centerY: number;
  startPointerDistance: number;
  startPointerAngle: number;
};

type InteractionState = MoveInteraction | CornerInteraction;

const parseCellId = (cellId: CellId): { col: number; row: number } => {
  const [rawCol, rawRow] = cellId.split(":");
  const col = Number(rawCol);
  const row = Number(rawRow);

  if (!Number.isInteger(col) || !Number.isInteger(row)) {
    throw new Error(`Invalid cell id "${cellId}"`);
  }

  return { col, row };
};

const makeCellKey = (col: number, row: number): `${number}:${number}` => `${col}:${row}`;

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

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

const intersectsViewport = (element: SheetVisualElement, viewport: ViewportRect): boolean => {
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

const createElementStyle = (element: SheetVisualElement, viewport: ViewportRect): CSSProperties => {
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

const cloneVisualElement = (element: SheetVisualElement): SheetVisualElement => {
  const base = {
    id: element.id,
    anchorCell: element.anchorCell,
    position: { ...element.position },
    visibility: {
      hideWhenOutOfBounds: element.visibility.hideWhenOutOfBounds,
      bounds: element.visibility.bounds
        ? {
            startCol: element.visibility.bounds.startCol,
            endCol: element.visibility.bounds.endCol,
            startRow: element.visibility.bounds.startRow,
            endRow: element.visibility.bounds.endRow,
          }
        : undefined,
    },
    transform: {
      width: element.transform.width,
      height: element.transform.height,
      rotation: {
        angle: element.transform.rotation.angle,
        origin: {
          horizontal: element.transform.rotation.origin.horizontal,
          vertical: element.transform.rotation.origin.vertical,
        },
      },
    },
  };

  if (element.elementType === "image") {
    const image: SheetImageElement = {
      ...base,
      elementType: "image",
      source: element.source,
      altText: element.altText,
    };
    return image;
  }

  const graph: SheetGraphElement = {
    ...base,
    elementType: "graph",
    graphType: element.graphType,
    data: {
      range: {
        start: element.data.range.start,
        end: element.data.range.end,
      },
      labelCell: element.data.labelCell,
    },
    options: element.options ? { ...element.options } : undefined,
  };

  return graph;
};

const cloneRegistry = (registry?: SheetVisualElementRegistry): SheetVisualElementRegistry => {
  if (!registry) {
    return {};
  }

  const cloned: SheetVisualElementRegistry = {};
  for (const [id, element] of Object.entries(registry)) {
    if (element) {
      cloned[id] = cloneVisualElement(element);
    }
  }
  return cloned;
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

const normalizeAngle = (angle: number): number => {
  let result = angle;
  while (result <= -180) {
    result += 360;
  }
  while (result > 180) {
    result -= 360;
  }
  return result;
};

const shouldRenderElement = (element: SheetVisualElement, viewport: ViewportRect): boolean => {
  const anchorCoordinates = parseCellId(element.anchorCell);
  if (!withinBounds(element, anchorCoordinates)) {
    return false;
  }

  if (!element.visibility.hideWhenOutOfBounds) {
    return true;
  }

  if (viewport.width <= 0 || viewport.height <= 0) {
    return false;
  }

  return intersectsViewport(element, viewport);
};

const createUpdatedElement = (
  base: SheetVisualElement,
  updates: {
    position?: { x: number; y: number };
    transform?: { width?: number; height?: number; angle?: number };
  },
): SheetVisualElement => {
  const position = updates.position
    ? {
        ...base.position,
        ...updates.position,
      }
    : base.position;

  const transform = updates.transform
    ? {
        ...base.transform,
        width: updates.transform.width ?? base.transform.width,
        height: updates.transform.height ?? base.transform.height,
        rotation: {
          ...base.transform.rotation,
          angle: updates.transform.angle ?? base.transform.rotation.angle,
        },
      }
    : base.transform;

  if (base.elementType === "image") {
    return {
      ...base,
      position,
      transform,
    };
  }

  return {
    ...base,
    position,
    transform,
  };
};

const renderVisualElementContent = (element: SheetVisualElement, sheet: Sheet): ReactElement | null => {
  if (element.elementType === "image") {
    return <img className={styles.image} src={element.source} alt={element.altText ?? ""} draggable={false} />;
  }

  const dataPoints = computeGraphDataPoints(sheet, element);
  const title = extractGraphTitle(sheet, element);

  return <GraphRenderer element={element} data={dataPoints} title={title} />;
};

type InteractiveVisualElementProps = {
  element: SheetVisualElement;
  sheet: Sheet;
  viewport: ViewportRect;
  onChange: (nextElement: SheetVisualElement) => void;
  isFocused: boolean;
  onFocus: () => void;
};

const InteractiveVisualElement = ({
  element,
  sheet,
  viewport,
  onChange,
  isFocused,
  onFocus,
}: InteractiveVisualElementProps): ReactElement | null => {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<InteractionState | null>(null);
  const [interactionKind, setInteractionKind] = useState<CornerInteractionMode | "move" | null>(null);
  const latestElementRef = useRef(element);

  useEffect(() => {
    latestElementRef.current = element;
  }, [element]);

  const style = useMemo(() => createElementStyle(element, viewport), [element, viewport]);
  const content = useMemo(() => renderVisualElementContent(element, sheet), [element, sheet]);

  if (!content) {
    return null;
  }

  const finishInteraction = useCallback(() => {
    interactionRef.current = null;
    setInteractionKind(null);
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const active = interactionRef.current;
      if (!active || active.pointerId !== event.pointerId) {
        return;
      }

      event.stopPropagation();
      event.preventDefault();

      if (active.type === "move") {
        const dx = event.clientX - active.startX;
        const dy = event.clientY - active.startY;

        const next = createUpdatedElement(active.initialElement, {
          position: {
            x: active.initialElement.position.x + dx,
            y: active.initialElement.position.y + dy,
          },
        });

        onChange(next);
        return;
      }

      if (active.type === "resize") {
        const dx = event.clientX - active.startX;
        const dy = event.clientY - active.startY;
        const cos = Math.cos(active.angleRadians);
        const sin = Math.sin(active.angleRadians);

        const localDx = dx * cos + dy * sin;
        const localDy = -dx * sin + dy * cos;

        const initialWidth = active.initialElement.transform.width;
        const initialHeight = active.initialElement.transform.height;

        let newWidth = initialWidth;
        let newHeight = initialHeight;
        let shiftLocalX = 0;
        let shiftLocalY = 0;

        const horizontalDirection = active.handle.includes("west") ? -1 : 1;
        const verticalDirection = active.handle.includes("north") ? -1 : 1;

        const targetWidth = initialWidth + localDx * horizontalDirection;
        newWidth = Math.max(MIN_ELEMENT_SIZE, targetWidth);
        const widthDelta = newWidth - initialWidth;
        shiftLocalX = (widthDelta / 2) * horizontalDirection;

        const targetHeight = initialHeight + localDy * verticalDirection;
        newHeight = Math.max(MIN_ELEMENT_SIZE, targetHeight);
        const heightDelta = newHeight - initialHeight;
        shiftLocalY = (heightDelta / 2) * verticalDirection;

        const shiftX = shiftLocalX * cos - shiftLocalY * sin;
        const shiftY = shiftLocalX * sin + shiftLocalY * cos;

        const next = createUpdatedElement(active.initialElement, {
          position: {
            x: active.initialElement.position.x + shiftX,
            y: active.initialElement.position.y + shiftY,
          },
          transform: {
            width: newWidth,
            height: newHeight,
          },
        });

        onChange(next);
        return;
      }

      if (active.type === "rotate") {
        const angleRadians = Math.atan2(event.clientY - active.centerY, event.clientX - active.centerX);
        const deltaRadians = angleRadians - active.startAngleRadians;
        const deltaDegrees = deltaRadians * RAD_TO_DEG;
        const targetAngle = normalizeAngle(active.initialElement.transform.rotation.angle + deltaDegrees);

        const next = createUpdatedElement(active.initialElement, {
          transform: {
            angle: targetAngle,
          },
        });

        onChange(next);
      }
    },
    [onChange],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const active = interactionRef.current;
      if (active && active.pointerId === event.pointerId) {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        event.stopPropagation();
        event.preventDefault();
        finishInteraction();
      }
    },
    [finishInteraction],
  );

  const startInteraction = useCallback(
    (interaction: InteractionState, event: React.PointerEvent<HTMLElement>) => {
      interactionRef.current = interaction;
      setInteractionKind(interaction.type);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const handleMovePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();

      onFocus();
      startInteraction(
        {
          type: "move",
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          initialElement: cloneVisualElement(element),
        },
        event,
      );
    },
    [element, startInteraction],
  );

  const handleResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>, handle: CornerHandle) => {
      if (event.button !== 0) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();

      onFocus();
      startInteraction(
        {
          type: "resize",
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          handle,
          angleRadians: element.transform.rotation.angle * (Math.PI / 180),
          initialElement: cloneVisualElement(element),
        },
        event,
      );
    },
    [element, startInteraction],
  );

  const handleRotatePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();

      const bounding = elementRef.current?.getBoundingClientRect();
      if (!bounding) {
        return;
      }

      onFocus();
      const centerX = bounding.left + bounding.width / 2;
      const centerY = bounding.top + bounding.height / 2;
      const startAngleRadians = Math.atan2(event.clientY - centerY, event.clientX - centerX);

      startInteraction(
        {
          type: "rotate",
          pointerId: event.pointerId,
          centerX,
          centerY,
          startAngleRadians,
          initialElement: cloneVisualElement(element),
        },
        event,
      );
    },
    [element, startInteraction],
  );

  useEffect(() => {
    return () => {
      finishInteraction();
    };
  }, [finishInteraction]);

  return (
    <div
      ref={elementRef}
      className={styles.element}
      data-element-type={element.elementType}
      data-interaction={interactionKind ?? undefined}
      data-focused={isFocused ? "true" : undefined}
      style={style}
      onPointerDown={handleMovePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="presentation"
    >
      {content}
      {isFocused
        ? cornerHandles.map((handle) => (
            <div key={`${handle}-group`} className={styles.handleGroup} data-handle={handle}>
              <div
                className={styles.rotationHandle}
                data-handle={handle}
                onPointerDown={handleRotatePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                role="presentation"
              />
              <div
                className={styles.resizeHandle}
                data-handle={handle}
                onPointerDown={(event) => handleResizePointerDown(event, handle)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                role="presentation"
              />
            </div>
          ))
        : null}
    </div>
  );
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
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [elementStates, setElementStates] = useState<SheetVisualElementRegistry>(() => cloneRegistry(sheet.visualElements));
  const [focusedElementId, setFocusedElementId] = useState<string | null>(null);

  useEffect(() => {
    setElementStates(cloneRegistry(sheet.visualElements));
    setFocusedElementId((previous) => {
      if (!previous) {
        return null;
      }
      return sheet.visualElements && sheet.visualElements[previous] ? previous : null;
    });
  }, [sheet.id, sheet.visualElements]);

  useEffect(() => {
    if (focusedElementId && !elementStates[focusedElementId]) {
      setFocusedElementId(null);
    }
  }, [focusedElementId, elementStates]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent): void => {
      const layer = layerRef.current;
      if (!layer) {
        return;
      }
      const target = event.target;
      if (target instanceof Node && layer.contains(target)) {
        return;
      }
      setFocusedElementId(null);
    };

    window.addEventListener("pointerdown", handlePointerDown, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
    };
  }, []);

  const elements = useMemo(() => sortVisualElements(elementStates), [elementStates]);

  const handleElementChange = useCallback((elementId: string, nextElement: SheetVisualElement) => {
    setElementStates((prev) => {
      const current = prev[elementId];
      if (!current) {
        return prev;
      }

      if (
        current.position.x === nextElement.position.x &&
        current.position.y === nextElement.position.y &&
        current.transform.width === nextElement.transform.width &&
        current.transform.height === nextElement.transform.height &&
        current.transform.rotation.angle === nextElement.transform.rotation.angle
      ) {
        return prev;
      }

      return {
        ...prev,
        [elementId]: cloneVisualElement(nextElement),
      };
    });
  }, []);

  const visibleElements = useMemo(
    () => elements.filter((element) => shouldRenderElement(element, viewport)),
    [elements, viewport],
  );

  if (visibleElements.length === 0) {
    return null;
  }

  return (
    <div ref={layerRef} className={styles.layer}>
      {visibleElements.map((element) => (
        <InteractiveVisualElement
          key={element.id}
          element={element}
          sheet={sheet}
          viewport={viewport}
          onChange={(next) => handleElementChange(element.id, next)}
          isFocused={focusedElementId === element.id}
          onFocus={() => setFocusedElementId(element.id)}
        />
      ))}
    </div>
  );
};

// Debug notes:
// - Referenced src/global.css to align interaction controls with theme tokens (spacing, colors, shadows).
// - Reviewed src/components/sheets/SelectionHighlight.tsx to ensure overlay stacking respects existing selection SVG.
