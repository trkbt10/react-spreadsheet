import { describe, it, expect } from "vitest";
import type { FormulaFunctionLazyContext } from "../../functionRegistry";
import {
  createLiteralNode,
  invokeLazyFormulaFunction,
  defaultLazyEvaluate,
} from "../testHelpers";
import type { FormulaAstNode } from "../../ast";
import { isBlankFunction } from "./isblank";
import { isNumberFunction } from "./isnumber";
import { isTextFunction } from "./isttext";
import { isLogicalFunction } from "./islogical";
import { isErrFunction } from "./iserr";
import { isErrorFunction } from "./iserror";
import { ifErrorFunction } from "./iferror";
import { ifNaFunction } from "./ifna";
import { errorTypeFunction } from "./errorType";
import { typeFunction } from "./type";
import { createFormulaError } from "../helpers";

const createFunctionNode = (name: string): FormulaAstNode => ({
  type: "Function",
  name,
  arguments: [],
});

const evaluateLazy = (
  definition: typeof isBlankFunction,
  nodes: Parameters<NonNullable<typeof definition.evaluateLazy>>[0],
  overrides: Partial<FormulaFunctionLazyContext> = {},
) => {
  return invokeLazyFormulaFunction(definition, nodes, overrides);
};

describe("information functions", () => {
  it("detects blank values", () => {
    expect(evaluateLazy(isBlankFunction, [createLiteralNode(null)])).toBe(true);
    expect(evaluateLazy(isBlankFunction, [createLiteralNode("text")])).toBe(false);
  });

  it("detects numeric values", () => {
    expect(evaluateLazy(isNumberFunction, [createLiteralNode(42)])).toBe(true);
    expect(evaluateLazy(isNumberFunction, [createLiteralNode("42")])).toBe(false);
  });

  it("detects text values", () => {
    expect(evaluateLazy(isTextFunction, [createLiteralNode("hello")])).toBe(true);
    expect(evaluateLazy(isTextFunction, [createLiteralNode(10)])).toBe(false);
  });

  it("detects logical values", () => {
    expect(evaluateLazy(isLogicalFunction, [createLiteralNode(true)])).toBe(true);
    expect(evaluateLazy(isLogicalFunction, [createLiteralNode(0)])).toBe(false);
  });

  it("detects general errors", () => {
    const throwingNode = createFunctionNode("ERR");
    const evaluate: FormulaFunctionLazyContext["evaluate"] = (node) => {
      if (node === throwingNode) {
        throw new Error("Division by zero");
      }
      return defaultLazyEvaluate(node);
    };
    expect(
      evaluateLazy(isErrorFunction, [throwingNode], {
        evaluate,
      }),
    ).toBe(true);
    expect(evaluateLazy(isErrorFunction, [createLiteralNode(1)])).toBe(false);
  });

  it("distinguishes #N/A from other errors", () => {
    const naNode = createFunctionNode("NA");
    const otherNode = createFunctionNode("ERR");
    const evaluate: FormulaFunctionLazyContext["evaluate"] = (node) => {
      if (node === naNode) {
        throw createFormulaError("#N/A", "Test NA");
      }
      if (node === otherNode) {
        throw new Error("Division by zero");
      }
      return defaultLazyEvaluate(node);
    };
    expect(
      evaluateLazy(isErrFunction, [otherNode], {
        evaluate,
      }),
    ).toBe(true);
    expect(
      evaluateLazy(isErrFunction, [naNode], {
        evaluate,
      }),
    ).toBe(false);
  });

  it("returns fallback value when IFERROR encounters an error", () => {
    const throwingNode = createFunctionNode("ERR");
    const evaluate: FormulaFunctionLazyContext["evaluate"] = (node) => {
      if (node === throwingNode) {
        throw new Error("Division by zero");
      }
      return defaultLazyEvaluate(node);
    };
    const result = invokeLazyFormulaFunction(ifErrorFunction, [throwingNode, createLiteralNode("fallback")], {
      evaluate,
    });
    expect(result).toBe("fallback");
    expect(invokeLazyFormulaFunction(ifErrorFunction, [createLiteralNode(5)])).toBe(5);
  });

  it("only handles #N/A in IFNA", () => {
    const naNode = createFunctionNode("NA");
    const otherNode = createFunctionNode("ERR");
    const evaluate: FormulaFunctionLazyContext["evaluate"] = (node) => {
      if (node === naNode) {
        throw createFormulaError("#N/A", "Test NA");
      }
      if (node === otherNode) {
        throw new Error("Division by zero");
      }
      return defaultLazyEvaluate(node);
    };
    const naResult = invokeLazyFormulaFunction(ifNaFunction, [naNode, createLiteralNode("fallback")], {
      evaluate,
    });
    expect(naResult).toBe("fallback");
    expect(() => {
      invokeLazyFormulaFunction(ifNaFunction, [otherNode, createLiteralNode("fallback")], {
        evaluate,
      });
    }).toThrowError("Division by zero");
  });

  it("returns the appropriate error type number", () => {
    const throwingNode = createFunctionNode("ERR");
    const evaluate: FormulaFunctionLazyContext["evaluate"] = (node) => {
      if (node === throwingNode) {
        throw new Error("Division by zero");
      }
      return defaultLazyEvaluate(node);
    };
    const result = invokeLazyFormulaFunction(errorTypeFunction, [throwingNode], { evaluate });
    expect(result).toBe(2);
    expect(() => invokeLazyFormulaFunction(errorTypeFunction, [createLiteralNode(1)])).toThrowError(
      "ERROR.TYPE expects an error value",
    );
  });

  it("maps TYPE codes", () => {
    expect(invokeLazyFormulaFunction(typeFunction, [createLiteralNode(10)])).toBe(1);
    expect(invokeLazyFormulaFunction(typeFunction, [createLiteralNode("text")])).toBe(2);
    expect(invokeLazyFormulaFunction(typeFunction, [createLiteralNode(false)])).toBe(4);

    const errorNode = createFunctionNode("ERR");
    const evaluateError: FormulaFunctionLazyContext["evaluate"] = (node) => {
      if (node === errorNode) {
        throw new Error("Division by zero");
      }
      return defaultLazyEvaluate(node);
    };
    expect(invokeLazyFormulaFunction(typeFunction, [errorNode], { evaluate: evaluateError })).toBe(16);

    const arrayNode = createFunctionNode("ARRAY");
    const evaluateArray: FormulaFunctionLazyContext["evaluate"] = (node) => {
      if (node === arrayNode) {
        return [[1, 2]];
      }
      return defaultLazyEvaluate(node);
    };
    expect(invokeLazyFormulaFunction(typeFunction, [arrayNode], { evaluate: evaluateArray })).toBe(64);
  });
});
