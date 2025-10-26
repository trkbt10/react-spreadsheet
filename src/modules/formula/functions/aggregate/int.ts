/**
 * @file INT function implementation (ODF 1.3 §6.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { normalizeZero } from "../helpers";

export const intFunction: FormulaFunctionEagerDefinition = {
  name: "INT",
  description: {
    en: "Rounds a number down to the nearest integer less than or equal to it.",
    ja: "数値を超えない最大の整数に切り下げます。",
  },
  examples: ['INT(5.9)', 'INT(A1)'],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("INT expects exactly one argument");
    }
    const [valueArg] = args;
    const value = helpers.requireNumber(valueArg, "INT number");
    const floored = Math.floor(value);
    return normalizeZero(floored);
  },
};
