/**
 * The hour a fresh city opens at: daylight, so a run starts readable rather than at dusk.
 * The slider in `index.html` carries the same value as its own default.
 */
export const DEFAULT_HOUR = 11;

/** The hours streetlights burn -- and, with them, every headlight on the road. */
export function streetlightsOnAt(hour: number): boolean {
  return hour >= 20 || hour < 6.5;
}
