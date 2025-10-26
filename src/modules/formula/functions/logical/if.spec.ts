import { describe, it, expect, vi } from "vitest";
import { ifFunction } from "./if";
import type { FormulaFunctionLazyContext } from "../../functionRegistry";
import type { FormulaAstNode } from "../../ast";
import { createLiteralNode, defaultLazyEvaluate, invokeLazyFormulaFunction } from "../testHelpers";

const evaluateLazy = (
  nodes: Parameters<NonNullable<typeof ifFunction.evaluateLazy>>[0],
  overrides: Partial<FormulaFunctionLazyContext> = {},
) => {
  return invokeLazyFormulaFunction(ifFunction, nodes, overrides);
};

describe("ifFunction", () => {
  it("returns the true branch when the condition is truthy", () => {
    const result = evaluateLazy([createLiteralNode(true), createLiteralNode(1), createLiteralNode(2)]);
    expect(result).toBe(1);
  });

  it("returns the false branch when provided", () => {
    const result = evaluateLazy([createLiteralNode(false), createLiteralNode(1), createLiteralNode(2)]);
    expect(result).toBe(2);
  });

  it("returns null when the condition is false and no else branch is provided", () => {
    const result = evaluateLazy([createLiteralNode(false), createLiteralNode(1)]);
    expect(result).toBeNull();
  });

  it("throws when invoked with an invalid number of arguments", () => {
    expect(() => {
      evaluateLazy([createLiteralNode(true)]);
    }).toThrowError("IF expects two or three arguments");
    expect(() => {
      evaluateLazy([createLiteralNode(true), createLiteralNode(1), createLiteralNode(2), createLiteralNode(3)]);
    }).toThrowError("IF expects two or three arguments");
  });

  it("evaluates only the branch that matches the condition", () => {
    const throwingNode: FormulaAstNode = {
      type: "Function",
      name: "MUST_NOT_RUN",
      arguments: [],
    };
    const evaluateSpy = vi.fn<FormulaFunctionLazyContext["evaluate"]>((node) => {
      if (node === throwingNode) {
        throw new Error("Unexpected evaluation of unused branch");
      }
      return defaultLazyEvaluate(node);
    });
    const result = evaluateLazy([createLiteralNode(true), createLiteralNode(1), throwingNode], {
      evaluate: evaluateSpy,
    });
    expect(result).toBe(1);
    expect(evaluateSpy).toHaveBeenCalledTimes(2);
  });
});
