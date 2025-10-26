/**
 * @file Styled textarea component with forwarded ref support.
 */

import { forwardRef } from "react";
import type { ForwardedRef, TextareaHTMLAttributes, ReactElement } from "react";
import styles from "./TextArea.module.css";

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const TextArea = forwardRef(function TextArea(
  { className, invalid = false, ...rest }: TextAreaProps,
  ref: ForwardedRef<HTMLTextAreaElement>,
): ReactElement {
  const textareaClassName = className ? `${styles.textarea} ${className}` : styles.textarea;

  return <textarea ref={ref} className={textareaClassName} data-invalid={invalid} {...rest} />;
});
