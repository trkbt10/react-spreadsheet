/**
 * @file Hyperbolic function implementations (ODF 1.3 §6.20).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

const assertSingleArgument = (argsLength: number, functionName: string): void => {
  if (argsLength !== 1) {
    throw new Error(`${functionName} expects exactly one argument`);
  }
};

export const sinhFunction: FormulaFunctionEagerDefinition = {
  name: "SINH",
  description: {
    en: "Returns the hyperbolic sine of a number.",
    ja: "数値の双曲線サインを返します。",
  },
  examples: ["SINH(0.5)"],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "SINH");
    const value = helpers.requireNumber(args[0], "SINH value");
    return Math.sinh(value);
  },
};

export const coshFunction: FormulaFunctionEagerDefinition = {
  name: "COSH",
  description: {
    en: "Returns the hyperbolic cosine of a number.",
    ja: "数値の双曲線コサインを返します。",
  },
  examples: ["COSH(0.5)"],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "COSH");
    const value = helpers.requireNumber(args[0], "COSH value");
    return Math.cosh(value);
  },
};

export const tanhFunction: FormulaFunctionEagerDefinition = {
  name: "TANH",
  description: {
    en: "Returns the hyperbolic tangent of a number.",
    ja: "数値の双曲線タンジェントを返します。",
  },
  examples: ["TANH(0.5)"],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "TANH");
    const value = helpers.requireNumber(args[0], "TANH value");
    return Math.tanh(value);
  },
};
