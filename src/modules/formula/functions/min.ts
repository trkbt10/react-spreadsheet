/**
 * @file MIN formula function.
 */

import type { FormulaFunctionDefinition } from "../functionRegistry";

export const minFunction: FormulaFunctionDefinition = {
  name: "MIN",
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args).filter(
      (value): value is number => typeof value === "number",
    );
    if (values.length === 0) {
      throw new Error("MIN expects at least one numeric argument");
    }
    return Math.min(...values);
  },
};

