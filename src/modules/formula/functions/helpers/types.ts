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
  comparePrimitiveEquality: (
    left: FormulaEvaluationResult,
    right: FormulaEvaluationResult,
  ) => boolean;
};

