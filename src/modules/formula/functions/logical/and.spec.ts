import { describe, it, expect } from "vitest";
import { andFunction } from "./and";
import { formulaFunctionHelpers } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (...args: EvalResult[]) => {
  return invokeFormulaFunction(andFunction, formulaFunctionHelpers, makeEvalArgs(...args));
};

describe("andFunction", () => {
  it("returns true when every argument resolves to true", () => {
    const result = evaluate(true, [true, true]);
    expect(result).toBe(true);
  });

  it("returns false when any argument resolves to false or null", () => {
    const result = evaluate([true, null], false);
    expect(result).toBe(false);
  });

  it("throws when invoked without arguments", () => {
    expect(() => {
      evaluate();
    }).toThrowError("AND expects at least one argument");
  });

  it("throws when encountering non-boolean inputs", () => {
    expect(() => {
      evaluate(true, 1);
    }).toThrowError("AND argument 2 expects logical arguments");
  });
});
