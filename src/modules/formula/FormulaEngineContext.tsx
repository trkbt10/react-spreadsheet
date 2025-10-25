/**
 * @file React context for sharing the formula engine across the component tree.
 */

import { createContext, useContext, useMemo } from "react";
import type { ReactNode, ReactElement } from "react";
import type { SpreadSheet } from "../../types";
import { FormulaEngine } from "./engine";

const FormulaEngineContext = createContext<FormulaEngine | null>(null);

export type FormulaEngineProviderProps = {
  engine: FormulaEngine;
  children: ReactNode;
};

export const FormulaEngineProvider = ({ engine, children }: FormulaEngineProviderProps): ReactElement => {
  return <FormulaEngineContext.Provider value={engine}>{children}</FormulaEngineContext.Provider>;
};

export const useFormulaEngine = (): FormulaEngine => {
  const engine = useContext(FormulaEngineContext);
  if (!engine) {
    throw new Error("useFormulaEngine must be used within FormulaEngineProvider");
  }
  return engine;
};

export const useFormulaEngineWithSpreadsheet = (spreadsheet: SpreadSheet): FormulaEngine => {
  return useMemo(() => FormulaEngine.fromSpreadsheet(spreadsheet), [spreadsheet]);
};
