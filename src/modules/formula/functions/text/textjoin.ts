/**
 * @file TEXTJOIN function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { valueToText } from "../helpers";

export const textJoinFunction: FormulaFunctionEagerDefinition = {
  name: "TEXTJOIN",
  description: {
    en: "Concatenates text items using a delimiter, optionally skipping empty strings.",
    ja: "区切り文字で項目を連結し、空文字を省略することもできます。",
  },
  examples: ['TEXTJOIN(",", true, A1:A5)', 'TEXTJOIN("-", false, "A", "B")'],
  evaluate: (args, helpers) => {
    if (args.length < 3) {
      throw new Error("TEXTJOIN expects at least three arguments");
    }
    const [delimiterArg, ignoreEmptyArg, ...valueArgs] = args;
    const delimiter = helpers.coerceText(delimiterArg, "TEXTJOIN delimiter");
    const ignoreEmpty = helpers.requireBoolean(ignoreEmptyArg, "TEXTJOIN ignore_empty");
    const segments = valueArgs.flatMap((valueArg) => {
      const flattened = helpers.flattenResult(valueArg);
      return flattened.map((value) => valueToText(value));
    });
    const filtered = ignoreEmpty ? segments.filter((segment) => segment.length > 0) : segments;
    return filtered.join(delimiter);
  },
};
