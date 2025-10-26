/**
 * @file Dependency graph visualiser for spreadsheet formulas.
 */

import { useMemo } from "react";
import type { ReactElement } from "react";
import type { DependencyGraphSnapshot } from "../../../modules/formula/graphSnapshot";
import styles from "./DependencyVisualizer.module.css";

export type DependencyVisualizerProps = {
  snapshot: DependencyGraphSnapshot;
};

const formatCount = (count: number): string => `${count} node${count === 1 ? "" : "s"}`;

const formatExternalDependencyLabel = (count: number): string => {
  if (count === 0) {
    return "外部依存なし";
  }
  return `${count} external`;
};

const renderList = (values: string[]): ReactElement => {
  if (values.length === 0) {
    return <span className={styles.emptyState}>なし</span>;
  }

  return (
    <div className={styles.dependencyList}>
      {values.map((value) => (
        <span key={value} className={styles.dependencyPill}>
          {value}
        </span>
      ))}
    </div>
  );
};

export const DependencyVisualizer = ({ snapshot }: DependencyVisualizerProps): ReactElement => {
  const componentMeta = useMemo(() => {
    return snapshot.components.map((component) => {
      return {
        id: component.id,
        sizeLabel: formatCount(component.size),
        externalCount: component.externalDependencies.length,
        externalLabel: formatExternalDependencyLabel(component.externalDependencies.length),
      };
    });
  }, [snapshot.components]);

  return (
    <div className={styles.visualizer}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>依存コンポーネント</h2>
          <span className={styles.meta}>{snapshot.components.length} group(s)</span>
        </div>

        <div className={styles.componentList}>
          {componentMeta.map((component) => (
            <div key={component.id} className={styles.componentCard} data-component-id={component.id}>
              <div>
                <strong>{component.id}</strong>
              </div>
              <div className={styles.componentMeta}>
                {component.sizeLabel} ・ {component.externalLabel}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>ノード詳細</h2>
          <span className={styles.meta}>{snapshot.nodes.length} node(s)</span>
        </div>

        <table className={styles.nodeTable}>
          <thead>
            <tr>
              <th scope="col">セル</th>
              <th scope="col">タイプ</th>
              <th scope="col">所属コンポーネント</th>
              <th scope="col">依存元</th>
              <th scope="col">依存先</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.nodes.map((node) => (
              <tr key={node.key} data-component-id={node.componentId} data-is-formula={node.isFormula}>
                <td>
                  <div>{node.label}</div>
                  <div className={styles.meta}>({node.key})</div>
                </td>
                <td>{node.cellType}</td>
                <td>{node.componentId}</td>
                <td>{renderList(node.dependencies)}</td>
                <td>{renderList(node.dependents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};
