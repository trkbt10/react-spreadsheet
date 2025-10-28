// @vitest-environment jsdom

/**
 * @file Tests for the FormulaBar component.
 */

import { act, useLayoutEffect, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { VirtualScrollProvider } from "../../scrollarea/VirtualScrollContext";
import type { UseVirtualScrollReturn } from "../../../hooks/useVirtualScroll";
import type { Sheet, SpreadSheet } from "../../../types";
import { FormulaBar } from "./FormulaBar";
import { FormulaEngineProvider } from "../../../modules/formula/FormulaEngineContext";
import { FormulaEngine } from "../../../modules/formula/engine";
import { SheetProvider, useSheetContext } from "../../../modules/spreadsheet/SheetContext";
import { useSheetPointerEvents } from "../../../modules/spreadsheet/useSheetPointerEvents";
import type { SheetPointerEvent, UseSheetPointerEventsReturn } from "../../../modules/spreadsheet/useSheetPointerEvents";
import type { BoundActionCreators } from "../../../utils/typedActions";
import { sheetActions } from "../../../modules/spreadsheet/sheetActions";
import type { SheetState } from "../../../modules/spreadsheet/sheetReducer";
import type { CellUpdateRequestOptions, CellUpdateResult } from "../../../modules/spreadsheet/SpreadSheetContext";

const createVirtualScrollValue = (): UseVirtualScrollReturn => {
  const noop = () => {};
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
    containerRef: () => {},
    setScrollTop: noop,
    setScrollLeft: noop,
    handleKeyDown: noop,
  };
};

const createSheet = (): Sheet => ({
  id: "sheet-1",
  name: "Sheet 1",
  cells: {},
});

const createSpreadsheet = (sheet: Sheet): SpreadSheet => ({
  name: "Test Book",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  sheets: [sheet],
});

