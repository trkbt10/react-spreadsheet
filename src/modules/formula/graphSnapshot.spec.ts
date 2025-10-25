import { describe, it, expect } from "vitest";
import { parseSpreadsheet } from "../spreadsheet/parseSpreadsheet";
import { createDependencyGraphSnapshot } from "./graphSnapshot";
import basicFixture from "../../../__mocks__/spreadsheet.basic.json";
import advancedFixture from "../../../__mocks__/spreadsheet.advanced.json";

describe("createDependencyGraphSnapshot", () => {
  it("maps basic dataset dependencies", () => {
    const spreadsheet = parseSpreadsheet(basicFixture);
    const snapshot = createDependencyGraphSnapshot(spreadsheet);

    expect(snapshot.components).toHaveLength(1);
    expect(snapshot.nodes.length).toBeGreaterThanOrEqual(3);

    const summaryNode = snapshot.nodes.find((node) => node.label === "Summary!B4");
    expect(summaryNode).toBeDefined();
    expect(summaryNode?.dependencies).toEqual([
      "summary-sheet|1:1",
      "summary-sheet|1:2",
    ]);
  });

  it("captures cross-sheet dependencies for advanced dataset", () => {
    const spreadsheet = parseSpreadsheet(advancedFixture);
    const snapshot = createDependencyGraphSnapshot(spreadsheet);

    expect(snapshot.components.length).toBeGreaterThanOrEqual(1);
    expect(snapshot.nodes.length).toBeGreaterThan(10);

    const marginNode = snapshot.nodes.find((node) => node.label === "Financials!B5");
    expect(marginNode?.dependents).toContain("summary-sheet|1:2");
    expect(marginNode?.dependents).toContain("scenarios-sheet|2:1");

    const scenarioSumNode = snapshot.nodes.find((node) => node.label === "Scenarios!B5");
    expect(scenarioSumNode?.dependencies).toEqual([
      "scenarios-sheet|1:1",
      "scenarios-sheet|1:2",
      "scenarios-sheet|1:3",
    ]);
  });
});

