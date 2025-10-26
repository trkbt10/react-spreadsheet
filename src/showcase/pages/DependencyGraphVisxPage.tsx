/**
 * @file Dependency Graph visx showcase page.
 */

import { useMemo, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { createDependencyGraphSnapshot } from "../../modules/formula/graphSnapshot";
import { DependencyGraphDiagram } from "../components/dependency-visualizer/DependencyGraphDiagram";
import { useShowcaseMetadata as useShowcaseMetadataHook } from "../hooks/useShowcaseMetadata";
import { listMockDatasets, getMockDatasetById } from "../mockDataRegistry";
import styles from "./DependencyGraphPage.module.css";

const DATASETS = listMockDatasets().filter((dataset) => dataset.id === "basic" || dataset.id === "advanced");

export const DependencyGraphVisxPage = (): ReactElement => {
  useShowcaseMetadataHook({
    title: "Dependency Graph Diagram",
    description: "visx を利用したグラフ描画で依存構造を可視化するデモ",
  });

  const [datasetId, setDatasetId] = useState<string>(DATASETS[0]?.id ?? "basic");

  const dataset = useMemo(() => getMockDatasetById(datasetId), [datasetId]);

  const snapshot = useMemo(() => createDependencyGraphSnapshot(dataset.spreadsheet), [dataset]);

  const handleDatasetChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    setDatasetId(event.target.value);
  };

  return (
    <>
      <div className={styles.controls}>
        <label className={styles.selectLabel} htmlFor="visx-dataset-select">
          モックデータ
        </label>
        <select
          id="visx-dataset-select"
          className={styles.select}
          value={datasetId}
          onChange={handleDatasetChange}
        >
          {DATASETS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <p className={styles.description}>{dataset.description}</p>

      <DependencyGraphDiagram snapshot={snapshot} />
    </>
  );
};

