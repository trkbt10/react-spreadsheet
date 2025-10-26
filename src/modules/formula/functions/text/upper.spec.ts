import { upperFunction } from "./upper";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(upperFunction, formulaFunctionHelpers, args);

describe("UPPER", () => {
  it("converts text to upper case", () => {
    expect(evaluate(makeEvalArgs("Spreadsheet"))).toBe("SPREADSHEET");
  });
});
