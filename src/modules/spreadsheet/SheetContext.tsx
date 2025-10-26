/**
 * @file Sheet-level context for providing sheet information to child components.
 */

import { createContext, useContext, useReducer, useMemo, useCallback } from "react";
import type { ReactNode, ReactElement, Dispatch } from "react";
import type { Sheet } from "../../types";
import { sheetReducer, initialSheetState } from "./sheetReducer";
import type { SheetState, SheetAction } from "./sheetReducer";
import { sheetActions } from "./sheetActions";
import { bindActionCreators } from "../../utils/typedActions";
import type { BoundActionCreators } from "../../utils/typedActions";

/**
 * Context value containing sheet information and state management.
 */
export type SheetContextValue = {
  sheet: Sheet;
  name: string;
  id: string;
  state: SheetState;
  dispatch: Dispatch<SheetAction>;
  actions: BoundActionCreators<typeof sheetActions>;
  onCellsUpdate?: (updates: Array<{ col: number; row: number; value: string }>) => void;
};

const SheetContext = createContext<SheetContextValue | null>(null);

export type SheetProviderProps = {
  sheet: Sheet;
  name: string;
  id: string;
  children: ReactNode;
  onCellsUpdate?: (updates: Array<{ col: number; row: number; value: string }>) => void;
};

/**
 * Provider component for sheet-level context.
 * @param props - Provider props
 * @returns SheetProvider component
 */
export const SheetProvider = ({
  sheet,
  name,
  id,
  children,
  onCellsUpdate: externalOnCellsUpdate,
}: SheetProviderProps): ReactElement => {
  const [state, dispatch] = useReducer(sheetReducer, initialSheetState);

  const actions = useMemo(() => bindActionCreators(sheetActions, dispatch), []);

  // TODO: Implement actual cell update logic here
  // For now, just log the updates
  const handleCellsUpdate = useCallback(
    (updates: Array<{ col: number; row: number; value: string }>) => {
      if (externalOnCellsUpdate) {
        externalOnCellsUpdate(updates);
      }
    },
    [externalOnCellsUpdate],
  );

  const value = useMemo(
    (): SheetContextValue => ({
      sheet,
      name,
      id,
      state,
      dispatch,
      actions,
      onCellsUpdate: handleCellsUpdate,
    }),
    [sheet, name, id, state, actions, handleCellsUpdate],
  );

  return <SheetContext.Provider value={value}>{children}</SheetContext.Provider>;
};

/**
 * Hook to access sheet context.
 * @throws Error if used outside of SheetProvider
 * @returns Sheet context value
 */
export const useSheetContext = (): SheetContextValue => {
  const context = useContext(SheetContext);
  if (!context) {
    throw new Error("useSheetContext must be used within SheetProvider");
  }
  return context;
};
