/**
 * @file COUNT function implementation (ODF 1.3 §6.18.4).
 */

import type { FormulaFunctionDefinition } from "../../functionRegistry";

export const countFunction: FormulaFunctionDefinition = {
  name: "COUNT",
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args);
    return values.reduce<number>((count, value) => (typeof value === "number" ? count + 1 : count), 0);
  },
};

