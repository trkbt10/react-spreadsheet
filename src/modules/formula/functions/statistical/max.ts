/**
 * @file MAX function implementation (ODF 1.3 §6.18.46).
 */

import type { FormulaFunctionDefinition } from "../../functionRegistry";

export const maxFunction: FormulaFunctionDefinition = {
  name: "MAX",
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args).filter(
      (value): value is number => typeof value === "number",
    );
    if (values.length === 0) {
      throw new Error("MAX expects at least one numeric argument");
    }
    return Math.max(...values);
  },
};

