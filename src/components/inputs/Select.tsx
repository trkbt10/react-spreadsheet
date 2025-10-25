/**
 * @file Styled select input component with decorative chevron.
 */

import { forwardRef } from "react";
import type { ForwardedRef, SelectHTMLAttributes, ReactElement } from "react";
import styles from "./Select.module.css";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export const Select = forwardRef(function Select(
  { className, invalid = false, children, ...rest }: SelectProps,
  ref: ForwardedRef<HTMLSelectElement>,
): ReactElement {
  const selectClassName = className ? `${styles.select} ${className}` : styles.select;

  return (
    <div className={styles.selectWrapper} data-invalid={invalid}>
      <select ref={ref} className={selectClassName} data-invalid={invalid} {...rest}>
        {children}
      </select>
      <svg className={styles.chevron} viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
});

