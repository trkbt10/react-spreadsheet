/**
 * @file ColorSlider component for selecting hue or other color values.
 */

import { useCallback, useMemo, useRef } from "react";
import type { ReactElement, MouseEvent, TouchEvent } from "react";
import styles from "./ColorSlider.module.css";

export type ColorSliderProps = {
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly type: "hue" | "alpha";
  readonly currentColor?: string;
};

/**
 * ColorSlider component for selecting hue or alpha values.
 * @param props - ColorSlider props
 * @returns ColorSlider component
 */
export const ColorSlider = ({ value, onChange, type, currentColor }: ColorSliderProps): ReactElement => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handlePositionUpdate = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) {
        return;
      }

      const rect = sliderRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = x / rect.width;

      if (type === "hue") {
        onChange(percentage * 360);
      } else {
        onChange(percentage * 100);
      }
    },
    [onChange, type],
  );

  const handleMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      isDraggingRef.current = true;
      handlePositionUpdate(event.clientX);
    },
    [handlePositionUpdate],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) {
        return;
      }
      handlePositionUpdate(event.clientX);
    },
    [handlePositionUpdate],
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleTouchStart = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      isDraggingRef.current = true;
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      handlePositionUpdate(touch.clientX);
    },
    [handlePositionUpdate],
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) {
        return;
      }
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      handlePositionUpdate(touch.clientX);
    },
    [handlePositionUpdate],
  );

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const cursorPosition = type === "hue" ? (value / 360) * 100 : value;

  const sliderBackground = useMemo(() => {
    if (type === "hue") {
      return "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)";
    }
    return `linear-gradient(to right, transparent, ${currentColor ?? "#000000"})`;
  }, [type, currentColor]);

  return (
    <div
      ref={sliderRef}
      className={styles.slider}
      style={{ background: sliderBackground }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-type={type}
    >
      <div className={styles.cursor} style={{ left: `${cursorPosition}%` }} />
    </div>
  );
};
