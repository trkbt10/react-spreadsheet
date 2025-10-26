import { properFunction } from "./proper";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (args: EvalResult[]) => invokeFormulaFunction(properFunction, formulaFunctionHelpers, args);

describe("PROPER", () => {
  it("capitalizes each word and lower-cases remaining characters", () => {
    expect(evaluate(makeEvalArgs("hello WORLD"))).toBe("Hello World");
  });

  it("handles words separated by punctuation", () => {
    expect(evaluate(makeEvalArgs("o'bRiAn"))).toBe("O'Brian");
  });

  it("capitalizes after numeric separators", () => {
    expect(evaluate(makeEvalArgs("version 2beta"))).toBe("Version 2Beta");
  });
});
