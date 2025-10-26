import { subtotalFunction } from "./subtotal";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(subtotalFunction, formulaFunctionHelpers, args);

describe("SUBTOTAL", () => {
  it("computes averages for numeric values", () => {
    const result = evaluate(makeEvalArgs(1, [10, 20, 30]));
    expect(result).toBe(20);
  });

  it("counts non-empty values", () => {
    const result = evaluate(makeEvalArgs(3, [1, null, "x", false]));
    expect(result).toBe(3);
  });

  it("sums values across multiple ranges", () => {
    const result = evaluate(makeEvalArgs(9, [1, 2], [3, 4]));
    expect(result).toBe(10);
  });

  it("computes sample variance", () => {
    const result = evaluate(makeEvalArgs(10, [1, 3, 5, 7, 9]));
    expect(result).toBe(10);
  });

  it("throws for unsupported function numbers", () => {
    expect(() => evaluate(makeEvalArgs(99, [1, 2]))).toThrowError("SUBTOTAL function number is not supported");
  });
});
