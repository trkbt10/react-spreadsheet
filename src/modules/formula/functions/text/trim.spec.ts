import { trimFunction } from "./trim";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(trimFunction, formulaFunctionHelpers, args);

describe("TRIM", () => {
  it("removes leading and trailing whitespace", () => {
    expect(evaluate(makeEvalArgs("  data  "))).toBe("data");
  });

  it("collapses internal whitespace sequences to a single space", () => {
    expect(evaluate(makeEvalArgs("a\t\t b\n\n c"))).toBe("a b c");
  });
});
