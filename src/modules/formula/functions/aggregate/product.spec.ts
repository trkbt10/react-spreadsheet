import { productFunction } from "./product";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(productFunction, formulaFunctionHelpers, args);

describe("PRODUCT", () => {
  it("multiplies numeric arguments, ignoring null values", () => {
    const result = evaluate(makeEvalArgs(2, [3, null, 4]));
    expect(result).toBe(24);
  });

  it("returns 1 when no arguments are provided", () => {
    const result = evaluate(makeEvalArgs());
    expect(result).toBe(1);
  });

  it("throws when encountering non-numeric values", () => {
    expect(() => evaluate(makeEvalArgs(2, "text"))).toThrowError("PRODUCT expects numeric arguments");
  });
});
