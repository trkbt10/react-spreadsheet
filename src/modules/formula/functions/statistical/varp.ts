/**
 * @file VARP function implementation (ODF 1.3 §6.18.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { collectNumericArguments, summarizeNumbers } from "../helpers";

export const variancePopulationFunction: FormulaFunctionEagerDefinition = {
  name: "VARP",
  description: {
    en: "Calculates the population variance of numeric arguments.",
    ja: "数値引数の母分散を計算します。",
  },
  examples: ["VARP(1, 3, 5)", "VARP(A1:A10)"],
  evaluate: (args, helpers) => {
    const numericValues = collectNumericArguments(args, helpers);

    if (numericValues.length === 0) {
      throw new Error("VARP expects at least one numeric argument");
    }

    const summary = summarizeNumbers(numericValues);
    const meanSquare = (summary.sum * summary.sum) / summary.count;
    return (summary.sumOfSquares - meanSquare) / summary.count;
  },
};

// NOTE: Shares helper usage with VAR at src/modules/formula/functions/statistical/var.ts.
