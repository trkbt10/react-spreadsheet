import { rightFunction } from "./right";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(rightFunction, formulaFunctionHelpers, args);

describe("RIGHT", () => {
  it("uses a default count of one when omitted", () => {
    expect(evaluate(makeEvalArgs("World"))).toBe("d");
  });

  it("returns the requested number of characters from the end", () => {
    expect(evaluate(makeEvalArgs("Spreadsheet", 5))).toBe("sheet");
  });

  it("throws when the requested number is negative", () => {
    expect(() => evaluate(makeEvalArgs("Test", -2))).toThrowError(
      "RIGHT number must be non-negative",
    );
  });
});
