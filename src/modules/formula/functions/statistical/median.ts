/**
 * @file MEDIAN function implementation (ODF 1.3 §6.18.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const medianFunction: FormulaFunctionEagerDefinition = {
  name: "MEDIAN",
  description: {
    en: "Returns the median of numeric arguments, ignoring non-numeric values.",
    ja: "数値以外を無視して引数の中央値を返します。",
  },
  examples: ["MEDIAN(1, 3, 5)", "MEDIAN(A1:A9)"],
  evaluate: (args, helpers) => {
    const numericValues = helpers.flattenArguments(args).filter((value): value is number => typeof value === "number");

    if (numericValues.length === 0) {
      throw new Error("MEDIAN expects at least one numeric argument");
    }

    const sorted = [...numericValues].sort((left, right) => left - right);
    const midIndex = Math.floor(sorted.length / 2);

    if (sorted.length % 2 !== 0) {
      return sorted[midIndex];
    }

    return (sorted[midIndex - 1] + sorted[midIndex]) / 2;
  },
};

// NOTE: Matched numeric extraction rules from src/modules/formula/functions/statistical/average.ts.
