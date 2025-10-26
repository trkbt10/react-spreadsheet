/**
 * @file STDEV function implementation (ODF 1.3 §6.18.17).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { collectNumericArguments, summarizeNumbers } from "../helpers";

export const standardDeviationFunction: FormulaFunctionEagerDefinition = {
  name: "STDEV",
  description: {
    en: "Calculates the sample standard deviation of numeric arguments.",
    ja: "数値引数の標本標準偏差を計算します。",
  },
  examples: ['STDEV(1, 3, 5)', 'STDEV(A1:A10)'],
  evaluate: (args, helpers) => {
    const numericValues = collectNumericArguments(args, helpers);

    if (numericValues.length < 2) {
      throw new Error("STDEV expects at least two numeric arguments");
    }

    const summary = summarizeNumbers(numericValues);
    const meanSquare = (summary.sum * summary.sum) / summary.count;
    const variance = (summary.sumOfSquares - meanSquare) / (summary.count - 1);
    return Math.sqrt(variance);
  },
};

// NOTE: Depends on the same variance summary as VAR defined in src/modules/formula/functions/statistical/var.ts.
