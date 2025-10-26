import { sumIfsFunction } from "./sumifs";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(sumIfsFunction, formulaFunctionHelpers, args);

describe("SUMIFS", () => {
  it("sums values satisfying all criteria", () => {
    const result = evaluate(
      makeEvalArgs([10, 20, 30, 40], ["North", "South", "North", "North"], "North", [2024, 2024, 2025, 2024], 2024),
    );
    expect(result).toBe(50);
  });

  it("ignores non-numeric values in the sum range", () => {
    const result = evaluate(makeEvalArgs([10, null, "x"], [true, true, false], true));
    expect(result).toBe(10);
  });

  it("throws when a criteria range size differs from the sum range", () => {
    expect(() => evaluate(makeEvalArgs([1, 2], [1], 1))).toThrowError(
      "SUMIFS criteria ranges must match the sum range size",
    );
  });

  it("throws when provided with an invalid argument count", () => {
    expect(() => evaluate(makeEvalArgs([1, 2, 3], [1, 2, 3]))).toThrowError(
      "SUMIFS expects a sum range followed by range/criteria pairs",
    );
  });
});
