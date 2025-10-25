/**
 * @file Accessible form label component with optional required badge.
 */

import type { ReactElement, ReactNode } from "react";
import styles from "./Label.module.css";

export type LabelProps = {
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export const Label = ({ htmlFor, required = false, children, className }: LabelProps): ReactElement => {
  const labelClassName = className ? `${styles.label} ${className}` : styles.label;

  return (
    <label className={labelClassName} htmlFor={htmlFor} data-required={required}>
      {children}
      {required ? <span className={styles.requiredPill}>必須</span> : null}
    </label>
  );
};
