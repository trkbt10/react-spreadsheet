/**
 * @file COUNTBLANK function implementation (ODF 1.3 §6.18.12).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const countBlankFunction: FormulaFunctionEagerDefinition = {
  name: "COUNTBLANK",
  description: {
    en: "Counts empty cells within the provided ranges.",
    ja: "指定した範囲内の空セルを数えます。",
  },
  examples: ['COUNTBLANK(A1:A10)', 'COUNTBLANK(A1:C3)'],
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args);
    return values.reduce<number>(
      (count, value) => (value === null || value === "" ? count + 1 : count),
      0,
    );
  },
};

// NOTE: Reused flattening approach from src/modules/formula/functions/statistical/count.ts.
