/**
 * @file FontSizeSelect component for selecting font sizes.
 */

import { useCallback, useState } from "react";
import type { ReactElement } from "react";
import { Popover } from "./Popover";
import styles from "./FontSizeSelect.module.css";

export type FontSizeSelectProps = {
  readonly value: string;
  readonly onChange: (size: string) => void;
};

const FONT_SIZES = ["10", "11", "12", "13", "14", "16", "18", "20", "24", "28", "32", "36", "48", "72"];

/**
 * FontSizeSelect component for selecting font size with dropdown.
 * @param props - FontSizeSelect props
 * @returns FontSizeSelect component
 */
export const FontSizeSelect = ({ value, onChange }: FontSizeSelectProps): ReactElement => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSizeSelect = useCallback(
    (size: string) => {
      onChange(size);
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

  const trigger = (
    <button
      type="button"
      className={styles.trigger}
      onClick={toggleDropdown}
      aria-label="Select font size"
      data-is-open={isOpen}
    >
      <span className={styles.value}>{value}</span>
      <span className={styles.arrow}>▼</span>
    </button>
  );

  return (
    <Popover isOpen={isOpen} onClose={closeDropdown} trigger={trigger}>
      <div className={styles.content}>
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={styles.option}
              onClick={() => {
                handleSizeSelect(size);
              }}
              data-is-selected={value === size}
            >
              {size}
            </button>
          ))}
        </div>
    </Popover>
  );
};
