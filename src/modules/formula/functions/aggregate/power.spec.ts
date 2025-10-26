import { powerFunction } from "./power";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) =>
  invokeFormulaFunction(powerFunction, formulaFunctionHelpers, args);

describe("POWER", () => {
  it("raises the base to the given exponent", () => {
    const result = evaluate(makeEvalArgs(2, 3));
    expect(result).toBe(8);
  });

  it("supports negative exponents", () => {
    const result = evaluate(makeEvalArgs(2, -2));
    expect(result).toBeCloseTo(0.25);
  });

  it("throws when called with an invalid number of arguments", () => {
    expect(() => evaluate(makeEvalArgs(2))).toThrowError("POWER expects exactly two arguments");
  });
});
