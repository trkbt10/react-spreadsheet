/**
 * @file Trigonometric function implementations (ODF 1.3 §6.20).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

const assertSingleArgument = (argsLength: number, functionName: string): void => {
  if (argsLength !== 1) {
    throw new Error(`${functionName} expects exactly one argument`);
  }
};

export const sinFunction: FormulaFunctionEagerDefinition = {
  name: "SIN",
  description: {
    en: "Returns the sine of an angle specified in radians.",
    ja: "ラジアンで指定した角度のサインを返します。",
  },
  examples: ["SIN(PI()/2)"],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "SIN");
    const angle = helpers.requireNumber(args[0], "SIN angle");
    return Math.sin(angle);
  },
};

export const cosFunction: FormulaFunctionEagerDefinition = {
  name: "COS",
  description: {
    en: "Returns the cosine of an angle specified in radians.",
    ja: "ラジアンで指定した角度のコサインを返します。",
  },
  examples: ["COS(0)"],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "COS");
    const angle = helpers.requireNumber(args[0], "COS angle");
    return Math.cos(angle);
  },
};

export const tanFunction: FormulaFunctionEagerDefinition = {
  name: "TAN",
  description: {
    en: "Returns the tangent of an angle specified in radians.",
    ja: "ラジアンで指定した角度のタンジェントを返します。",
  },
  examples: ["TAN(PI()/4)"],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "TAN");
    const angle = helpers.requireNumber(args[0], "TAN angle");
    return Math.tan(angle);
  },
};

export const asinFunction: FormulaFunctionEagerDefinition = {
  name: "ASIN",
  description: {
    en: "Returns the arcsine of a value, in radians.",
    ja: "値の逆サインをラジアンで返します。",
  },
  examples: ["ASIN(1)"],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "ASIN");
    const value = helpers.requireNumber(args[0], "ASIN value");
    if (value < -1 || value > 1) {
      throw new Error("ASIN value must be between -1 and 1");
    }
    return Math.asin(value);
  },
};

export const acosFunction: FormulaFunctionEagerDefinition = {
  name: "ACOS",
  description: {
    en: "Returns the arccosine of a value, in radians.",
    ja: "値の逆コサインをラジアンで返します。",
  },
  examples: ["ACOS(0)"],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "ACOS");
    const value = helpers.requireNumber(args[0], "ACOS value");
    if (value < -1 || value > 1) {
      throw new Error("ACOS value must be between -1 and 1");
    }
    return Math.acos(value);
  },
};

export const atanFunction: FormulaFunctionEagerDefinition = {
  name: "ATAN",
  description: {
    en: "Returns the arctangent of a value, in radians.",
    ja: "値の逆タンジェントをラジアンで返します。",
  },
  examples: ["ATAN(1)"],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "ATAN");
    const value = helpers.requireNumber(args[0], "ATAN value");
    return Math.atan(value);
  },
};
