/**
 * @file Database function unit tests.
 */

import { formulaFunctionHelpers } from "../../functionRegistry";
import { dAverageFunction } from "./daverage";
import { dCountFunction } from "./dcount";
import { dMaxFunction, dMinFunction } from "./dextrema";
import { dProductFunction, dSumFunction } from "./daggregate";
import { dStdevFunction, dStdevpFunction, dVarFunction, dVarpFunction } from "./dstatistics";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { EvalResult } from "../helpers";

const evaluate = (
  definition: Parameters<typeof invokeFormulaFunction>[0],
  ...args: Parameters<typeof makeEvalArgs>
) => invokeFormulaFunction(definition, formulaFunctionHelpers, makeEvalArgs(...args));

const database = [
  ["Region", "Year", "Sales", "Quantity", "Active"],
  ["North", 2024, 120, 10, true],
  ["South", 2024, 80, 4, false],
  ["North", 2025, 200, 8, true],
  ["North", 2024, null, 5, true],
  ["North", 2024, "n/a", 7, false],
  ["East", 2024, 40, 3, true],
] satisfies EvalResult[];

const north2024Criteria = [
  ["Region", "Year"],
  ["North", 2024],
] satisfies EvalResult[];

const northCriteria = [
  ["Region"],
  ["North"],
] satisfies EvalResult[];

const allRowsCriteria = [
  ["Region", "Year"],
  [null, null],
] satisfies EvalResult[];

describe("database functions", () => {
  it("sums numeric rows matching the DSUM criteria", () => {
    const result = evaluate(dSumFunction, database, 3, north2024Criteria);
    expect(result).toBe(120);
  });

  it("multiplies numeric rows matching the DPRODUCT criteria", () => {
    const result = evaluate(dProductFunction, database, "Sales", north2024Criteria);
    expect(result).toBe(120);
  });

  it("counts numeric rows matching the DCOUNT criteria", () => {
    const result = evaluate(dCountFunction, database, "Sales", north2024Criteria);
    expect(result).toBe(1);
  });

  it("averages numeric rows matching the DAVERAGE criteria", () => {
    const result = evaluate(dAverageFunction, database, "Sales", northCriteria);
    expect(result).toBe(160);
  });

  it("returns the maximum numeric value matching the DMAX criteria", () => {
    const result = evaluate(dMaxFunction, database, "Sales", northCriteria);
    expect(result).toBe(200);
  });

  it("returns the minimum numeric value matching the DMIN criteria", () => {
    const result = evaluate(dMinFunction, database, "Sales", northCriteria);
    expect(result).toBe(120);
  });

  it("computes the sample standard deviation for DSTDEV", () => {
    const result = evaluate(dStdevFunction, database, "Sales", northCriteria);
    expect(result).toBeCloseTo(56.568542, 6);
  });

  it("computes the population standard deviation for DSTDEVP", () => {
    const result = evaluate(dStdevpFunction, database, "Sales", northCriteria);
    expect(result).toBe(40);
  });

  it("computes the sample variance for DVAR", () => {
    const result = evaluate(dVarFunction, database, "Sales", northCriteria);
    expect(result).toBe(3200);
  });

  it("computes the population variance for DVARP", () => {
    const result = evaluate(dVarpFunction, database, "Sales", northCriteria);
    expect(result).toBe(1600);
  });

  it("returns zero for DSUM when no numeric values match", () => {
    const result = evaluate(
      dSumFunction,
      database,
      "Sales",
      [
        ["Region"],
        ["West"],
      ] satisfies EvalResult[],
    );
    expect(result).toBe(0);
  });

  it("returns one for DPRODUCT when no numeric values match", () => {
    const result = evaluate(
      dProductFunction,
      database,
      "Sales",
      [
        ["Region"],
        ["West"],
      ] satisfies EvalResult[],
    );
    expect(result).toBe(1);
  });

  it("throws when DAVERAGE has no numeric matches", () => {
    expect(() =>
      evaluate(
        dAverageFunction,
        database,
        "Sales",
        [
          ["Region"],
          ["West"],
        ] satisfies EvalResult[],
      ),
    ).toThrowError("DAVERAGE found no numeric values matching criteria");
  });

  it("throws when DSTDEV lacks enough numeric matches", () => {
    expect(() => evaluate(dStdevFunction, database, "Sales", north2024Criteria)).toThrowError(
      "DSTDEV requires at least two numeric values matching criteria",
    );
  });

  it("treats a blank criteria row as matching all records", () => {
    const result = evaluate(dSumFunction, database, "Sales", allRowsCriteria);
    expect(result).toBe(440);
  });

  it("throws when criteria headers do not match the database", () => {
    expect(() =>
      evaluate(
        dSumFunction,
        database,
        "Sales",
        [
          ["Unknown"],
          ["value"],
        ] satisfies EvalResult[],
      ),
    ).toThrowError('DSUM criteria header "Unknown" does not match a database field');
  });
});
