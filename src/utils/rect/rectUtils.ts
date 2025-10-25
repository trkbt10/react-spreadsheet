/**
 * @file High-performance rect utility functions.
 * All functions are pure and optimized for frequent calculations.
 */

import type { Rect, Point } from "./types";

/**
 * Create a rect from two points (start and current drag position).
 * Optimized for drag operations - calculates normalized rect in one pass.
 * @param start - Start point
 * @param end - End point
 * @returns Normalized rect
 */
export const createRectFromPoints = (start: Point, end: Point): Rect => {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return { x, y, width, height };
};

/**
 * Check if two rects are equal.
 * Uses strict equality for performance - rects should be immutable.
 * @param a - First rect
 * @param b - Second rect
 * @returns True if rects are equal
 */
export const rectEquals = (a: Rect | null, b: Rect | null): boolean => {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
};

/**
 * Check if rect has zero area.
 * @param rect - Rect to check
 * @returns True if rect has zero area
 */
export const isRectEmpty = (rect: Rect | null): boolean => {
  return !rect || rect.width === 0 || rect.height === 0;
};

/**
 * Check if point is inside rect.
 * @param point - Point to check
 * @param rect - Rect to test against
 * @returns True if point is inside rect
 */
export const containsPoint = (point: Point, rect: Rect): boolean => {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
};

/**
 * Check if two rects intersect.
 * @param a - First rect
 * @param b - Second rect
 * @returns True if rects intersect
 */
export const rectsIntersect = (a: Rect, b: Rect): boolean => {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
};

/**
 * Get intersection of two rects.
 * @param a - First rect
 * @param b - Second rect
 * @returns Intersection rect or null if no intersection
 */
export const getIntersection = (a: Rect, b: Rect): Rect | null => {
  if (!rectsIntersect(a, b)) {
    return null;
  }

  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const width = Math.min(a.x + a.width, b.x + b.width) - x;
  const height = Math.min(a.y + a.height, b.y + b.height) - y;

  return { x, y, width, height };
};

/**
 * Get union (bounding box) of two rects.
 * @param a - First rect
 * @param b - Second rect
 * @returns Union rect
 */
export const getUnion = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.max(a.x + a.width, b.x + b.width) - x;
  const height = Math.max(a.y + a.height, b.y + b.height) - y;

  return { x, y, width, height };
};

/**
 * Expand rect by padding on all sides.
 * @param rect - Rect to expand
 * @param padding - Padding amount
 * @returns Expanded rect
 */
export const expandRect = (rect: Rect, padding: number): Rect => {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
};

/**
 * Clamp rect to bounds.
 * @param rect - Rect to clamp
 * @param bounds - Bounding rect
 * @returns Clamped rect
 */
export const clampRect = (rect: Rect, bounds: Rect): Rect => {
  const x = Math.max(bounds.x, Math.min(rect.x, bounds.x + bounds.width - rect.width));
  const y = Math.max(bounds.y, Math.min(rect.y, bounds.y + bounds.height - rect.height));

  return {
    x,
    y,
    width: Math.min(rect.width, bounds.width),
    height: Math.min(rect.height, bounds.height),
  };
};

/**
 * Get rect bounds (right and bottom edges).
 * Optimized for boundary calculations.
 * @param rect - Rect to get bounds from
 * @returns Object with right and bottom coordinates
 */
export const getRectBounds = (rect: Rect): { right: number; bottom: number } => {
  return {
    right: rect.x + rect.width,
    bottom: rect.y + rect.height,
  };
};
