/**
 * Pure pull math with no DOM access.
 */

/**
 * Visible offset for a finger distance: follows the finger 1:1 at first,
 * then stiffens and approaches `max` asymptotically (rubber band).
 */
export function pullOffset(distance: number, max: number): number {
  if (distance <= 0 || max <= 0) return 0;
  return (max * distance) / (distance + max);
}

/** 0 (rest) .. 1 (threshold reached, releasing refreshes). */
export function pullProgress(offset: number, threshold: number): number {
  if (threshold <= 0) return offset > 0 ? 1 : 0;
  return Math.min(Math.max(offset / threshold, 0), 1);
}
