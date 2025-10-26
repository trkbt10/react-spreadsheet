/**
 * @file FontFamilySelect component for selecting font families.
 */

import { useCallback, useState } from "react";
import type { ReactElement } from "react";
import { Popover } from "../layouts/Popover";
import styles from "./FontFamilySelect.module.css";

export type FontFamilySelectProps = {
  readonly value: string;
  readonly onChange: (family: string) => void;
};

type FontFamily = {
  readonly name: string;
  readonly value: string;
};

const FONT_FAMILIES: readonly FontFamily[] = [
  { name: "Sans Serif", value: "var(--font-family-base)" },
  { name: "Monospace", value: "var(--font-family-mono)" },
  { name: "Arial", value: "Arial, sans-serif" },
  { name: "Helvetica", value: "Helvetica, sans-serif" },
  { name: "Times New Roman", value: "'Times New Roman', serif" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Courier New", value: "'Courier New', monospace" },
  { name: "Verdana", value: "Verdana, sans-serif" },
];

/**
 * FontFamilySelect component for selecting font family with dropdown.
 * @param props - FontFamilySelect props
 * @returns FontFamilySelect component
 */
export const FontFamilySelect = ({ value, onChange }: FontFamilySelectProps): ReactElement => {
  const [isOpen, setIsOpen] = useState(false);

  const handleFamilySelect = useCallback(
    (family: string) => {
      onChange(family);
      setIsOpen(false);
    },
    [onChange],
  );

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  const currentFont = FONT_FAMILIES.find((font) => font.value === value) ?? FONT_FAMILIES[0];

  const trigger = (
    <button
      type="button"
      className={styles.trigger}
      onClick={toggleDropdown}
      aria-label="Select font family"
      data-is-open={isOpen}
    >
      <span className={styles.value}>{currentFont.name}</span>
      <span className={styles.arrow}>▼</span>
    </button>
  );

  return (
    <Popover isOpen={isOpen} onClose={closeDropdown} trigger={trigger}>
      <div className={styles.content}>
        {FONT_FAMILIES.map((font) => (
          <button
            key={font.value}
            type="button"
            className={styles.option}
            style={{ fontFamily: font.value }}
            onClick={() => {
              handleFamilySelect(font.value);
            }}
            data-is-selected={value === font.value}
          >
            {font.name}
          </button>
        ))}
      </div>
    </Popover>
  );
};
