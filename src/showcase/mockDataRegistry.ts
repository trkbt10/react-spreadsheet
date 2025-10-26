/**
 * @file Centralized mock data registry for showcase pages.
 * This module serves as the single source of truth for all mock spreadsheet data.
 */

import { parseSpreadsheet } from "../modules/spreadsheet/parseSpreadsheet";
import type { SpreadSheet } from "../types";
import rawBasic from "../../__mocks__/spreadsheet.basic.json";
import rawAdvanced from "../../__mocks__/spreadsheet.advanced.json";
import rawVisual from "../../__mocks__/spreadsheet.visual.json";

export type MockDatasetId = "basic" | "advanced" | "visual";

export type MockDataset = {
  id: MockDatasetId;
  name: string;
  description: string;
  spreadsheet: SpreadSheet;
};

const MOCK_DATASETS: Record<MockDatasetId, MockDataset> = {
  basic: {
    id: "basic",
    name: "Basic Spreadsheet",
    description: "単純な参照構造を持つ標準的なモックデータ。視覚化の初期確認に利用できます。",
    spreadsheet: parseSpreadsheet(rawBasic),
  },
  advanced: {
    id: "advanced",
    name: "Advanced Dependency Workbook",
    description: "複数シートを跨ぐ分岐と条件計算を含むサンプル。依存コンポーネントの分割効果を確認できます。",
    spreadsheet: parseSpreadsheet(rawAdvanced),
  },
  visual: {
    id: "visual",
    name: "Visual Spreadsheet",
    description: "視覚化機能を確認するためのサンプルデータ。",
    spreadsheet: parseSpreadsheet(rawVisual),
  },
} as const;

/**
 * Get all available mock datasets as an array.
 * @returns Array of all mock datasets
 */
export const listMockDatasets = (): MockDataset[] => {
  return Object.values(MOCK_DATASETS);
};

/**
 * Get a specific mock dataset by ID.
 * @param id - The dataset ID
 * @returns The mock dataset
 * @throws Error if dataset not found
 */
export const getMockDatasetById = (id: string): MockDataset => {
  if (!(id in MOCK_DATASETS)) {
    throw new Error(`Mock dataset with id "${id}" not found`);
  }
  return MOCK_DATASETS[id as MockDatasetId];
};

/**
 * Check if a dataset ID is valid.
 * @param id - The dataset ID to check
 * @returns True if the ID is valid
 */
export const isValidDatasetId = (id: string): id is MockDatasetId => {
  return id in MOCK_DATASETS;
};
