/**
 * @file Hook for tracking container dimensions using ResizeObserver.
 */

import { useState, useEffect, useRef, useCallback } from "react";

export type ContainerDimensions = {
  width: number;
  height: number;
};

export type DimensionsBindProps = {
  ref: React.RefCallback<HTMLDivElement>;
};

/**
 * Tracks the dimensions of a container element using ResizeObserver.
 * @returns Tuple of [dimensions, bindProps]
 */
export const useContainerDimensions = (): [ContainerDimensions, DimensionsBindProps] => {
  const [dimensions, setDimensions] = useState<ContainerDimensions>({
    width: 0,
    height: 0,
  });

  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const { width, height } = entry.contentRect;
      setDimensions({ width, height });
    });

    resizeObserver.observe(element);

    return (): void => {
      resizeObserver.disconnect();
    };
  }, []);

  const ref = useCallback((node: HTMLDivElement | null): void => {
    elementRef.current = node;
  }, []);

  const bindProps: DimensionsBindProps = { ref };

  return [dimensions, bindProps];
};
