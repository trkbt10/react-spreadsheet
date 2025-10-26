import { substituteFunction } from "./substitute";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(substituteFunction, formulaFunctionHelpers, args);

describe("SUBSTITUTE", () => {
  it("replaces all occurrences by default", () => {
    expect(evaluate(makeEvalArgs("banana", "a", "o"))).toBe("bonono");
  });

  it("replaces only the specified occurrence when instance is provided", () => {
    expect(evaluate(makeEvalArgs("banana", "a", "o", 2))).toBe("banona");
  });

  it("throws when old_text is empty", () => {
    expect(() => evaluate(makeEvalArgs("data", "", "x"))).toThrowError(
      "SUBSTITUTE old_text must be non-empty",
    );
  });
});
