/**
 * @file Hook for tracking window dimensions.
 */

import { useState, useEffect } from "react";

export type WindowDimensions = {
  width: number;
  height: number;
};

/**
 * Tracks the dimensions of the browser window.
 * @returns Current window dimensions
 */
export const useWindowDimensions = (): WindowDimensions => {
  const [dimensions, setDimensions] = useState<WindowDimensions>({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = (): void => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);

    return (): void => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return dimensions;
};
