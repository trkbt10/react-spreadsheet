/**
 * @file ToolbarDivider component for visual separation.
 */

import type { ReactElement } from "react";
import styles from "./ToolbarDivider.module.css";

/**
 * ToolbarDivider component for separating toolbar sections.
 * @returns ToolbarDivider component
 */
export const ToolbarDivider = (): ReactElement => {
  return <div className={styles.divider} />;
};
