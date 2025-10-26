/**
 * @file Utilities for retrieving and filtering formula function suggestions.
 */

import { listFormulaFunctions } from "../../modules/formula/functionRegistry";

export type FormulaFunctionSuggestion = {
  name: string;
  description?: string;
};

const MAX_SUGGESTIONS = 8;

export const extractFormulaQuery = (value: string): string | null => {
  if (!value.startsWith("=")) {
    return null;
  }
  const sliced = value.slice(1);
  const match = sliced.match(/^[A-Za-z]+/);
  if (!match) {
    return "";
  }
  return match[0].toUpperCase();
};

export const loadFormulaSuggestions = (): FormulaFunctionSuggestion[] => {
  return listFormulaFunctions()
    .map((definition) => {
      const description = definition.description?.ja ?? definition.description?.en ?? undefined;
      return {
        name: definition.name,
        description,
      } satisfies FormulaFunctionSuggestion;
    })
    .sort((left, right) => {
      return left.name.localeCompare(right.name);
    });
};

export const filterFormulaSuggestions = (
  suggestions: FormulaFunctionSuggestion[],
  query: string | null,
): FormulaFunctionSuggestion[] => {
  if (query === null) {
    return [] satisfies FormulaFunctionSuggestion[];
  }
  if (query === "") {
    return suggestions.slice(0, MAX_SUGGESTIONS);
  }
  const matches = suggestions.filter((suggestion) => {
    return suggestion.name.startsWith(query);
  });
  return matches.slice(0, MAX_SUGGESTIONS);
};

/**
 * Notes:
 * - Reads formula registry via listFormulaFunctions for canonical data source.
 */
