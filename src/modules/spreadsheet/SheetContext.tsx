/**
 * @file Sheet-level context for providing sheet information to child components.
 */

import { createContext, useContext, useReducer, useMemo, useCallback, useEffect } from "react";
import type { ReactNode, ReactElement, Dispatch } from "react";
import type { Sheet } from "../../types";
import { sheetReducer, initialSheetState } from "./sheetReducer";
import type { SheetState, SheetAction } from "./sheetReducer";
import { sheetActions } from "./sheetActions";
import { bindActionCreators } from "../../utils/typedActions";
import type { BoundActionCreators } from "../../utils/typedActions";
import { applyUpdatesToSheet, type CellUpdate, isUpdateApplied } from "./cellUpdates";
import type { CellUpdateRequestOptions, CellUpdateResult } from "./SpreadSheetContext";

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
  onCellsUpdate?: (updates: Array<CellUpdate>, options?: CellUpdateRequestOptions) => CellUpdateResult | void;
};

const SheetContext = createContext<SheetContextValue | null>(null);

export type SheetProviderProps = {
  sheet: Sheet;
  name: string;
  id: string;
  children: ReactNode;
  onCellsUpdate?: (updates: Array<CellUpdate>, options?: CellUpdateRequestOptions) => CellUpdateResult | void;
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

  const notifyExternal = useCallback(
    (updates: Array<CellUpdate>, options?: CellUpdateRequestOptions): CellUpdateResult => {
      if (externalOnCellsUpdate) {
        const result = externalOnCellsUpdate(updates, options);
        if (!result) {
          return { status: "applied" };
        }
        return result;
      }
      return { status: "applied" };
    },
    [externalOnCellsUpdate],
  );

  const applyOptimisticUpdates = useCallback(
    (updates: Array<CellUpdate>, options?: CellUpdateRequestOptions): CellUpdateResult => {
      const result = notifyExternal(updates, options);
      if (result.status !== "applied") {
        return result;
      }
      if (updates.length === 0) {
        return result;
      }
      actions.recordOptimisticUpdates(updates);
      return result;
    },
    [actions, notifyExternal],
  );

  useEffect(() => {
    if (state.pendingUpdates.length === 0) {
      return;
    }
    const pendingUpdates = Array.from(state.pendingUpdates);
    try {
      const result = notifyExternal(pendingUpdates);
      if (result.status !== "applied") {
        if (result.status === "rejected") {
          actions.removeOptimisticUpdates(pendingUpdates);
          console.error("Failed to apply pending spreadsheet updates", result.error);
        }
        actions.clearPendingUpdates();
        return;
      }
      actions.clearPendingUpdates();
    } catch (error) {
      actions.removeOptimisticUpdates(pendingUpdates);
      actions.clearPendingUpdates();
      console.error("Failed to apply pending spreadsheet updates", error);
      return;
    }
  }, [state.pendingUpdates, notifyExternal, actions]);

  useEffect(() => {
    if (state.optimisticUpdates.length === 0) {
      return;
    }

    const unresolved = state.optimisticUpdates.filter((update) => !isUpdateApplied(sheet, update));
    if (unresolved.length === state.optimisticUpdates.length) {
      return;
    }

    actions.setOptimisticUpdates(unresolved);
  }, [sheet, state.optimisticUpdates, actions]);

  const optimisticSheet = useMemo((): Sheet => {
    if (state.optimisticUpdates.length === 0) {
      return sheet;
    }
    return applyUpdatesToSheet(sheet, state.optimisticUpdates);
  }, [sheet, state.optimisticUpdates]);

  const value = useMemo(
    (): SheetContextValue => ({
      sheet: optimisticSheet,
      name,
      id,
      state,
      dispatch,
      actions,
      onCellsUpdate: applyOptimisticUpdates,
    }),
    [optimisticSheet, name, id, state, actions, applyOptimisticUpdates],
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

/**
 * Notes:
 * - Consulted src/modules/spreadsheet/sheetReducer.ts to align optimistic update handling with reducer actions.
 * - Reviewed src/modules/spreadsheet/SpreadSheetContext.tsx to ensure notification order and update options match spreadsheet-level error handling.
 */
