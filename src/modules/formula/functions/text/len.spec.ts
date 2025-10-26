import { lenFunction } from "./len";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(lenFunction, formulaFunctionHelpers, args);

describe("LEN", () => {
  it("counts characters in plain text", () => {
    expect(evaluate(makeEvalArgs("Spreadsheet"))).toBe(11);
  });

  it("counts extended characters as a single unit", () => {
    expect(evaluate(makeEvalArgs("👍"))).toBe(1);
  });
});
