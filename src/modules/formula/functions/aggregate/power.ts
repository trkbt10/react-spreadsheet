/**
 * @file POWER function implementation (ODF 1.3 §6.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const powerFunction: FormulaFunctionEagerDefinition = {
  name: "POWER",
  description: {
    en: "Raises a base number to a given exponent.",
    ja: "指定した指数で底となる数値をべき乗します。",
  },
  examples: ['POWER(2, 3)', 'POWER(A1, 0.5)'],
  evaluate: (args, helpers) => {
    if (args.length !== 2) {
      throw new Error("POWER expects exactly two arguments");
    }
    const [baseArg, exponentArg] = args;
    const base = helpers.requireNumber(baseArg, "POWER base");
    const exponent = helpers.requireNumber(exponentArg, "POWER exponent");
    return base ** exponent;
  },
};
