import { lowerFunction } from "./lower";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(lowerFunction, formulaFunctionHelpers, args);

describe("LOWER", () => {
  it("converts text to lower case", () => {
    expect(evaluate(makeEvalArgs("SpreadSheet"))).toBe("spreadsheet");
  });
});
