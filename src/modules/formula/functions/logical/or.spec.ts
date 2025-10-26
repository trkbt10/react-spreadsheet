import { describe, it, expect } from "vitest";
import { orFunction } from "./or";
import { formulaFunctionHelpers } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (...args: EvalResult[]) => {
  return invokeFormulaFunction(orFunction, formulaFunctionHelpers, makeEvalArgs(...args));
};

describe("orFunction", () => {
  it("returns true when any argument resolves to true", () => {
    const result = evaluate(false, [null, true]);
    expect(result).toBe(true);
  });

  it("returns false when every argument resolves to false or null", () => {
    const result = evaluate([false, null], false);
    expect(result).toBe(false);
  });

  it("throws when invoked without arguments", () => {
    expect(() => {
      evaluate();
    }).toThrowError("OR expects at least one argument");
  });

  it("throws when encountering non-boolean inputs", () => {
    expect(() => {
      evaluate(false, "unexpected");
    }).toThrowError("OR argument 2 expects logical arguments");
  });
});
