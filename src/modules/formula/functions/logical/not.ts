/**
 * @file NOT function implementation (ODF 1.3 §6.11.3).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const notFunction: FormulaFunctionEagerDefinition = {
  name: "NOT",
  description: {
    en: "Returns the logical negation of a boolean value.",
    ja: "真偽値を反転させた結果を返します。",
  },
  examples: ['NOT(TRUE)', 'NOT(A1)'],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("NOT expects exactly one argument");
    }
    const booleanValue = helpers.coerceLogical(args[0], "NOT argument");
    return !booleanValue;
  },
};

// NOTE: Confirmed logical coercion behaviour in src/modules/formula/functions/helpers/coerceLogical.ts.
