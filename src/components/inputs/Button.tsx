/**
 * @file High-level button component with primary/secondary variants.
 */

import type { ButtonHTMLAttributes, ReactElement } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export const Button = ({ className, variant = "primary", type = "button", ...rest }: ButtonProps): ReactElement => {
  const buttonClassName = className ? `${styles.button} ${className}` : styles.button;

  return <button type={type} className={buttonClassName} data-variant={variant} {...rest} />;
};

