/**
 * @file AND function implementation (ODF 1.3 §6.11.1).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const andFunction: FormulaFunctionEagerDefinition = {
  name: "AND",
  description: {
    en: "Returns TRUE if all arguments evaluate to TRUE; otherwise FALSE.",
    ja: "すべての引数がTRUEの場合にTRUEを返し、それ以外はFALSEを返します。",
  },
  examples: ["AND(TRUE, FALSE)", "AND(A1:A3)"],
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args);
    if (values.length === 0) {
      throw new Error("AND expects at least one argument");
    }
    return values.reduce<boolean>((accumulator, value, index) => {
      if (!accumulator) {
        return false;
      }
      const booleanValue = helpers.coerceLogical(value, `AND argument ${index + 1}`);
      return accumulator && booleanValue;
    }, true);
  },
};

// NOTE: Reviewed src/modules/formula/functions/helpers/index.ts to align helper usage.
