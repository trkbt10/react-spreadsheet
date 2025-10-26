/**
 * @file MODE function implementation (ODF 1.3 §6.18.14).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const modeFunction: FormulaFunctionEagerDefinition = {
  name: "MODE",
  description: {
    en: "Returns the most frequently occurring numeric value, preferring the smallest on ties.",
    ja: "最も頻出する数値を返し、同数の場合は最小値を選択します。",
  },
  examples: ["MODE(1, 2, 2, 3)", "MODE(A1:A10)"],
  evaluate: (args, helpers) => {
    const numericValues = helpers.flattenArguments(args).filter((value): value is number => typeof value === "number");

    if (numericValues.length === 0) {
      throw new Error("MODE expects at least one numeric argument");
    }

    const frequency = numericValues.reduce<Map<number, number>>((map, value) => {
      const current = map.get(value) ?? 0;
      map.set(value, current + 1);
      return map;
    }, new Map());

    const entries = Array.from(frequency.entries());
    const primaryEntry = entries[0] ?? null;
    if (!primaryEntry) {
      throw new Error("MODE could not determine a frequency distribution");
    }

    const [modeCandidate, occurrence] = entries.reduce<[number, number]>((best, [value, count]) => {
      if (count > best[1]) {
        return [value, count];
      }
      if (count === best[1] && value < best[0]) {
        return [value, count];
      }
      return best;
    }, primaryEntry);

    if (occurrence < 2) {
      throw new Error("MODE requires at least one repeating numeric value");
    }

    return modeCandidate;
  },
};

// NOTE: Frequency map pattern inspired by COUNT at src/modules/formula/functions/statistical/count.ts.
