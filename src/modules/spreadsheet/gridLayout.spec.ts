/// <reference types="vitest" />

/**
 * @file Tests for grid layout utilities.
 */
import { calculateRowPosition } from "./gridLayout";

describe("calculateRowPosition", () => {
  it("applies consecutive custom heights without regression", () => {
    const defaultHeight = 24;
    const rowSizes = new Map<number, number>();
    rowSizes.set(0, 40);
    rowSizes.set(1, 80);

    expect(calculateRowPosition(1, defaultHeight, rowSizes)).toBe(40);
    expect(calculateRowPosition(2, defaultHeight, rowSizes)).toBe(120);
    expect(calculateRowPosition(3, defaultHeight, rowSizes)).toBe(144);
  });
});
