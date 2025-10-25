/**
 * @file ColorInputFields component for RGB and HSL input.
 */

import { useCallback, useState } from "react";
import type { ReactElement, ChangeEvent } from "react";
import type { RGBColor, HSLColor } from "../../utils/colorConversion";
import styles from "./ColorInputFields.module.css";

export type ColorInputFieldsProps = {
  readonly rgb: RGBColor;
  readonly hsl: HSLColor;
  readonly hex: string;
  readonly onRgbChange: (rgb: RGBColor) => void;
  readonly onHslChange: (hsl: HSLColor) => void;
  readonly onHexChange: (hex: string) => void;
};

type ColorMode = "hex" | "rgb" | "hsl";

/**
 * ColorInputFields component for manual color input in different formats.
 * @param props - ColorInputFields props
 * @returns ColorInputFields component
 */
export const ColorInputFields = ({ rgb, hsl, hex, onRgbChange, onHslChange, onHexChange }: ColorInputFieldsProps): ReactElement => {
  const [mode, setMode] = useState<ColorMode>("hex");

  const handleModeChange = useCallback((newMode: ColorMode) => {
    setMode(newMode);
  }, []);

  const handleHexChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
        onHexChange(value);
      }
    },
    [onHexChange],
  );

  const handleRgbChange = useCallback(
    (channel: "r" | "g" | "b") => (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseInt(event.target.value, 10);
      if (Number.isNaN(value)) {
        return;
      }
      const clampedValue = Math.max(0, Math.min(255, value));
      onRgbChange({ ...rgb, [channel]: clampedValue });
    },
    [rgb, onRgbChange],
  );

  const handleHslChange = useCallback(
    (channel: "h" | "s" | "l") => (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseInt(event.target.value, 10);
      if (Number.isNaN(value)) {
        return;
      }
      const maxValue = channel === "h" ? 360 : 100;
      const clampedValue = Math.max(0, Math.min(maxValue, value));
      onHslChange({ ...hsl, [channel]: clampedValue });
    },
    [hsl, onHslChange],
  );

  return (
    <div className={styles.container}>
      <div className={styles.modeSelector}>
        <button
          type="button"
          className={styles.modeButton}
          onClick={() => {
            handleModeChange("hex");
          }}
          data-is-active={mode === "hex"}
        >
          HEX
        </button>
        <button
          type="button"
          className={styles.modeButton}
          onClick={() => {
            handleModeChange("rgb");
          }}
          data-is-active={mode === "rgb"}
        >
          RGB
        </button>
        <button
          type="button"
          className={styles.modeButton}
          onClick={() => {
            handleModeChange("hsl");
          }}
          data-is-active={mode === "hsl"}
        >
          HSL
        </button>
      </div>

      {mode === "hex" ? (
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>
            <span className={styles.labelText}>HEX</span>
            <input
              type="text"
              className={styles.input}
              value={hex}
              onChange={handleHexChange}
              placeholder="#000000"
            />
          </label>
        </div>
      ) : null}

      {mode === "rgb" ? (
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>
            <span className={styles.labelText}>R</span>
            <input
              type="number"
              className={styles.input}
              value={Math.round(rgb.r)}
              onChange={handleRgbChange("r")}
              min="0"
              max="255"
            />
          </label>
          <label className={styles.inputLabel}>
            <span className={styles.labelText}>G</span>
            <input
              type="number"
              className={styles.input}
              value={Math.round(rgb.g)}
              onChange={handleRgbChange("g")}
              min="0"
              max="255"
            />
          </label>
          <label className={styles.inputLabel}>
            <span className={styles.labelText}>B</span>
            <input
              type="number"
              className={styles.input}
              value={Math.round(rgb.b)}
              onChange={handleRgbChange("b")}
              min="0"
              max="255"
            />
          </label>
        </div>
      ) : null}

      {mode === "hsl" ? (
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>
            <span className={styles.labelText}>H</span>
            <input
              type="number"
              className={styles.input}
              value={Math.round(hsl.h)}
              onChange={handleHslChange("h")}
              min="0"
              max="360"
            />
          </label>
          <label className={styles.inputLabel}>
            <span className={styles.labelText}>S</span>
            <input
              type="number"
              className={styles.input}
              value={Math.round(hsl.s)}
              onChange={handleHslChange("s")}
              min="0"
              max="100"
            />
          </label>
          <label className={styles.inputLabel}>
            <span className={styles.labelText}>L</span>
            <input
              type="number"
              className={styles.input}
              value={Math.round(hsl.l)}
              onChange={handleHslChange("l")}
              min="0"
              max="100"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
};
