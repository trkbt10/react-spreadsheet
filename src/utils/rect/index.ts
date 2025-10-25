/**
 * @file Rect utilities module exports.
 */

export type { Rect, Point, Size } from "./types";
export {
  createRectFromPoints,
  rectEquals,
  isRectEmpty,
  containsPoint,
  rectsIntersect,
  getIntersection,
  getUnion,
  expandRect,
  clampRect,
  getRectBounds,
} from "./rectUtils";
export { useRectState } from "./useRectState";
export type { RectStateActions, UseRectStateReturn } from "./useRectState";
