import { aggregateFunction } from "./aggregate";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(aggregateFunction, formulaFunctionHelpers, args);

describe("AGGREGATE", () => {
  it("supports summation with option 0", () => {
    const result = evaluate(makeEvalArgs(9, 0, [1, 2, 3]));
    expect(result).toBe(6);
  });

  it("accepts option 6 and ignores non-numeric values", () => {
    const result = evaluate(makeEvalArgs(9, 6, [1, null, "x", 4]));
    expect(result).toBe(5);
  });

  it("throws for unsupported options", () => {
    expect(() => evaluate(makeEvalArgs(9, 7, [1, 2]))).toThrowError("AGGREGATE options value is not supported");
  });

  it("throws for unsupported function numbers", () => {
    expect(() => evaluate(makeEvalArgs(99, 0, [1, 2]))).toThrowError("AGGREGATE function number is not supported");
  });
});
