/**
 * @file Builds dependency components used for memoised evaluation segments.
 */

import type {
  CellAddressKey,
  DependencyTree,
  DependencyComponent,
  DependencyComponentIndex,
} from "./types";

type ComponentBuildResult = {
  components: Map<string, DependencyComponent>;
  componentIndex: DependencyComponentIndex;
};

const buildUndirectedAdjacency = (tree: DependencyTree): Map<CellAddressKey, Set<CellAddressKey>> => {
  const adjacency = new Map<CellAddressKey, Set<CellAddressKey>>();

  tree.forEach((node, key) => {
    if (!adjacency.has(key)) {
      adjacency.set(key, new Set());
    }
    node.dependencies.forEach((dependencyKey) => {
      const neighbours = adjacency.get(key);
      neighbours?.add(dependencyKey);
      if (!adjacency.has(dependencyKey)) {
        adjacency.set(dependencyKey, new Set());
      }
      adjacency.get(dependencyKey)?.add(key);
    });
    node.dependents.forEach((dependentKey) => {
      adjacency.get(key)?.add(dependentKey);
      if (!adjacency.has(dependentKey)) {
        adjacency.set(dependentKey, new Set());
      }
      adjacency.get(dependentKey)?.add(key);
    });
  });

  return adjacency;
};

const discoverComponent = (
  startKey: CellAddressKey,
  adjacency: Map<CellAddressKey, Set<CellAddressKey>>,
): Set<CellAddressKey> => {
  const visited = new Set<CellAddressKey>();
  const stack: CellAddressKey[] = [startKey];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);
    const neighbours = adjacency.get(current);
    if (!neighbours) {
      continue;
    }
    neighbours.forEach((neighbour) => {
      if (!visited.has(neighbour)) {
        stack.push(neighbour);
      }
    });
  }

  return visited;
};

const computeTopologicalOrder = (nodes: Set<CellAddressKey>, tree: DependencyTree): CellAddressKey[] => {
  const inDegree = new Map<CellAddressKey, number>();
  const queue: CellAddressKey[] = [];
  const order: CellAddressKey[] = [];

  nodes.forEach((key) => {
    const node = tree.get(key);
    if (!node) {
      throw new Error(`Missing dependency node "${key}" during topological sort`);
    }
    const degree = Array.from(node.dependencies).filter((dependency) => nodes.has(dependency)).length;
    inDegree.set(key, degree);
    if (degree === 0) {
      queue.push(key);
    }
  });

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }
    order.push(current);

    const node = tree.get(current);
    if (!node) {
      continue;
    }

    node.dependents.forEach((dependent) => {
      if (!nodes.has(dependent)) {
        return;
      }
      const currentDegree = inDegree.get(dependent);
      if (currentDegree === undefined) {
        throw new Error(`Missing in-degree for "${dependent}"`);
      }
      const nextDegree = currentDegree - 1;
      inDegree.set(dependent, nextDegree);
      if (nextDegree === 0) {
        queue.push(dependent);
      }
    });
  }

  if (order.length !== nodes.size) {
    throw new Error("Formula dependencies contain a cycle");
  }

  return order;
};

const collectExternalDependencies = (
  nodes: Set<CellAddressKey>,
  tree: DependencyTree,
): Set<CellAddressKey> => {
  const external = new Set<CellAddressKey>();
  nodes.forEach((key) => {
    const node = tree.get(key);
    if (!node) {
      return;
    }
    node.dependencies.forEach((dependency) => {
      if (!nodes.has(dependency)) {
        external.add(dependency);
      }
    });
  });
  return external;
};

export const buildDependencyComponents = (
  tree: DependencyTree,
): ComponentBuildResult => {
  const components = new Map<string, DependencyComponent>();
  const componentIndex: DependencyComponentIndex = new Map();

  if (tree.size === 0) {
    return { components, componentIndex };
  }

  const adjacency = buildUndirectedAdjacency(tree);
  const globalVisited = new Set<CellAddressKey>();
  let componentCounter = 0;

  tree.forEach((_node, key) => {
    if (globalVisited.has(key)) {
      return;
    }

    const componentNodes = discoverComponent(key, adjacency);
    componentNodes.forEach((nodeKey) => globalVisited.add(nodeKey));

    const sortedKeys = Array.from(componentNodes).sort();
    const componentId = sortedKeys[0] ?? `component-${componentCounter + 1}`;
    componentCounter += 1;
    const topologicalOrder = computeTopologicalOrder(componentNodes, tree);
    const externalDependencies = collectExternalDependencies(componentNodes, tree);

    const component: DependencyComponent = {
      id: componentId,
      nodes: componentNodes,
      topologicalOrder,
      externalDependencies,
    };

    components.set(componentId, component);
    componentNodes.forEach((nodeKey) => {
      componentIndex.set(nodeKey, componentId);
    });
  });

  return {
    components,
    componentIndex,
  };
};
