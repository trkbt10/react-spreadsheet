/**
 * @file MMULT function implementation (ODF 1.3 §6.17.4).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { normalizeNumericMatrix } from "./matrixHelpers";

const multiplyMatrices = (left: number[][], right: number[][], description: string): number[][] => {
  const sharedDimension = left[0]?.length ?? 0;
  if (sharedDimension === 0) {
    throw new Error(`${description} requires non-empty matrices`);
  }
  if (right.length !== sharedDimension) {
    throw new Error(`${description} requires the number of columns in the first matrix to match the number of rows in the second matrix`);
  }
  const rightColumnCount = right[0]?.length ?? 0;
  if (rightColumnCount === 0) {
    throw new Error(`${description} requires non-empty matrices`);
  }

  return left.map((leftRow) => {
    return Array.from({ length: rightColumnCount }, (_, columnIndex) => {
      return leftRow.reduce((total, leftValue, sharedIndex) => {
        const rightValue = right[sharedIndex]?.[columnIndex];
        if (typeof rightValue !== "number") {
          throw new Error(`${description} requires rectangular matrices`);
        }
        return total + leftValue * rightValue;
      }, 0);
    });
  });
};

export const mmultFunction: FormulaFunctionEagerDefinition = {
  name: "MMULT",
  description: {
    en: "Returns the matrix product of two arrays.",
    ja: "2つの配列の行列積を返します。",
  },
  examples: ["MMULT({1,2;3,4},{5;6})", "MMULT(A1:B2, C1:D2)"],
  evaluate: (args) => {
    if (args.length !== 2) {
      throw new Error("MMULT expects exactly two arguments");
    }

    const left = normalizeNumericMatrix(args[0], "MMULT");
    const right = normalizeNumericMatrix(args[1], "MMULT");

    return multiplyMatrices(left, right, "MMULT");
  },
};
