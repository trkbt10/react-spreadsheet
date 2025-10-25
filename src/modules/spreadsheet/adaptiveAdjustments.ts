/**
 * @file Adaptive window-based adjustment caches for efficient prefix sums.
 */

const WINDOW_GRANULARITY = 128;
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);
const MIN_SAFE_BIGINT = BigInt(Number.MIN_SAFE_INTEGER);

type AdaptiveLeaf = {
  kind: "leaf";
  index: number;
  delta: bigint;
};

type AdaptiveNode = {
  kind: "node";
  windowSize: number;
  blockIds: number[];
  prefixTotals: bigint[];
  children: Map<number, AdaptiveStructure>;
};

type AdaptiveStructure = AdaptiveLeaf | AdaptiveNode;

export type AdaptiveAdjustmentCache = {
  defaultSize: number;
  defaultSizeBigInt: bigint;
  root: AdaptiveStructure | null;
};

const buildAdaptiveStructure = (
  entries: Array<[number, bigint]>,
  windowSize: number,
): AdaptiveStructure => {
  if (entries.length === 1) {
    const [index, delta] = entries[0];
    return {
      kind: "leaf",
      index,
      delta,
    };
  }

  if (windowSize === 1) {
    const sortedEntries = [...entries].sort((a, b) => a[0] - b[0]);
    const blockIds: number[] = [];
    const prefixTotals: bigint[] = [];
    const children = new Map<number, AdaptiveStructure>();

    let runningTotal = 0n;
    for (const [index, delta] of sortedEntries) {
      runningTotal += delta;
      blockIds.push(index);
      prefixTotals.push(runningTotal);
      children.set(
        index,
        {
          kind: "leaf",
          index,
          delta,
        },
      );
    }

    return {
      kind: "node",
      windowSize,
      blockIds,
      prefixTotals,
      children,
    };
  }

  const grouped = new Map<number, Array<[number, bigint]>>();
  for (const entry of entries) {
    const blockId = Math.floor(entry[0] / windowSize);
    const group = grouped.get(blockId);
    if (group === undefined) {
      grouped.set(blockId, [entry]);
    } else {
      group.push(entry);
    }
  }

  const blockIds = Array.from(grouped.keys()).sort((a, b) => a - b);
  const prefixTotals: bigint[] = [];
  const children = new Map<number, AdaptiveStructure>();

  let runningTotal = 0n;
  const childWindowSize = Math.max(1, Math.floor(windowSize / WINDOW_GRANULARITY));

  for (const blockId of blockIds) {
    const blockEntries = grouped.get(blockId);
    if (blockEntries === undefined) {
      continue;
    }

    let blockTotal = 0n;
    for (const [, delta] of blockEntries) {
      blockTotal += delta;
    }

    runningTotal += blockTotal;
    prefixTotals.push(runningTotal);

    const child = buildAdaptiveStructure(blockEntries, childWindowSize);
    children.set(blockId, child);
  }

  return {
    kind: "node",
    windowSize,
    blockIds,
    prefixTotals,
    children,
  };
};

const buildAdaptiveCache = (
  sizes: Map<number, number>,
  defaultSize: number,
  defaultSizeBigInt: bigint,
): AdaptiveAdjustmentCache => {
  if (sizes.size === 0) {
    return {
      defaultSize,
      defaultSizeBigInt,
      root: null,
    };
  }

  const adjustments: Array<[number, bigint]> = [];
  for (const [index, value] of sizes) {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error("Size overrides must be finite integer values.");
    }
    if (value !== defaultSize) {
      adjustments.push([index, BigInt(value) - defaultSizeBigInt]);
    }
  }

  if (adjustments.length === 0) {
    return {
      defaultSize,
      defaultSizeBigInt,
      root: null,
    };
  }

  let maxIndex = 0;
  for (const [index] of adjustments) {
    if (index > maxIndex) {
      maxIndex = index;
    }
  }

  let windowSize = 1;
  while (windowSize <= maxIndex) {
    windowSize *= WINDOW_GRANULARITY;
  }

  const root = buildAdaptiveStructure(adjustments, windowSize);

  return {
    defaultSize,
    defaultSizeBigInt,
    root,
  };
};

/**
 * Retrieve (or build) a cache for the provided size overrides.
 */
export const getAdaptiveCache = (
  cacheMap: WeakMap<Map<number, number>, AdaptiveAdjustmentCache>,
  sizes: Map<number, number>,
  defaultSize: number,
  defaultSizeBigInt: bigint,
): AdaptiveAdjustmentCache => {
  const cached = cacheMap.get(sizes);
  if (
    cached !== undefined &&
    cached.defaultSize === defaultSize &&
    cached.defaultSizeBigInt === defaultSizeBigInt
  ) {
    return cached;
  }

  const rebuilt = buildAdaptiveCache(sizes, defaultSize, defaultSizeBigInt);
  cacheMap.set(sizes, rebuilt);
  return rebuilt;
};

const findLastIndexLessThan = (values: number[], target: number): number => {
  if (values.length === 0) {
    return -1;
  }

  let low = 0;
  let high = values.length - 1;
  let resultIndex = -1;

  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    if (values[mid] < target) {
      resultIndex = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return resultIndex;
};

const sumAdjustmentsBeforeIndexInternal = (
  root: AdaptiveStructure | null,
  index: number,
): bigint => {
  if (root === null) {
    return 0n;
  }

  if (root.kind === "leaf") {
    return index > root.index ? root.delta : 0n;
  }

  const blockId = Math.floor(index / root.windowSize);
  const blockIndex = findLastIndexLessThan(root.blockIds, blockId);
  const sumBefore = blockIndex === -1 ? 0n : root.prefixTotals[blockIndex];

  const child = root.children.get(blockId);
  if (child === undefined) {
    return sumBefore;
  }

  return sumBefore + sumAdjustmentsBeforeIndexInternal(child, index);
};

/**
 * Sum all adjustments before the provided index.
 */
export const sumAdjustmentsBeforeIndex = (
  cache: AdaptiveAdjustmentCache,
  index: number,
): bigint => {
  return sumAdjustmentsBeforeIndexInternal(cache.root, index);
};

export const toSafeNumber = (value: bigint, context: string): number => {
  if (value > MAX_SAFE_BIGINT) {
    return Number.MAX_SAFE_INTEGER;
  }
  if (value < MIN_SAFE_BIGINT) {
    return Number.MIN_SAFE_INTEGER;
  }
  return Number(value);
};

/**
 * Calculate absolute position for an index using the cached tree.
 */
export const calculatePositionWithCache = (
  index: number,
  defaultSize: number,
  cache: AdaptiveAdjustmentCache,
): number => {
  if (index <= 0) {
    return 0;
  }
  if (cache.defaultSize !== defaultSize) {
    throw new Error("Adaptive cache default size mismatch.");
  }

  const baseline = BigInt(index) * cache.defaultSizeBigInt;
  const adjustment = sumAdjustmentsBeforeIndex(cache, index);
  return toSafeNumber(baseline + adjustment, "calculated position");
};
