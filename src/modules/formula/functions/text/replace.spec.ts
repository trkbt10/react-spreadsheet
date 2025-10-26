import { replaceFunction } from "./replace";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(replaceFunction, formulaFunctionHelpers, args);

describe("REPLACE", () => {
  it("replaces the specified portion of text", () => {
    expect(evaluate(makeEvalArgs("Spreadsheet", 7, 5, "book"))).toBe("Spreadbook");
  });

  it("inserts new text when the start is beyond the input length", () => {
    expect(evaluate(makeEvalArgs("Data", 10, 2, "X"))).toBe("DataX");
  });

  it("throws when the start position is less than 1", () => {
    expect(() => evaluate(makeEvalArgs("Test", 0, 1, "A"))).toThrowError(
      "REPLACE position must be greater than or equal to 1",
    );
  });
});
