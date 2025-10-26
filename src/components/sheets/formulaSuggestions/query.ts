/**
 * @file Query extraction helpers for formula suggestion logic.
 */

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

/**
 * Notes:
 * - Relies on regular expression to capture leading function token immediately after '='.
 */
