/**
 * @file Dependency Graph showcase page.
 */

import { useMemo, useState } from "react";
import type { ReactElement, ChangeEvent } from "react";
import { parseSpreadsheet } from "../../modules/spreadsheet/parseSpreadsheet";
import { createDependencyGraphSnapshot } from "../../modules/formula/graphSnapshot";
import { DependencyVisualizer } from "../../components/dependency-visualizer/DependencyVisualizer";
import type { SpreadSheet } from "../../types";
import { useShowcaseMetadata as useShowcaseMetadataHook } from "../hooks/useShowcaseMetadata";
import basicFixture from "../../../__mocks__/spreadsheet.basic.json";
import advancedFixture from "../../../__mocks__/spreadsheet.advanced.json";
import styles from "./DependencyGraphPage.module.css";

type DatasetOption = {
  id: string;
  label: string;
  description: string;
  spreadsheet: SpreadSheet;
};

const DATASETS: DatasetOption[] = [
  {
    id: "basic",
    label: "Basic Budget",
    description: "単純な参照構造を持つ標準的なモックデータ。視覚化の初期確認に利用できます。",
    spreadsheet: parseSpreadsheet(basicFixture),
  },
  {
    id: "advanced",
    label: "Advanced Scenario",
    description: "複数シートを跨ぐ分岐と条件計算を含むサンプル。依存コンポーネントの分割効果を確認できます。",
    spreadsheet: parseSpreadsheet(advancedFixture),
  },
];

const getDatasetById = (id: string): DatasetOption => {
  const dataset = DATASETS.find((entry) => entry.id === id);
  if (!dataset) {
    throw new Error(`Dataset with id "${id}" not found`);
  }
  return dataset;
};

export const DependencyGraphPage = (): ReactElement => {
  useShowcaseMetadataHook({
    title: "Dependency Graph",
    description: "Formula dependency visualization with interactive dataset selection",
  });

  const [datasetId, setDatasetId] = useState<string>(DATASETS[0]?.id ?? "basic");

  const dataset = useMemo(() => getDatasetById(datasetId), [datasetId]);

  const snapshot = useMemo(() => createDependencyGraphSnapshot(dataset.spreadsheet), [dataset]);

  const handleDatasetChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    setDatasetId(event.target.value);
  };

  return (
    <>
      <div className={styles.controls}>
        <label className={styles.selectLabel} htmlFor="dataset-select">
          モックデータ
        </label>
        <select id="dataset-select" className={styles.select} value={datasetId} onChange={handleDatasetChange}>
          {DATASETS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <p className={styles.description}>{dataset.description}</p>

      <DependencyVisualizer snapshot={snapshot} />
    </>
  );
};
