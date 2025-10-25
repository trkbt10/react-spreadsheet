/**
 * @file Header corner component (top-left intersection).
 */

import type { ReactElement } from "react";
import styles from "./HeaderCorner.module.css";

/**
 * Renders the corner element at the intersection of row and column headers.
 * @returns HeaderCorner component
 */
export const HeaderCorner = (): ReactElement => {
  return <div className={styles.headerCorner} />;
};
