/**
 * @file OR function implementation (ODF 1.3 §6.11.2).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const orFunction: FormulaFunctionEagerDefinition = {
  name: "OR",
  description: {
    en: "Returns TRUE if any argument evaluates to TRUE; otherwise FALSE.",
    ja: "引数のいずれかがTRUEであればTRUEを返し、それ以外はFALSEを返します。",
  },
  examples: ["OR(TRUE, FALSE)", "OR(A1:A3)"],
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args);
    if (values.length === 0) {
      throw new Error("OR expects at least one argument");
    }
    return values.reduce<boolean>((accumulator, value, index) => {
      if (accumulator) {
        return true;
      }
      const booleanValue = helpers.coerceLogical(value, `OR argument ${index + 1}`);
      return booleanValue;
    }, false);
  },
};

// NOTE: Checked src/modules/formula/functions/logical/and.ts to keep consistency between logical operators.
