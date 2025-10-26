/**
 * @file visx-powered dependency graph diagram for spreadsheet formulas.
 */

import { useMemo } from "react";
import type { ReactElement } from "react";
import { Group } from "@visx/group";
import { GlyphCircle } from "@visx/glyph";
import { LinePath } from "@visx/shape";
import { LegendOrdinal } from "@visx/legend";
import { scaleOrdinal } from "@visx/scale";
import type { DependencyGraphSnapshot } from "../../../modules/formula/graphSnapshot";
import type { CellAddressKey } from "../../../modules/formula/types";
import styles from "./DependencyGraphDiagram.module.css";

const SVG_WIDTH = 960;
const SVG_HEIGHT = 640;
const MARGIN = {
  top: 56,
  right: 120,
  bottom: 56,
  left: 160,
};
const NODE_RADIUS = 14;
const COMPONENT_COLORS = [
  "#4C6EF5",
  "#9775FA",
  "#FF6B6B",
  "#40C057",
  "#099268",
  "#15AABF",
  "#F08C00",
  "#FAB005",
] as const;

type LayoutNode = {
  key: CellAddressKey;
  label: string;
  x: number;
  y: number;
  level: number;
  componentId: string;
  isFormula: boolean;
};

type LayoutEdge = {
  sourceKey: CellAddressKey;
  targetKey: CellAddressKey;
  points: Array<{ x: number; y: number }>;
};

type LevelComputationResult = {
  levels: Map<number, CellAddressKey[]>;
  levelCount: number;
};

const computeLevels = (snapshot: DependencyGraphSnapshot): LevelComputationResult => {
  const dependencies = new Map<CellAddressKey, CellAddressKey[]>(snapshot.nodes.map((node) => [node.key, node.dependencies]));
  const unresolved = new Set<CellAddressKey>(snapshot.nodes.map((node) => node.key));

  const traverse = (
    remaining: Set<CellAddressKey>,
    depth: number,
    accumulated: Map<number, CellAddressKey[]>,
  ): LevelComputationResult => {
    if (remaining.size === 0) {
      return {
        levels: accumulated,
        levelCount: depth,
      };
    }

    const ready = Array.from(remaining).filter((key) => {
      const incoming = dependencies.get(key) ?? [];
      return incoming.every((dependencyKey) => !remaining.has(dependencyKey));
    });

    if (ready.length === 0) {
      const leftoverLevel = new Map(accumulated);
      leftoverLevel.set(depth, Array.from(remaining).sort());
      return {
        levels: leftoverLevel,
        levelCount: depth + 1,
      };
    }

    const nextLevels = new Map(accumulated);
    const sortedReady = [...ready].sort();
    nextLevels.set(depth, sortedReady);

    const nextRemaining = new Set<CellAddressKey>(remaining);
    sortedReady.forEach((key) => {
      nextRemaining.delete(key);
    });

    return traverse(nextRemaining, depth + 1, nextLevels);
  };

  return traverse(unresolved, 0, new Map<number, CellAddressKey[]>());
};

const computeLayout = (snapshot: DependencyGraphSnapshot): { nodes: LayoutNode[]; edges: LayoutEdge[] } => {
  const { levels, levelCount } = computeLevels(snapshot);
  const chartWidth = SVG_WIDTH - MARGIN.left - MARGIN.right;
  const chartHeight = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;
  const horizontalSpacing = levelCount > 1 ? chartWidth / (levelCount - 1) : 0;

  const nodeLookup = new Map<CellAddressKey, LayoutNode>();
  const snapshotNodeMap = new Map<CellAddressKey, (typeof snapshot.nodes)[number]>(snapshot.nodes.map((node) => [node.key, node]));

  levels.forEach((keys, level) => {
    const verticalSpacing = keys.length > 0 ? chartHeight / (keys.length + 1) : chartHeight;

    keys.forEach((key, index) => {
      const snapshotNode = snapshotNodeMap.get(key);
      if (!snapshotNode) {
        throw new Error(`Snapshot node "${key}" missing during layout computation`);
      }

      const x = MARGIN.left + level * horizontalSpacing;
      const y = MARGIN.top + (index + 1) * verticalSpacing;

      nodeLookup.set(key, {
        key,
        label: snapshotNode.label,
        level,
        x,
        y,
        componentId: snapshotNode.componentId,
        isFormula: snapshotNode.isFormula,
      });
    });
  });

  const edges: LayoutEdge[] = [];

  snapshot.nodes.forEach((node) => {
    const target = nodeLookup.get(node.key);
    if (!target) {
      return;
    }

    node.dependencies.forEach((dependencyKey) => {
      const source = nodeLookup.get(dependencyKey);
      if (!source) {
        return;
      }

      edges.push({
        sourceKey: dependencyKey,
        targetKey: node.key,
        points: [
          { x: source.x + NODE_RADIUS, y: source.y },
          { x: target.x - NODE_RADIUS, y: target.y },
        ],
      });
    });
  });

  return {
    nodes: Array.from(nodeLookup.values()),
    edges,
  };
};

