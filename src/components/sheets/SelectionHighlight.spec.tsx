// @vitest-environment jsdom

/**
 * @file Tests for SelectionHighlight behaviour under different editing modes.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, useLayoutEffect } from "react";
import type { ReactElement, ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SelectionHighlight } from "./SelectionHighlight";
import { VirtualScrollProvider } from "../scrollarea/VirtualScrollContext";
import type { UseVirtualScrollReturn } from "../../hooks/useVirtualScroll";
import { SheetProvider, useSheetContext } from "../../modules/spreadsheet/SheetContext";
import type { Sheet } from "../../types";
import type { BoundActionCreators } from "../../utils/typedActions";
import { sheetActions } from "../../modules/spreadsheet/sheetActions";

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

const ContextCapture = ({
  actionsRef,
  children,
}: {
  actionsRef: ActionsRef;
  children: ReactNode;
}): ReactElement => {
  const { actions } = useSheetContext();

  useLayoutEffect(() => {
    actionsRef.current = actions;
  }, [actions, actionsRef]);

  return <>{children}</>;
};

const HEADER_WIDTH = 48;
const HEADER_HEIGHT = 24;

describe("SelectionHighlight editing visibility", () => {
  const actionsRef: ActionsRef = { current: null };
  const rootRef: { current: Root | null } = { current: null };
  const containerRef: { current: HTMLDivElement | null } = { current: null };

  const renderHighlight = (): void => {
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
          <SheetProvider sheet={sheet} name={sheet.name} id={sheet.id}>
            <ContextCapture actionsRef={actionsRef}>
              <SelectionHighlight headerColumnWidth={HEADER_WIDTH} headerRowHeight={HEADER_HEIGHT} />
            </ContextCapture>
          </SheetProvider>
        </VirtualScrollProvider>,
      );
    });
  };

  const dispatchEdit = (kind: "cell" | "range", origin: "formulaBar" | "cellEditor"): void => {
    const actions = actionsRef.current;
    if (!actions) {
      throw new Error("Sheet actions are not available");
    }

    act(() => {
      if (kind === "cell") {
        actions.startEditingCell(0, 0, "value", origin);
        return;
      }

      actions.startEditingRange(
        {
          startCol: 0,
          startRow: 0,
          endCol: 3,
          endRow: 3,
        },
        "",
        origin,
      );
    });
  };

  const querySelectionGroup = (): Element | null => {
    const container = containerRef.current;
    if (!container) {
      throw new Error("Container not initialised");
    }
    return container.querySelector('[data-highlight="selection"]');
  };

  beforeEach(() => {
    actionsRef.current = null;
    renderHighlight();
  });

  afterEach(() => {
    act(() => {
      rootRef.current?.unmount();
    });
    containerRef.current?.remove();
    rootRef.current = null;
    containerRef.current = null;
    actionsRef.current = null;
  });

  it("keeps the selection highlight visible when editing via the formula bar", () => {
    dispatchEdit("range", "formulaBar");
    expect(querySelectionGroup()).not.toBeNull();
  });

  it("hides the selection highlight while inline cell editing is active", () => {
    dispatchEdit("cell", "cellEditor");
    expect(querySelectionGroup()).toBeNull();
  });
});
