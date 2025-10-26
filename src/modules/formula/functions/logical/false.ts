/**
 * @file FALSE function implementation (ODF 1.3 §6.11.9).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const falseFunction: FormulaFunctionEagerDefinition = {
  name: "FALSE",
  description: {
    en: "Returns the logical constant FALSE.",
    ja: "論理値FALSEを返します。",
  },
  examples: ["FALSE()"],
  evaluate: (args) => {
    if (args.length !== 0) {
      throw new Error("FALSE expects no arguments");
    }
    return false;
  },
};

// NOTE: Mirrors src/modules/formula/functions/logical/true.ts for symmetry.
