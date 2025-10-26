import { concatFunction } from "./concat";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(concatFunction, formulaFunctionHelpers, args);

describe("CONCAT", () => {
  it("concatenates text, numbers, and booleans", () => {
    expect(evaluate(makeEvalArgs("Hello", 123, true))).toBe("Hello123TRUE");
  });

  it("treats null values as empty strings", () => {
    expect(evaluate(makeEvalArgs("A", null, "B"))).toBe("AB");
  });

  it("flattens array arguments", () => {
    expect(evaluate(makeEvalArgs(["A", "B"], "C"))).toBe("ABC");
  });

  it("returns an empty string when called without arguments", () => {
    expect(evaluate(makeEvalArgs())).toBe("");
  });
});
