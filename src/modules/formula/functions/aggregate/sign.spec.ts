import { signFunction } from "./sign";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(signFunction, formulaFunctionHelpers, args);

describe("SIGN", () => {
  it("returns 1 for positive numbers", () => {
    expect(evaluate(makeEvalArgs(42))).toBe(1);
  });

  it("returns -1 for negative numbers", () => {
    expect(evaluate(makeEvalArgs(-5))).toBe(-1);
  });

  it("returns 0 for zero", () => {
    expect(evaluate(makeEvalArgs(0))).toBe(0);
  });

  it("throws when called with an invalid number of arguments", () => {
    expect(() => evaluate(makeEvalArgs())).toThrowError("SIGN expects exactly one argument");
  });
});
