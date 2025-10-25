/**
 * @file SpreadSheet-level context for providing spreadsheet information to child components.
 */

import { createContext, useContext } from "react";
import type { ReactNode, ReactElement } from "react";
import type { SpreadSheet } from "../../types";

/**
 * Context value containing spreadsheet information.
 */
export type SpreadSheetContextValue = {
  spreadsheet: SpreadSheet;
  name: string;
};

const SpreadSheetContext = createContext<SpreadSheetContextValue | null>(null);

export type SpreadSheetProviderProps = {
  value: SpreadSheetContextValue;
  children: ReactNode;
};

/**
 * Provider component for spreadsheet-level context.
 * @param props - Provider props
 * @returns SpreadSheetProvider component
 */
export const SpreadSheetProvider = ({ value, children }: SpreadSheetProviderProps): ReactElement => {
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
