/**
 * @file Registry for formula function evaluators.
 */

import type { FormulaEvaluationResult } from "./types";
import {
  formulaFunctionHelpers,
  type EvalResult,
  type FormulaFunctionHelpers,
} from "./functions/helpers";
import { sumFunction } from "./functions/aggregate/sum";
import { averageFunction } from "./functions/statistical/average";
import { maxFunction } from "./functions/statistical/max";
import { minFunction } from "./functions/statistical/min";
import { countFunction } from "./functions/statistical/count";
import { countIfFunction } from "./functions/statistical/countif";
import { vlookupFunction } from "./functions/lookup/vlookup";

export type FormulaFunctionEvaluator = (
  args: EvalResult[],
  helpers: FormulaFunctionHelpers,
) => FormulaEvaluationResult;

export type FormulaFunctionDefinition = {
  name: string;
  evaluate: FormulaFunctionEvaluator;
};

const registry = new Map<string, FormulaFunctionDefinition>();

const registeredHelpers = formulaFunctionHelpers;

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

export { registeredHelpers as formulaFunctionHelpers };

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
