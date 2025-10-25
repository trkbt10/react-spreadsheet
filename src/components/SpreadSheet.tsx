/**
 * @file SpreadSheet component for rendering entire spreadsheet with multiple sheets.
 */

import { useState, useMemo, useCallback, Activity } from "react";
import type { CSSProperties, ReactElement } from "react";
import type { SpreadSheet as SpreadSheetType } from "../types";
import { Sheet } from "./Sheet";
import { Tabs } from "./layouts/Tabs";
import type { Tab } from "./layouts/Tabs";
import { AppHeader } from "./app-header/AppHeader";
import { SheetProvider } from "../modules/spreadsheet/SheetContext";
import { SpreadSheetProvider } from "../modules/spreadsheet/SpreadSheetContext";
import type { SpreadSheetContextValue } from "../modules/spreadsheet/SpreadSheetContext";
import styles from "./SpreadSheet.module.css";

export type SpreadSheetProps = {
  spreadsheet: SpreadSheetType;
  style?: CSSProperties;
  maxColumns?: number;
  maxRows?: number;
};

/**
 * Renders a complete spreadsheet with multiple sheets and navigation.
 * @param props - Component props
 * @returns SpreadSheet component
 */
export const SpreadSheet = ({
  spreadsheet,
  style,
  maxColumns = 16384,
  maxRows = 1048576,
}: SpreadSheetProps): ReactElement => {
  const [activeSheetId, setActiveSheetId] = useState<string>(spreadsheet.sheets[0]?.id ?? "");

  const activeSheet = spreadsheet.sheets.find((sheet) => sheet.id === activeSheetId) ?? spreadsheet.sheets[0];

  const tabs = useMemo(
    (): Tab[] =>
      spreadsheet.sheets.map((sheet) => ({
        id: sheet.id,
        label: sheet.name,
      })),
    [spreadsheet.sheets],
  );

  const handleTabChange = useCallback((tabId: string): void => {
    setActiveSheetId(tabId);
  }, []);

  const spreadsheetContextValue = useMemo(
    (): SpreadSheetContextValue => ({
      spreadsheet,
      name: spreadsheet.name,
    }),
    [spreadsheet],
  );

  return (
    <SpreadSheetProvider value={spreadsheetContextValue}>
      <div className={styles.spreadsheet} style={style}>
        <AppHeader title={spreadsheet.name} createdAt={spreadsheet.createdAt} updatedAt={spreadsheet.updatedAt} />

        {/* Sheet tabs */}
        <Tabs tabs={tabs} activeTabId={activeSheetId} onTabChange={handleTabChange} />

        {/* Active sheet content */}
        <div className={styles.sheetContent}>
          <Activity mode={activeSheet ? "visible" : "hidden"}>
            <SheetProvider sheet={activeSheet} name={activeSheet.name} id={activeSheet.id}>
              <Sheet sheet={activeSheet} maxColumns={maxColumns} maxRows={maxRows} />
            </SheetProvider>
          </Activity>
        </div>
      </div>
    </SpreadSheetProvider>
  );
};
