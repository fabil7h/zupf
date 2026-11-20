export type { Direction } from '../shared';

/** Fraction of the container (`0.5`) or a fixed size in px (`'320px'`). */
export type SnapPoint = number | string;

export type ChangeReason = 'api' | 'trigger' | 'close-button' | 'escape' | 'outside' | 'drag' | 'handle';
