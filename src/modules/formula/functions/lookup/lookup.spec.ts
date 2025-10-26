import { describe, it, expect } from "vitest";
import { formulaFunctionHelpers } from "../../functionRegistry";
import type { FormulaFunctionLazyContext } from "../../functionRegistry";
import type { FormulaEvaluationResult, WorkbookIndex } from "../../types";
import {
  invokeFormulaFunction,
  makeEvalArgs,
  createLiteralNode,
  defaultLazyEvaluate,
  invokeLazyFormulaFunction,
} from "../testHelpers";
import { hlookupFunction } from "./hlookup";
import { lookupFunction } from "./lookup";
import { matchFunction } from "./match";
import { chooseFunction } from "./choose";
import { indexFunction } from "./index";
import { offsetFunction } from "./offset";
import { indirectFunction } from "./indirect";
import { parseCellReference } from "../../address";

const evaluate = (...args: Parameters<typeof invokeFormulaFunction>) => {
  return invokeFormulaFunction(...args);
};

const evaluateFunction = (
  definition: Parameters<typeof invokeFormulaFunction>[0],
  ...args: Parameters<typeof makeEvalArgs>
) => {
  return evaluate(definition, formulaFunctionHelpers, makeEvalArgs(...args));
};

describe("lookup functions", () => {
  describe("HLOOKUP", () => {
    it("returns the matching value from the specified row", () => {
      const table = [
        ["Key", "Alt", "Spare"],
        [10, 20, 30],
        [100, 200, 300],
      ];
      const result = evaluateFunction(hlookupFunction, "Alt", table, 3, false);
      expect(result).toBe(200);
    });

    it("supports approximate matches for numeric lookups", () => {
      const table = [
        [10, 20, 40, 60],
        [1, 2, 3, 4],
      ];
      const result = evaluateFunction(hlookupFunction, 45, table, 2);
      expect(result).toBe(3);
    });
  });

  describe("LOOKUP", () => {
    it("returns the corresponding value from the result vector", () => {
      const value = evaluateFunction(lookupFunction, "b", ["a", "b", "c"], [1, 2, 3]);
      expect(value).toBe(2);
    });

    it("falls back to approximate numeric lookup when exact match is absent", () => {
      const value = evaluateFunction(lookupFunction, 15, [10, 20, 30], [100, 200, 300]);
      expect(value).toBe(100);
    });
  });

  describe("MATCH", () => {
    it("returns the position of an exact match when match type is 0", () => {
      const index = evaluateFunction(matchFunction, "target", ["base", "target", "tail"], 0);
      expect(index).toBe(2);
    });

    it("returns the last position less than or equal to the lookup value for match type 1", () => {
      const index = evaluateFunction(matchFunction, 32, [10, 20, 30, 40]);
      expect(index).toBe(3);
    });

    it("returns the smallest index whose value is greater than or equal to the lookup value for match type -1", () => {
      const index = evaluateFunction(matchFunction, 32, [50, 40, 30, 20], -1);
      expect(index).toBe(2);
    });
  });

  describe("CHOOSE", () => {
    it("returns the value at the requested index", () => {
      const result = evaluateFunction(chooseFunction, 2, "ignore", "second", "third");
      expect(result).toBe("second");
    });
  });
  describe("INDEX", () => {
    it("returns the value at the requested row and column", () => {
      const table = [
        [10, 20],
        [30, 40],
      ];
      const result = evaluateFunction(indexFunction, table, 2, 1);
      expect(result).toBe(30);
    });
  });

  describe("OFFSET", () => {
    it("returns a range shifted by the specified rows and columns", () => {
      const grid = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ];
      const origin = {
        sheetId: "sheet-1",
        sheetName: "Sheet1",
        row: 0,
        column: 0,
      } as const;

      const evaluateNode: FormulaFunctionLazyContext["evaluate"] = (node) => {
        if (node.type === "Reference") {
          return grid[node.address.row]?.[node.address.column] ?? null;
        }
        return defaultLazyEvaluate(node);
      };

      const rangeNode = {
        type: "Range" as const,
        start: origin,
        end: {
          ...origin,
          row: 1,
          column: 1,
        },
      };

      const result = invokeLazyFormulaFunction(
        offsetFunction,
        [rangeNode, createLiteralNode(1), createLiteralNode(1), createLiteralNode(2), createLiteralNode(2)],
        {
          evaluate: evaluateNode,
          origin,
        },
      );

      expect(result).toEqual([
        [5, 6],
        [8, 9],
      ]);
    });
  });

  describe("INDIRECT", () => {
    const origin = {
      sheetId: "sheet-1",
      sheetName: "Sheet1",
      row: 0,
      column: 0,
    } as const;

    const workbookIndex: WorkbookIndex = {
      byId: new Map([
        [
          "sheet-1",
          {
            id: "sheet-1",
            name: "Sheet1",
            index: 0,
          },
        ],
      ]),
      byName: new Map([
        [
          "SHEET1",
          {
            id: "sheet-1",
            name: "Sheet1",
            index: 0,
          },
        ],
      ]),
    };

    const grid: FormulaEvaluationResult[][] = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ];

    const evaluateNode: FormulaFunctionLazyContext["evaluate"] = (node) => {
      if (node.type === "Reference") {
        return grid[node.address.row]?.[node.address.column] ?? null;
      }
      if (node.type === "Range") {
        const minRow = Math.min(node.start.row, node.end.row);
        const maxRow = Math.max(node.start.row, node.end.row);
        const minColumn = Math.min(node.start.column, node.end.column);
        const maxColumn = Math.max(node.start.column, node.end.column);
        const values: FormulaEvaluationResult[][] = [];
        for (let row = minRow; row <= maxRow; row += 1) {
          const rowValues: FormulaEvaluationResult[] = [];
          for (let column = minColumn; column <= maxColumn; column += 1) {
            rowValues.push(grid[row]?.[column] ?? null);
          }
          values.push(rowValues);
        }
        return values;
      }
      return defaultLazyEvaluate(node);
    };

    const parseReference = (reference: string) => {
      return parseCellReference(reference, {
        defaultSheetId: origin.sheetId,
        defaultSheetName: origin.sheetName,
        workbookIndex,
      });
    };

    it("resolves a single-cell reference", () => {
      const result = invokeLazyFormulaFunction(indirectFunction, [createLiteralNode("B2"), createLiteralNode(true)], {
        evaluate: evaluateNode,
        origin,
        parseReference,
      });
      expect(result).toBe(5);
    });

    it("resolves a range reference", () => {
      const result = invokeLazyFormulaFunction(indirectFunction, [createLiteralNode("A1:B2")], {
        evaluate: evaluateNode,
        origin,
        parseReference,
      });
      expect(result).toEqual([
        [1, 2],
        [4, 5],
      ]);
    });
  });
});
