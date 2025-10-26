/**
 * @file Boolean coercion helper that treats null as false.
 */

import type { FormulaEvaluationResult } from "../../types";
import type { EvalResult } from "./types";
import { coerceScalar } from "./coerceScalar";

const toBoolean = (value: FormulaEvaluationResult, description: string): boolean => {
  if (value === null) {
    return false;
  }
  if (typeof value === "boolean") {
    return value;
  }
  throw new Error(`${description} expects logical arguments`);
};

export const coerceLogical = (result: EvalResult, description: string): boolean => {
  const scalar = coerceScalar(result, description);
  return toBoolean(scalar, description);
};
