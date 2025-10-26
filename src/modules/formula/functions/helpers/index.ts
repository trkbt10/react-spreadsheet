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
import { createCriteriaPredicate as createCriteriaPredicateInternal } from "./createCriteriaPredicate";
import { summarizeNumbers as summarizeNumbersInternal } from "./summarizeNumbers";
import { collectNumericArguments as collectNumericArgumentsInternal } from "./collectNumericArguments";
import {
  requireInteger as requireIntegerInternal,
  computePowerOfTen as computePowerOfTenInternal,
  normalizeZero as normalizeZeroInternal,
} from "./numeric";
import { coerceText as coerceTextInternal, valueToText as valueToTextInternal } from "./text";
import { coerceLogical as coerceLogicalInternal } from "./coerceLogical";

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

export const coerceLogical = (result: EvalResult, description: string): boolean => {
  return coerceLogicalInternal(result, description);
};

export const requireInteger = (value: number, errorMessage: string): number => {
  return requireIntegerInternal(value, errorMessage);
};

export const computePowerOfTen = (exponent: number, errorMessage: string): number => {
  return computePowerOfTenInternal(exponent, errorMessage);
};

export const normalizeZero = (value: number): number => {
  return normalizeZeroInternal(value);
};

export const coerceText = (result: EvalResult, description: string): string => {
  return coerceTextInternal(result, description);
};

export const valueToText = (value: FormulaEvaluationResult): string => {
  return valueToTextInternal(value);
};

export const createCriteriaPredicate = (
  criteria: EvalResult,
  compare: (left: FormulaEvaluationResult, right: FormulaEvaluationResult) => boolean,
  description: string,
) => {
  return createCriteriaPredicateInternal(criteria, compare, description);
};

export const collectNumericArguments = (args: EvalResult[], helpers: FormulaFunctionHelpers) => {
  return collectNumericArgumentsInternal(args, helpers);
};

export const summarizeNumbers = (values: ReadonlyArray<number>) => {
  return summarizeNumbersInternal(values);
};

export const formulaFunctionHelpers: FormulaFunctionHelpers = {
  flattenArguments,
  flattenResult,
  coerceScalar,
  coerceLogical,
  requireNumber,
  requireBoolean,
  comparePrimitiveEquality,
  requireInteger,
  computePowerOfTen,
  normalizeZero,
  coerceText,
  valueToText,
  createCriteriaPredicate,
  collectNumericArguments,
  summarizeNumbers,
};
