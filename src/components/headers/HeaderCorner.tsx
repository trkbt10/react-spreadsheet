/**
 * @file Header corner component (top-left intersection).
 */

import type { ReactElement } from "react";
import styles from "./HeaderCorner.module.css";

export type HeaderCornerProps = {
  onClick?: () => void;
};

/**
 * Renders the corner element at the intersection of row and column headers.
 * @param props - Component props
 * @returns HeaderCorner component
 */
export const HeaderCorner = ({ onClick }: HeaderCornerProps): ReactElement => {
  return <div className={styles.headerCorner} onClick={onClick} />;
};
