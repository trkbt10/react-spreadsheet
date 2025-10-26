/**
 * @file ISTEXT function implementation (ODF 1.3 §6.15.5).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";
import { extractSingleValue } from "./utils";

export const isTextFunction: FormulaFunctionLazyDefinition = {
  name: "ISTEXT",
  description: {
    en: "Returns TRUE if the value is text.",
    ja: "値が文字列の場合にTRUEを返します。",
  },
  examples: ["ISTEXT(A1)", "ISTEXT(\"hello\")"],
  evaluateLazy: (nodes, context) => {
    if (nodes.length !== 1) {
      throw new Error("ISTEXT expects exactly one argument");
    }
    try {
      const value = context.evaluate(nodes[0]);
      const scalar = extractSingleValue(value, context.helpers, "ISTEXT argument");
      return typeof scalar === "string";
    } catch (error) {
      return false;
    }
  },
};
