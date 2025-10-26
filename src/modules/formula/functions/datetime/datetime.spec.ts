import { describe, it, expect, vi, afterEach } from "vitest";
import { formulaFunctionHelpers } from "../../functionRegistry";
import {
  invokeFormulaFunction,
  makeEvalArgs,
} from "../testHelpers";
import { dateFunction } from "./date";
import { timeFunction } from "./time";
import { dateValueFunction } from "./datevalue";
import { timeValueFunction } from "./timevalue";
import { todayFunction } from "./today";
import { nowFunction } from "./now";
import { eDateFunction } from "./edate";
import { eoMonthFunction } from "./eomonth";
import { dayFunction } from "./day";
import { monthFunction } from "./month";
import { yearFunction } from "./year";
import { weekDayFunction } from "./weekday";
import { weekNumFunction } from "./weeknum";

const evaluate = (
  definition: Parameters<typeof invokeFormulaFunction>[0],
  ...args: Parameters<typeof makeEvalArgs>
) => invokeFormulaFunction(definition, formulaFunctionHelpers, makeEvalArgs(...args));

const expectNumberResult = (value: unknown): number => {
  if (typeof value !== "number") {
    throw new Error("Expected numeric result");
  }
  return value;
};

afterEach(() => {
  vi.useRealTimers();
});

describe("datetime functions", () => {
  it("computes DATE with month overflow", () => {
    const serial = expectNumberResult(evaluate(dateFunction, 2024, 1, 32));
    const normalized = expectNumberResult(evaluate(dateFunction, 2024, 2, 1));
    expect(serial).toBe(normalized);
  });

  it("computes TIME with overflowing hours", () => {
    const fraction = expectNumberResult(evaluate(timeFunction, 25, 0, 0));
    expect(fraction).toBeCloseTo(25 / 24);
  });

  it("parses DATEVALUE text", () => {
    const serial = expectNumberResult(evaluate(dateValueFunction, "2024-05-10"));
    const expected = expectNumberResult(evaluate(dateFunction, 2024, 5, 10));
    expect(serial).toBe(expected);
  });

  it("parses TIMEVALUE text", () => {
    const fraction = expectNumberResult(evaluate(timeValueFunction, "12:30:00"));
    expect(fraction).toBeCloseTo(12.5 / 24);
  });

  it("returns TODAY without time component", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2024, 0, 15, 9, 30, 0)));
    const result = expectNumberResult(evaluate(todayFunction));
    const expected = Math.floor(expectNumberResult(evaluate(dateFunction, 2024, 1, 15)));
    expect(result).toBe(expected);
  });

  it("returns NOW including the time component", () => {
    vi.useFakeTimers();
    const fixed = new Date(Date.UTC(2024, 0, 15, 12, 0, 0));
    vi.setSystemTime(fixed);
    const result = expectNumberResult(evaluate(nowFunction));
    const expected =
      expectNumberResult(evaluate(dateFunction, 2024, 1, 15)) +
      expectNumberResult(evaluate(timeFunction, 12, 0, 0));
    expect(result).toBeCloseTo(expected);
  });

  it("shifts months with EDATE", () => {
    const base = expectNumberResult(evaluate(dateFunction, 2024, 1, 31));
    const shifted = expectNumberResult(evaluate(eDateFunction, base, 1));
    const expected = expectNumberResult(evaluate(dateFunction, 2024, 2, 29));
    expect(shifted).toBe(expected);
  });

  it("returns month end with EOMONTH", () => {
    const base = expectNumberResult(evaluate(dateFunction, 2024, 1, 15));
    const result = expectNumberResult(evaluate(eoMonthFunction, base, 1));
    const expected = expectNumberResult(evaluate(dateFunction, 2024, 2, 29));
    expect(result).toBe(expected);
  });

  it("extracts DAY, MONTH, and YEAR", () => {
    const serial =
      expectNumberResult(evaluate(dateFunction, 2023, 12, 31)) +
      expectNumberResult(evaluate(timeFunction, 5, 0, 0));
    expect(expectNumberResult(evaluate(dayFunction, serial))).toBe(31);
    expect(expectNumberResult(evaluate(monthFunction, serial))).toBe(12);
    expect(expectNumberResult(evaluate(yearFunction, serial))).toBe(2023);
  });

  it("computes WEEKDAY with different return types", () => {
    const serial = expectNumberResult(evaluate(dateFunction, 2024, 1, 7)); // Sunday
    expect(expectNumberResult(evaluate(weekDayFunction, serial))).toBe(1);
    expect(expectNumberResult(evaluate(weekDayFunction, serial, 2))).toBe(7);
    expect(expectNumberResult(evaluate(weekDayFunction, serial, 3))).toBe(6);
  });

  it("computes WEEKNUM for Sunday-based weeks", () => {
    const serial = expectNumberResult(evaluate(dateFunction, 2024, 1, 6)); // Saturday
    expect(expectNumberResult(evaluate(weekNumFunction, serial))).toBe(1);
  });

  it("computes WEEKNUM for Monday-based weeks", () => {
    const serial = expectNumberResult(evaluate(dateFunction, 2024, 1, 8)); // Monday
    expect(expectNumberResult(evaluate(weekNumFunction, serial, 2))).toBe(2);
  });
});
