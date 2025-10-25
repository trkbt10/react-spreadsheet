/**
 * @file React application entry component used for Vite preview.
 */

import type { ReactElement } from "react";
import { parseSpreadsheet } from "./modules/spreadsheet/parseSpreadsheet";
import { SpreadSheet as SpreadSheetView } from "./components/SpreadSheet.tsx";
import rawSpreadsheet from "../__mocks__/spreadsheet.visual.json";
const spreadsheet = parseSpreadsheet(rawSpreadsheet);

/**
 * Minimal spreadsheet preview component.
 */
export function App(): ReactElement {
  return <SpreadSheetView spreadsheet={spreadsheet} />;
}
