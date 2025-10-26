import { describe, it, expect } from "vitest";
import { notFunction } from "./not";
import { formulaFunctionHelpers } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (...args: EvalResult[]) => {
  return invokeFormulaFunction(notFunction, formulaFunctionHelpers, makeEvalArgs(...args));
};

describe("notFunction", () => {
  it("negates a boolean argument", () => {
    const result = evaluate(true);
    expect(result).toBe(false);
  });

  it("treats null as false", () => {
    const result = evaluate(null);
    expect(result).toBe(true);
  });

  it("throws when provided with more than one argument", () => {
    expect(() => {
      evaluate(true, false);
    }).toThrowError("NOT expects exactly one argument");
  });

  it("throws when the argument cannot be coerced to boolean", () => {
    expect(() => {
      evaluate(1);
    }).toThrowError("NOT argument expects logical arguments");
  });
});
