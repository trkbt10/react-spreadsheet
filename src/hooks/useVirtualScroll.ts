/**
 * @file useVirtualScroll hook for managing virtual scroll state and viewport calculations.
 */

import { useState, useCallback, useEffect, useRef } from "react";

export type ViewportRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type ViewportWindow = {
  scrollTop: number;
  scrollLeft: number;
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
};

export type UseVirtualScrollOptions = {
  contentWidth: number;
  contentHeight: number;
};

export type UseVirtualScrollReturn = {
  scrollTop: number;
  scrollLeft: number;
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
  maxScrollTop: number;
  maxScrollLeft: number;
  viewportRect: ViewportRect;
  containerRef: (node: HTMLElement | null) => void;
  setScrollTop: (value: number | ((prev: number) => number)) => void;
  setScrollLeft: (value: number | ((prev: number) => number)) => void;
  handleKeyDown: (event: React.KeyboardEvent) => void;
};

/**
 * Type guard to check if an event is a WheelEvent.
 * @param event - Event to check
 * @returns True if event is a WheelEvent
 */
const isWheelEvent = (event: Event): event is globalThis.WheelEvent => {
  return event instanceof globalThis.WheelEvent;
};

/**
 * Hook for managing virtual scroll state and viewport calculations.
 * Provides scroll position, viewport dimensions, and scroll control methods.
 * @param options - Configuration options
 * @returns Virtual scroll state and control methods
 */
export const useVirtualScroll = ({
  contentWidth,
  contentHeight,
}: UseVirtualScrollOptions): UseVirtualScrollReturn => {
  const containerRef = useRef<HTMLElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const maxScrollTop = Math.max(0, contentHeight - viewportHeight);
  const maxScrollLeft = Math.max(0, contentWidth - viewportWidth);

  const setScrollTopClamped = useCallback(
    (value: number | ((prev: number) => number)): void => {
      setScrollTop((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        return Math.max(0, Math.min(maxScrollTop, next));
      });
    },
    [maxScrollTop],
  );

  const setScrollLeftClamped = useCallback(
    (value: number | ((prev: number) => number)): void => {
      setScrollLeft((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        return Math.max(0, Math.min(maxScrollLeft, next));
      });
    },
    [maxScrollLeft],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent): void => {
      const scrollAmount = 100;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setScrollTopClamped((prev) => prev + scrollAmount);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setScrollTopClamped((prev) => prev - scrollAmount);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setScrollLeftClamped((prev) => prev + scrollAmount);
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setScrollLeftClamped((prev) => prev - scrollAmount);
      }

      if (event.key === "PageDown") {
        event.preventDefault();
        setScrollTopClamped((prev) => prev + viewportHeight);
      }

      if (event.key === "PageUp") {
        event.preventDefault();
        setScrollTopClamped((prev) => prev - viewportHeight);
      }

      if (event.key === "Home") {
        event.preventDefault();
        setScrollTop(0);
        setScrollLeft(0);
      }

      if (event.key === "End") {
        event.preventDefault();
        setScrollTop(maxScrollTop);
      }
    },
    [maxScrollTop, viewportHeight, setScrollTopClamped, setScrollLeftClamped],
  );

  // Measure viewport dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setViewportWidth(width);
        setViewportHeight(height);
      }
    });

    observer.observe(container);

    return (): void => {
      observer.disconnect();
    };
  }, []);

  // Handle wheel events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleWheel = (event: Event): void => {
      if (!isWheelEvent(event)) {
        return;
      }

      event.preventDefault();

      const deltaX = event.deltaX;
      const deltaY = event.deltaY;

      setScrollLeftClamped((prev) => prev + deltaX);
      setScrollTopClamped((prev) => prev + deltaY);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return (): void => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [setScrollLeftClamped, setScrollTopClamped]);

  const ref = useCallback((node: HTMLElement | null): void => {
    containerRef.current = node;
  }, []);

  const viewportRect: ViewportRect = {
    top: scrollTop,
    left: scrollLeft,
    width: viewportWidth,
    height: viewportHeight,
  };

  return {
    scrollTop,
    scrollLeft,
    viewportWidth,
    viewportHeight,
    contentWidth,
    contentHeight,
    maxScrollTop,
    maxScrollLeft,
    viewportRect,
    containerRef: ref,
    setScrollTop: setScrollTopClamped,
    setScrollLeft: setScrollLeftClamped,
    handleKeyDown,
  };
};
