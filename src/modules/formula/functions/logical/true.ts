/**
 * @file TRUE function implementation (ODF 1.3 §6.11.8).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const trueFunction: FormulaFunctionEagerDefinition = {
  name: "TRUE",
  description: {
    en: "Returns the logical constant TRUE.",
    ja: "論理値TRUEを返します。",
  },
  examples: ['TRUE()'],
  evaluate: (args) => {
    if (args.length !== 0) {
      throw new Error("TRUE expects no arguments");
    }
    return true;
  },
};

// NOTE: No external references needed for constants; kept for completeness.
