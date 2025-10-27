// @vitest-environment jsdom

/**
 * @file Tests for SheetContext pending update propagation.
 */

import { act, useLayoutEffect } from "react";
import type { ReactElement, ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SheetProvider, useSheetContext } from "./SheetContext";
import type { BoundActionCreators } from "../../utils/typedActions";
import { sheetActions } from "./sheetActions";
import type { Sheet } from "../../types";
import type { CellUpdate } from "./cellUpdates";
import { FormulaValidationError } from "../formula/errors";
import type { CellUpdateRequestOptions, CellUpdateResult } from "./SpreadSheetContext";

type ActionsRef = {
  current: BoundActionCreators<typeof sheetActions> | null;
};

type SheetRef = {
  current: Sheet | null;
};

type OnUpdateRef = {
  current:
    | ((updates: Array<CellUpdate>, options?: CellUpdateRequestOptions) => CellUpdateResult | void)
    | null;
};

type ContextOnUpdateRef = {
  current:
    | ((updates: Array<CellUpdate>, options?: CellUpdateRequestOptions) => CellUpdateResult | void)
    | null;
};

const createSheet = (): Sheet => ({
  id: "sheet-ctx",
  name: "Sheet Context",
  cells: {
    "0:0": {
      id: "0:0",
      x: 0,
      y: 0,
      type: "string",
      value: "initial",
    },
  },
});

const requireSheetState = (value: Sheet | null): Sheet => {
  if (!value) {
    throw new Error("Sheet state not captured");
  }
  return value;
};

const ContextCapture = ({
  actionsRef,
  sheetRef,
  contextOnUpdateRef,
  children,
}: {
  actionsRef: ActionsRef;
  sheetRef: SheetRef;
  contextOnUpdateRef: ContextOnUpdateRef;
  children: ReactNode;
}): ReactElement => {
  const { actions, sheet, onCellsUpdate } = useSheetContext();

  useLayoutEffect(() => {
    actionsRef.current = actions;
    sheetRef.current = sheet;
    contextOnUpdateRef.current = onCellsUpdate ?? null;
  }, [actions, sheet, onCellsUpdate, actionsRef, sheetRef, contextOnUpdateRef]);

  return <>{children}</>;
};

const commitValue = (
  actions: BoundActionCreators<typeof sheetActions>,
  updateRef: ContextOnUpdateRef,
  value: string,
): void => {
  const triggerUpdates = updateRef.current;
  if (!triggerUpdates) {
    throw new Error("Sheet context updates are not available");
  }

  act(() => {
    actions.startEditingCell(0, 0, "initial", "cellEditor");
  });
  act(() => {
    actions.updateEditingValue(value);
  });

  act(() => {
    const result = triggerUpdates([{ col: 0, row: 0, value }]);
    if (result && result.status === "rejected") {
      throw result.error;
    }
  });

  act(() => {
    actions.commitEdit();
  });
};

