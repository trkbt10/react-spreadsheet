import { modFunction } from "./mod";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(modFunction, formulaFunctionHelpers, args);

describe("MOD", () => {
  it("returns remainders matching the divisor sign", () => {
    expect(evaluate(makeEvalArgs(10, 3))).toBe(1);
    expect(evaluate(makeEvalArgs(-10, 3))).toBe(2);
    expect(evaluate(makeEvalArgs(10, -3))).toBe(-2);
  });

  it("throws when the divisor is zero", () => {
    expect(() => evaluate(makeEvalArgs(5, 0))).toThrowError("MOD divisor must be non-zero");
  });
});
