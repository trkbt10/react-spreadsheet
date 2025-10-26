import { quotientFunction } from "./quotient";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(quotientFunction, formulaFunctionHelpers, args);

describe("QUOTIENT", () => {
  it("returns the integer portion of division toward zero", () => {
    expect(evaluate(makeEvalArgs(10, 3))).toBe(3);
    expect(evaluate(makeEvalArgs(-10, 3))).toBe(-3);
    expect(evaluate(makeEvalArgs(10, -3))).toBe(-3);
    expect(evaluate(makeEvalArgs(-10, -3))).toBe(3);
  });

  it("throws when the divisor is zero", () => {
    expect(() => evaluate(makeEvalArgs(5, 0))).toThrowError("QUOTIENT divisor must be non-zero");
  });
});
