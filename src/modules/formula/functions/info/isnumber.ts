/**
 * @file ISNUMBER function implementation (ODF 1.3 §6.15.4).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";
import { extractSingleValue } from "./utils";

export const isNumberFunction: FormulaFunctionLazyDefinition = {
  name: "ISNUMBER",
  description: {
    en: "Returns TRUE if the value is a finite number.",
    ja: "値が有限の数値であればTRUEを返します。",
  },
  examples: ["ISNUMBER(A1)", "ISNUMBER(42)"],
  evaluateLazy: (nodes, context) => {
    if (nodes.length !== 1) {
      throw new Error("ISNUMBER expects exactly one argument");
    }
    try {
      const value = context.evaluate(nodes[0]);
      const scalar = extractSingleValue(value, context.helpers, "ISNUMBER argument");
      return typeof scalar === "number" && Number.isFinite(scalar);
    } catch (error) {
      return false;
    }
  },
};
