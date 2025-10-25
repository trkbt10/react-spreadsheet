/**
 * @file Hook for tracking scroll position.
 */

import { useState, useCallback, useMemo } from "react";

export type ScrollPosition = {
  scrollTop: number;
  scrollLeft: number;
};

export type ScrollBindProps = {
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  onWheel: (event: React.WheelEvent<HTMLDivElement>) => void;
};

/**
 * Tracks the scroll position with memoized handlers.
 * @returns Tuple of [scrollPosition, bindProps]
 */
export const useScrollPosition = (): [ScrollPosition, ScrollBindProps] => {
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({
    scrollTop: 0,
    scrollLeft: 0,
  });

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>): void => {
    const target = event.currentTarget;
    setScrollPosition({
      scrollTop: target.scrollTop,
      scrollLeft: target.scrollLeft,
    });
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>): void => {
    const target = event.currentTarget;
    target.scrollTop += event.deltaY;
    target.scrollLeft += event.deltaX;
  }, []);

  const bindProps = useMemo(
    (): ScrollBindProps => ({
      onScroll: handleScroll,
      onWheel: handleWheel,
    }),
    [handleScroll, handleWheel],
  );

  return [scrollPosition, bindProps];
};
