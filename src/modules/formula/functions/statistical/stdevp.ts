/**
 * @file STDEVP function implementation (ODF 1.3 §6.18.18).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { collectNumericArguments, summarizeNumbers } from "../helpers";

export const standardDeviationPopulationFunction: FormulaFunctionEagerDefinition = {
  name: "STDEVP",
  description: {
    en: "Calculates the population standard deviation of numeric arguments.",
    ja: "数値引数の母標準偏差を計算します。",
  },
  examples: ["STDEVP(1, 3, 5)", "STDEVP(A1:A10)"],
  evaluate: (args, helpers) => {
    const numericValues = collectNumericArguments(args, helpers);

    if (numericValues.length === 0) {
      throw new Error("STDEVP expects at least one numeric argument");
    }

    const summary = summarizeNumbers(numericValues);
    const meanSquare = (summary.sum * summary.sum) / summary.count;
    const variance = (summary.sumOfSquares - meanSquare) / summary.count;
    return Math.sqrt(variance);
  },
};

// NOTE: Population variant mirrors VARP in src/modules/formula/functions/statistical/varp.ts.
