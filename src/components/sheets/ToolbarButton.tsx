/**
 * @file ToolbarButton component for toolbar actions.
 */

import type { ReactElement, ReactNode, MouseEvent } from "react";
import styles from "./ToolbarButton.module.css";

export type ToolbarButtonProps = {
  readonly icon: ReactNode;
  readonly onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  readonly isActive?: boolean;
  readonly isDisabled?: boolean;
  readonly ariaLabel: string;
};

/**
 * ToolbarButton component for toolbar formatting actions.
 * @param props - ToolbarButton props
 * @returns ToolbarButton component
 */
export const ToolbarButton = ({
  icon,
  onClick,
  isActive = false,
  isDisabled = false,
  ariaLabel,
}: ToolbarButtonProps): ReactElement => {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      data-is-active={isActive}
      data-is-disabled={isDisabled}
    >
      {icon}
    </button>
  );
};
