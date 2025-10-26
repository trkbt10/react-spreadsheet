/**
 * @file ABS function implementation (ODF 1.3 §6.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { normalizeZero } from "../helpers";

export const absFunction: FormulaFunctionEagerDefinition = {
  name: "ABS",
  description: {
    en: "Returns the absolute value of a number.",
    ja: "数値の絶対値を返します。",
  },
  examples: ['ABS(-5)', 'ABS(A1)'],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("ABS expects exactly one argument");
    }
    const [valueArg] = args;
    const value = helpers.requireNumber(valueArg, "ABS number");
    const result = Math.abs(value);
    return normalizeZero(result);
  },
};
