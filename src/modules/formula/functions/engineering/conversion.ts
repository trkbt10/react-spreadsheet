/**
 * @file Angle conversion function implementations (ODF 1.3 §6.20).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

const assertSingleArgument = (argsLength: number, functionName: string): void => {
  if (argsLength !== 1) {
    throw new Error(`${functionName} expects exactly one argument`);
  }
};

const RADIANS_PER_DEGREE = Math.PI / 180;
const DEGREES_PER_RADIAN = 180 / Math.PI;

export const degreesFunction: FormulaFunctionEagerDefinition = {
  name: "DEGREES",
  description: {
    en: "Converts radians to degrees.",
    ja: "ラジアン値を度に変換します。",
  },
  examples: ["DEGREES(PI())"],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "DEGREES");
    const radians = helpers.requireNumber(args[0], "DEGREES radians");
    return radians * DEGREES_PER_RADIAN;
  },
};

export const radiansFunction: FormulaFunctionEagerDefinition = {
  name: "RADIANS",
  description: {
    en: "Converts degrees to radians.",
    ja: "度をラジアン値に変換します。",
  },
  examples: ["RADIANS(180)"],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "RADIANS");
    const degrees = helpers.requireNumber(args[0], "RADIANS degrees");
    return degrees * RADIANS_PER_DEGREE;
  },
};
