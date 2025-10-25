/**
 * @file Styled text input component with forwarded ref support.
 */

import { forwardRef } from "react";
import type { ForwardedRef, InputHTMLAttributes, ReactElement } from "react";
import styles from "./Input.module.css";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef(function Input(
  { className, invalid = false, ...rest }: InputProps,
  ref: ForwardedRef<HTMLInputElement>,
): ReactElement {
  const inputClassName = className ? `${styles.input} ${className}` : styles.input;

  return <input ref={ref} className={inputClassName} data-invalid={invalid} {...rest} />;
});