const buildComponentColorScale = (componentIds: string[]) => {
  const palette: string[] = [];
  componentIds.forEach((componentId, index) => {
    const color = COMPONENT_COLORS[index % COMPONENT_COLORS.length];
    palette.push(color);
  });

  return scaleOrdinal<string, string>({
    domain: componentIds,
    range: palette.length > 0 ? palette : [COMPONENT_COLORS[0]],
  });
};

export type DependencyGraphDiagramProps = {
  snapshot: DependencyGraphSnapshot;
};

export const DependencyGraphDiagram = ({ snapshot }: DependencyGraphDiagramProps): ReactElement => {
  const { nodes, edges } = useMemo(() => computeLayout(snapshot), [snapshot]);

  const componentColorScale = useMemo(() => {
    const uniqueComponentIds = Array.from(new Set(nodes.map((node) => node.componentId))).sort();
    return buildComponentColorScale(uniqueComponentIds);
  }, [nodes]);

  const nodeMap = useMemo(() => {
    return new Map(nodes.map((node) => [node.key, node]));
  }, [nodes]);

  return (
    <div className={styles.diagram} data-node-count={nodes.length}>
      <div className={styles.legend}>
        <LegendOrdinal scale={componentColorScale} labelFormat={(label) => `Component ${label}`}>
          {(labels) => (
            <ul className={styles.legendList}>
              {labels.map((label) => (
                <li key={label.text} className={styles.legendItem}>
                  <span className={styles.swatch} style={{ backgroundColor: label.value }} />
                  <span>{label.text}</span>
                </li>
              ))}
            </ul>
          )}
        </LegendOrdinal>
      </div>

      <svg className={styles.canvas} viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} role="img">
        <title>Dependency graph visualisation</title>
        <Group>
          {edges.map((edge) => (
            <LinePath
              key={`${edge.sourceKey}->${edge.targetKey}`}
              className={styles.edge}
              data-source={edge.sourceKey}
              data-target={edge.targetKey}
              data-direction="forward"
              data-testid="dependency-edge"
              data-component-source={nodeMap.get(edge.sourceKey)?.componentId}
              data-component-target={nodeMap.get(edge.targetKey)?.componentId}
              data-has-same-component={
                nodeMap.get(edge.sourceKey)?.componentId === nodeMap.get(edge.targetKey)?.componentId ? "true" : "false"
              }
              data-level-delta={(nodeMap.get(edge.targetKey)?.level ?? 0) - (nodeMap.get(edge.sourceKey)?.level ?? 0)}
              stroke="#ADB5BD"
              strokeWidth={1.6}
              strokeOpacity={0.65}
              data={edge.points}
              x={(point) => point.x}
              y={(point) => point.y}
            />
          ))}

          {nodes.map((node) => {
            const componentColor = componentColorScale(node.componentId);
            return (
              <Group
                key={node.key}
                top={node.y}
                left={node.x}
                className={styles.node}
                data-component-id={node.componentId}
                data-is-formula={node.isFormula}
              >
                <GlyphCircle
                  className={styles.nodeGlyph}
                  left={0}
                  top={0}
                  r={NODE_RADIUS}
                  fill={componentColor}
                  stroke={node.isFormula ? "#11284B" : "#495057"}
                  strokeWidth={node.isFormula ? 2.4 : 1.6}
                />
                <text className={styles.nodeLabel} x={NODE_RADIUS + 12} y={4}>
                  {node.label}
                </text>
                <text className={styles.nodeMeta} x={NODE_RADIUS + 12} y={22}>
                  {node.componentId}
                </text>
              </Group>
            );
          })}
        </Group>
      </svg>
    </div>
  );
};

/**
 * Notes:
 * - Reviewed src/showcase/pages/DependencyGraphPage.tsx to align dataset handling behaviour.
 * - Reviewed src/modules/formula/graphSnapshot.ts to confirm node shape for layout computation.
 * - Reviewed src/components/dependency-visualizer/DependencyVisualizer.tsx to mirror snapshot usage expectations.
 */
