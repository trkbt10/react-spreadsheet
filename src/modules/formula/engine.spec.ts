import { describe, it, expect } from "vitest";
import type { SpreadSheet, Cell } from "../../types";
import { FormulaEngine } from "./engine";
import type { FormulaCellData } from "./types";

const createNumberCell = (x: number, y: number, value: number): Cell => {
  const id = `${x}:${y}` as const;
  return {
    id,
    x,
    y,
    type: "number",
    value,
  };
};

const createFormulaCell = (x: number, y: number, formula: string, value: number = 0): Cell => {
  const id = `${x}:${y}` as const;
  return {
    id,
    x,
    y,
    type: "formula",
    value,
    formula,
  };
};

const createTestSpreadsheet = (): SpreadSheet => {
  const sheetOneCells: Record<string, Cell> = {
    "0:0": createNumberCell(0, 0, 10),
    "0:1": createNumberCell(0, 1, 5),
    "0:2": createNumberCell(0, 2, 7),
    "0:3": createNumberCell(0, 3, 12),
    "1:0": createFormulaCell(1, 0, "=A1*2"),
    "1:1": createFormulaCell(1, 1, "=SUM(A2:A3)"),
    "1:2": createFormulaCell(1, 2, "=IF(A1>11, SUM(A2:A3), MIN(A2:A3))"),
    "1:3": createFormulaCell(1, 3, "=COUNTIF(A1:A4,\">6\")"),
    "2:1": createFormulaCell(2, 1, "=VLOOKUP(A2,'Sheet 2'!A2:B3,2,FALSE)", 500),
    "2:2": createFormulaCell(2, 2, "=VLOOKUP(6,'Sheet 2'!A2:B3,2)", 500),
    "2:0": createFormulaCell(2, 0, "=A1 + 'Sheet 2'!A1"),
  };

  const sheetTwoCells: Record<string, Cell> = {
    "0:0": createNumberCell(0, 0, 3),
    "0:1": createNumberCell(0, 1, 5),
    "1:1": createNumberCell(1, 1, 500),
    "0:2": createNumberCell(0, 2, 7),
    "1:2": createNumberCell(1, 2, 700),
  };

  return {
    name: "Test Workbook",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    sheets: [
      {
        name: "Sheet1",
        id: "sheet-1",
        cells: sheetOneCells,
      },
      {
        name: "Sheet 2",
        id: "sheet-2",
        cells: sheetTwoCells,
      },
    ],
  };
};

describe("FormulaEngine", () => {
  it("evaluates arithmetic and range formulas", () => {
    const engine = FormulaEngine.fromSpreadsheet(createTestSpreadsheet());

    const doubled = engine.resolveCellValueByCoords("sheet-1", 1, 0);
    const summed = engine.resolveCellValueByCoords("sheet-1", 1, 1);
    const conditional = engine.resolveCellValueByCoords("sheet-1", 1, 2);
    const counted = engine.resolveCellValueByCoords("sheet-1", 1, 3);
    const lookupExact = engine.resolveCellValueByCoords("sheet-1", 2, 1);
    const lookupApproximate = engine.resolveCellValueByCoords("sheet-1", 2, 2);

    expect(doubled).toBe(20);
    expect(summed).toBe(12);
    expect(conditional).toBe(5);
    expect(counted).toBe(3);
    expect(lookupExact).toBe(500);
    expect(lookupApproximate).toBe(500);
  });

  it("supports cross-sheet references with quoted names", () => {
    const engine = FormulaEngine.fromSpreadsheet(createTestSpreadsheet());
    const crossSheetValue = engine.resolveCellValueByCoords("sheet-1", 2, 0);
    expect(crossSheetValue).toBe(13);
  });

  it("updates dependent formulas when source cells change", () => {
    const engine = FormulaEngine.fromSpreadsheet(createTestSpreadsheet());

    expect(engine.resolveCellValueByCoords("sheet-1", 1, 0)).toBe(20);
    expect(engine.resolveCellValueByCoords("sheet-1", 1, 2)).toBe(5);
    expect(engine.resolveCellValueByCoords("sheet-1", 2, 0)).toBe(13);

    const updatedNumberCell: FormulaCellData = {
      type: "number",
      value: 20,
    };
    engine.updateCell(
      {
        sheetId: "sheet-1",
        sheetName: "Sheet1",
        column: 0,
        row: 0,
      },
      updatedNumberCell,
    );

    expect(engine.resolveCellValueByCoords("sheet-1", 1, 0)).toBe(40);
    expect(engine.resolveCellValueByCoords("sheet-1", 1, 2)).toBe(12);
    expect(engine.resolveCellValueByCoords("sheet-1", 2, 0)).toBe(23);
    expect(engine.resolveCellValueByCoords("sheet-1", 2, 1)).toBe(500);
    expect(engine.resolveCellValueByCoords("sheet-1", 2, 2)).toBe(500);

    engine.updateCell(
      {
        sheetId: "sheet-2",
        sheetName: "Sheet 2",
        column: 0,
        row: 0,
      },
      {
        type: "number",
        value: 5,
      },
    );

    expect(engine.resolveCellValueByCoords("sheet-1", 2, 0)).toBe(25);

    expect(engine.resolveCellValueByCoords("sheet-1", 2, 1)).toBe(500);
    expect(engine.resolveCellValueByCoords("sheet-1", 2, 2)).toBe(500);

    engine.updateCell(
      {
        sheetId: "sheet-2",
        sheetName: "Sheet 2",
        column: 1,
        row: 1,
      },
      {
        type: "number",
        value: 505,
      },
    );

    expect(engine.resolveCellValueByCoords("sheet-1", 2, 1)).toBe(505);
    expect(engine.resolveCellValueByCoords("sheet-1", 2, 2)).toBe(505);
  });
});
