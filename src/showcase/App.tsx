/**
 * @file React application entry component used for Vite preview.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import { SpreadSheet as SpreadSheetView } from "../components/SpreadSheet.tsx";
import { AppHeader } from "./components/app-header/AppHeader";
import type { SpreadsheetOption } from "./components/app-header/AppHeader";
import { listMockDatasets, getMockDatasetById, isValidDatasetId } from "./mockDataRegistry";
import type { MockDatasetId } from "./mockDataRegistry";
import styles from "./App.module.css";

const SPREADSHEET_OPTIONS: SpreadsheetOption[] = listMockDatasets().map((dataset) => {
  return {
    id: dataset.id,
    name: dataset.name,
  };
});

/**
 * Minimal spreadsheet preview component.
 */
export function App(): ReactElement {
  const [currentId, setCurrentId] = useState<MockDatasetId>("visual");

  const dataset = getMockDatasetById(currentId);
  const spreadsheet = dataset.spreadsheet;

  const handleSpreadsheetChange = (id: string): void => {
    if (isValidDatasetId(id)) {
      setCurrentId(id);
    }
  };

  return (
    <div className={styles.appContainer}>
      <AppHeader
        title={spreadsheet.name}
        createdAt={spreadsheet.createdAt}
        updatedAt={spreadsheet.updatedAt}
        spreadsheets={SPREADSHEET_OPTIONS}
        currentSpreadsheetId={currentId}
        onSpreadsheetChange={handleSpreadsheetChange}
        showCatalogLink={true}
      />
      <SpreadSheetView key={currentId} spreadsheet={spreadsheet} />
    </div>
  );
}
