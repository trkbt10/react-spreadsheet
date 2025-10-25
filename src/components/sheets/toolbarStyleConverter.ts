/**
 * @file Converter between Toolbar style and Cell style formats.
 */

import type { CellStyle } from "../../modules/spreadsheet/cellStyle";
import type { ToolbarStyle } from "./Toolbar";

/**
 * Convert ToolbarStyle to CellStyle format.
 * @param toolbarStyle - Toolbar style object
 * @returns Cell style object
 */
export const toolbarStyleToCellStyle = (toolbarStyle: ToolbarStyle): CellStyle => {
  const cellStyle: CellStyle = {};

  if (toolbarStyle.color !== undefined) {
    cellStyle.color = toolbarStyle.color;
  }

  if (toolbarStyle.backgroundColor !== undefined) {
    cellStyle.backgroundColor = toolbarStyle.backgroundColor;
  }

  if (toolbarStyle.fontSize !== undefined) {
    cellStyle.fontSize = `${toolbarStyle.fontSize}px`;
  }

  if (toolbarStyle.fontFamily !== undefined) {
    cellStyle.fontFamily = toolbarStyle.fontFamily;
  }

  if (toolbarStyle.bold === true) {
    cellStyle.fontWeight = "bold";
  }

  if (toolbarStyle.italic === true) {
    cellStyle.fontStyle = "italic";
  }

  const decorations: string[] = [];
  if (toolbarStyle.underline === true) {
    decorations.push("underline");
  }
  if (toolbarStyle.strikethrough === true) {
    decorations.push("line-through");
  }
  if (decorations.length > 0) {
    cellStyle.textDecoration = decorations.join(" ");
  }

  return cellStyle;
};

/**
 * Convert CellStyle to ToolbarStyle format.
 * @param cellStyle - Cell style object
 * @returns Toolbar style object
 */
export const cellStyleToToolbarStyle = (cellStyle: CellStyle): ToolbarStyle => {
  const result: {
    color?: string;
    backgroundColor?: string;
    fontSize?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    fontFamily?: string;
  } = {};

  if (cellStyle.color !== undefined) {
    result.color = String(cellStyle.color);
  }

  if (cellStyle.backgroundColor !== undefined) {
    result.backgroundColor = String(cellStyle.backgroundColor);
  }

  if (cellStyle.fontSize !== undefined) {
    const fontSizeStr = String(cellStyle.fontSize);
    const match = /^(\d+)/.exec(fontSizeStr);
    if (match) {
      result.fontSize = match[1];
    }
  }

  if (cellStyle.fontWeight !== undefined) {
    result.bold = cellStyle.fontWeight === "bold" || cellStyle.fontWeight === 700;
  }

  if (cellStyle.fontStyle !== undefined) {
    result.italic = cellStyle.fontStyle === "italic";
  }

  if (cellStyle.textDecoration !== undefined) {
    const decoration = String(cellStyle.textDecoration);
    result.underline = decoration.includes("underline");
    result.strikethrough = decoration.includes("line-through");
  }

  if (cellStyle.fontFamily !== undefined) {
    result.fontFamily = String(cellStyle.fontFamily);
  }

  return result;
};
