import { roundFunction } from "./round";
import { roundUpFunction } from "./roundup";
import { roundDownFunction } from "./rounddown";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluateRound = (args: EvalResult[]) =>
  invokeFormulaFunction(roundFunction, formulaFunctionHelpers, args);

const evaluateRoundUp = (args: EvalResult[]) =>
  invokeFormulaFunction(roundUpFunction, formulaFunctionHelpers, args);

const evaluateRoundDown = (args: EvalResult[]) =>
  invokeFormulaFunction(roundDownFunction, formulaFunctionHelpers, args);

describe("ROUND", () => {
  it("rounds half values away from zero when digits is zero", () => {
    expect(evaluateRound(makeEvalArgs(1.5, 0))).toBe(2);
    expect(evaluateRound(makeEvalArgs(-1.5, 0))).toBe(-2);
  });

  it("respects positive digit counts", () => {
    const rounded = evaluateRound(makeEvalArgs(1.235, 2));
    expect(rounded).toBe(1.24);
  });

  it("supports negative digit counts", () => {
    const rounded = evaluateRound(makeEvalArgs(125, -1));
    expect(rounded).toBe(130);
  });

  it("rejects non-integer digit counts", () => {
    expect(() => evaluateRound(makeEvalArgs(1.23, 1.5))).toThrowError(
      "ROUND digits must be an integer",
    );
  });

  it("rejects an invalid number of arguments", () => {
    expect(() => evaluateRound(makeEvalArgs(1.5))).toThrowError(
      "ROUND expects exactly two arguments",
    );
  });
});

describe("ROUNDUP", () => {
  it("rounds values away from zero", () => {
    expect(evaluateRoundUp(makeEvalArgs(1.21, 0))).toBe(2);
    expect(evaluateRoundUp(makeEvalArgs(-1.21, 0))).toBe(-2);
  });

  it("honors digit arguments", () => {
    const positiveDigits = evaluateRoundUp(makeEvalArgs(1.219, 2));
    const negativeDigits = evaluateRoundUp(makeEvalArgs(1234, -2));
    expect(positiveDigits).toBe(1.22);
    expect(negativeDigits).toBe(1300);
  });

  it("rejects non-integer digit counts", () => {
    expect(() => evaluateRoundUp(makeEvalArgs(1.23, 0.2))).toThrowError(
      "ROUNDUP digits must be an integer",
    );
  });

  it("rejects an invalid number of arguments", () => {
    expect(() => evaluateRoundUp(makeEvalArgs(1.2))).toThrowError(
      "ROUNDUP expects exactly two arguments",
    );
  });
});

describe("ROUNDDOWN", () => {
  it("rounds values toward zero", () => {
    expect(evaluateRoundDown(makeEvalArgs(1.29, 0))).toBe(1);
    expect(evaluateRoundDown(makeEvalArgs(-1.29, 0))).toBe(-1);
  });

  it("honors digit arguments", () => {
    const positiveDigits = evaluateRoundDown(makeEvalArgs(1.298, 2));
    const negativeDigits = evaluateRoundDown(makeEvalArgs(1234, -2));
    expect(positiveDigits).toBe(1.29);
    expect(negativeDigits).toBe(1200);
  });

  it("rejects non-integer digit counts", () => {
    expect(() => evaluateRoundDown(makeEvalArgs(1.23, 0.3))).toThrowError(
      "ROUNDDOWN digits must be an integer",
    );
  });

  it("rejects an invalid number of arguments", () => {
    expect(() => evaluateRoundDown(makeEvalArgs(1.2))).toThrowError(
      "ROUNDDOWN expects exactly two arguments",
    );
  });
});
