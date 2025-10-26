/**
 * @file SpreadSheet component for rendering entire spreadsheet with multiple sheets.
 */

import { Activity } from "react";
import type { CSSProperties, ReactElement } from "react";
import type { SpreadSheet as SpreadSheetType } from "../types";
import { Sheet } from "./Sheet";
import { Tabs } from "./layouts/Tabs";
import { FormulaBar } from "./sheets/FormulaBar";
import { SheetProvider } from "../modules/spreadsheet/SheetContext";
import { SpreadSheetProvider, useSpreadSheetContext } from "../modules/spreadsheet/SpreadSheetContext";
import { SAFE_MAX_COLUMNS, SAFE_MAX_ROWS } from "../modules/spreadsheet/gridLayout";
import { FormulaEngineProvider } from "../modules/formula/FormulaEngineContext";
import styles from "./SpreadSheet.module.css";

export type SpreadSheetProps = {
  spreadsheet: SpreadSheetType;
  style?: CSSProperties;
  maxColumns?: number;
  maxRows?: number;
};

type ActiveSheetContentProps = {
  maxColumns: number;
  maxRows: number;
};

const ActiveSheetContent = ({ maxColumns, maxRows }: ActiveSheetContentProps): ReactElement | null => {
  const { activeSheet, handleCellsUpdate } = useSpreadSheetContext();

  if (!activeSheet) {
    return null;
  }

  return (
    <SheetProvider sheet={activeSheet} name={activeSheet.name} id={activeSheet.id} onCellsUpdate={handleCellsUpdate}>
      <FormulaBar />
      <Sheet sheet={activeSheet} maxColumns={maxColumns} maxRows={maxRows} />
    </SheetProvider>
  );
};

const SpreadSheetContent = ({
  style,
  maxColumns = SAFE_MAX_COLUMNS,
  maxRows = SAFE_MAX_ROWS,
}: Omit<SpreadSheetProps, "spreadsheet">): ReactElement => {
  const { activeSheetId, activeSheet, tabs, formulaEngine, handleTabChange } = useSpreadSheetContext();

  return (
    <FormulaEngineProvider engine={formulaEngine}>
      <div className={styles.spreadsheet} style={style}>
        {/* Active sheet content */}
        <div className={styles.sheetContent}>
          <Activity mode={activeSheet ? "visible" : "hidden"}>
            <ActiveSheetContent maxColumns={maxColumns} maxRows={maxRows} />
          </Activity>
        </div>
        {/* Sheet tabs */}
        <Tabs tabs={tabs} activeTabId={activeSheetId} onTabChange={handleTabChange} />
      </div>
    </FormulaEngineProvider>
  );
};

/**
 * Renders a complete spreadsheet with multiple sheets and navigation.
 * @param props - Component props
 * @returns SpreadSheet component
 */
export const SpreadSheet = ({
  spreadsheet,
  style,
  maxColumns = SAFE_MAX_COLUMNS,
  maxRows = SAFE_MAX_ROWS,
}: SpreadSheetProps): ReactElement => {
  return (
    <SpreadSheetProvider spreadsheet={spreadsheet}>
      <SpreadSheetContent style={style} maxColumns={maxColumns} maxRows={maxRows} />
    </SpreadSheetProvider>
  );
};
