/**
 * @file ISLOGICAL function implementation (ODF 1.3 §6.15.6).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";
import { extractSingleValue } from "./utils";

export const isLogicalFunction: FormulaFunctionLazyDefinition = {
  name: "ISLOGICAL",
  description: {
    en: "Returns TRUE if the value is a boolean.",
    ja: "値が論理値であればTRUEを返します。",
  },
  examples: ["ISLOGICAL(A1)", "ISLOGICAL(TRUE)"],
  evaluateLazy: (nodes, context) => {
    if (nodes.length !== 1) {
      throw new Error("ISLOGICAL expects exactly one argument");
    }
    try {
      const value = context.evaluate(nodes[0]);
      const scalar = extractSingleValue(value, context.helpers, "ISLOGICAL argument");
      return typeof scalar === "boolean";
    } catch (error) {
      return false;
    }
  },
};
