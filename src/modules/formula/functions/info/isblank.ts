/**
 * @file ISBLANK function implementation (ODF 1.3 §6.15.3).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";
import { extractSingleValue } from "./utils";

export const isBlankFunction: FormulaFunctionLazyDefinition = {
  name: "ISBLANK",
  description: {
    en: "Returns TRUE if the value is empty (null).",
    ja: "値が空(null)の場合にTRUEを返します。",
  },
  examples: ["ISBLANK(A1)", 'ISBLANK("")'],
  evaluateLazy: (nodes, context) => {
    if (nodes.length !== 1) {
      throw new Error("ISBLANK expects exactly one argument");
    }
    try {
      const value = context.evaluate(nodes[0]);
      const scalar = extractSingleValue(value, context.helpers, "ISBLANK argument");
      return scalar === null;
    } catch (error) {
      return false;
    }
  },
};
