import { describe, it, expect, vi } from "vitest";
import { switchFunction } from "./switch";
import type { FormulaFunctionLazyContext } from "../../functionRegistry";
import type { FormulaAstNode } from "../../ast";
import { createLiteralNode, defaultLazyEvaluate, invokeLazyFormulaFunction } from "../testHelpers";

const evaluateLazy = (
  nodes: Parameters<NonNullable<typeof switchFunction.evaluateLazy>>[0],
  overrides: Partial<FormulaFunctionLazyContext> = {},
) => {
  return invokeLazyFormulaFunction(switchFunction, nodes, overrides);
};

describe("switchFunction", () => {
  it("returns the result of the first matching case", () => {
    const result = evaluateLazy([
      createLiteralNode("B"),
      createLiteralNode("A"),
      createLiteralNode(1),
      createLiteralNode("B"),
      createLiteralNode(2),
      createLiteralNode("fallback"),
    ]);
    expect(result).toBe(2);
  });

  it("returns the default when no match is found", () => {
    const result = evaluateLazy([
      createLiteralNode("Z"),
      createLiteralNode("A"),
      createLiteralNode(1),
      createLiteralNode("B"),
      createLiteralNode(2),
      createLiteralNode("default"),
    ]);
    expect(result).toBe("default");
  });

  it("throws when no match exists and no default is provided", () => {
    expect(() => {
      evaluateLazy([createLiteralNode("Z"), createLiteralNode("A"), createLiteralNode(1)]);
    }).toThrowError("SWITCH could not find a matching case");
  });

  it("throws when missing value/result pairs", () => {
    expect(() => {
      evaluateLazy([
        createLiteralNode("A"),
        createLiteralNode("B"),
        createLiteralNode(1),
        createLiteralNode("incomplete"),
      ]);
    }).toThrowError("SWITCH requires at least one value/result pair");
  });

  it("evaluates only the matching result", () => {
    const sentinel: FormulaAstNode = {
      type: "Function",
      name: "UNUSED_RESULT",
      arguments: [],
    };
    const evaluateSpy = vi.fn<FormulaFunctionLazyContext["evaluate"]>((node) => {
      if (node === sentinel) {
        throw new Error("Unexpected evaluation of unmatched result");
      }
      return defaultLazyEvaluate(node);
    });
    const result = evaluateLazy(
      [createLiteralNode("A"), createLiteralNode("A"), createLiteralNode(1), createLiteralNode("B"), sentinel],
      { evaluate: evaluateSpy },
    );
    expect(result).toBe(1);
    expect(evaluateSpy).toHaveBeenCalledTimes(3);
  });
});
