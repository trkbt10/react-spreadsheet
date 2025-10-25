/**
 * @file High-performance rect state management hook.
 * Optimized for frequent updates during drag operations.
 */

import { useRef, useCallback } from "react";
import type { Rect, Point } from "./types";
import { createRectFromPoints, rectEquals } from "./rectUtils";

export type RectStateActions = {
  /**
   * Start rect selection from a point.
   * @param point - Starting point
   */
  startRect: (point: Point) => void;

  /**
   * Update rect to current drag position.
   * Only triggers update if rect actually changed.
   * @param point - Current point
   */
  updateRect: (point: Point) => void;

  /**
   * End rect selection.
   */
  endRect: () => void;

  /**
   * Clear rect.
   */
  clearRect: () => void;

  /**
   * Set rect directly.
   * @param rect - New rect value
   */
  setRect: (rect: Rect | null) => void;
};

export type UseRectStateReturn = {
  getCurrentRect: () => Rect | null;
  isDragging: () => boolean;
  actions: RectStateActions;
};

/**
 * High-performance rect state hook.
 * Uses refs to avoid re-renders during drag operations.
 * Consumer should subscribe to state changes via onChange callback.
 * @param onChange - Callback when rect changes
 * @returns Rect state accessors and actions
 */
export const useRectState = (onChange?: (rect: Rect | null) => void): UseRectStateReturn => {
  const rectRef = useRef<Rect | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<Point | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep onChange callback fresh without re-creating actions
  onChangeRef.current = onChange;

  const notifyChange = useCallback((newRect: Rect | null): void => {
    if (!rectEquals(rectRef.current, newRect)) {
      rectRef.current = newRect;
      onChangeRef.current?.(newRect);
    }
  }, []);

  const startRect = useCallback(
    (point: Point): void => {
      isDraggingRef.current = true;
      dragStartRef.current = point;
      const newRect: Rect = { x: point.x, y: point.y, width: 0, height: 0 };
      notifyChange(newRect);
    },
    [notifyChange],
  );

  const updateRect = useCallback(
    (point: Point): void => {
      if (!isDraggingRef.current || !dragStartRef.current) {
        return;
      }

      const newRect = createRectFromPoints(dragStartRef.current, point);

      // Only update if rect actually changed (optimization for high-frequency updates)
      if (!rectEquals(rectRef.current, newRect)) {
        notifyChange(newRect);
      }
    },
    [notifyChange],
  );

  const endRect = useCallback((): void => {
    isDraggingRef.current = false;
    // Keep rect after drag ends - don't clear dragStartRef yet for potential use
  }, []);

  const clearRect = useCallback((): void => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
    notifyChange(null);
  }, [notifyChange]);

  const setRect = useCallback(
    (rect: Rect | null): void => {
      notifyChange(rect);
    },
    [notifyChange],
  );

  const getCurrentRect = useCallback((): Rect | null => {
    return rectRef.current;
  }, []);

  const isDragging = useCallback((): boolean => {
    return isDraggingRef.current;
  }, []);

  const actions = useRef<RectStateActions>({
    startRect,
    updateRect,
    endRect,
    clearRect,
    setRect,
  }).current;

  return {
    getCurrentRect,
    isDragging,
    actions,
  };
};
