import { describe, it, expect } from "vitest";
import { formulaFunctionHelpers, type FormulaFunctionDefinition } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";
import {
  sinFunction,
  cosFunction,
  tanFunction,
  asinFunction,
  acosFunction,
  atanFunction,
} from "./trigonometric";
import { sinhFunction, coshFunction, tanhFunction } from "./hyperbolic";
import { degreesFunction, radiansFunction } from "./conversion";
import { besseliFunction, besseljFunction } from "./bessel";
import { deltaFunction } from "./delta";
import { erfFunction, erfcFunction } from "./erf";

const evaluate = (definition: FormulaFunctionDefinition, ...args: EvalResult[]) => {
  return invokeFormulaFunction(definition, formulaFunctionHelpers, makeEvalArgs(...args));
};

describe("trigonometric functions", () => {
  it("computes sine, cosine, and tangent", () => {
    const sine = evaluate(sinFunction, Math.PI / 2) as number;
    const cosine = evaluate(cosFunction, 0) as number;
    const tangent = evaluate(tanFunction, Math.PI / 4) as number;
    expect(sine).toBeCloseTo(1, 12);
    expect(cosine).toBeCloseTo(1, 12);
    expect(tangent).toBeCloseTo(1, 12);
  });

  it("computes inverse trigonometric values within domain", () => {
    const arcsine = evaluate(asinFunction, 1) as number;
    const arccosine = evaluate(acosFunction, 0) as number;
    const arctangent = evaluate(atanFunction, 1) as number;
    expect(arcsine).toBeCloseTo(Math.PI / 2, 12);
    expect(arccosine).toBeCloseTo(Math.PI / 2, 12);
    expect(arctangent).toBeCloseTo(Math.PI / 4, 12);
  });

  it("rejects inverse trigonometric inputs outside [-1, 1]", () => {
    expect(() => evaluate(asinFunction, 2)).toThrowError(/ASIN/);
    expect(() => evaluate(acosFunction, -2)).toThrowError(/ACOS/);
  });
});

describe("hyperbolic functions", () => {
  it("computes hyperbolic sine, cosine, and tangent", () => {
    const value = 0.5;
    const sinh = evaluate(sinhFunction, value) as number;
    const cosh = evaluate(coshFunction, value) as number;
    const tanh = evaluate(tanhFunction, value) as number;
    expect(sinh).toBeCloseTo(Math.sinh(value), 12);
    expect(cosh).toBeCloseTo(Math.cosh(value), 12);
    expect(tanh).toBeCloseTo(Math.tanh(value), 12);
  });
});

describe("angle conversion functions", () => {
  it("converts between degrees and radians", () => {
    const degrees = evaluate(degreesFunction, Math.PI) as number;
    const radians = evaluate(radiansFunction, 180) as number;
    expect(degrees).toBeCloseTo(180, 12);
    expect(radians).toBeCloseTo(Math.PI, 12);
  });
});

describe("engineering functions", () => {
  it("evaluates DELTA equality test", () => {
    expect(evaluate(deltaFunction, 5, 5)).toBe(1);
    expect(evaluate(deltaFunction, 5, 2)).toBe(0);
    expect(evaluate(deltaFunction, 3)).toBe(0);
  });

  it("computes Bessel J and I values", () => {
    const j0 = evaluate(besseljFunction, 0, 0) as number;
    const j1 = evaluate(besseljFunction, 1, 1) as number;
    const i0 = evaluate(besseliFunction, 0, 0) as number;
    const i1 = evaluate(besseliFunction, 1, 1) as number;
    expect(j0).toBeCloseTo(1, 12);
    expect(j1).toBeCloseTo(0.44005058574493355, 10);
    expect(i0).toBeCloseTo(1, 12);
    expect(i1).toBeCloseTo(0.565159103992485, 10);
  });

  it("enforces non-negative integer orders for Bessel functions", () => {
    expect(() => evaluate(besseljFunction, 1, 1.5)).toThrowError(/integer/);
    expect(() => evaluate(besseliFunction, 1, -1)).toThrowError(/non-negative/);
  });

  it("computes error functions", () => {
    const erfSingle = evaluate(erfFunction, 1) as number;
    const erfRange = evaluate(erfFunction, 0, 1) as number;
    const erfZero = evaluate(erfFunction, 0) as number;
    const erfc = evaluate(erfcFunction, 1) as number;
    expect(erfSingle).toBeCloseTo(0.8427007929497149, 10);
    expect(erfRange).toBeCloseTo(erfSingle - erfZero, 12);
    expect(erfc).toBeCloseTo(0.1572992070502851, 10);
  });
});
