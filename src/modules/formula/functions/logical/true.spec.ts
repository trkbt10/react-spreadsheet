import { describe, it, expect } from "vitest";
import { trueFunction } from "./true";
import { formulaFunctionHelpers } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (...args: EvalResult[]) => {
  return invokeFormulaFunction(trueFunction, formulaFunctionHelpers, makeEvalArgs(...args));
};

describe("trueFunction", () => {
  it("returns literal true without arguments", () => {
    expect(evaluate()).toBe(true);
  });

  it("throws when any argument is provided", () => {
    expect(() => {
      evaluate(true);
    }).toThrowError("TRUE expects no arguments");
  });
});
