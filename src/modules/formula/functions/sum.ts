/**
 * @file SUM formula function.
 */

import type { FormulaFunctionDefinition } from "../functionRegistry";

export const sumFunction: FormulaFunctionDefinition = {
  name: "SUM",
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