describe("SheetContext cell updates", () => {
  const actionsRef: ActionsRef = { current: null };
  const sheetRef: SheetRef = { current: null };
  const externalUpdateRef: OnUpdateRef = { current: null };
  const contextOnUpdateRef: ContextOnUpdateRef = { current: null };
  const rootRef: { current: Root | null } = { current: null };
  const containerRef: { current: HTMLDivElement | null } = { current: null };

  const renderProvider = (): void => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    containerRef.current = container;

    const root = createRoot(container);
    rootRef.current = root;

    const sheet = createSheet();

    act(() => {
      root.render(
        <SheetProvider
          sheet={sheet}
          name={sheet.name}
          id={sheet.id}
          onCellsUpdate={externalUpdateRef.current ?? undefined}
        >
          <ContextCapture
            actionsRef={actionsRef}
            sheetRef={sheetRef}
            contextOnUpdateRef={contextOnUpdateRef}
          >
            <div />
          </ContextCapture>
        </SheetProvider>,
      );
    });
  };

  const flushEffects = async (): Promise<void> => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    actionsRef.current = null;
    sheetRef.current = null;
    externalUpdateRef.current = null;
    contextOnUpdateRef.current = null;
    renderProvider();
  });

  afterEach(() => {
    act(() => {
      rootRef.current?.unmount();
    });
    containerRef.current?.remove();
    rootRef.current = null;
    containerRef.current = null;
  });

  it("applies pending updates to the local sheet state when commits occur", async () => {
    const actions = actionsRef.current;
    expect(actions).not.toBeNull();
    if (!actions) {
      throw new Error("Sheet actions are unavailable");
    }

    commitValue(actions, contextOnUpdateRef, "updated");
    await flushEffects();

    const sheet = requireSheetState(sheetRef.current);

    const cell = sheet.cells["0:0"];
    expect(cell).not.toBeUndefined();
    if (!cell) {
      throw new Error("Updated cell was not found");
    }
    expect(cell.value).toBe("updated");
    expect(cell.type).toBe("string");
  });

  it("applies optimistic updates when cells are patched directly", async () => {
    const triggerUpdates = contextOnUpdateRef.current;
    expect(triggerUpdates).not.toBeNull();
    if (!triggerUpdates) {
      throw new Error("Sheet context updates are not available");
    }

  act(() => {
    const result = triggerUpdates([{ col: 2, row: 2, value: "inline" }]);
    expect(result?.status ?? "applied").toBe("applied");
  });

    const sheet = requireSheetState(sheetRef.current);
    const cell = sheet.cells["2:2"];
    expect(cell).not.toBeUndefined();
    if (!cell) {
      throw new Error("Inline update was not applied");
    }
    expect(cell.value).toBe("inline");
    expect(cell.type).toBe("string");
  });

  it("notifies external handlers while still mutating local sheet state", async () => {
    const recordedUpdates: Array<Array<CellUpdate>> = [];
    const externalUpdates = (updates: Array<CellUpdate>): CellUpdateResult => {
      recordedUpdates.push(updates);
      return { status: "applied" };
    };
    externalUpdateRef.current = externalUpdates;

    actionsRef.current = null;
    sheetRef.current = null;

    act(() => {
      rootRef.current?.render(
        <SheetProvider
          sheet={createSheet()}
          name="Sheet Context"
          id="sheet-ctx"
          onCellsUpdate={externalUpdateRef.current ?? undefined}
        >
          <ContextCapture
            actionsRef={actionsRef}
            sheetRef={sheetRef}
            contextOnUpdateRef={contextOnUpdateRef}
          >
            <div />
          </ContextCapture>
        </SheetProvider>,
      );
    });

    const actions = actionsRef.current;
    expect(actions).not.toBeNull();
    if (!actions) {
      throw new Error("Sheet actions are unavailable");
    }

    commitValue(actions, contextOnUpdateRef, "42");
    await flushEffects();

    expect(recordedUpdates.length).toBeGreaterThanOrEqual(1);
    expect(recordedUpdates[0]).toEqual([{ col: 0, row: 0, value: "42" }]);

    const sheet = requireSheetState(sheetRef.current);
    const cell = sheet.cells["0:0"];
    expect(cell).not.toBeUndefined();
    if (!cell) {
      throw new Error("Updated cell was not found");
    }
    expect(cell.type).toBe("number");
    expect(cell.value).toBe(42);
  });

  it("leaves local sheet state unchanged when external handlers reject updates", async () => {
    const failure = new FormulaValidationError(
      "Failed to validate formula at Sheet Context!A1: Unexpected token in expression",
      {
        sheetId: "sheet-ctx",
        sheetName: "Sheet Context",
        column: 0,
        row: 0,
      },
      new Error("Unexpected token in expression"),
    );
    const externalUpdates = (): CellUpdateResult => {
      return { status: "rejected", error: failure };
    };
    externalUpdateRef.current = externalUpdates;

    actionsRef.current = null;
    sheetRef.current = null;

    act(() => {
      rootRef.current?.render(
        <SheetProvider
          sheet={createSheet()}
          name="Sheet Context"
          id="sheet-ctx"
          onCellsUpdate={externalUpdateRef.current ?? undefined}
        >
          <ContextCapture
            actionsRef={actionsRef}
            sheetRef={sheetRef}
            contextOnUpdateRef={contextOnUpdateRef}
          >
            <div />
          </ContextCapture>
        </SheetProvider>,
      );
    });

    const actions = actionsRef.current;
    expect(actions).not.toBeNull();
    if (!actions) {
      throw new Error("Sheet actions are unavailable");
    }

    expect(() => {
      commitValue(actions, contextOnUpdateRef, "=SUM(");
    }).toThrow(failure);

    const sheet = requireSheetState(sheetRef.current);
    const cell = sheet.cells["0:0"];
    expect(cell).not.toBeUndefined();
    if (!cell) {
      throw new Error("Expected initial cell to be present");
    }
    expect(cell.value).toBe("initial");
    expect(cell.type).toBe("string");
  });
});

/**
 * Notes:
 * - Studied src/modules/spreadsheet/sheetReducer.ts to confirm pendingUpdates dispatch semantics under test.
 * - Reused patterns from src/components/sheets/CellEditor.spec.tsx for capturing bound sheet actions during rendering.
 */
