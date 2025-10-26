/**
 * @file MAX function implementation (ODF 1.3 §6.18.46).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const maxFunction: FormulaFunctionEagerDefinition = {
  name: "MAX",
  description: {
    en: "Returns the largest numeric value from the arguments.",
    ja: "引数の中で最大の数値を返します。",
  },
  examples: ['MAX(1, 5, 3)', 'MAX(A1:A10)'],
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args).filter(
      (value): value is number => typeof value === "number",
    );
    if (values.length === 0) {
      throw new Error("MAX expects at least one numeric argument");
    }
    return Math.max(...values);
  },
};
