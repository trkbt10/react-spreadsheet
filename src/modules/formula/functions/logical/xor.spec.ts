import { describe, it, expect } from "vitest";
import { xorFunction } from "./xor";
import { formulaFunctionHelpers } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (...args: EvalResult[]) => {
  return invokeFormulaFunction(xorFunction, formulaFunctionHelpers, makeEvalArgs(...args));
};

describe("xorFunction", () => {
  it("returns true when an odd number of arguments are true", () => {
    const result = evaluate([true, null], false);
    expect(result).toBe(true);
  });

  it("returns false when an even number of arguments are true", () => {
    const result = evaluate([true, true], false);
    expect(result).toBe(false);
  });

  it("throws when invoked without arguments", () => {
    expect(() => {
      evaluate();
    }).toThrowError("XOR expects at least one argument");
  });

  it("throws when encountering non-boolean inputs", () => {
    expect(() => {
      evaluate([true], "unexpected");
    }).toThrowError("XOR argument 2 expects logical arguments");
  });
});
