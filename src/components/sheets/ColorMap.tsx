/**
 * @file ColorMap component for 2D color selection (saturation and lightness).
 */

import { useCallback, useRef } from "react";
import type { ReactElement, MouseEvent, TouchEvent } from "react";
import styles from "./ColorMap.module.css";

export type ColorMapProps = {
  readonly hue: number;
  readonly saturation: number;
  readonly lightness: number;
  readonly onChange: (saturation: number, lightness: number) => void;
};

/**
 * ColorMap component for selecting saturation and lightness on a 2D canvas.
 * @param props - ColorMap props
 * @returns ColorMap component
 */
export const ColorMap = ({ hue, saturation, lightness, onChange }: ColorMapProps): ReactElement => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handlePositionUpdate = useCallback(
    (clientX: number, clientY: number) => {
      if (!canvasRef.current) {
        return;
      }

      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(clientY - rect.top, rect.height));

      const newSaturation = (x / rect.width) * 100;
      const newLightness = 100 - (y / rect.height) * 100;

      onChange(newSaturation, newLightness);
    },
    [onChange],
  );

  const handleMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      isDraggingRef.current = true;
      handlePositionUpdate(event.clientX, event.clientY);
    },
    [handlePositionUpdate],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) {
        return;
      }
      handlePositionUpdate(event.clientX, event.clientY);
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
      handlePositionUpdate(touch.clientX, touch.clientY);
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
      handlePositionUpdate(touch.clientX, touch.clientY);
    },
    [handlePositionUpdate],
  );

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const cursorX = saturation;
  const cursorY = 100 - lightness;

  return (
    <div
      ref={canvasRef}
      className={styles.colorMap}
      style={{ backgroundColor: `hsl(${hue}, 100%, 50%)` }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={styles.cursor}
        style={{
          left: `${cursorX}%`,
          top: `${cursorY}%`,
        }}
      />
    </div>
  );
};
