/** Two road arms count as a continuation when they face each other within this much. */
export const OPPOSITE_BEARING_TOLERANCE = Math.PI / 4;

/** Smallest turn from one bearing to the other, in [0, PI]. */
export function angleBetween(a: number, b: number): number {
  const d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}
