/**
 * @file FIND function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

const toCharacters = (text: string): string[] => Array.from(text);

const isMatchAt = (haystack: string[], needle: string[], startIndex: number): boolean => {
  for (let index = 0; index < needle.length; index += 1) {
    if (haystack[startIndex + index] !== needle[index]) {
      return false;
    }
  }
  return true;
};

export const findFunction: FormulaFunctionEagerDefinition = {
  name: "FIND",
  description: {
    en: "Locates one text value within another, matching case and returning the position.",
    ja: "大文字小文字を区別して文字列内の位置を検索します。",
  },
  examples: ['FIND("sheet", "Spreadsheet")', 'FIND("-", A1, 3)'],
  evaluate: (args, helpers) => {
    if (args.length < 2 || args.length > 3) {
      throw new Error("FIND expects two or three arguments");
    }
    const [needleArg, haystackArg, startArg] = args;
    const haystack = helpers.coerceText(haystackArg, "FIND within_text");
    const needle = helpers.coerceText(needleArg, "FIND find_text");
    const startValue = startArg === undefined ? 1 : helpers.requireNumber(startArg, "FIND start");
    const startPosition = helpers.requireInteger(startValue, "FIND start must be an integer");
    if (startPosition < 1) {
      throw new Error("FIND start must be greater than or equal to 1");
    }
    const haystackChars = toCharacters(haystack);
    const needleChars = toCharacters(needle);
    if (needleChars.length === 0) {
      if (startPosition > haystackChars.length + 1) {
        throw new Error("FIND start is beyond the length of within_text");
      }
      return startPosition;
    }
    if (startPosition > haystackChars.length) {
      throw new Error("FIND start is beyond the length of within_text");
    }
    const zeroBasedStart = startPosition - 1;
    const maxStart = haystackChars.length - needleChars.length;
    for (let index = zeroBasedStart; index <= maxStart; index += 1) {
      if (isMatchAt(haystackChars, needleChars, index)) {
        return index + 1;
      }
    }
    throw new Error("FIND could not locate the specified text");
  },
};
