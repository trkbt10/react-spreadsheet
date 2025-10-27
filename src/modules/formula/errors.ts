/**
 * @file Error types for formula validation and evaluation.
 */

export type FormulaValidationErrorContext = {
  sheetId: string;
  sheetName: string;
  column: number;
  row: number;
};

/**
 * Signals that a formula could not be validated for the provided cell context.
 */
export class FormulaValidationError extends Error {
  readonly sheetId: string;
  readonly sheetName: string;
  readonly column: number;
  readonly row: number;
  readonly originalError: Error;

  constructor(message: string, context: FormulaValidationErrorContext, originalError: Error) {
    super(message);
    this.name = "FormulaValidationError";
    this.sheetId = context.sheetId;
    this.sheetName = context.sheetName;
    this.column = context.column;
    this.row = context.row;
    this.originalError = originalError;
  }
}
