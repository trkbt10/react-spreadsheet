/**
 * @file Utility helpers for evaluating formula samples in the showcase.
 */

import { parseFormula } from "../../modules/formula/parser";
import { getFormulaFunction, formulaFunctionHelpers } from "../../modules/formula/functionRegistry";
import { parseCellReference } from "../../modules/formula/address";
import type { ParseCellReferenceDependencies } from "../../modules/formula/address";
import type { FormulaAstNode, FunctionNode } from "../../modules/formula/ast";
import type { EvalResult } from "../../modules/formula/functions/helpers";
import type { WorkbookSheetIndex } from "../../modules/formula/types";

const DEFAULT_SHEET_ID = "Sheet1";
const DEFAULT_SHEET_NAME = "Sheet1";

const mockSheet: WorkbookSheetIndex = {
  id: DEFAULT_SHEET_ID,
  name: DEFAULT_SHEET_NAME,
  index: 0,
};

const mockParseContext: ParseCellReferenceDependencies = {
  defaultSheetId: DEFAULT_SHEET_ID,
  defaultSheetName: DEFAULT_SHEET_NAME,
  workbookIndex: {
    byId: new Map([[mockSheet.id, mockSheet]]),
    byName: new Map([[mockSheet.name.toUpperCase(), mockSheet]]),
  },
};

const mockOrigin = {
  sheetId: DEFAULT_SHEET_ID,
  sheetName: DEFAULT_SHEET_NAME,
  row: 0,
  column: 0,
} as const;

const ensureComparable = (value: EvalResult, comparator: string): string | number | boolean | null => {
  const scalar = formulaFunctionHelpers.coerceScalar(value, `comparator ${comparator}`);
  if (scalar === null || typeof scalar === "number" || typeof scalar === "string" || typeof scalar === "boolean") {
    return scalar;
  }
  throw new Error(`Unsupported comparator operand for ${comparator}`);
};

const comparatorEvaluators: Record<string, (left: EvalResult, right: EvalResult) => boolean> = {
  "=": (left, right) => {
    const leftValue = formulaFunctionHelpers.coerceScalar(left, "comparator");
    const rightValue = formulaFunctionHelpers.coerceScalar(right, "comparator");
    return Object.is(leftValue, rightValue);
  },
  "<>": (left, right) => {
    const leftValue = formulaFunctionHelpers.coerceScalar(left, "comparator");
    const rightValue = formulaFunctionHelpers.coerceScalar(right, "comparator");
    return !Object.is(leftValue, rightValue);
  },
  ">": (left, right) => {
    const leftValue = ensureComparable(left, ">");
    const rightValue = ensureComparable(right, ">");
    if (leftValue === null || rightValue === null) {
      throw new Error("Cannot compare null values with '>'");
    }
    if (typeof leftValue !== typeof rightValue) {
      throw new Error("Comparator operands must share the same type");
    }
    if (typeof leftValue === "boolean") {
      throw new Error("Boolean comparison is not supported for '>'");
    }
    return (leftValue as number | string) > (rightValue as number | string);
  },
  "<": (left, right) => {
    const leftValue = ensureComparable(left, "<");
    const rightValue = ensureComparable(right, "<");
    if (leftValue === null || rightValue === null) {
      throw new Error("Cannot compare null values with '<'");
    }
    if (typeof leftValue !== typeof rightValue) {
      throw new Error("Comparator operands must share the same type");
    }
    if (typeof leftValue === "boolean") {
      throw new Error("Boolean comparison is not supported for '<'");
    }
    return (leftValue as number | string) < (rightValue as number | string);
  },
  ">=": (left, right) => {
    const leftValue = ensureComparable(left, ">=");
    const rightValue = ensureComparable(right, ">=");
    if (leftValue === null || rightValue === null) {
      throw new Error("Cannot compare null values with '>='");
    }
    if (typeof leftValue !== typeof rightValue) {
      throw new Error("Comparator operands must share the same type");
    }
    if (typeof leftValue === "boolean") {
      throw new Error("Boolean comparison is not supported for '>='");
    }
    return (leftValue as number | string) >= (rightValue as number | string);
  },
  "<=": (left, right) => {
    const leftValue = ensureComparable(left, "<=");
    const rightValue = ensureComparable(right, "<=");
    if (leftValue === null || rightValue === null) {
      throw new Error("Cannot compare null values with '<='");
    }
    if (typeof leftValue !== typeof rightValue) {
      throw new Error("Comparator operands must share the same type");
    }
    if (typeof leftValue === "boolean") {
      throw new Error("Boolean comparison is not supported for '<='");
    }
    return (leftValue as number | string) <= (rightValue as number | string);
  },
};

