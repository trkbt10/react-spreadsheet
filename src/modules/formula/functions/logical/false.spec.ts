import { describe, it, expect } from "vitest";
import { falseFunction } from "./false";
import { formulaFunctionHelpers } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (...args: EvalResult[]) => {
  return invokeFormulaFunction(falseFunction, formulaFunctionHelpers, makeEvalArgs(...args));
};

describe("falseFunction", () => {
  it("returns literal false without arguments", () => {
    expect(evaluate()).toBe(false);
  });

  it("throws when any argument is provided", () => {
    expect(() => {
      evaluate(false);
    }).toThrowError("FALSE expects no arguments");
  });
});
