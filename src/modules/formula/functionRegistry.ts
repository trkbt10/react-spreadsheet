/**
 * @file Registry for formula function evaluators.
 */

import type { FormulaAstNode } from "./ast";
import type { CellAddress } from "./types";
import { formulaFunctionHelpers, type EvalResult, type FormulaFunctionHelpers } from "./functions/helpers";
import { sumFunction } from "./functions/aggregate/sum";
import { productFunction } from "./functions/aggregate/product";
import { powerFunction } from "./functions/aggregate/power";
import { roundFunction } from "./functions/aggregate/round";
import { roundUpFunction } from "./functions/aggregate/roundup";
import { roundDownFunction } from "./functions/aggregate/rounddown";
import { absFunction } from "./functions/aggregate/abs";
import { intFunction } from "./functions/aggregate/int";
import { modFunction } from "./functions/aggregate/mod";
import { quotientFunction } from "./functions/aggregate/quotient";
import { signFunction } from "./functions/aggregate/sign";
import { sumIfFunction } from "./functions/aggregate/sumif";
import { sumIfsFunction } from "./functions/aggregate/sumifs";
import { subtotalFunction } from "./functions/aggregate/subtotal";
import { aggregateFunction } from "./functions/aggregate/aggregate";
import { dateFunction } from "./functions/datetime/date";
import { timeFunction } from "./functions/datetime/time";
import { dateValueFunction } from "./functions/datetime/datevalue";
import { timeValueFunction } from "./functions/datetime/timevalue";
import { todayFunction } from "./functions/datetime/today";
import { nowFunction } from "./functions/datetime/now";
import { eDateFunction } from "./functions/datetime/edate";
import { eoMonthFunction } from "./functions/datetime/eomonth";
import { dayFunction } from "./functions/datetime/day";
import { monthFunction } from "./functions/datetime/month";
import { yearFunction } from "./functions/datetime/year";
import { weekDayFunction } from "./functions/datetime/weekday";
import { weekNumFunction } from "./functions/datetime/weeknum";
import { pmtFunction } from "./functions/financial/pmt";
import { ipmtFunction } from "./functions/financial/ipmt";
import { ppmtFunction } from "./functions/financial/ppmt";
import { pvFunction } from "./functions/financial/pv";
import { fvFunction } from "./functions/financial/fv";
import { npvFunction } from "./functions/financial/npv";
import { irrFunction } from "./functions/financial/irr";
import { xnpvFunction } from "./functions/financial/xnpv";
import { xirrFunction } from "./functions/financial/xirr";
import { rateFunction } from "./functions/financial/rate";
import { averageFunction } from "./functions/statistical/average";
import { averageIfFunction } from "./functions/statistical/averageif";
import { averageIfsFunction } from "./functions/statistical/averageifs";
import { maxFunction } from "./functions/statistical/max";
import { minFunction } from "./functions/statistical/min";
import { countFunction } from "./functions/statistical/count";
import { countIfFunction } from "./functions/statistical/countif";
import { countIfsFunction } from "./functions/statistical/countifs";
import { countAFunction } from "./functions/statistical/counta";
import { countBlankFunction } from "./functions/statistical/countblank";
import { medianFunction } from "./functions/statistical/median";
import { modeFunction } from "./functions/statistical/mode";
import { varianceFunction } from "./functions/statistical/var";
import { variancePopulationFunction } from "./functions/statistical/varp";
import { standardDeviationFunction } from "./functions/statistical/stdev";
import { standardDeviationPopulationFunction } from "./functions/statistical/stdevp";
import { vlookupFunction } from "./functions/lookup/vlookup";
import { hlookupFunction } from "./functions/lookup/hlookup";
import { lookupFunction } from "./functions/lookup/lookup";
import { matchFunction } from "./functions/lookup/match";
import { indexFunction } from "./functions/lookup/index";
import { offsetFunction } from "./functions/lookup/offset";
import { indirectFunction } from "./functions/lookup/indirect";
import { chooseFunction } from "./functions/lookup/choose";
import { andFunction } from "./functions/logical/and";
import { orFunction } from "./functions/logical/or";
import { notFunction } from "./functions/logical/not";
import { xorFunction } from "./functions/logical/xor";
import { trueFunction } from "./functions/logical/true";
import { falseFunction } from "./functions/logical/false";
import { ifFunction } from "./functions/logical/if";
import { ifsFunction } from "./functions/logical/ifs";
import { switchFunction } from "./functions/logical/switch";
import { concatFunction } from "./functions/text/concat";
import { textJoinFunction } from "./functions/text/textjoin";
import { leftFunction } from "./functions/text/left";
import { rightFunction } from "./functions/text/right";
import { midFunction } from "./functions/text/mid";
import { lenFunction } from "./functions/text/len";
import { trimFunction } from "./functions/text/trim";
import { upperFunction } from "./functions/text/upper";
import { lowerFunction } from "./functions/text/lower";
import { properFunction } from "./functions/text/proper";
import { replaceFunction } from "./functions/text/replace";
import { substituteFunction } from "./functions/text/substitute";
import { findFunction } from "./functions/text/find";
import { searchFunction } from "./functions/text/search";

