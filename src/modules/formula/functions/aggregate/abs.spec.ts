import { absFunction } from "./abs";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) =>
  invokeFormulaFunction(absFunction, formulaFunctionHelpers, args);

describe("ABS", () => {
  it("returns absolute values", () => {
    expect(evaluate(makeEvalArgs(-5))).toBe(5);
    expect(evaluate(makeEvalArgs(5))).toBe(5);
  });

  it("normalizes negative zero to zero", () => {
    const result = evaluate(makeEvalArgs(-0));
    expect(Object.is(result, 0)).toBe(true);
  });

  it("throws when called with an invalid number of arguments", () => {
    expect(() => evaluate(makeEvalArgs())).toThrowError(
      "ABS expects exactly one argument",
    );
  });
});
