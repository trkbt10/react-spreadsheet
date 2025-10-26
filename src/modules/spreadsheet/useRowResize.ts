/**
 * @file Hook for handling row resize operations.
 */

import { useCallback, useRef, useEffect } from "react";
import type { BoundActionCreators } from "../../utils/typedActions";
import type { sheetActions } from "./sheetActions";
import type { RowSizeMap } from "./gridLayout";

export type UseRowResizeParams = {
  actions: BoundActionCreators<typeof sheetActions>;
  defaultCellHeight: number;
  rowSizes: RowSizeMap;
};

export type UseRowResizeReturn = {
  handleRowResizeStart: (row: number, clientY: number) => void;
};

/**
 * Hook for handling row resize via drag.
 * @param params - Configuration parameters
 * @returns Row resize handlers
 */
export const useRowResize = ({ actions, defaultCellHeight, rowSizes }: UseRowResizeParams): UseRowResizeReturn => {
  const resizeStateRef = useRef<{
    row: number;
    startY: number;
    startHeight: number;
  } | null>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!resizeStateRef.current) {
        return;
      }

      const { row, startY, startHeight } = resizeStateRef.current;
      const deltaY = e.clientY - startY;
      const newHeight = Math.max(16, startHeight + deltaY);

      actions.setRowHeight(row, newHeight);
    },
    [actions],
  );

  const handleMouseUp = useCallback(() => {
    resizeStateRef.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const handleRowResizeStart = useCallback(
    (row: number, clientY: number) => {
      const customHeight = rowSizes.get(row);
      const startHeight = customHeight === undefined ? defaultCellHeight : customHeight;

      resizeStateRef.current = {
        row,
        startY: clientY,
        startHeight,
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [defaultCellHeight, rowSizes, handleMouseMove, handleMouseUp],
  );

  useEffect(() => {
    return (): void => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return {
    handleRowResizeStart,
  };
};
