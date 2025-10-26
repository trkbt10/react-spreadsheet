import { describe, it, expect } from "vitest";
import { formulaFunctionHelpers } from "../../functionRegistry";
import type { FormulaFunctionDefinition } from "../../functionRegistry";
import type { EvalResult } from "../helpers";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import { averageIfFunction } from "./averageif";
import { averageIfsFunction } from "./averageifs";
import { countIfsFunction } from "./countifs";
import { countAFunction } from "./counta";
import { countBlankFunction } from "./countblank";
import { medianFunction } from "./median";
import { modeFunction } from "./mode";
import { varianceFunction } from "./var";
import { variancePopulationFunction } from "./varp";
import { standardDeviationFunction } from "./stdev";
import { standardDeviationPopulationFunction } from "./stdevp";

const evaluate = (definition: FormulaFunctionDefinition, ...values: EvalResult[]) => {
  return invokeFormulaFunction(definition, formulaFunctionHelpers, makeEvalArgs(...values));
};

describe("statistical functions", () => {
  it("evaluates AVERAGEIF over matching numeric values", () => {
    const result = evaluate(averageIfFunction, [1, 2, 3, 4, null], ">2", [10, 20, 30, 40, 50]);
    expect(result).toBe(35);
  });

  it("throws when AVERAGEIF finds no numeric matches", () => {
    expect(() => evaluate(averageIfFunction, [1, 2, 3], ">5", [10, 20, 30])).toThrowError(
      /AVERAGEIF found no numeric values matching criteria/u,
    );
  });

  it("evaluates AVERAGEIFS with multiple range criteria", () => {
    const result = evaluate(
      averageIfsFunction,
      [10, 20, 30, 40],
      [true, true, false, true],
      "=TRUE",
      [3, 4, 1, 2],
      ">2",
    );
    expect(result).toBe(15);
  });

  it("counts values meeting all COUNTIFS criteria", () => {
    const result = evaluate(
      countIfsFunction,
      [1, 2, 3, 4, 5],
      ">2",
      ["apple", "banana", "apple", "banana", "apple"],
      "=apple",
    );
    expect(result).toBe(2);
  });

  it("counts non-null values with COUNTA", () => {
    const result = evaluate(countAFunction, [1, null, "", "text", false]);
    expect(result).toBe(4);
  });

  it("counts blank values with COUNTBLANK", () => {
    const result = evaluate(countBlankFunction, [null, "", "non-empty", 0]);
    expect(result).toBe(2);
  });

  it("computes MEDIAN for odd and even counts", () => {
    expect(evaluate(medianFunction, [3, 1, 5])).toBe(3);
    expect(evaluate(medianFunction, [1, 2, 3, 4])).toBe(2.5);
  });

  it("computes MODE and prefers the smallest value on ties", () => {
    const result = evaluate(modeFunction, [1, 2, 2, 3, 3]);
    expect(result).toBe(2);
  });

  it("computes sample variance and standard deviation", () => {
    const variance = evaluate(varianceFunction, [2, 4, 6, 8]);
    const stdev = evaluate(standardDeviationFunction, [2, 4, 6, 8]);
    expect(variance).toBeCloseTo(6.6666667);
    expect(stdev).toBeCloseTo(Math.sqrt(6.6666667));
  });

  it("computes population variance and standard deviation", () => {
    const variance = evaluate(variancePopulationFunction, [2, 4, 6, 8]);
    const stdev = evaluate(standardDeviationPopulationFunction, [2, 4, 6, 8]);
    expect(variance).toBeCloseTo(5);
    expect(stdev).toBeCloseTo(Math.sqrt(5));
  });
});
