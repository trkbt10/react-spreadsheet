import { textJoinFunction } from "./textjoin";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(textJoinFunction, formulaFunctionHelpers, args);

describe("TEXTJOIN", () => {
  it("joins values using the provided delimiter", () => {
    expect(evaluate(makeEvalArgs(",", false, "A", ["B", null, "C"]))).toBe("A,B,,C");
  });

  it("skips empty values when ignore_empty is true", () => {
    expect(evaluate(makeEvalArgs("-", true, ["A", "", null], "B"))).toBe("A-B");
  });

  it("throws when invoked with fewer than three arguments", () => {
    expect(() => evaluate(makeEvalArgs(",", true))).toThrowError("TEXTJOIN expects at least three arguments");
  });
});