export type FormulaFunctionEvaluator = (args: EvalResult[], helpers: FormulaFunctionHelpers) => EvalResult;

export type FormulaFunctionLazyContext = {
  evaluate: (node: FormulaAstNode) => EvalResult;
  helpers: FormulaFunctionHelpers;
  parseReference: (reference: string) => CellAddress;
  origin: CellAddress;
};

export type FormulaFunctionLazyEvaluator = (args: FormulaAstNode[], context: FormulaFunctionLazyContext) => EvalResult;

export type FormulaFunctionDescription = {
  en: string;
  ja: string;
};

export type FormulaFunctionEagerDefinition = {
  name: string;
  description?: FormulaFunctionDescription;
  examples?: string[];
  evaluate: FormulaFunctionEvaluator;
  evaluateLazy?: undefined;
};

export type FormulaFunctionLazyDefinition = {
  name: string;
  description?: FormulaFunctionDescription;
  examples?: string[];
  evaluateLazy: FormulaFunctionLazyEvaluator;
  evaluate?: undefined;
};

export type FormulaFunctionDefinition = FormulaFunctionEagerDefinition | FormulaFunctionLazyDefinition;

const registry = new Map<string, FormulaFunctionDefinition>();

const registeredHelpers = formulaFunctionHelpers;

export const registerFormulaFunction = (definition: FormulaFunctionDefinition): void => {
  const normalizedName = definition.name.toUpperCase();
  if (registry.has(normalizedName)) {
    throw new Error(`Formula function "${definition.name}" is already registered`);
  }
  registry.set(normalizedName, {
    ...definition,
    name: normalizedName,
  });
};

export const getFormulaFunction = (name: string): FormulaFunctionDefinition | undefined => {
  return registry.get(name.toUpperCase());
};

export const listFormulaFunctions = (): FormulaFunctionDefinition[] => {
  return Array.from(registry.values());
};

export { registeredHelpers as formulaFunctionHelpers };

const builtInFunctions: FormulaFunctionDefinition[] = [
  sumFunction,
  productFunction,
  powerFunction,
  roundFunction,
  roundUpFunction,
  roundDownFunction,
  absFunction,
  intFunction,
  modFunction,
  quotientFunction,
  signFunction,
  sumIfFunction,
  sumIfsFunction,
  subtotalFunction,
  aggregateFunction,
  dateFunction,
  timeFunction,
  dateValueFunction,
  timeValueFunction,
  todayFunction,
  nowFunction,
  eDateFunction,
  eoMonthFunction,
  dayFunction,
  monthFunction,
  yearFunction,
  weekDayFunction,
  weekNumFunction,
  pmtFunction,
  ipmtFunction,
  ppmtFunction,
  pvFunction,
  fvFunction,
  npvFunction,
  irrFunction,
  xnpvFunction,
  xirrFunction,
  rateFunction,
  averageFunction,
  averageIfFunction,
  averageIfsFunction,
  maxFunction,
  minFunction,
  countFunction,
  countIfFunction,
  countIfsFunction,
  countAFunction,
  countBlankFunction,
  medianFunction,
  modeFunction,
  varianceFunction,
  variancePopulationFunction,
  standardDeviationFunction,
  standardDeviationPopulationFunction,
  vlookupFunction,
  hlookupFunction,
  lookupFunction,
  matchFunction,
  indexFunction,
  offsetFunction,
  indirectFunction,
  chooseFunction,
  andFunction,
  orFunction,
  notFunction,
  xorFunction,
  trueFunction,
  falseFunction,
  ifFunction,
  ifsFunction,
  switchFunction,
  concatFunction,
  textJoinFunction,
  leftFunction,
  rightFunction,
  midFunction,
  lenFunction,
  trimFunction,
  upperFunction,
  lowerFunction,
  properFunction,
  replaceFunction,
  substituteFunction,
  findFunction,
  searchFunction,
];

builtInFunctions.forEach(registerFormulaFunction);

/**
 * Notes:
 * - Added listFormulaFunctions to expose registered definitions for the formula suggestion UI.
 */
