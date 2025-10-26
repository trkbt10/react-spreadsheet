/**
 * @file LEN function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const lenFunction: FormulaFunctionEagerDefinition = {
  name: "LEN",
  description: {
    en: "Counts the number of Unicode characters in a text value.",
    ja: "文字列内のUnicode文字数を返します。",
  },
  examples: ['LEN("Spreadsheet")', "LEN(A1)"],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("LEN expects exactly one argument");
    }
    const [textArg] = args;
    const text = helpers.coerceText(textArg, "LEN text");
    return Array.from(text).length;
  },
};
