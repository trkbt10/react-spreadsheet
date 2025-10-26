/**
 * @file Shared helpers for formula function evaluators.
 */

import type { FormulaEvaluationResult } from "../types";

export type EvalResult = FormulaEvaluationResult | EvalResult[];

export type FormulaFunctionHelpers = {
  flattenArguments: (args: EvalResult[]) => FormulaEvaluationResult[];
  flattenResult: (result: EvalResult) => FormulaEvaluationResult[];
  coerceScalar: (result: EvalResult, description: string) => FormulaEvaluationResult;
  requireNumber: (result: EvalResult, description: string) => number;
  requireBoolean: (result: EvalResult, description: string) => boolean;
  comparePrimitiveEquality: (left: FormulaEvaluationResult, right: FormulaEvaluationResult) => boolean;
};

const isArrayResult = (value: EvalResult): value is EvalResult[] => Array.isArray(value);

const flattenResult = (result: EvalResult): FormulaEvaluationResult[] => {
  if (!isArrayResult(result)) {
    return [result];
  }
  return result.flatMap((value) => flattenResult(value));
};

const flattenArguments = (args: EvalResult[]): FormulaEvaluationResult[] => {
  return args.flatMap((arg) => flattenResult(arg));
};

const coerceScalar = (result: EvalResult, description: string): FormulaEvaluationResult => {
  const flattened = flattenResult(result);
  if (flattened.length === 0) {
    return null;
  }
  if (flattened.length === 1) {
    return flattened[0] ?? null;
  }
  throw new Error(`Range cannot be coerced to scalar for ${description}`);
};

const requireNumber = (result: EvalResult, description: string): number => {
  const scalar = coerceScalar(result, description);
  if (typeof scalar !== "number" || Number.isNaN(scalar)) {
    throw new Error(`Expected number for ${description}`);
  }
  return scalar;
};

const requireBoolean = (result: EvalResult, description: string): boolean => {
  const scalar = coerceScalar(result, description);
  if (typeof scalar !== "boolean") {
    throw new Error(`Expected boolean for ${description}`);
  }
  return scalar;
};

const comparePrimitiveEquality = (
  left: FormulaEvaluationResult,
  right: FormulaEvaluationResult,
): boolean => {
  if (left === null || right === null) {
    return left === right;
  }
  if (typeof left !== typeof right) {
    return false;
  }
  if (typeof left === "number") {
    if (Number.isNaN(left) || Number.isNaN(right as number)) {
      return false;
    }
    return Object.is(left, right);
  }
  return left === right;
};

export const functionHelpers: FormulaFunctionHelpers = {
  flattenArguments,
  flattenResult,
  coerceScalar,
  requireNumber,
  requireBoolean,
  comparePrimitiveEquality,
};

export {
  flattenArguments,
  flattenResult,
  coerceScalar,
  requireNumber,
  requireBoolean,
  comparePrimitiveEquality,
  isArrayResult,
};

