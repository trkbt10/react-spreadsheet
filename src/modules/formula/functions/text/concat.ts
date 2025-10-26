/**
 * @file CONCAT function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { valueToText } from "../helpers";

export const concatFunction: FormulaFunctionEagerDefinition = {
  name: "CONCAT",
  description: {
    en: "Concatenates text values, numbers, and booleans into a single string.",
    ja: "文字列や数値、真偽値を連結して1つの文字列にします。",
  },
  examples: ['CONCAT("Hello", " ", "World")', "CONCAT(A1:A3)"],
  evaluate: (args, helpers) => {
    if (args.length === 0) {
      return "";
    }
    const values = helpers.flattenArguments(args);
    return values.reduce<string>((accumulator, value) => {
      return `${accumulator}${valueToText(value)}`;
    }, "");
  },
};
