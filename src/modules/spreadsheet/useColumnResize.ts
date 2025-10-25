/**
 * @file Hook for handling column resize operations.
 */

import { useCallback, useRef, useEffect } from "react";
import type { BoundActionCreators } from "../../utils/typedActions";
import type { sheetActions } from "./sheetActions";
import type { ColumnSizeMap } from "./gridLayout";

export type UseColumnResizeParams = {
  actions: BoundActionCreators<typeof sheetActions>;
  defaultCellWidth: number;
  columnSizes: ColumnSizeMap;
};

export type UseColumnResizeReturn = {
  handleColumnResizeStart: (col: number, clientX: number) => void;
};

/**
 * Hook for handling column resize via drag.
 * @param params - Configuration parameters
 * @returns Column resize handlers
 */
export const useColumnResize = ({
  actions,
  defaultCellWidth,
  columnSizes,
}: UseColumnResizeParams): UseColumnResizeReturn => {
  const resizeStateRef = useRef<{
    col: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!resizeStateRef.current) {
        return;
      }

      const { col, startX, startWidth } = resizeStateRef.current;
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(20, startWidth + deltaX);

      actions.setColumnWidth(col, newWidth);
    },
    [actions],
  );

  const handleMouseUp = useCallback(() => {
    resizeStateRef.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const handleColumnResizeStart = useCallback(
    (col: number, clientX: number) => {
      const customWidth = columnSizes.get(col);
      const startWidth = customWidth === undefined ? defaultCellWidth : customWidth;

      resizeStateRef.current = {
        col,
        startX: clientX,
        startWidth,
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [defaultCellWidth, columnSizes, handleMouseMove, handleMouseUp],
  );

  useEffect(() => {
    return (): void => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return {
    handleColumnResizeStart,
  };
};
