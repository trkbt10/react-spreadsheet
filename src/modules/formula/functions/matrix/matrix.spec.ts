/**
 * @file Matrix function specifications.
 */

import { formulaFunctionHelpers, type FormulaFunctionDefinition } from "../../functionRegistry";
import type { EvalResult } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import { mmultFunction } from "./mmult";
import { minverseFunction } from "./minverse";
import { mdetermFunction } from "./mdeterm";
import { transposeFunction } from "./transpose";
import { frequencyFunction } from "./frequency";

const evaluate = (definition: FormulaFunctionDefinition, ...args: EvalResult[]) => {
  return invokeFormulaFunction(definition, formulaFunctionHelpers, makeEvalArgs(...args));
};

describe("matrix functions", () => {
  describe("MMULT", () => {
    it("computes the matrix product of compatible matrices", () => {
      const left = [
        [1, 2, 3],
        [4, 5, 6],
      ];
      const right = [
        [7, 8],
        [9, 10],
        [11, 12],
      ];
      const result = evaluate(mmultFunction, left, right);
      expect(result).toEqual([
        [58, 64],
        [139, 154],
      ]);
    });

    it("rejects non-conformable matrices", () => {
      expect(() => evaluate(mmultFunction, [[1, 2]], [[3, 4]])).toThrowError(/columns/i);
    });
  });

  describe("MINVERSE", () => {
    it("computes the inverse of a square matrix", () => {
      const matrix = [
        [4, 7],
        [2, 6],
      ];
      const result = evaluate(minverseFunction, matrix) as number[][];
      expect(result[0][0]).toBeCloseTo(0.6, 10);
      expect(result[0][1]).toBeCloseTo(-0.7, 10);
      expect(result[1][0]).toBeCloseTo(-0.2, 10);
      expect(result[1][1]).toBeCloseTo(0.4, 10);
    });

    it("rejects singular matrices", () => {
      expect(() => evaluate(minverseFunction, [
        [1, 2],
        [2, 4],
      ])).toThrowError(/non-singular/);
    });
  });

  describe("MDETERM", () => {
    it("computes the determinant of a square matrix", () => {
      const matrix = [
        [1, 2, 3],
        [0, 1, 4],
        [5, 6, 0],
      ];
      const result = evaluate(mdetermFunction, matrix) as number;
      expect(result).toBeCloseTo(1, 10);
    });
  });

  describe("TRANSPOSE", () => {
    it("transposes a rectangular matrix", () => {
      const matrix = [
        [1, 2, 3],
        [4, 5, 6],
      ];
      const result = evaluate(transposeFunction, matrix);
      expect(result).toEqual([
        [1, 4],
        [2, 5],
        [3, 6],
      ]);
    });

    it("returns the scalar value when input is not an array", () => {
      const result = evaluate(transposeFunction, 5);
      expect(result).toBe(5);
    });
  });

  describe("FREQUENCY", () => {
    it("computes frequency counts for ascending bins", () => {
      const data = [5, 15, 25, null, "ignored"];
      const bins = [10, 20];
      const result = evaluate(frequencyFunction, data, bins);
      expect(result).toEqual([[1], [1], [1]]);
    });

    it("rejects unsorted bins", () => {
      expect(() => evaluate(frequencyFunction, [1, 2, 3], [10, 5])).toThrowError(/ascending/);
    });
  });
});
