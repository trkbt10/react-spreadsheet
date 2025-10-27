/**
 * @file Shared types for formula function suggestions.
 */

export type FormulaFunctionSuggestion = {
  name: string;
  description?: string;
  example?: string;
};

export const MAX_FORMULA_SUGGESTIONS = 8;

/**
 * Notes:
 * - Centralises suggestion-related types/constants to prevent duplication across helpers.
 */
