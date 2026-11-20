/**
 * Pure drag/snap math with no DOM access, so it is unit-testable and reusable.
 */
import type { Direction, SnapPoint } from './types';
import { directionSign, isVertical } from '../core';

export interface Size {
  width: number;
  height: number;
}

/**
 * Translate offset (px along the sheet axis) that shows each snap point.
 * For a bottom sheet the offset is `containerHeight - visibleHeight`.
 */
export function getSnapOffsets(snapPoints: readonly SnapPoint[], direction: Direction, container: Size): number[] {
  const total = isVertical(direction) ? container.height : container.width;
  return snapPoints.map((point) => {
    const visible = typeof point === 'string' ? parseFloat(point) : point * total;
    return directionSign(direction) === 1 ? total - visible : -total + visible;
  });
}

export function closestIndex(offsets: readonly number[], position: number): number {
  let best = 0;
  for (let i = 1; i < offsets.length; i++) {
    if (Math.abs(offsets[i] - position) < Math.abs(offsets[best] - position)) best = i;
  }
  return best;
}

/** Overlay opacity (0 or 1) at rest on a given snap point. */
export function overlayOpacityAt(index: number, fadeFromIndex: number, count: number): number {
  return index === count - 1 || index >= fadeFromIndex ? 1 : 0;
}

export type ReleaseResult = { type: 'close' } | { type: 'reset' } | { type: 'snap'; index: number };

export interface SnapReleaseInput {
  offsets: readonly number[];
  activeIndex: number;
  /** Distance dragged towards "more open" in px (negative = towards closed). */
  draggedDistance: number;
  /** px / ms */
  velocity: number;
  direction: Direction;
  dismissible: boolean;
  sequential: boolean;
  velocityThreshold: number;
  /** Velocity (px/ms) above which a flick jumps straight to the first/last point. */
  flickVelocity: number;
  /** Viewport size along the sheet axis. */
  viewport: number;
}

export function resolveSnapRelease(i: SnapReleaseInput): ReleaseResult {
  const last = i.offsets.length - 1;
  const activeOffset = i.offsets[i.activeIndex] ?? 0;
  const position =
    directionSign(i.direction) === 1 ? activeOffset - i.draggedDistance : activeOffset + i.draggedDistance;
  const towardsOpen = i.draggedDistance > 0;

  if (!i.sequential && i.velocity > i.flickVelocity) {
    if (towardsOpen) return { type: 'snap', index: last };
    return i.dismissible ? { type: 'close' } : { type: 'snap', index: 0 };
  }

  if (i.velocity > i.velocityThreshold && Math.abs(i.draggedDistance) < i.viewport * 0.4) {
    const step = towardsOpen ? 1 : -1;
    if (step > 0 && i.activeIndex === last) return { type: 'snap', index: last };
    if (step < 0 && i.activeIndex === 0) return i.dismissible ? { type: 'close' } : { type: 'snap', index: 0 };
    return { type: 'snap', index: Math.min(Math.max(i.activeIndex + step, 0), last) };
  }

  return { type: 'snap', index: closestIndex(i.offsets, position) };
}

export interface ReleaseInput {
  /** Current translate of the sheet along its axis, in px. */
  swipeAmount: number;
  /** Signed drag distance towards "more open" in px. */
  draggedDistance: number;
  velocity: number;
  velocityThreshold: number;
  closeThreshold: number;
  /** Visible size of the sheet along its axis. */
  sheetSize: number;
}

export function resolveRelease(i: ReleaseInput): ReleaseResult {
  if (i.draggedDistance > 0) return { type: 'reset' };
  if (i.velocity > i.velocityThreshold) return { type: 'close' };
  if (Math.abs(i.swipeAmount) >= i.sheetSize * i.closeThreshold) return { type: 'close' };
  return { type: 'reset' };
}

/**
 * How far (0..1) the overlay fade has progressed while dragging between snap points.
 * Returns `null` when the overlay should not react to this drag.
 */
export function snapFadeProgress(input: {
  offsets: readonly number[];
  activeIndex: number;
  fadeFromIndex: number;
  absDraggedDistance: number;
  towardsOpen: boolean;
  /** Offset at which the sheet is fully closed (e.g. container height for a bottom sheet). */
  closedOffset: number;
}): number | null {
  const { offsets, activeIndex, fadeFromIndex, absDraggedDistance, towardsOpen, closedOffset } = input;
  const isOverlaySnapPoint = activeIndex === fadeFromIndex - 1;
  const shouldFade = activeIndex === fadeFromIndex;

  if (activeIndex >= fadeFromIndex && towardsOpen) return 0;
  if (isOverlaySnapPoint && !towardsOpen) return 1;
  if (!shouldFade && !isOverlaySnapPoint) return null;

  // Fading in: towards the next point. Fading out: towards the previous point, or closed from the first one.
  const distance = isOverlaySnapPoint
    ? offsets[activeIndex + 1] - offsets[activeIndex]
    : offsets[activeIndex] - (activeIndex > 0 ? offsets[activeIndex - 1] : closedOffset);
  const progress = absDraggedDistance / Math.abs(distance);
  return isOverlaySnapPoint ? 1 - progress : progress;
}
