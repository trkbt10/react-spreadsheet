import { sumIfFunction } from "./sumif";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(sumIfFunction, formulaFunctionHelpers, args);

describe("SUMIF", () => {
  it("sums values matching the criteria from the source range", () => {
    const result = evaluate(makeEvalArgs([1, 2, 3, 4], ">2"));
    expect(result).toBe(7);
  });

  it("sums values from a separate range when provided", () => {
    const result = evaluate(makeEvalArgs(["a", "b", "a"], "a", [10, 20, 30]));
    expect(result).toBe(40);
  });

  it("ignores non-numeric values in the sum range", () => {
    const result = evaluate(makeEvalArgs([1, 2, 3], ">1", ["x", 5, null]));
    expect(result).toBe(5);
  });

  it("throws when range and sum range sizes differ", () => {
    expect(() =>
      evaluate(makeEvalArgs([1, 2, 3], ">0", [1, 2])),
    ).toThrowError("SUMIF sum_range must match criteria range size");
  });
});
