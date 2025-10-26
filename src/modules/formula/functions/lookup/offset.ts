/**
 * @file OFFSET function implementation (ODF 1.3 §6.14.16).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";
import type { FormulaAstNode } from "../../ast";
import type { FormulaEvaluationResult } from "../../types";
import { resolveReferenceBounds } from "./referenceBounds";

const createReferenceNode = (node: FormulaAstNode, row: number, column: number): FormulaAstNode => {
  if (node.type === "Reference") {
    return {
      type: "Reference",
      address: {
        ...node.address,
        row,
        column,
      },
    };
  }

  if (node.type === "Range") {
    return {
      type: "Reference",
      address: {
        sheetId: node.start.sheetId,
        sheetName: node.start.sheetName,
        row,
        column,
      },
    };
  }

  throw new Error("OFFSET internal error: Unsupported reference node");
};

export const offsetFunction: FormulaFunctionLazyDefinition = {
  name: "OFFSET",
  category: "lookup",
  description: {
    en: "Returns a range displaced from a starting reference by row and column offsets.",
    ja: "基準セルから行と列のオフセットでずらした範囲を返します。",
  },
  examples: ["OFFSET(A1, 1, 2, 2, 1)", "OFFSET(Table1, 0, 1)"],
  samples: [
    {
      input: "OFFSET([[10, 20, 30], [40, 50, 60]], 0, 1)",
      output: [[20, 30], [50, 60]],
      description: {
        en: "Offset by 1 column, same size",
        ja: "1列オフセット、同じサイズ",
      },
    },
    {
      input: "OFFSET([[10, 20], [30, 40], [50, 60]], 1, 0, 2, 2)",
      output: [[30, 40], [50, 60]],
      description: {
        en: "Offset by 1 row, specify 2x2 size",
        ja: "1行オフセット、2x2サイズを指定",
      },
    },
    {
      input: "OFFSET([[1, 2, 3], [4, 5, 6]], 0, 1, 1, 2)",
      output: [[2, 3]],
      description: {
        en: "Offset to get subset of array",
        ja: "配列の部分集合を取得するオフセット",
      },
    },
  ],
  evaluateLazy: (args, context) => {
    if (args.length < 3 || args.length > 5) {
      throw new Error("OFFSET expects between three and five arguments");
    }

    const [referenceNode, rowsNode, columnsNode, heightNode, widthNode] = args;
    const bounds = resolveReferenceBounds(referenceNode, "OFFSET");

    const rowOffsetValue = context.helpers.requireNumber(context.evaluate(rowsNode), "OFFSET rows");
    const columnOffsetValue = context.helpers.requireNumber(context.evaluate(columnsNode), "OFFSET columns");

    const rowOffset = context.helpers.requireInteger(rowOffsetValue, "OFFSET rows must be an integer");
    const columnOffset = context.helpers.requireInteger(columnOffsetValue, "OFFSET columns must be an integer");

    const heightValue = heightNode
      ? context.helpers.requireNumber(context.evaluate(heightNode), "OFFSET height")
      : bounds.height;
    const widthValue = widthNode
      ? context.helpers.requireNumber(context.evaluate(widthNode), "OFFSET width")
      : bounds.width;

    const height = context.helpers.requireInteger(heightValue, "OFFSET height must be an integer");
    const width = context.helpers.requireInteger(widthValue, "OFFSET width must be an integer");

    if (height <= 0 || width <= 0) {
      throw new Error("OFFSET height and width must be greater than zero");
    }

    const startRow = bounds.topRow + rowOffset;
    const startColumn = bounds.leftColumn + columnOffset;

    if (startRow < 0 || startColumn < 0) {
      throw new Error("OFFSET cannot reference cells with negative coordinates");
    }

    const result: FormulaEvaluationResult[][] = [];

    for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
      const rowValues: FormulaEvaluationResult[] = [];
      for (let columnIndex = 0; columnIndex < width; columnIndex += 1) {
        const reference = createReferenceNode(referenceNode, startRow + rowIndex, startColumn + columnIndex);
        const cellValue = context.helpers.coerceScalar(context.evaluate(reference), "OFFSET result");
        rowValues.push(cellValue);
      }
      result.push(rowValues);
    }

    return result;
  },
};

// NOTE: Constructs reference nodes manually to reuse the engine's evaluation flow for each cell.
