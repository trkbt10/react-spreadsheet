/**
 * @file COUNTA function implementation (ODF 1.3 §6.18.11).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const countAFunction: FormulaFunctionEagerDefinition = {
  name: "COUNTA",
  description: {
    en: "Counts non-empty values, including text and booleans.",
    ja: "文字列や真偽値を含む空でない値の件数を数えます。",
  },
  examples: ['COUNTA(A1:A10)', 'COUNTA(1, "text", TRUE, null)'],
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args);
    return values.reduce<number>((count, value) => (value === null ? count : count + 1), 0);
  },
};

// NOTE: Followed numeric filtering conventions established in src/modules/formula/functions/statistical/count.ts.
