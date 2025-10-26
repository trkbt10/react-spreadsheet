/**
 * @file LEFT function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const leftFunction: FormulaFunctionEagerDefinition = {
  name: "LEFT",
  description: {
    en: "Returns the leftmost characters from a text value.",
    ja: "文字列の左端から指定した文字数を返します。",
  },
  examples: ['LEFT("Spreadsheet", 5)', 'LEFT(A1)'],
  evaluate: (args, helpers) => {
    if (args.length === 0 || args.length > 2) {
      throw new Error("LEFT expects one or two arguments");
    }
    const [textArg, countArg] = args;
    const text = helpers.coerceText(textArg, "LEFT text");
    const countValue = countArg === undefined ? 1 : helpers.requireNumber(countArg, "LEFT number");
    const requestedCount = helpers.requireInteger(countValue, "LEFT number must be an integer");
    if (requestedCount < 0) {
      throw new Error("LEFT number must be non-negative");
    }
    if (requestedCount === 0) {
      return "";
    }
    const characters = Array.from(text);
    const sliceEnd = Math.min(requestedCount, characters.length);
    return characters.slice(0, sliceEnd).join("");
  },
};
