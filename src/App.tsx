/**
 * @file React application entry component used for Vite preview.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import { parseSpreadsheet } from "./modules/spreadsheet/parseSpreadsheet";
import { SpreadSheet as SpreadSheetView } from "./components/SpreadSheet.tsx";
import { AppHeader } from "./components/app-header/AppHeader";
import type { SpreadsheetOption } from "./components/app-header/AppHeader";
import rawBasic from "../__mocks__/spreadsheet.basic.json";
import rawAdvanced from "../__mocks__/spreadsheet.advanced.json";
import rawVisual from "../__mocks__/spreadsheet.visual.json";

const SPREADSHEET_CONFIGS = {
  basic: { raw: rawBasic, id: "basic", name: "Basic Spreadsheet" },
  advanced: { raw: rawAdvanced, id: "advanced", name: "Advanced Dependency Workbook" },
  visual: { raw: rawVisual, id: "visual", name: "Visual Spreadsheet" },
} as const;

type SpreadsheetId = keyof typeof SPREADSHEET_CONFIGS;

const SPREADSHEET_OPTIONS: SpreadsheetOption[] = Object.values(SPREADSHEET_CONFIGS).map(
  (config) => {
    return {
      id: config.id,
      name: config.name,
    };
  },
);

/**
 * Minimal spreadsheet preview component.
 */
export function App(): ReactElement {
  const [currentId, setCurrentId] = useState<SpreadsheetId>("visual");

  const config = SPREADSHEET_CONFIGS[currentId];
  const spreadsheet = parseSpreadsheet(config.raw);

  const handleSpreadsheetChange = (id: string): void => {
    if (id === "basic" || id === "advanced" || id === "visual") {
      setCurrentId(id);
    }
  };

  return (
    <>
      <AppHeader
        title={spreadsheet.name}
        createdAt={spreadsheet.createdAt}
        updatedAt={spreadsheet.updatedAt}
        spreadsheets={SPREADSHEET_OPTIONS}
        currentSpreadsheetId={currentId}
        onSpreadsheetChange={handleSpreadsheetChange}
      />
      <SpreadSheetView key={currentId} spreadsheet={spreadsheet} />
    </>
  );
}
