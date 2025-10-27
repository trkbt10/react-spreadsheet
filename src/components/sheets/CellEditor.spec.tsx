// @vitest-environment jsdom

/**
 * @file Tests for the CellEditor component.
 */

import type { ReactElement, ReactNode } from "react";
import { useLayoutEffect, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { VirtualScrollProvider } from "../scrollarea/VirtualScrollContext";
import type { UseVirtualScrollReturn } from "../../hooks/useVirtualScroll";
import type { Sheet } from "../../types";
import { SheetProvider, useSheetContext } from "../../modules/spreadsheet/SheetContext";
import type { BoundActionCreators } from "../../utils/typedActions";
import { sheetActions } from "../../modules/spreadsheet/sheetActions";
import type { EditingOrigin, SheetState } from "../../modules/spreadsheet/sheetReducer";
import { FormulaValidationError } from "../../modules/formula/errors";
import { CellEditor } from "./CellEditor";
import type { CellUpdateResult, CellUpdateRequestOptions } from "../../modules/spreadsheet/SpreadSheetContext";

const createVirtualScrollValue = (): UseVirtualScrollReturn => {
  const setScroll: UseVirtualScrollReturn["setScrollTop"] = () => {};
  const handleKeyDown: UseVirtualScrollReturn["handleKeyDown"] = () => {};
  const containerRefCallback: UseVirtualScrollReturn["containerRef"] = () => {};

  return {
    scrollTop: 0,
    scrollLeft: 0,
    viewportWidth: 800,
    viewportHeight: 600,
    contentWidth: 800,
    contentHeight: 600,
    maxScrollTop: 0,
    maxScrollLeft: 0,
    viewportRect: { top: 0, left: 0, width: 800, height: 600 },
    containerRef: containerRefCallback,
    setScrollTop: setScroll,
    setScrollLeft: setScroll,
    handleKeyDown,
  };
};

const createSheet = (): Sheet => ({
  id: "sheet-1",
  name: "Sheet 1",
  cells: {},
});

type ActionsRef = {
  current: BoundActionCreators<typeof sheetActions> | null;
};

type StateRef = {
  current: SheetState | null;
};

const ContextCapture = ({
  actionsRef,
  stateRef,
  children,
}: {
  actionsRef: ActionsRef;
  stateRef: StateRef;
  children: ReactNode;
}): ReactElement => {
  const { actions, state } = useSheetContext();

  useLayoutEffect(() => {
    actionsRef.current = actions;
    stateRef.current = state;
  }, [actions, state, actionsRef, stateRef]);

  return <>{children}</>;
};

const EditingSurface = (): ReactElement | null => {
  const { state } = useSheetContext();
  if (!state.editorActivity.cellEditor || !state.editingSelection) {
    return null;
  }
  return <CellEditor />;
};

describe("CellEditor formula bar interaction", () => {
  const actionsRef: ActionsRef = { current: null };
  const stateRef: StateRef = { current: null };
  const rootRef: { current: Root | null } = { current: null };
  const containerRef: { current: HTMLDivElement | null } = { current: null };
  const onCellsUpdateRef: {
    current:
      | ((
          updates: Array<{ col: number; row: number; value: string }>,
          options?: CellUpdateRequestOptions,
        ) => CellUpdateResult | void)
      | null;
  } = { current: null };

  const renderWithProviders = (): void => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    containerRef.current = container;

    const root = createRoot(container);
    rootRef.current = root;

    const sheet = createSheet();
    const virtualScrollValue = createVirtualScrollValue();

    act(() => {
      root.render(
        <VirtualScrollProvider value={virtualScrollValue}>
          <SheetProvider
            sheet={sheet}
            name={sheet.name}
            id={sheet.id}
            onCellsUpdate={onCellsUpdateRef.current ?? undefined}
          >
            <ContextCapture actionsRef={actionsRef} stateRef={stateRef}>
              <EditingSurface />
            </ContextCapture>
          </SheetProvider>
        </VirtualScrollProvider>,
      );
    });
  };

  const dispatchEdit = (origin: EditingOrigin, asRange = origin === "formulaBar"): void => {
    const actions = actionsRef.current;
    if (!actions) {
      throw new Error("Actions are not available");
    }

    act(() => {
      if (!asRange) {
        actions.startEditingCell(1, 1, "initial", origin);
        return;
      }
      actions.startEditingRange(
        {
          startCol: 1,
          startRow: 1,
          endCol: 3,
          endRow: 3,
        },
        "",
        origin,
      );
    });
  };

  beforeEach(() => {
    actionsRef.current = null;
    stateRef.current = null;
    onCellsUpdateRef.current = () => ({ status: "applied" });
    renderWithProviders();
  });

  afterEach(() => {
    act(() => {
      rootRef.current?.unmount();
    });
    containerRef.current?.remove();
    rootRef.current = null;
    containerRef.current = null;
  });

  it("keeps inline editor hidden for multi-cell edits triggered by the formula bar", () => {
    renderWithProviders();
    dispatchEdit("formulaBar", true);

    const container = containerRef.current;
    expect(container).not.toBeNull();
    if (!container) {
      throw new Error("Container was not created");
    }

    expect(container.querySelector("input")).toBeNull();
    expect(stateRef.current?.editorActivity.formulaBar).toBe(true);
    expect(stateRef.current?.editorActivity.cellEditor).toBe(false);
    expect(stateRef.current?.editingSelection?.kind).toBe("range");
  });

  it("activates inline editing for direct cell edits without focusing the formula bar", () => {
    renderWithProviders();
    dispatchEdit("cellEditor", false);

    const container = containerRef.current;
    expect(container).not.toBeNull();
    if (!container) {
      throw new Error("Container was not created");
    }

    expect(container.querySelector("input")).not.toBeNull();
    expect(stateRef.current?.editorActivity.cellEditor).toBe(true);
    expect(stateRef.current?.editorActivity.formulaBar).toBe(false);
    expect(stateRef.current?.editingSelection?.kind).toBe("cell");
  });

  it("treats single-cell formula bar edits as formula bar activity only", () => {
    renderWithProviders();
    dispatchEdit("formulaBar", false);

    const container = containerRef.current;
    expect(container).not.toBeNull();
    if (!container) {
      throw new Error("Container was not created");
    }

    expect(container.querySelector("input")).toBeNull();
    expect(stateRef.current?.editorActivity.formulaBar).toBe(true);
    expect(stateRef.current?.editorActivity.cellEditor).toBe(false);
    expect(stateRef.current?.editingSelection?.kind).toBe("cell");
  });

  it("keeps inline editor active when formula validation fails during commit", () => {
    const failure = new FormulaValidationError(
      "Failed to validate formula at Sheet 1!B2: Unexpected token in expression",
      {
        sheetId: "sheet-1",
        sheetName: "Sheet 1",
        column: 1,
        row: 1,
      },
      new Error("Unexpected token in expression"),
    );
    const recordedUpdates: Array<Array<{ col: number; row: number; value: string }>> = [];
    const failingHandler = (
      updates: Array<{ col: number; row: number; value: string }>,
    ): CellUpdateResult => {
      recordedUpdates.push(updates);
      return { status: "rejected", error: failure };
    };
    onCellsUpdateRef.current = failingHandler;

    renderWithProviders();
    dispatchEdit("cellEditor", false);

    const container = containerRef.current;
    expect(container).not.toBeNull();
    if (!container) {
      throw new Error("Container was not created");
    }

    const input = container.querySelector("input");
    expect(input).toBeInstanceOf(HTMLInputElement);
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Inline editor input was not rendered");
    }

    act(() => {
      actionsRef.current?.updateEditingValue("=SUM(");
    });

    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(recordedUpdates).toHaveLength(1);
    const firstCall = recordedUpdates[0];
    expect(firstCall).toEqual([{ col: 1, row: 1, value: "=SUM(" }]);
    expect(stateRef.current?.editorActivity.cellEditor).toBe(true);
    expect(stateRef.current?.editingSelection).not.toBeNull();
    expect(input.validationMessage).toBe(failure.message);
  });
});
