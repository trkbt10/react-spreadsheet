/**
 * @file Shared type definitions for formula function helpers.
 */

import type { FormulaEvaluationResult } from "../../types";

export type EvalResult = FormulaEvaluationResult | EvalResult[];

export type FormulaFunctionHelpers = {
  flattenArguments: (args: EvalResult[]) => FormulaEvaluationResult[];
  flattenResult: (result: EvalResult) => FormulaEvaluationResult[];
  coerceScalar: (result: EvalResult, description: string) => FormulaEvaluationResult;
  requireNumber: (result: EvalResult, description: string) => number;
  requireBoolean: (result: EvalResult, description: string) => boolean;
  coerceLogical: (result: EvalResult, description: string) => boolean;
  comparePrimitiveEquality: (
    left: FormulaEvaluationResult,
    right: FormulaEvaluationResult,
  ) => boolean;
  requireInteger: (value: number, errorMessage: string) => number;
  computePowerOfTen: (exponent: number, errorMessage: string) => number;
  normalizeZero: (value: number) => number;
  coerceText: (result: EvalResult, description: string) => string;
  valueToText: (value: FormulaEvaluationResult) => string;
  createCriteriaPredicate: (
    criteria: EvalResult,
    compare: (left: FormulaEvaluationResult, right: FormulaEvaluationResult) => boolean,
    description: string,
  ) => (value: FormulaEvaluationResult) => boolean;
  collectNumericArguments: (args: EvalResult[], helpers: FormulaFunctionHelpers) => number[];
  summarizeNumbers: (values: ReadonlyArray<number>) => {
    count: number;
    sum: number;
    sumOfSquares: number;
  };
};
