/**
 * @file DELTA function implementation (ODF 1.3 §6.19).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const deltaFunction: FormulaFunctionEagerDefinition = {
  name: "DELTA",
  description: {
    en: "Tests whether two numbers are equal.",
    ja: "2つの数値が等しいかどうかを判定します。",
  },
  examples: ["DELTA(5, 5)", "DELTA(3)"],
  evaluate: (args, helpers) => {
    if (args.length === 0 || args.length > 2) {
      throw new Error("DELTA expects one or two arguments");
    }
    const x = helpers.requireNumber(args[0], "DELTA number1");
    const y = args.length === 2 ? helpers.requireNumber(args[1], "DELTA number2") : 0;
    return x === y ? 1 : 0;
  },
};
