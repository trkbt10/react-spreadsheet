/**
 * @file Aggregates reusable helpers for formula function evaluators.
 */

import type { FormulaEvaluationResult } from "../../types";
import type { EvalResult, FormulaFunctionHelpers } from "./types";
import { isArrayResult as isArrayResultInternal } from "./isArrayResult";
import { flattenResult as flattenResultInternal } from "./flattenResult";
import { flattenArguments as flattenArgumentsInternal } from "./flattenArguments";
import { coerceScalar as coerceScalarInternal } from "./coerceScalar";
import { requireNumber as requireNumberInternal } from "./requireNumber";
import { requireBoolean as requireBooleanInternal } from "./requireBoolean";
import { comparePrimitiveEquality as comparePrimitiveEqualityInternal } from "./comparePrimitiveEquality";

export type { EvalResult, FormulaFunctionHelpers } from "./types";

export const isArrayResult = (value: EvalResult): value is EvalResult[] => {
  return isArrayResultInternal(value);
};

export const flattenResult = (result: EvalResult): FormulaEvaluationResult[] => {
  return flattenResultInternal(result);
};

export const flattenArguments = (args: EvalResult[]): FormulaEvaluationResult[] => {
  return flattenArgumentsInternal(args);
};

export const coerceScalar = (result: EvalResult, description: string): FormulaEvaluationResult => {
  return coerceScalarInternal(result, description);
};

export const requireNumber = (result: EvalResult, description: string): number => {
  return requireNumberInternal(result, description);
};

export const requireBoolean = (result: EvalResult, description: string): boolean => {
  return requireBooleanInternal(result, description);
};

export const comparePrimitiveEquality = (
  left: FormulaEvaluationResult,
  right: FormulaEvaluationResult,
): boolean => {
  return comparePrimitiveEqualityInternal(left, right);
};

export const formulaFunctionHelpers: FormulaFunctionHelpers = {
  flattenArguments,
  flattenResult,
  coerceScalar,
  requireNumber,
  requireBoolean,
  comparePrimitiveEquality,
};

