/**
 * @file AVERAGE function implementation (ODF 1.3 §6.18.3).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const averageFunction: FormulaFunctionEagerDefinition = {
  name: "AVERAGE",
  description: {
    en: "Returns the arithmetic mean of numeric arguments, ignoring non-numeric values.",
    ja: "数値以外を無視して引数の算術平均を返します。",
  },
  examples: ["AVERAGE(1, 2, 3)", "AVERAGE(A1:A10)"],
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args).filter((value): value is number => typeof value === "number");
    if (values.length === 0) {
      throw new Error("AVERAGE expects at least one numeric argument");
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    return total / values.length;
  },
};
