import { describe, it, expect, vi } from "vitest";
import { ifsFunction } from "./ifs";
import type { FormulaFunctionLazyContext } from "../../functionRegistry";
import type { FormulaAstNode } from "../../ast";
import { createLiteralNode, defaultLazyEvaluate, invokeLazyFormulaFunction } from "../testHelpers";

const evaluateLazy = (
  nodes: Parameters<NonNullable<typeof ifsFunction.evaluateLazy>>[0],
  overrides: Partial<FormulaFunctionLazyContext> = {},
) => {
  return invokeLazyFormulaFunction(ifsFunction, nodes, overrides);
};

describe("ifsFunction", () => {
  it("returns the first matching value", () => {
    const result = evaluateLazy([
      createLiteralNode(false),
      createLiteralNode(1),
      createLiteralNode(true),
      createLiteralNode(2),
      createLiteralNode(true),
      createLiteralNode(3),
    ]);
    expect(result).toBe(2);
  });

  it("throws when no condition evaluates to true", () => {
    expect(() => {
      evaluateLazy([createLiteralNode(false), createLiteralNode(1), createLiteralNode(false), createLiteralNode(2)]);
    }).toThrowError("IFS requires at least one matching condition");
  });

  it("throws when pairs are missing", () => {
    expect(() => {
      evaluateLazy([createLiteralNode(true), createLiteralNode(1), createLiteralNode(false)]);
    }).toThrowError("IFS expects condition/value pairs");
  });

  it("stops evaluating after hitting the first true condition", () => {
    const sentinelNode: FormulaAstNode = {
      type: "Function",
      name: "UNUSED_BRANCH",
      arguments: [],
    };
    const evaluateSpy = vi.fn<FormulaFunctionLazyContext["evaluate"]>((node) => {
      if (node === sentinelNode) {
        throw new Error("Unexpected evaluation of later branch");
      }
      return defaultLazyEvaluate(node);
    });
    const result = evaluateLazy(
      [createLiteralNode(true), createLiteralNode(1), createLiteralNode(true), sentinelNode],
      { evaluate: evaluateSpy },
    );
    expect(result).toBe(1);
    expect(evaluateSpy).toHaveBeenCalledTimes(2);
  });
});
