/**
 * @file Hook for handling pointer events on sheet container for rect-based selection.
 */

import { useCallback, useRef } from "react";
import type { PointerEvent } from "react";
import type { BoundActionCreators } from "../../utils/typedActions";
import type { sheetActions } from "./sheetActions";

export type UseSheetPointerEventsParams = {
  actions: BoundActionCreators<typeof sheetActions>;
  scrollLeft: number;
  scrollTop: number;
};

export type UseSheetPointerEventsReturn = {
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerUp: (event: PointerEvent<HTMLDivElement>) => void;
};

/**
 * Hook for handling pointer events on sheet container.
 * Provides rect-based selection from which cell ranges are derived.
 * @param params - Configuration parameters
 * @returns Pointer event handlers
 */
export const useSheetPointerEvents = ({
  actions,
  scrollLeft,
  scrollTop,
}: UseSheetPointerEventsParams): UseSheetPointerEventsReturn => {
  const isDraggingRef = useRef(false);

  const getPositionFromPointer = useCallback(
    (event: PointerEvent<HTMLDivElement>): { x: number; y: number } | null => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left + scrollLeft;
      const y = event.clientY - rect.top + scrollTop;

      if (x < 0 || y < 0) {
        return null;
      }

      return { x, y };
    },
    [scrollLeft, scrollTop],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      const pos = getPositionFromPointer(event);
      if (!pos) {
        return;
      }

      isDraggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);

      actions.startRectSelection(pos.x, pos.y);
    },
    [getPositionFromPointer, actions],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      if (!isDraggingRef.current) {
        return;
      }

      const pos = getPositionFromPointer(event);
      if (!pos) {
        return;
      }

      actions.updateRectSelection(pos.x, pos.y);
    },
    [getPositionFromPointer, actions],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      if (!isDraggingRef.current) {
        return;
      }

      isDraggingRef.current = false;
      event.currentTarget.releasePointerCapture(event.pointerId);

      actions.endRectSelection();
    },
    [actions],
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};
