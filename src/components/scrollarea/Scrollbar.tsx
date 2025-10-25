/**
 * @file Custom scrollbar component for virtual scrolling.
 */

import { useCallback, useRef, useState, useEffect } from "react";
import type { ReactElement, MouseEvent } from "react";
import styles from "./Scrollbar.module.css";

export type ScrollbarProps = {
  orientation: "vertical" | "horizontal";
  size: number;
  viewportSize: number;
  scrollPosition: number;
  onScrollChange: (position: number) => void;
};

/**
 * Custom scrollbar component.
 * @param props - Component props
 * @returns Scrollbar component
 */
export const Scrollbar = ({
  orientation,
  size,
  viewportSize,
  scrollPosition,
  onScrollChange,
}: ScrollbarProps): ReactElement | null => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState(0);
  const [dragStartScroll, setDragStartScroll] = useState(0);

  const maxScroll = Math.max(0, size - viewportSize);
  const thumbSize = viewportSize > 0 ? (viewportSize / size) * viewportSize : 0;
  const thumbPosition = maxScroll > 0 ? (scrollPosition / maxScroll) * (viewportSize - thumbSize) : 0;

  const isVertical = orientation === "vertical";

  const handleTrackClick = useCallback(
    (event: MouseEvent<HTMLDivElement>): void => {
      if (!trackRef.current) {
        return;
      }

      const rect = trackRef.current.getBoundingClientRect();
      const clickPosition = isVertical ? event.clientY - rect.top : event.clientX - rect.left;
      const trackSize = isVertical ? rect.height : rect.width;

      const targetThumbCenter = clickPosition - thumbSize / 2;
      const scrollRatio = targetThumbCenter / (trackSize - thumbSize);
      const newScrollPosition = Math.max(0, Math.min(maxScroll, scrollRatio * maxScroll));

      onScrollChange(newScrollPosition);
    },
    [isVertical, thumbSize, maxScroll, onScrollChange],
  );

  const handleThumbMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>): void => {
      event.stopPropagation();
      setIsDragging(true);
      setDragStartPosition(isVertical ? event.clientY : event.clientX);
      setDragStartScroll(scrollPosition);
    },
    [isVertical, scrollPosition],
  );

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handleMouseMove = (event: globalThis.MouseEvent): void => {
      const currentPosition = isVertical ? event.clientY : event.clientX;
      const delta = currentPosition - dragStartPosition;
      const scrollDelta = (delta / (viewportSize - thumbSize)) * maxScroll;
      const newScrollPosition = Math.max(0, Math.min(maxScroll, dragStartScroll + scrollDelta));

      onScrollChange(newScrollPosition);
    };

    const handleMouseUp = (): void => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return (): void => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isVertical, dragStartPosition, dragStartScroll, viewportSize, thumbSize, maxScroll, onScrollChange]);

  if (maxScroll <= 0 || thumbSize >= viewportSize) {
    return null;
  }

  return (
    <div
      ref={trackRef}
      className={styles.scrollbar}
      data-orientation={orientation}
      onClick={handleTrackClick}
    >
      <div
        className={styles.thumb}
        style={{
          [isVertical ? "height" : "width"]: thumbSize,
          [isVertical ? "top" : "left"]: thumbPosition,
        }}
        onMouseDown={handleThumbMouseDown}
        data-is-dragging={isDragging}
      />
    </div>
  );
};
