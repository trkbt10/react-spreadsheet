import { searchFunction } from "./search";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(searchFunction, formulaFunctionHelpers, args);

describe("SEARCH", () => {
  it("performs a case-insensitive search", () => {
    expect(evaluate(makeEvalArgs("SHEET", "Spreadsheet"))).toBe(7);
  });

  it("honors the provided starting position", () => {
    expect(evaluate(makeEvalArgs("e", "Spreadsheet", 5))).toBe(9);
  });

  it("throws when the text is not found", () => {
    expect(() => evaluate(makeEvalArgs("z", "data"))).toThrowError("SEARCH could not locate the specified text");
  });
});
