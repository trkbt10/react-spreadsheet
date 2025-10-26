/**
 * @file SUM function implementation (ODF 1.3 §6.10.1).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const sumFunction: FormulaFunctionEagerDefinition = {
  name: "SUM",
  description: {
    en: "Adds all numeric arguments, ignoring empty cells and null values.",
    ja: "空のセルやnullを無視して数値引数を合計します。",
  },
  examples: ['SUM(1, 2, 3)', 'SUM(A1:A10)'],
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args);
    return values.reduce<number>((total, value) => {
      if (value === null) {
        return total;
      }
      if (typeof value !== "number") {
        throw new Error("SUM expects numeric arguments");
      }
      return total + value;
    }, 0);
  },
};
