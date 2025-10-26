/**
 * @file Registry for formula function evaluators.
 */

import type { FormulaEvaluationResult } from "./types";
import {
  functionHelpers,
  type EvalResult,
  type FormulaFunctionHelpers,
} from "./functions/helpers";
import { sumFunction } from "./functions/sum";
import { averageFunction } from "./functions/average";
import { maxFunction } from "./functions/max";
import { minFunction } from "./functions/min";
import { countFunction } from "./functions/count";
import { countIfFunction } from "./functions/countif";
import { vlookupFunction } from "./functions/vlookup";

export type FormulaFunctionEvaluator = (
  args: EvalResult[],
  helpers: FormulaFunctionHelpers,
) => FormulaEvaluationResult;

export type FormulaFunctionDefinition = {
  name: string;
  evaluate: FormulaFunctionEvaluator;
};

const registry = new Map<string, FormulaFunctionDefinition>();

export const registerFormulaFunction = (definition: FormulaFunctionDefinition): void => {
  const normalizedName = definition.name.toUpperCase();
  if (registry.has(normalizedName)) {
    throw new Error(`Formula function "${definition.name}" is already registered`);
  }
  registry.set(normalizedName, {
    ...definition,
    name: normalizedName,
  });
};

export const getFormulaFunction = (name: string): FormulaFunctionDefinition | undefined => {
  return registry.get(name.toUpperCase());
};

export const formulaFunctionHelpers = functionHelpers;

const builtInFunctions: FormulaFunctionDefinition[] = [
  sumFunction,
  averageFunction,
  maxFunction,
  minFunction,
  countFunction,
  countIfFunction,
  vlookupFunction,
];

builtInFunctions.forEach(registerFormulaFunction);
