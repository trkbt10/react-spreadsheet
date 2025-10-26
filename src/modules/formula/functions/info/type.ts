/**
 * @file TYPE function implementation (ODF 1.3 §6.15.13).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";
import type { EvalResult } from "../helpers";

const TYPE_NUMBER = 1;
const TYPE_TEXT = 2;
const TYPE_LOGICAL = 4;
const TYPE_ERROR = 16;
const TYPE_ARRAY = 64;

const determineType = (value: EvalResult): number => {
  if (Array.isArray(value)) {
    return TYPE_ARRAY;
  }
  if (value === null) {
    return TYPE_NUMBER;
  }
  if (typeof value === "number") {
    return TYPE_NUMBER;
  }
  if (typeof value === "string") {
    return TYPE_TEXT;
  }
  if (typeof value === "boolean") {
    return TYPE_LOGICAL;
  }
  return TYPE_TEXT;
};

export const typeFunction: FormulaFunctionLazyDefinition = {
  name: "TYPE",
  description: {
    en: "Returns a number representing the type of a value.",
    ja: "値の種類を表す番号を返します。",
  },
  examples: ["TYPE(42)", "TYPE(\"text\")", "TYPE(TRUE)", "TYPE(1/0)"],
  evaluateLazy: (nodes, context) => {
    if (nodes.length !== 1) {
      throw new Error("TYPE expects exactly one argument");
    }
    try {
      const value = context.evaluate(nodes[0]);
      return determineType(value);
    } catch (error) {
      context.helpers.getErrorCode(error);
      return TYPE_ERROR;
    }
  },
};
