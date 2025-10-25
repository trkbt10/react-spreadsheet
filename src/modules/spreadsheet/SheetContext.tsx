/**
 * @file Sheet-level context for providing sheet information to child components.
 */

import { createContext, useContext, useReducer, useMemo } from "react";
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
};

const SheetContext = createContext<SheetContextValue | null>(null);

export type SheetProviderProps = {
  sheet: Sheet;
  name: string;
  id: string;
  children: ReactNode;
};

/**
 * Provider component for sheet-level context.
 * @param props - Provider props
 * @returns SheetProvider component
 */
export const SheetProvider = ({ sheet, name, id, children }: SheetProviderProps): ReactElement => {
  const [state, dispatch] = useReducer(sheetReducer, initialSheetState);

  const actions = useMemo(() => bindActionCreators(sheetActions, dispatch), []);

  const value = useMemo(
    (): SheetContextValue => ({
      sheet,
      name,
      id,
      state,
      dispatch,
      actions,
    }),
    [sheet, name, id, state, actions],
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
