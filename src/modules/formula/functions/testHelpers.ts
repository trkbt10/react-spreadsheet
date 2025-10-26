/**
 * @file Testing utilities for formula function evaluators.
 */

import {
  formulaFunctionHelpers,
  type FormulaFunctionDefinition,
  type FormulaFunctionLazyContext,
  type FormulaFunctionLazyDefinition,
} from "../functionRegistry";
import type { FormulaAstNode } from "../ast";
import type { FormulaPrimitiveValue } from "../types";
import type { EvalResult, FormulaFunctionHelpers } from "./helpers";

export const makeEvalArgs = (...values: EvalResult[]): EvalResult[] => values;

export const invokeFormulaFunction = (
  definition: FormulaFunctionDefinition,
  helpers: FormulaFunctionHelpers,
  args: EvalResult[],
) => {
  const evaluator = definition.evaluate;
  if (typeof evaluator !== "function") {
    throw new Error(`Formula function "${definition.name}" does not define an evaluator`);
  }
  return evaluator(args, helpers);
};

export const createLiteralNode = (value: FormulaPrimitiveValue): FormulaAstNode => {
  return {
    type: "Literal",
    value,
  };
};

export const defaultLazyEvaluate: FormulaFunctionLazyContext["evaluate"] = (node) => {
  if (node.type === "Literal") {
    return node.value;
  }
  throw new Error("Unexpected node");
};

export const invokeLazyFormulaFunction = (
  definition: FormulaFunctionLazyDefinition,
  nodes: FormulaAstNode[],
  overrides: Partial<FormulaFunctionLazyContext> = {},
) => {
  if (!definition.evaluateLazy) {
    throw new Error(`Formula function "${definition.name}" does not define a lazy evaluator`);
  }
  const context: FormulaFunctionLazyContext = {
    evaluate: defaultLazyEvaluate,
    helpers: formulaFunctionHelpers,
    parseReference: () => {
      throw new Error("parseReference is not implemented for this test context");
    },
    origin: {
      sheetId: "test-sheet",
      sheetName: "Test Sheet",
      row: 0,
      column: 0,
    },
    ...overrides,
  };
  return definition.evaluateLazy(nodes, context);
};
