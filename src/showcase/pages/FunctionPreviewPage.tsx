/**
 * @file Function preview page for showcasing individual formula functions.
 */

import { useParams } from "react-router-dom";
import type { ReactElement } from "react";
import { getFormulaFunction } from "../../modules/formula/functionRegistry";
import { useShowcaseMetadata as useShowcaseMetadataHook } from "../hooks/useShowcaseMetadata";
import { parseFormula } from "../../modules/formula/parser";
import { formulaFunctionHelpers } from "../../modules/formula/functionRegistry";
import type { EvalResult } from "../../modules/formula/functions/helpers";
import styles from "./FunctionPreviewPage.module.css";

const evaluateSample = (input: string): string => {
  try {
    const mockSheetIndex = { id: "Sheet1", name: "Sheet1", index: 0 };
    const mockContext = {
      defaultSheetId: "Sheet1",
      defaultSheetName: "Sheet1",
      workbookIndex: {
        byId: new Map([["Sheet1", mockSheetIndex]]),
        byName: new Map([["Sheet1", mockSheetIndex]]),
      },
    };

    const result = parseFormula(input, mockContext);
    const ast = result.ast;

    if (ast.type !== "Function") {
      throw new Error("Input must be a function call");
    }

    const func = getFormulaFunction(ast.name);
    if (func === undefined) {
      throw new Error(`Function ${ast.name} not found`);
    }

    if (func.evaluate === undefined) {
      throw new Error(`Function ${ast.name} does not support eager evaluation`);
    }

    const evaluatedArgs: EvalResult[] = ast.arguments.map((arg): EvalResult => {
      if (arg.type === "Literal" && typeof arg.value === "number") {
        return arg.value;
      }
      if (arg.type === "Literal" && typeof arg.value === "string") {
        return arg.value;
      }
      if (arg.type === "Literal" && typeof arg.value === "boolean") {
        return arg.value;
      }
      throw new Error(`Unsupported argument type: ${arg.type}`);
    });

    const output = func.evaluate(evaluatedArgs, formulaFunctionHelpers);
    return formatOutput(output);
  } catch (error) {
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return `Error: ${String(error)}`;
  }
};

const formatOutput = (value: EvalResult): string => {
  if (value === null) {
    return "null";
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => formatOutput(v)).join(", ")}]`;
  }
  return String(value);
};

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
            const expectedOutput = formatOutput(sample.output);
            const isMatch = actualOutput === expectedOutput;

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
