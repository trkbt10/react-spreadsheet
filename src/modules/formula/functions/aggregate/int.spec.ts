import { intFunction } from "./int";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) =>
  invokeFormulaFunction(intFunction, formulaFunctionHelpers, args);

describe("INT", () => {
  it("floors positive values", () => {
    const result = evaluate(makeEvalArgs(5.9));
    expect(result).toBe(5);
  });

  it("floors negative values toward negative infinity", () => {
    const result = evaluate(makeEvalArgs(-5.2));
    expect(result).toBe(-6);
  });

  it("throws when called with an invalid number of arguments", () => {
    expect(() => evaluate(makeEvalArgs())).toThrowError("INT expects exactly one argument");
  });
});
