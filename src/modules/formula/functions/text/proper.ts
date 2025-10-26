/**
 * @file PROPER function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

const LETTER_PATTERN = /\p{L}/u;
const DIGIT_PATTERN = /\p{Nd}/u;

const isLetter = (character: string): boolean => LETTER_PATTERN.test(character);
const isDigit = (character: string): boolean => DIGIT_PATTERN.test(character);

export const properFunction: FormulaFunctionEagerDefinition = {
  name: "PROPER",
  description: {
    en: "Capitalizes the first letter of each word and lowercases the rest.",
    ja: "各単語の先頭文字を大文字にし、残りを小文字に変換します。",
  },
  examples: ['PROPER("hello WORLD")', 'PROPER(A1)'],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("PROPER expects exactly one argument");
    }
    const [textArg] = args;
    const text = helpers.coerceText(textArg, "PROPER text");
    let shouldCapitalize = true;
    const result = Array.from(text).map((character) => {
      const lower = character.toLocaleLowerCase();
      if (isLetter(lower)) {
        const next = shouldCapitalize ? lower.toLocaleUpperCase() : lower;
        shouldCapitalize = false;
        return next;
      }
      shouldCapitalize = true;
      return character;
    });
    return result.join("");
  },
};
