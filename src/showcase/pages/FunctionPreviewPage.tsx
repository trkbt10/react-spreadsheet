/**
 * @file Function preview page for showcasing individual formula functions.
 */

import { useParams } from "react-router-dom";
import type { ReactElement } from "react";
import { getFormulaFunction } from "../../modules/formula/functionRegistry";
import { useShowcaseMetadata as useShowcaseMetadataHook } from "../hooks/useShowcaseMetadata";
import { evaluateSample, formatSampleValue } from "./evaluateSample";
import styles from "./FunctionPreviewPage.module.css";

export const FunctionPreviewPage = (): ReactElement => {
  const { category, functionName } = useParams<{ category: string; functionName: string }>();

  if (category === undefined || functionName === undefined) {
    return (
      <div className={styles.error}>
        <p>Invalid function URL</p>
      </div>
    );
  }

  const func = getFormulaFunction(functionName);

  if (func === undefined) {
    return (
      <div className={styles.error}>
        <p>Function not found: {functionName}</p>
      </div>
    );
  }

  useShowcaseMetadataHook({
    title: func.name,
    description: func.description?.en ?? "Formula function preview",
  });

  const renderDescription = (): ReactElement | null => {
    if (func.description === undefined) {
      return null;
    }

    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Description</h2>
        <div className={styles.descriptionBox}>
          <p className={styles.descriptionText}>{func.description.en}</p>
          <p className={styles.descriptionText} lang="ja">
            {func.description.ja}
          </p>
        </div>
      </section>
    );
  };

  const renderExamples = (): ReactElement | null => {
    if (func.examples === undefined || func.examples.length === 0) {
      return null;
    }

    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Examples</h2>
        <ul className={styles.exampleList}>
          {func.examples.map((example, index) => (
            <li key={index} className={styles.exampleItem}>
              <code className={styles.exampleCode}>{example}</code>
            </li>
          ))}
        </ul>
      </section>
    );
  };

  const renderSamples = (): ReactElement | null => {
    if (func.samples === undefined || func.samples.length === 0) {
      return null;
    }

    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Live Samples</h2>
        <div className={styles.samplesGrid}>
          {func.samples.map((sample, index) => {
            const actualOutput = evaluateSample(sample.input);
            const expectedOutput = formatSampleValue(sample.output);

            const isMatch = (() => {
              if (actualOutput === expectedOutput) {
                return true;
              }

              const actualNum = parseFloat(actualOutput);
              const expectedNum = typeof sample.output === "number" ? sample.output : parseFloat(expectedOutput);

              if (!isNaN(actualNum) && !isNaN(expectedNum)) {
                const tolerance = Math.abs(expectedNum) * 0.0001;
                return Math.abs(actualNum - expectedNum) <= Math.max(tolerance, 1e-9);
              }

              return false;
            })();

            const renderSampleDescription = (): ReactElement | null => {
              if (sample.description === undefined) {
                return null;
              }

              return (
                <div className={styles.sampleDescription}>
                  <p className={styles.sampleDescriptionText}>{sample.description.en}</p>
                  <p className={styles.sampleDescriptionText} lang="ja">
                    {sample.description.ja}
                  </p>
                </div>
              );
            };

            return (
              <div key={index} className={styles.sampleCard}>
                {renderSampleDescription()}
                <div className={styles.sampleInput}>
                  <span className={styles.sampleLabel}>Input:</span>
                  <code className={styles.sampleCode}>{sample.input}</code>
                </div>
                <div className={styles.sampleOutput}>
                  <span className={styles.sampleLabel}>Expected:</span>
                  <code className={styles.sampleCode}>{expectedOutput}</code>
                </div>
                <div className={styles.sampleOutput}>
                  <span className={styles.sampleLabel}>Actual:</span>
                  <code className={styles.sampleCode} data-is-match={isMatch}>
                    {actualOutput}
                  </code>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.metadata}>
        <span className={styles.category}>{category}</span>
      </div>

      {renderDescription()}
      {renderExamples()}
      {renderSamples()}
    </div>
  );
};
