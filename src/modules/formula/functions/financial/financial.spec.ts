import { describe, it, expect } from "vitest";
import { formulaFunctionHelpers } from "../../functionRegistry";
import { invokeFormulaFunction, makeEvalArgs } from "../testHelpers";
import type { FormulaFunctionDefinition } from "../../functionRegistry";
import type { EvalResult } from "../helpers";
import { pmtFunction } from "./pmt";
import { pvFunction } from "./pv";
import { fvFunction } from "./fv";
import { ipmtFunction } from "./ipmt";
import { ppmtFunction } from "./ppmt";
import { npvFunction } from "./npv";
import { irrFunction } from "./irr";
import { xnpvFunction } from "./xnpv";
import { xirrFunction } from "./xirr";
import { rateFunction } from "./rate";

const evaluate = (definition: FormulaFunctionDefinition, ...args: EvalResult[]) => {
  return invokeFormulaFunction(definition, formulaFunctionHelpers, makeEvalArgs(...args));
};

describe("financial functions", () => {
  const rate = 0.05 / 12;
  const nper = 60;
  const pv = 10000;

  it("computes periodic payment", () => {
    const payment = evaluate(pmtFunction, rate, nper, pv) as number;
    expect(payment).toBeCloseTo(-188.7123364401099, 6);
  });

  it("returns present value consistent with payment", () => {
    const payment = evaluate(pmtFunction, rate, nper, pv) as number;
    const result = evaluate(pvFunction, rate, nper, payment) as number;
    expect(result).toBeCloseTo(pv, 4);
  });

  it("computes future value of recurring payments", () => {
    const futureValue = evaluate(fvFunction, rate, nper, -200) as number;
    const expected = -(0 * (1 + rate) ** nper + (-200 * ((1 + rate) ** nper - 1)) / rate);
    expect(futureValue).toBeCloseTo(expected, 6);
  });

  it("splits payment into interest and principal components", () => {
    const payment = evaluate(pmtFunction, rate, nper, pv) as number;
    const interest = evaluate(ipmtFunction, rate, 1, nper, pv) as number;
    const principal = evaluate(ppmtFunction, rate, 1, nper, pv) as number;
    expect(interest).toBeCloseTo(-41.666666666666664, 6);
    expect(principal).toBeCloseTo(payment - interest, 6);
  });

  it("computes net present value", () => {
    const cashflows = [3000, 4200, 6800];
    const npv = evaluate(npvFunction, rate, cashflows) as number;
    const expected = cashflows.reduce((sum, value, index) => sum + value / (1 + rate) ** (index + 1), 0);
    expect(npv).toBeCloseTo(expected, 6);
  });

  it("solves internal rate of return", () => {
    const cashflows = [-10000, 3000, 4200, 6800];
    const irr = evaluate(irrFunction, cashflows) as number;
    const residual = cashflows.reduce((sum, value, index) => sum + value / (1 + irr) ** index, 0);
    expect(irr).toBeCloseTo(0.16340560068898924, 6);
    expect(residual).toBeCloseTo(0, 4);
  });

  it("computes XNPV for irregular cash flows", () => {
    const cashflows = [-10000, 2750, 4250, 3250, 2750];
    const dates = ["2008-01-01", "2008-03-01", "2008-10-30", "2009-02-15", "2009-04-01"];
    const rateGuess = 0.09;
    const xnpv = evaluate(xnpvFunction, rateGuess, cashflows, dates) as number;
    const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
    const baseDate = toDate(dates[0]);
    const expected = cashflows.reduce((sum, value, index) => {
      const days = (toDate(dates[index]).getTime() - baseDate.getTime()) / 86_400_000;
      return sum + value / (1 + rateGuess) ** (days / 365);
    }, 0);
    expect(xnpv).toBeCloseTo(expected, 6);
  });

  it("solves XIRR for irregular cash flows", () => {
    const cashflows = [-10000, 2750, 4250, 3250, 2750];
    const dates = ["2008-01-01", "2008-03-01", "2008-10-30", "2009-02-15", "2009-04-01"];
    const xirr = evaluate(xirrFunction, cashflows, dates) as number;
    const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
    const baseDate = toDate(dates[0]);
    const residual = cashflows.reduce((sum, value, index) => {
      const days = (toDate(dates[index]).getTime() - baseDate.getTime()) / 86_400_000;
      return sum + value / (1 + xirr) ** (days / 365);
    }, 0);
    expect(xirr).toBeCloseTo(0.3733625335188314, 6);
    expect(residual).toBeCloseTo(0, 4);
  });

  it("solves for rate that zeros present value", () => {
    const payment = evaluate(pmtFunction, rate, nper, pv) as number;
    const computedRate = evaluate(rateFunction, nper, payment, pv) as number;
    const balance = (() => {
      if (computedRate === 0) {
        return pv + payment * nper;
      }
      const factor = (1 + computedRate) ** nper;
      return pv * factor + (payment * (factor - 1)) / computedRate;
    })();
    expect(computedRate).toBeCloseTo(rate, 6);
    expect(balance).toBeCloseTo(0, 4);
  });
});
