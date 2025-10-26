/**
 * @file AVERAGE formula function.
 */

import type { FormulaFunctionDefinition } from "../functionRegistry";

export const averageFunction: FormulaFunctionDefinition = {
  name: "AVERAGE",
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args).filter(
      (value): value is number => typeof value === "number",
    );
    if (values.length === 0) {
      throw new Error("AVERAGE expects at least one numeric argument");
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    return total / values.length;
  },
};

