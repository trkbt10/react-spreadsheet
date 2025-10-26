/**
 * @file CHOOSE function implementation (ODF 1.3 §6.14.5).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const chooseFunction: FormulaFunctionEagerDefinition = {
  name: "CHOOSE",
  description: {
    en: "Returns a value from a list by index.",
    ja: "インデックスで指定したリストの値を返します。",
  },
  examples: ['CHOOSE(2, "A", "B", "C")', "CHOOSE(A1, B1:B3)"],
  evaluate: (args, helpers) => {
    if (args.length < 2) {
      throw new Error("CHOOSE expects at least two arguments");
    }

    const indexRaw = helpers.requireNumber(args[0], "CHOOSE index");
    if (!Number.isInteger(indexRaw)) {
      throw new Error("CHOOSE index must be an integer");
    }
    const index = indexRaw;
    if (index < 1 || index >= args.length) {
      throw new Error("CHOOSE index is out of bounds");
    }

    const chosen = args[index];
    if (chosen === undefined) {
      throw new Error("CHOOSE could not resolve the requested value");
    }
    return chosen ?? null;
  },
};

// NOTE: Returns the raw argument to preserve array results when needed.
