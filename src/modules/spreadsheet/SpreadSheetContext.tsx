/**
 * @file SpreadSheet-level context for providing spreadsheet information to child components.
 */

import { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { ReactNode, ReactElement } from "react";
import type { SpreadSheet, Sheet } from "../../types";
import type { Tab } from "../../components/layouts/Tabs";
import { useFormulaEngineWithSpreadsheet } from "../formula/FormulaEngineContext";
import type { FormulaEngine } from "../formula/engine";

/**
 * Context value containing spreadsheet information.
 */
export type SpreadSheetContextValue = {
  spreadsheet: SpreadSheet;
  name: string;
  activeSheetId: string;
  activeSheet: Sheet | undefined;
  tabs: Tab[];
  formulaEngine: FormulaEngine;
  handleTabChange: (tabId: string) => void;
  handleCellsUpdate: (updates: Array<{ col: number; row: number; value: string }>) => void;
};

const SpreadSheetContext = createContext<SpreadSheetContextValue | null>(null);

export type SpreadSheetProviderProps = {
  spreadsheet: SpreadSheet;
  children: ReactNode;
};

/**
 * Provider component for spreadsheet-level context.
 * @param props - Provider props
 * @returns SpreadSheetProvider component
 */
export const SpreadSheetProvider = ({ spreadsheet, children }: SpreadSheetProviderProps): ReactElement => {
  const [activeSheetId, setActiveSheetId] = useState<string>(spreadsheet.sheets[0]?.id ?? "");

  const activeSheet = useMemo(
    () => spreadsheet.sheets.find((sheet) => sheet.id === activeSheetId) ?? spreadsheet.sheets[0],
    [spreadsheet.sheets, activeSheetId],
  );

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

  const handleCellsUpdate = useCallback((updates: Array<{ col: number; row: number; value: string }>) => {
    // TODO: Implement actual cell data update
    console.log("SpreadSheet: Cell updates received:", updates);
  }, []);

  const formulaEngine = useFormulaEngineWithSpreadsheet(spreadsheet);

  const value = useMemo(
    (): SpreadSheetContextValue => ({
      spreadsheet,
      name: spreadsheet.name,
      activeSheetId,
      activeSheet,
      tabs,
      formulaEngine,
      handleTabChange,
      handleCellsUpdate,
    }),
    [spreadsheet, activeSheetId, activeSheet, tabs, formulaEngine, handleTabChange, handleCellsUpdate],
  );

  return <SpreadSheetContext.Provider value={value}>{children}</SpreadSheetContext.Provider>;
};

/**
 * Hook to access spreadsheet context.
 * @throws Error if used outside of SpreadSheetProvider
 * @returns SpreadSheet context value
 */
export const useSpreadSheetContext = (): SpreadSheetContextValue => {
  const context = useContext(SpreadSheetContext);
  if (!context) {
    throw new Error("useSpreadSheetContext must be used within SpreadSheetProvider");
  }
  return context;
};
