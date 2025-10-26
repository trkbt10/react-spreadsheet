/**
 * @file Bessel function implementations (ODF 1.3 §6.19).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

const BESSEL_MAX_ITERATIONS = 500;
const BESSEL_TOLERANCE = 1e-12;

const computeBesselSeries = (order: number, x: number, alternating: boolean): number => {
  const halfX = x / 2;
  let term = 1;
  if (order > 0) {
    for (let k = 1; k <= order; k += 1) {
      term *= halfX / k;
    }
  }
  let sum = term;
  for (let m = 0; m < BESSEL_MAX_ITERATIONS; m += 1) {
    const denominator = (m + 1) * (m + 1 + order);
    if (denominator === 0) {
      throw new Error("Bessel series encountered zero denominator");
    }
    const ratioBase = (halfX * halfX) / denominator;
    const ratio = alternating ? -ratioBase : ratioBase;
    term *= ratio;
    sum += term;
    if (!Number.isFinite(term) || !Number.isFinite(sum)) {
      throw new Error("Bessel series failed to converge");
    }
    const magnitude = Math.abs(sum);
    const tolerance = magnitude > 1 ? BESSEL_TOLERANCE * magnitude : BESSEL_TOLERANCE;
    if (Math.abs(term) < tolerance) {
      break;
    }
  }
  return sum;
};

export const besseliFunction: FormulaFunctionEagerDefinition = {
  name: "BESSELI",
  description: {
    en: "Returns the modified Bessel function of the first kind.",
    ja: "第1種変形ベッセル関数を返します。",
  },
  examples: ["BESSELI(1, 0)", "BESSELI(2, 1.5)"],
  evaluate: (args, helpers) => {
    if (args.length !== 2) {
      throw new Error("BESSELI expects exactly two arguments");
    }
    const x = helpers.requireNumber(args[0], "BESSELI value");
    const orderCandidate = helpers.requireNumber(args[1], "BESSELI order");
    const order = helpers.requireInteger(orderCandidate, "BESSELI order must be an integer");
    if (order < 0) {
      throw new Error("BESSELI order must be non-negative");
    }
    return computeBesselSeries(order, x, false);
  },
};

export const besseljFunction: FormulaFunctionEagerDefinition = {
  name: "BESSELJ",
  description: {
    en: "Returns the Bessel function of the first kind.",
    ja: "第1種ベッセル関数を返します。",
  },
  examples: ["BESSELJ(0, 1)", "BESSELJ(1, 2.5)"],
  evaluate: (args, helpers) => {
    if (args.length !== 2) {
      throw new Error("BESSELJ expects exactly two arguments");
    }
    const x = helpers.requireNumber(args[0], "BESSELJ value");
    const orderCandidate = helpers.requireNumber(args[1], "BESSELJ order");
    const order = helpers.requireInteger(orderCandidate, "BESSELJ order must be an integer");
    if (order < 0) {
      throw new Error("BESSELJ order must be non-negative");
    }
    return computeBesselSeries(order, x, true);
  },
};
