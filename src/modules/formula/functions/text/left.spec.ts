import { leftFunction } from "./left";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(leftFunction, formulaFunctionHelpers, args);

describe("LEFT", () => {
  it("uses a default count of one when omitted", () => {
    expect(evaluate(makeEvalArgs("Hello"))).toBe("H");
  });

  it("returns the requested number of characters", () => {
    expect(evaluate(makeEvalArgs("こんにちは", 2))).toBe("こん");
  });

  it("throws when the requested number is negative", () => {
    expect(() => evaluate(makeEvalArgs("Test", -1))).toThrowError(
      "LEFT number must be non-negative",
    );
  });
});
