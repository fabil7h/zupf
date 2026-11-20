// Stack of open sheets, so only the top-most one reacts to Escape / outside press / focus trapping.
export interface Layer {
  readonly content: HTMLElement;
}

const stack: Layer[] = [];

export const pushLayer = (layer: Layer): void => {
  removeLayer(layer);
  stack.push(layer);
};
export const removeLayer = (layer: Layer): void => {
  const i = stack.indexOf(layer);
  if (i !== -1) stack.splice(i, 1);
};
export const isTopLayer = (layer: Layer): boolean => stack[stack.length - 1] === layer;
/** True if `target` is inside any open layer above `layer` (e.g. a nested sheet). */
export const isInHigherLayer = (layer: Layer, target: Node): boolean => {
  const i = stack.indexOf(layer);
  return stack.slice(i + 1).some((l) => l.content.contains(target));
};
