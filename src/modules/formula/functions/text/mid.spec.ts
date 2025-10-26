import { midFunction } from "./mid";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(midFunction, formulaFunctionHelpers, args);

describe("MID", () => {
  it("returns the requested substring", () => {
    expect(evaluate(makeEvalArgs("Spreadsheet", 4, 5))).toBe("eadsh");
  });

  it("returns an empty string when the start is beyond the text", () => {
    expect(evaluate(makeEvalArgs("Data", 10, 2))).toBe("");
  });

  it("throws when start is less than 1", () => {
    expect(() => evaluate(makeEvalArgs("Test", 0, 1))).toThrowError("MID start must be greater than or equal to 1");
  });
});
