/**
 * @file AppHeader component for displaying spreadsheet metadata.
 */

import type { ReactElement } from "react";
import styles from "./AppHeader.module.css";

export type AppHeaderProps = {
  title: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Formats ISO date string to readable format.
 * @param isoString - ISO date string
 * @returns Formatted date string
 */
const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Application header component displaying spreadsheet title and metadata.
 * @param props - Component props
 * @returns AppHeader component
 */
export const AppHeader = ({ title, createdAt, updatedAt }: AppHeaderProps): ReactElement => {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.metadata}>
        <div className={styles.metadataItem}>
          <span className={styles.metadataLabel}>Created:</span>
          <span>{formatDate(createdAt)}</span>
        </div>
        <div className={styles.metadataItem}>
          <span className={styles.metadataLabel}>Updated:</span>
          <span>{formatDate(updatedAt)}</span>
        </div>
      </div>
    </div>
  );
};
