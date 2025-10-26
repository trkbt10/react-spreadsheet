/**
 * @file MIN function implementation (ODF 1.3 §6.18.48).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const minFunction: FormulaFunctionEagerDefinition = {
  name: "MIN",
  description: {
    en: "Returns the smallest numeric value from the arguments.",
    ja: "引数の中で最小の数値を返します。",
  },
  examples: ['MIN(1, 5, 3)', 'MIN(A1:A10)'],
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args).filter(
      (value): value is number => typeof value === "number",
    );
    if (values.length === 0) {
      throw new Error("MIN expects at least one numeric argument");
    }
    return Math.min(...values);
  },
};
