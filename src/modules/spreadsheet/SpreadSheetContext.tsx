/**
 * @file SpreadSheet-level context for providing spreadsheet information to child components.
 */

import { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { ReactNode, ReactElement } from "react";
import type { SpreadSheet, Sheet, Cell, CellId } from "../../types";
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

type CellUpdate = {
  col: number;
  row: number;
  value: string;
};

const NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/u;
const BOOLEAN_PATTERN = /^(true|false)$/iu;

const createCellId = (col: number, row: number): CellId => `${col}:${row}` as CellId;

const inferCellFromValue = (col: number, row: number, rawValue: string, previous?: Cell): Cell | null => {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const id = createCellId(col, row);

  if (trimmed.startsWith("=")) {
    return {
      id,
      x: col,
      y: row,
      type: "formula",
      value: previous?.type === "formula" ? previous.value : null,
      formula: trimmed,
    } satisfies Cell;
  }

  if (NUMBER_PATTERN.test(trimmed)) {
    return {
      id,
      x: col,
      y: row,
      type: "number",
      value: Number.parseFloat(trimmed),
    } satisfies Cell;
  }

  if (BOOLEAN_PATTERN.test(trimmed)) {
    const normalized = trimmed.toLowerCase();
    return {
      id,
      x: col,
      y: row,
      type: "boolean",
      value: normalized === "true",
    } satisfies Cell;
  }

  if (trimmed.toLowerCase() === "null") {
    return {
      id,
      x: col,
      y: row,
      type: "null",
      value: null,
    } satisfies Cell;
  }

  return {
    id,
    x: col,
    y: row,
    type: "string",
    value: rawValue,
  } satisfies Cell;
};

const cellsEqual = (left: Cell | undefined, right: Cell | undefined): boolean => {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return left.type === right.type && Object.is(left.value, right.value) && left.formula === right.formula;
};

const applyUpdatesToSheet = (sheet: Sheet, updates: ReadonlyArray<CellUpdate>): Sheet => {
  if (updates.length === 0) {
    return sheet;
  }

  const nextCells: Sheet["cells"] = { ...sheet.cells };
  let mutated = false;

  updates.forEach(({ col, row, value }) => {
    const cellId = createCellId(col, row);
    const previous = nextCells[cellId];
    const next = inferCellFromValue(col, row, value, previous);

    if (!next) {
      if (previous) {
        delete nextCells[cellId];
        mutated = true;
      }
      return;
    }

    if (!cellsEqual(previous, next)) {
      nextCells[cellId] = next;
      mutated = true;
    }
  });

  if (!mutated) {
    return sheet;
  }

  return {
    ...sheet,
    cells: nextCells,
  } satisfies Sheet;
};

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
    (updates: Array<CellUpdate>) => {
      if (updates.length === 0) {
        return;
      }

      setDocumentState((current) => {
        const sheetIndex = current.sheets.findIndex((sheet) => sheet.id === activeSheetId);
        if (sheetIndex === -1) {
          return current;
        }

        const targetSheet = current.sheets[sheetIndex];
        const updatedSheet = applyUpdatesToSheet(targetSheet, updates);
        if (updatedSheet === targetSheet) {
          return current;
        }

        const nextSheets = [...current.sheets];
        nextSheets[sheetIndex] = updatedSheet;

        return {
          ...current,
          sheets: nextSheets,
          updatedAt: new Date().toISOString(),
        } satisfies SpreadSheet;
      });
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
