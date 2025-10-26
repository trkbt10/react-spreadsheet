/**
 * @file AppHeader component for displaying spreadsheet metadata and selection.
 */

import type { ReactElement, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { Select } from "../../../components/inputs/Select";
import styles from "./AppHeader.module.css";

export type SpreadsheetOption = {
  id: string;
  name: string;
  description?: string;
};

export type AppHeaderProps = {
  title: string;
  createdAt: string;
  updatedAt: string;
  spreadsheets: SpreadsheetOption[];
  currentSpreadsheetId: string;
  onSpreadsheetChange: (spreadsheetId: string) => void;
  showCatalogLink?: boolean;
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
export const AppHeader = ({
  title,
  createdAt,
  updatedAt,
  spreadsheets,
  currentSpreadsheetId,
  onSpreadsheetChange,
  showCatalogLink = false,
}: AppHeaderProps): ReactElement => {
  const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    onSpreadsheetChange(event.target.value);
  };

  const renderCatalogLink = (): ReactElement | null => {
    if (!showCatalogLink) {
      return null;
    }

    return (
      <div className={styles.metadataItem}>
        <Link to="/catalog" className={styles.catalogLink}>
          Component Catalog
        </Link>
      </div>
    );
  };

  return (
    <div className={styles.header}>
      <div className={styles.titleSection}>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.spreadsheetSelector}>
          <Select value={currentSpreadsheetId} onChange={handleSelectChange}>
            {spreadsheets.map((spreadsheet) => {
              return (
                <option key={spreadsheet.id} value={spreadsheet.id}>
                  {spreadsheet.name}
                </option>
              );
            })}
          </Select>
        </div>
      </div>
      <div className={styles.metadata}>
        <div className={styles.metadataItem}>
          <span className={styles.metadataLabel}>Created:</span>
          <span>{formatDate(createdAt)}</span>
        </div>
        <div className={styles.metadataItem}>
          <span className={styles.metadataLabel}>Updated:</span>
          <span>{formatDate(updatedAt)}</span>
        </div>
        {renderCatalogLink()}
      </div>
    </div>
  );
};
