// @vitest-environment jsdom

/**
 * @file Tests for the CellEditor component.
 */

import type { ReactElement, ReactNode } from "react";
import { useLayoutEffect, useMemo, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { VirtualScrollProvider } from "../../scrollarea/VirtualScrollContext";
import type { UseVirtualScrollReturn } from "../../../hooks/useVirtualScroll";
import type { Sheet } from "../../../types";
import { SheetProvider, useSheetContext } from "../../../modules/spreadsheet/SheetContext";
import type { BoundActionCreators } from "../../../utils/typedActions";
import { sheetActions } from "../../../modules/spreadsheet/sheetActions";
import type { EditingOrigin, SheetState } from "../../../modules/spreadsheet/sheetReducer";
import { FormulaValidationError } from "../../../modules/formula/errors";
import { CellEditor } from "./CellEditor";
import type { CellUpdateResult, CellUpdateRequestOptions } from "../../../modules/spreadsheet/SpreadSheetContext";
import { useSheetPointerEvents } from "../../../modules/spreadsheet/useSheetPointerEvents";
import type { SheetPointerEvent, UseSheetPointerEventsReturn } from "../../../modules/spreadsheet/useSheetPointerEvents";

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

const PointerSurface = ({
  handlersRef,
  hostRef,
}: {
  handlersRef: { current: UseSheetPointerEventsReturn | null };
  hostRef: { current: HTMLDivElement | null };
}): ReactElement => {
  const { sheet, state, actions, name } = useSheetContext();
  const spreadsheet = useMemo(
    () => ({
      name,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      sheets: [sheet],
    }),
    [name, sheet],
  );

  const handlers = useSheetPointerEvents({
    actions,
    scrollLeft: 0,
    scrollTop: 0,
    headerColumnWidth: 48,
    headerRowHeight: 24,
    defaultCellWidth: state.defaultCellWidth,
    defaultCellHeight: state.defaultCellHeight,
    columnSizes: state.columnSizes,
    rowSizes: state.rowSizes,
    maxColumns: 32,
    maxRows: 200,
    sheet,
    spreadsheet,
    selection: state.selection,
    selectionAnchor: state.selectionAnchor,
    editingSelection: state.editingSelection,
    editingCaret: state.editingCaret,
    editorActivity: state.editorActivity,
    formulaTargeting: state.formulaTargeting,
  });

  useLayoutEffect(() => {
    handlersRef.current = handlers;
  }, [handlers, handlersRef]);

  return (
    <div
      data-testid="pointer-surface"
      ref={(node) => {
        hostRef.current = node;
      }}
    />
  );
};

describe("CellEditor formula bar interaction", () => {
  const actionsRef: ActionsRef = { current: null };
  const stateRef: StateRef = { current: null };
  const rootRef: { current: Root | null } = { current: null };
  const containerRef: { current: HTMLDivElement | null } = { current: null };
  const pointerHandlersRef: { current: UseSheetPointerEventsReturn | null } = { current: null };
  const pointerHostRef: { current: HTMLDivElement | null } = { current: null };
  const onCellsUpdateRef: {
    current:
      | ((
          updates: Array<{ col: number; row: number; value: string }>,
          options?: CellUpdateRequestOptions,
        ) => CellUpdateResult | void)
      | null;
  } = { current: null };

  const renderWithProviders = (includePointerSurface = false): void => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    containerRef.current = container;

    const root = createRoot(container);
    rootRef.current = root;

    const sheet = createSheet();
    const virtualScrollValue = createVirtualScrollValue();

    const renderPointerSurface = (): ReactElement => {
      return <PointerSurface handlersRef={pointerHandlersRef} hostRef={pointerHostRef} />;
    };
    const pointerSurface = includePointerSurface ? renderPointerSurface() : null;

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
              <>
                {pointerSurface}
                <EditingSurface />
              </>
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

  const dispatchPointer = (type: "pointerdown" | "pointerup", clientX: number, clientY: number): void => {
    const handlers = pointerHandlersRef.current;
    const host = pointerHostRef.current;
    if (!handlers || !host) {
      throw new Error("Pointer surface was not initialised");
    }

    Object.assign(host, {
      setPointerCapture: () => {},
      releasePointerCapture: () => {},
      getBoundingClientRect: () => ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
        toJSON: () => ({}),
      }),
    });

    const pointerEvent: SheetPointerEvent = {
      pointerId: 1,
      clientX,
      clientY,
      shiftKey: false,
      currentTarget: host,
      preventDefault: () => {},
    };

    act(() => {
      if (type === "pointerdown") {
        handlers.handlePointerDown(pointerEvent);
        return;
      }
      handlers.handlePointerUp(pointerEvent);
    });
  };

  const typeIntoInput = (input: HTMLInputElement, value: string): void => {
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
    if (!descriptor || typeof descriptor.set !== "function") {
      throw new Error("Unable to set input value");
    }
    descriptor.set.call(input, value);
    input.selectionStart = value.length;
    input.selectionEnd = value.length;
    act(() => {
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };

  beforeEach(() => {
    actionsRef.current = null;
    stateRef.current = null;
    onCellsUpdateRef.current = () => ({ status: "applied" });
    pointerHandlersRef.current = null;
    pointerHostRef.current = null;
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

  it("commits exactly once on Enter even if the editor subsequently blurs", () => {
    const recordedUpdates: Array<Array<{ col: number; row: number; value: string }>> = [];
    onCellsUpdateRef.current = (updates) => {
      recordedUpdates.push(updates);
      return { status: "applied" };
    };

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
      actionsRef.current?.updateEditingValue("committed-value");
    });

    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(recordedUpdates[0]).toEqual([{ col: 1, row: 1, value: "committed-value" }]);
    expect(stateRef.current?.editingSelection).toBeNull();

    act(() => {
      input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    });

    expect(recordedUpdates.length).toBeGreaterThanOrEqual(1);
    expect(
      recordedUpdates.every((call) => call.length === 1 && call[0]?.value === "committed-value"),
    ).toBe(true);
    expect(container.querySelector("input")).toBeNull();
  });

  it("preserves inserted references after committing a formula edit created via pointer selection", () => {
    const recordedUpdates: Array<Array<{ col: number; row: number; value: string }>> = [];
    onCellsUpdateRef.current = (updates) => {
      recordedUpdates.push(updates);
      return { status: "applied" };
    };

    renderWithProviders(true);
    dispatchEdit("cellEditor", false);

    expect(pointerHandlersRef.current).not.toBeNull();
    expect(pointerHostRef.current).not.toBeNull();

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

    typeIntoInput(input, "=ABS(");

    dispatchPointer("pointerdown", 48 + 100 + 10, 24 + 4 * 24 + 10);
    dispatchPointer("pointerup", 48 + 100 + 10, 24 + 4 * 24 + 10);

    expect(stateRef.current?.editingSelection?.value).toBe("=ABS(B5");
    expect(input.value).toBe("=ABS(B5");

    typeIntoInput(input, "=ABS(B5)");

    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(recordedUpdates.length).toBeGreaterThan(0);
    expect(recordedUpdates.every((call) => call[0]?.value === "=ABS(B5)")).toBe(true);
  });

  it("retains extended formulas when pointer references are appended", () => {
    const recordedUpdates: Array<Array<{ col: number; row: number; value: string }>> = [];
    onCellsUpdateRef.current = (updates) => {
      recordedUpdates.push(updates);
      return { status: "applied" };
    };

    renderWithProviders(true);
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

    typeIntoInput(input, "=SUM(B2:B4)+");
    expect(stateRef.current?.editingSelection?.value).toBe("=SUM(B2:B4)+");

    dispatchPointer("pointerdown", 48 + 100 + 10, 24 + 1 * 24 + 10);
    dispatchPointer("pointerup", 48 + 100 + 10, 24 + 1 * 24 + 10);

    expect(input.value).toBe("=SUM(B2:B4)+B2");

    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(recordedUpdates.length).toBeGreaterThan(0);
    expect(recordedUpdates.every((call) => call[0]?.value === "=SUM(B2:B4)+B2")).toBe(true);
  });
});
