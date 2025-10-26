/**
 * @file COUNT function implementation (ODF 1.3 §6.18.4).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const countFunction: FormulaFunctionEagerDefinition = {
  name: "COUNT",
  description: {
    en: "Counts numeric values in the arguments, ignoring non-numeric entries.",
    ja: "数値以外を無視して引数内の数値を数えます。",
  },
  examples: ['COUNT(1, 2, "x")', "COUNT(A1:A10)"],
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args);
    return values.reduce<number>((count, value) => (typeof value === "number" ? count + 1 : count), 0);
  },
};