const ContextCapture = ({
  actionsRef,
  stateRef,
  children,
}: {
  actionsRef: { current: BoundActionCreators<typeof sheetActions> | null };
  stateRef: { current: SheetState | null };
  children: ReactNode;
}): ReactElement => {
  const { actions, state } = useSheetContext();
  useLayoutEffect(() => {
    actionsRef.current = actions;
    stateRef.current = state;
  }, [actions, state, actionsRef, stateRef]);
  return <>{children}</>;
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

describe("FormulaBar pointer-assisted editing", () => {
  const actionsRef: { current: BoundActionCreators<typeof sheetActions> | null } = { current: null };
  const stateRef: { current: SheetState | null } = { current: null };
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

  const renderWithProviders = (): void => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    containerRef.current = container;

    const sheet = createSheet();
    const spreadsheet = createSpreadsheet(sheet);
    const engine = FormulaEngine.fromSpreadsheet(spreadsheet);
    const virtualScrollValue = createVirtualScrollValue();

    const root = createRoot(container);
    rootRef.current = root;

    act(() => {
      root.render(
        <FormulaEngineProvider engine={engine}>
          <VirtualScrollProvider value={virtualScrollValue}>
            <SheetProvider
              sheet={sheet}
              name={sheet.name}
              id={sheet.id}
              onCellsUpdate={onCellsUpdateRef.current ?? undefined}
            >
              <ContextCapture actionsRef={actionsRef} stateRef={stateRef}>
                <>
                  <PointerSurface handlersRef={pointerHandlersRef} hostRef={pointerHostRef} />
                  <FormulaBar />
                </>
              </ContextCapture>
            </SheetProvider>
          </VirtualScrollProvider>
        </FormulaEngineProvider>,
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

  const waitForAnimationFrame = async (): Promise<void> => {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        resolve();
      });
    });
  };

  beforeEach(() => {
    actionsRef.current = null;
    stateRef.current = null;
    pointerHandlersRef.current = null;
    pointerHostRef.current = null;
    onCellsUpdateRef.current = () => ({ status: "applied" });
  });

  afterEach(() => {
    act(() => {
      rootRef.current?.unmount();
    });
    containerRef.current?.remove();
    containerRef.current = null;
    rootRef.current = null;
  });

  it("commits pointer-inserted references when editing via the formula bar", () => {
    const recordedUpdates: Array<Array<{ col: number; row: number; value: string }>> = [];
    onCellsUpdateRef.current = (updates) => {
      recordedUpdates.push(updates);
      return { status: "applied" };
    };

    renderWithProviders();

    const actions = actionsRef.current;
    if (!actions) {
      throw new Error("Actions are not available");
    }

    act(() => {
      actions.setActiveCell(1, 1);
      actions.startEditingCell(1, 1, "", "formulaBar");
    });

    expect(stateRef.current?.editorActivity.formulaBar).toBe(true);
    expect(stateRef.current?.editingSelection?.value).toBe("");

    const container = containerRef.current;
    expect(container).not.toBeNull();
    if (!container) {
      throw new Error("Container was not created");
    }

    const input = container.querySelector('input[data-is-formula]');
    expect(input).toBeInstanceOf(HTMLInputElement);
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Formula bar input was not rendered");
    }

    typeIntoInput(input, "=ABS(");
    expect(stateRef.current?.editingSelection?.value).toBe("=ABS(");

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

  it("preserves manual formula edits when pointer references are added after suggestions appeared", () => {
    const recordedUpdates: Array<Array<{ col: number; row: number; value: string }>> = [];
    onCellsUpdateRef.current = (updates) => {
      recordedUpdates.push(updates);
      return { status: "applied" };
    };

    renderWithProviders();

    const actions = actionsRef.current;
    if (!actions) {
      throw new Error("Actions were not captured");
    }

    act(() => {
      actions.setActiveCell(1, 1);
      actions.startEditingCell(1, 1, "=SUM(B2:B4)", "formulaBar");
    });

    const container = containerRef.current;
    expect(container).not.toBeNull();
    if (!container) {
      throw new Error("Container was not created");
    }

    const input = container.querySelector('input[data-is-formula]');
    expect(input).toBeInstanceOf(HTMLInputElement);
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Formula bar input was not rendered");
    }

    typeIntoInput(input, "=SUM(B2:B4)+");
    expect(stateRef.current?.editingSelection?.value).toBe("=SUM(B2:B4)+");

    act(() => {
      const nextValue = "=SUM(B2:B4)+B5";
      actions.updateEditingValue(nextValue);
      actions.setEditingCaretRange(nextValue.length, nextValue.length);
    });

    expect(input.value).toBe("=SUM(B2:B4)+B5");

    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(recordedUpdates.length).toBeGreaterThan(0);
    expect(recordedUpdates.every((call) => call[0]?.value === "=SUM(B2:B4)+B5")).toBe(true);
  });

  it("commits dragged range formulas entered through the formula bar", () => {
    const recordedUpdates: Array<Array<{ col: number; row: number; value: string }>> = [];
    onCellsUpdateRef.current = (updates) => {
      recordedUpdates.push(updates);
      return { status: "applied" };
    };

    renderWithProviders();

    const actions = actionsRef.current;
    if (!actions) {
      throw new Error("Actions were not captured");
    }

    act(() => {
      actions.setActiveCell(1, 1);
      actions.startEditingCell(1, 1, "", "formulaBar");
    });

    const container = containerRef.current;
    expect(container).not.toBeNull();
    if (!container) {
      throw new Error("Container was not created");
    }

    const input = container.querySelector('input[data-is-formula]');
    expect(input).toBeInstanceOf(HTMLInputElement);
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Formula bar input was not rendered");
    }

    typeIntoInput(input, "=SUM(");

    const columnX = 48 + 100 + 10;
    const startY = 24 + 8 * 24 + 10;
    const endY = 24 + 12 * 24 + 10;

    dispatchPointer("pointerdown", columnX, startY);
    dispatchPointer("pointerup", columnX, endY);

    expect(stateRef.current?.editingSelection?.value).toBe("=SUM(B9:B13");

    typeIntoInput(input, "=SUM(B9:B13)");

    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(recordedUpdates.length).toBeGreaterThan(0);
    expect(recordedUpdates.every((call) => call[0]?.value === "=SUM(B9:B13)")).toBe(true);
    expect(stateRef.current?.editingSelection).toBeNull();
    expect(stateRef.current?.editorActivity.formulaBar).toBe(false);
  });

  it("commits suggestion-applied range formulas without re-triggering edit mode", async () => {
    const recordedUpdates: Array<Array<{ col: number; row: number; value: string }>> = [];
    onCellsUpdateRef.current = (updates) => {
      recordedUpdates.push(updates);
      return { status: "applied" };
    };

    renderWithProviders();

    const actions = actionsRef.current;
    if (!actions) {
      throw new Error("Actions were not captured");
    }

    act(() => {
      actions.setActiveCell(1, 1);
      actions.startEditingCell(1, 1, "", "formulaBar");
    });

    const container = containerRef.current;
    expect(container).not.toBeNull();
    if (!container) {
      throw new Error("Container was not created");
    }

    const input = container.querySelector('input[data-is-formula]');
    expect(input).toBeInstanceOf(HTMLInputElement);
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Formula bar input was not rendered");
    }

    act(() => {
      input.focus();
    });

    typeIntoInput(input, "=SUM");

    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    await waitForAnimationFrame();

    expect(input.value).toBe("=SUM()");
    expect(stateRef.current?.editingSelection?.value).toBe("=SUM()");

    const columnX = 48 + 100 + 10;
    const startY = 24 + 8 * 24 + 10;
    const endY = 24 + 12 * 24 + 10;

    dispatchPointer("pointerdown", columnX, startY);
    dispatchPointer("pointerup", columnX, endY);

    expect(stateRef.current?.editingSelection?.value).toBe("=SUM(B9:B13)");
    expect(stateRef.current?.editingSelection?.isDirty).toBe(true);
    expect(input.value).toBe("=SUM(B9:B13)");

    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(recordedUpdates.length).toBeGreaterThan(0);
    expect(recordedUpdates.every((call) => call[0]?.value === "=SUM(B9:B13)")).toBe(true);
    expect(stateRef.current?.editingSelection).toBeNull();
    expect(stateRef.current?.editorActivity.formulaBar).toBe(false);
  });
});

// Notes:
// - Reviewed src/modules/formula/FormulaEngineContext.tsx to ensure the formula engine provider mirrors runtime usage in tests.
