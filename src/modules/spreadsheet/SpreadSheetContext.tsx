/**
 * @file SpreadSheet-level context for providing spreadsheet information to child components.
 */

import { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { ReactNode, ReactElement } from "react";
import type { SpreadSheet, Sheet } from "../../types";
import type { Tab } from "../../components/layouts/Tabs";
import { useFormulaEngineWithSpreadsheet } from "../formula/FormulaEngineContext";
import { FormulaEngine } from "../formula/engine";
import { FormulaValidationError } from "../formula/errors";
import { applyUpdatesToSheet, type CellUpdate } from "./cellUpdates";

const toColumnName = (index: number): string => {
  if (index < 0) {
    return "";
  }
  const prefix = toColumnName(Math.floor(index / 26) - 1);
  const suffix = String.fromCharCode(65 + (index % 26));
  return `${prefix}${suffix}`;
};

const formatCellPosition = (col: number, row: number): string => {
  const columnName = toColumnName(col);
  const rowNumber = row + 1;
  return `${columnName}${rowNumber}`;
};

export type CellUpdateRequestOptions = {
  errorMode?: "throw" | "suppress";
};

export type CellUpdateResult =
  | {
      status: "applied";
      spreadsheet?: SpreadSheet;
    }
  | {
      status: "unchanged";
    }
  | {
      status: "rejected";
      error: FormulaValidationError;
    };

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
  handleCellsUpdate: (
    updates: Array<{ col: number; row: number; value: string }>,
    options?: CellUpdateRequestOptions,
  ) => CellUpdateResult;
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
  const [documentState, setDocumentState] = useState<SpreadSheet>(spreadsheet);
  const [activeSheetId, setActiveSheetId] = useState<string>(spreadsheet.sheets[0]?.id ?? "");

  const activeSheet = useMemo(
    () => documentState.sheets.find((sheet) => sheet.id === activeSheetId) ?? documentState.sheets[0],
    [documentState.sheets, activeSheetId],
  );

  const tabs = useMemo(
    (): Tab[] =>
      documentState.sheets.map((sheet) => ({
        id: sheet.id,
        label: sheet.name,
      })),
    [documentState.sheets],
  );

  const handleTabChange = useCallback((tabId: string): void => {
    setActiveSheetId(tabId);
  }, []);

  const handleCellsUpdate = useCallback(
    (updates: Array<CellUpdate>, options?: CellUpdateRequestOptions): CellUpdateResult => {
      if (updates.length === 0) {
        return { status: "unchanged" };
      }
      const errorMode = options?.errorMode ?? "throw";

      let outcome: CellUpdateResult = { status: "unchanged" };

      setDocumentState((current) => {
        const sheetIndex = current.sheets.findIndex((sheet) => sheet.id === activeSheetId);
        if (sheetIndex === -1) {
          outcome = { status: "unchanged" };
          return current;
        }

        const targetSheet = current.sheets[sheetIndex];
        const updatedSheet = applyUpdatesToSheet(targetSheet, updates);
        if (updatedSheet === targetSheet) {
          outcome = { status: "unchanged" };
          return current;
        }

        const nextSheets = [...current.sheets];
        nextSheets[sheetIndex] = updatedSheet;

        const nextSpreadsheet: SpreadSheet = {
          ...current,
          sheets: nextSheets,
          updatedAt: new Date().toISOString(),
        };

        const targetUpdate = updates.find((update) => update.value.trim().startsWith("=")) ?? updates[0];

        try {
          FormulaEngine.fromSpreadsheet(nextSpreadsheet);
        } catch (error) {
          const failure = error instanceof Error ? error : new Error(String(error));
          const cellLabel = formatCellPosition(targetUpdate.col, targetUpdate.row);
          const validationError = new FormulaValidationError(
            `Failed to validate formula at ${targetSheet.name}!${cellLabel}: ${failure.message}`,
            {
              sheetId: targetSheet.id,
              sheetName: targetSheet.name,
              column: targetUpdate.col,
              row: targetUpdate.row,
            },
            failure,
          );
          outcome = { status: "rejected", error: validationError };
          if (errorMode === "suppress") {
            console.warn(
              `Skipped applying updates due to formula validation error at ${targetSheet.name}!${cellLabel}: ${failure.message}`,
            );
            return current;
          }
          return current;
        }

        outcome = { status: "applied", spreadsheet: nextSpreadsheet };
        return nextSpreadsheet;
      });

      return outcome;
    },
    [activeSheetId],
  );

  const formulaEngine = useFormulaEngineWithSpreadsheet(documentState);

  const value = useMemo(
    (): SpreadSheetContextValue => ({
      spreadsheet: documentState,
      name: documentState.name,
      activeSheetId,
      activeSheet,
      tabs,
      formulaEngine,
      handleTabChange,
      handleCellsUpdate,
    }),
    [documentState, activeSheetId, activeSheet, tabs, formulaEngine, handleTabChange, handleCellsUpdate],
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

/**
 * Notes:
 * - Reviewed src/modules/spreadsheet/SheetContext.tsx while threading cell update options through provider boundaries.
 * - Coordinated with src/components/sheets/SelectionHighlight.tsx to keep suppressed validation errors consistent during autofill drags.
 */
