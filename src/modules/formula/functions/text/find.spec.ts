import { findFunction } from "./find";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(findFunction, formulaFunctionHelpers, args);

describe("FIND", () => {
  it("returns the position of the first match", () => {
    expect(evaluate(makeEvalArgs("sheet", "Spreadsheet"))).toBe(7);
  });

  it("respects the provided starting position", () => {
    expect(evaluate(makeEvalArgs("e", "Spreadsheet", 3))).toBe(4);
  });

  it("throws when the text is not found", () => {
    expect(() => evaluate(makeEvalArgs("x", "data"))).toThrowError(
      "FIND could not locate the specified text",
    );
  });
});
