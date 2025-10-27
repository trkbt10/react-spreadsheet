// @vitest-environment jsdom

/**
 * @file Tests for the useSheetPointerEvents hook.
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useLayoutEffect, type ReactElement } from "react";
import { bindActionCreators, type BoundActionCreators } from "../../utils/typedActions";
import { sheetActions } from "./sheetActions";
import { useSheetPointerEvents } from "./useSheetPointerEvents";
import type { SheetPointerEvent, UseSheetPointerEventsParams, UseSheetPointerEventsReturn } from "./useSheetPointerEvents";
import type { Sheet, SpreadSheet } from "../../types";

type ActionsRecord = BoundActionCreators<typeof sheetActions>;

const createActionsMock = (): { actions: ActionsRecord; recorded: Array<{ type: string; payload: unknown }> } => {
  const recorded: Array<{ type: string; payload: unknown }> = [];
  const dispatch = (action: { type: string; payload?: unknown }): void => {
    recorded.push({ type: action.type, payload: action.payload ?? null });
  };
  return {
    actions: bindActionCreators(sheetActions, dispatch),
    recorded,
  };
};

type HarnessProps = {
  params: UseSheetPointerEventsParams;
  hostRef: React.MutableRefObject<HTMLDivElement | null>;
  handlersRef: React.MutableRefObject<UseSheetPointerEventsReturn | null>;
};

const PointerHarness = ({ params, hostRef, handlersRef }: HarnessProps): ReactElement => {
  const handlers = useSheetPointerEvents(params);
  useLayoutEffect(() => {
    handlersRef.current = handlers;
  }, [handlers, handlersRef]);

  return (
    <div
      ref={(node) => {
        hostRef.current = node;
      }}
    />
  );
};

const createSheet = (): Sheet => ({
  id: "sheet-1",
  name: "Sheet 1",
  cells: {},
});

const createSpreadsheet = (sheet: Sheet): SpreadSheet => ({
  name: "Test",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  sheets: [sheet],
});

const createBaseParams = (overrides: Partial<UseSheetPointerEventsParams>): UseSheetPointerEventsParams => {
  const sheet = overrides.sheet ?? createSheet();
  const spreadsheet = overrides.spreadsheet ?? createSpreadsheet(sheet);
  return {
    actions: overrides.actions ?? bindActionCreators(sheetActions, () => {}),
    scrollLeft: overrides.scrollLeft ?? 0,
    scrollTop: overrides.scrollTop ?? 0,
    headerColumnWidth: overrides.headerColumnWidth ?? 48,
    headerRowHeight: overrides.headerRowHeight ?? 24,
    defaultCellWidth: overrides.defaultCellWidth ?? 100,
    defaultCellHeight: overrides.defaultCellHeight ?? 28,
    columnSizes: overrides.columnSizes ?? new Map(),
    rowSizes: overrides.rowSizes ?? new Map(),
    maxColumns: overrides.maxColumns ?? 16,
    maxRows: overrides.maxRows ?? 16,
    sheet,
    spreadsheet,
    selection: overrides.selection ?? { kind: "cell", col: 0, row: 0 },
    selectionAnchor: overrides.selectionAnchor ?? { col: 0, row: 0 },
    editingSelection:
      overrides.editingSelection ??
      ({
        kind: "cell",
        col: 0,
        row: 0,
        value: "",
        isDirty: true,
      } as const),
    editingCaret: overrides.editingCaret ?? { start: 0, end: 0 },
    editorActivity:
      overrides.editorActivity ??
      ({
        formulaBar: true,
        cellEditor: false,
      } as const),
    formulaTargeting: overrides.formulaTargeting ?? null,
  };
};

describe("useSheetPointerEvents", () => {
  const hostRef: React.MutableRefObject<HTMLDivElement | null> = { current: null };
  const handlersRef: React.MutableRefObject<UseSheetPointerEventsReturn | null> = { current: null };
  const rootRef: { current: Root | null } = { current: null };
  const containerRef: { current: HTMLDivElement | null } = { current: null };

  beforeEach(() => {
    hostRef.current = null;
    handlersRef.current = null;
    rootRef.current = null;
    containerRef.current = document.createElement("div");
    document.body.appendChild(containerRef.current);
  });

  afterEach(() => {
    act(() => {
      rootRef.current?.unmount();
    });
    if (containerRef.current) {
      containerRef.current.remove();
    }
    containerRef.current = null;
  });

  const renderHarness = (params: UseSheetPointerEventsParams): void => {
    const container = containerRef.current;
    if (!container) {
      throw new Error("Container was not initialised");
    }
    const root = createRoot(container);
    rootRef.current = root;
    act(() => {
      root.render(<PointerHarness params={params} hostRef={hostRef} handlersRef={handlersRef} />);
    });
  };

  const dispatchPointerDown = (overrides?: { clientX?: number; clientY?: number; pointerId?: number }) => {
    const handlers = handlersRef.current;
    const host = hostRef.current;
    if (!handlers || !host) {
      throw new Error("Harness was not initialised");
    }

    Object.assign(host, {
      setPointerCapture: () => {},
      releasePointerCapture: () => {},
      getBoundingClientRect: () => ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 360,
        bottom: 240,
        width: 360,
        height: 240,
        toJSON: () => ({}),
      }),
    });

    const pointerEvent: SheetPointerEvent = {
      pointerId: overrides?.pointerId ?? 1,
      clientX: overrides?.clientX ?? 64,
      clientY: overrides?.clientY ?? 32,
      shiftKey: false,
      currentTarget: host,
      preventDefault: () => {},
    };

    act(() => {
      handlers.handlePointerDown(pointerEvent);
    });

    return pointerEvent;
  };

  it("does not start formula targeting when editing plain text", () => {
    const { actions, recorded } = createActionsMock();
    const params = createBaseParams({
      actions,
      editingSelection: {
        kind: "cell",
        col: 0,
        row: 0,
        value: "plain text",
        isDirty: true,
      },
      editingCaret: { start: 5, end: 5 },
    });

    renderHarness(params);
    dispatchPointerDown();

    const startCalls = recorded.filter((action) => action.type === "sheet/startFormulaTargeting");
    const previewCalls = recorded.filter((action) => action.type === "sheet/updateFormulaTargetPreview");
    expect(startCalls).toHaveLength(0);
    expect(previewCalls).toHaveLength(0);
  });

  it("initialises formula targeting when editing a formula", () => {
    const { actions, recorded } = createActionsMock();
    const params = createBaseParams({
      actions,
      editingSelection: {
        kind: "cell",
        col: 0,
        row: 0,
        value: "=ABS(",
        isDirty: true,
      },
      editingCaret: { start: 5, end: 5 },
    });

    renderHarness(params);
    dispatchPointerDown();

    const startCalls = recorded.filter((action) => action.type === "sheet/startFormulaTargeting");
    expect(startCalls).toHaveLength(1);

    const previewCalls = recorded.filter((action) => action.type === "sheet/updateFormulaTargetPreview");
    expect(previewCalls).toHaveLength(1);
    const [preview] = previewCalls;
    expect(preview.payload).toEqual({
      previewRange: {
        startCol: 0,
        startRow: 0,
        endCol: 1,
        endRow: 1,
      },
      sheetId: "sheet-1",
    });
  });
});

// Notes:
// - Reviewed src/modules/spreadsheet/formulaTargetingUtils.ts to align fallback targeting expectations with the mocked selection state supplied here.