const isComparatorFunction = (name: string): boolean => name.startsWith("COMPARE_");

const evaluateComparator = (node: FunctionNode, evaluateNode: (argument: FormulaAstNode) => EvalResult): boolean => {
  const comparator = node.name.slice("COMPARE_".length);
  const evaluator = comparatorEvaluators[comparator];
  if (evaluator === undefined) {
    throw new Error(`Unsupported comparator "${node.name}"`);
  }
  if (node.arguments.length !== 2) {
    throw new Error("Comparators require exactly two arguments");
  }
  const left = evaluateNode(node.arguments[0]);
  const right = evaluateNode(node.arguments[1]);
  return evaluator(left, right);
};

const evaluateFunctionNode = (
  node: FunctionNode,
  evaluateNode: (argument: FormulaAstNode) => EvalResult,
): EvalResult => {
  if (isComparatorFunction(node.name)) {
    return evaluateComparator(node, evaluateNode);
  }

  const definition = getFormulaFunction(node.name);
  if (definition === undefined) {
    throw new Error(`Function ${node.name} not found`);
  }

  if (definition.evaluateLazy !== undefined) {
    return definition.evaluateLazy(node.arguments, {
      evaluate: evaluateNode,
      helpers: formulaFunctionHelpers,
      parseReference: (reference) => parseCellReference(reference, mockParseContext),
      origin: mockOrigin,
    });
  }

  if (definition.evaluate === undefined) {
    throw new Error(`Function ${node.name} does not support eager evaluation`);
  }

  const evaluatedArgs = node.arguments.map((argument) => evaluateNode(argument));
  return definition.evaluate(evaluatedArgs, formulaFunctionHelpers);
};

const evaluateNode = (node: FormulaAstNode): EvalResult => {
  if (node.type === "Literal") {
    return node.value;
  }

  if (node.type === "Array") {
    return node.elements.map((row) => row.map((element) => evaluateNode(element)));
  }

  if (node.type === "Unary") {
    const operand = formulaFunctionHelpers.requireNumber(evaluateNode(node.argument), "unary operand");
    if (node.operator === "+") {
      return operand;
    }
    if (node.operator === "-") {
      return -operand;
    }
    throw new Error(`Unsupported unary operator: ${node.operator}`);
  }

  if (node.type === "Binary") {
    const left = formulaFunctionHelpers.requireNumber(evaluateNode(node.left), `binary ${node.operator}`);
    const right = formulaFunctionHelpers.requireNumber(evaluateNode(node.right), `binary ${node.operator}`);

    if (node.operator === "+") {
      return left + right;
    }
    if (node.operator === "-") {
      return left - right;
    }
    if (node.operator === "*") {
      return left * right;
    }
    if (node.operator === "/") {
      if (right === 0) {
        throw new Error("Division by zero");
      }
      return left / right;
    }
    if (node.operator === "^") {
      return left ** right;
    }
    throw new Error(`Unsupported binary operator: ${node.operator}`);
  }

  if (node.type === "Function") {
    return evaluateFunctionNode(node, evaluateNode);
  }

  if (node.type === "Reference") {
    throw new Error("Sample evaluation does not support cell references");
  }

  if (node.type === "Range") {
    throw new Error("Sample evaluation does not support ranges");
  }

  throw new Error("Unsupported argument type");
};

export const formatSampleValue = (value: unknown): string => {
  if (value === null) {
    return "null";
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return `[${value.map((element) => formatSampleValue(element)).join(", ")}]`;
  }
  return String(value);
};

export const evaluateSample = (input: string): string => {
  try {
    const { ast } = parseFormula(input, mockParseContext);
    if (ast.type !== "Function") {
      throw new Error("Input must be a function call");
    }
    const output = evaluateFunctionNode(ast, evaluateNode);
    return formatSampleValue(output);
  } catch (error) {
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return `Error: ${String(error)}`;
  }
};

// NOTE: Mirrored comparator and evaluation behavior from src/modules/formula/engine.ts and parsing
// semantics from src/modules/formula/parser.ts to ensure showcase previews align with engine logic.
