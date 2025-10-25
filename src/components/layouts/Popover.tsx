/**
 * @file Popover component for managing dropdown dialogs with outside click detection.
 */

import { Activity, useCallback, useEffect, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import styles from "./Popover.module.css";

export type PopoverProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly trigger: ReactNode;
  readonly children: ReactNode;
  readonly align?: "left" | "center" | "right";
};

/**
 * Popover component for dropdown dialogs with outside click handling.
 * @param props - Popover props
 * @returns Popover component
 */
export const Popover = ({ isOpen, onClose, trigger, children, align = "left" }: PopoverProps): ReactElement => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (event: PointerEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.addEventListener("pointerdown", handleClickOutside);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  return (
    <div className={styles.container} ref={containerRef}>
      {trigger}
      <Activity mode={isOpen ? "visible" : "hidden"}>
        <div className={styles.dropdown} data-align={align}>
          {children}
        </div>
      </Activity>
    </div>
  );
};
