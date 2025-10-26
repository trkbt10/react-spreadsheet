/**
 * @file DSTDEV/DSTDEVP/DVAR/DVARP implementations (ODF 1.3 §6.7.4, §6.7.5, §6.7.10, §6.7.11).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import {
  collectNumericFieldValues,
  filterDatabaseRows,
  parseDatabaseArgument,
  resolveFieldIndex,
} from "./common";

type EvaluateArgs = Parameters<FormulaFunctionEagerDefinition["evaluate"]>[0];
type EvaluateHelpers = Parameters<FormulaFunctionEagerDefinition["evaluate"]>[1];

const prepareNumericSummary = (args: EvaluateArgs, helpers: EvaluateHelpers, functionName: string) => {
  if (args.length !== 3) {
    throw new Error(`${functionName} expects exactly three arguments`);
  }

  const [databaseArg, fieldArg, criteriaArg] = args;
  const database = parseDatabaseArgument(databaseArg, functionName);
  const fieldValue = helpers.coerceScalar(fieldArg, `${functionName} field`);
  const fieldIndex = resolveFieldIndex(fieldValue, database, functionName);
  const matchingRows = filterDatabaseRows(database, criteriaArg, helpers, functionName);
  const numericValues = collectNumericFieldValues(matchingRows, fieldIndex);
  const summary = helpers.summarizeNumbers(numericValues);
  return {
    numericValues,
    summary,
  };
};

const computeVarianceComponents = (sum: number, sumOfSquares: number, count: number) => {
  if (count === 0) {
    return {
      sampleVariance: 0,
      populationVariance: 0,
    };
  }
  const meanSquare = (sum * sum) / count;
  const squaredDifferenceSum = Math.max(sumOfSquares - meanSquare, 0);
  const populationVariance = squaredDifferenceSum / count;
  const sampleVariance = count > 1 ? squaredDifferenceSum / (count - 1) : 0;
  return {
    sampleVariance,
    populationVariance,
  };
};

export const dStdevFunction: FormulaFunctionEagerDefinition = {
  name: "DSTDEV",
  description: {
    en: "Returns the sample standard deviation of numeric entries matching the criteria.",
    ja: "条件を満たす数値の標本標準偏差を返します。",
  },
  examples: ['DSTDEV(A1:C10, "Sales", E1:F2)'],
  evaluate: (args, helpers) => {
    const { numericValues, summary } = prepareNumericSummary(args, helpers, "DSTDEV");
    if (numericValues.length < 2) {
      throw new Error("DSTDEV requires at least two numeric values matching criteria");
    }
    const { sampleVariance } = computeVarianceComponents(summary.sum, summary.sumOfSquares, summary.count);
    return Math.sqrt(sampleVariance);
  },
};

export const dStdevpFunction: FormulaFunctionEagerDefinition = {
  name: "DSTDEVP",
  description: {
    en: "Returns the population standard deviation of numeric entries matching the criteria.",
    ja: "条件を満たす数値の母集団標準偏差を返します。",
  },
  examples: ['DSTDEVP(A1:C10, "Sales", E1:F2)'],
  evaluate: (args, helpers) => {
    const { numericValues, summary } = prepareNumericSummary(args, helpers, "DSTDEVP");
    if (numericValues.length === 0) {
      throw new Error("DSTDEVP requires at least one numeric value matching criteria");
    }
    const { populationVariance } = computeVarianceComponents(summary.sum, summary.sumOfSquares, summary.count);
    return Math.sqrt(populationVariance);
  },
};

export const dVarFunction: FormulaFunctionEagerDefinition = {
  name: "DVAR",
  description: {
    en: "Returns the sample variance of numeric entries matching the criteria.",
    ja: "条件を満たす数値の標本分散を返します。",
  },
  examples: ['DVAR(A1:C10, "Sales", E1:F2)'],
  evaluate: (args, helpers) => {
    const { numericValues, summary } = prepareNumericSummary(args, helpers, "DVAR");
    if (numericValues.length < 2) {
      throw new Error("DVAR requires at least two numeric values matching criteria");
    }
    const { sampleVariance } = computeVarianceComponents(summary.sum, summary.sumOfSquares, summary.count);
    return sampleVariance;
  },
};

export const dVarpFunction: FormulaFunctionEagerDefinition = {
  name: "DVARP",
  description: {
    en: "Returns the population variance of numeric entries matching the criteria.",
    ja: "条件を満たす数値の母集団分散を返します。",
  },
  examples: ['DVARP(A1:C10, "Sales", E1:F2)'],
  evaluate: (args, helpers) => {
    const { numericValues, summary } = prepareNumericSummary(args, helpers, "DVARP");
    if (numericValues.length === 0) {
      throw new Error("DVARP requires at least one numeric value matching criteria");
    }
    const { populationVariance } = computeVarianceComponents(summary.sum, summary.sumOfSquares, summary.count);
    return populationVariance;
  },
};
