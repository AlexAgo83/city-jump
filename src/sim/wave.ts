export const WAVE_STARTING_VALUES = {
  kaijuSpeedMps: 16,
  kaijuHitPoints: 900,
  batteryRangeM: 220,
  damagePerParcelCell: 14,
  reloadSeconds: 4,
  missileTravelSecondsAtRange: 1.5,
  destructionRadiusM: 25,
  /**
   * The quiet a city is owed after a wave.
   *
   * The bar alone does not space anything out: a city big enough to have earned wave 5 is a city
   * that crosses the bar for wave 6 a few hundred residents later, which it does while the rubble
   * of the last one is still being cleared. Long enough to rebuild what was flattened and put
   * something new up before the next one lands.
   */
  peaceSeconds: 180,
} as const;

/**
 * The residents a city must hold before a kaiju comes for it.
 *
 * Nothing is on a schedule. A city is attacked because it has become worth attacking, so a player
 * who does not build is not attacked at all, and one who grows fast brings the next one on
 * themselves. The bar rises every wave, which is why holding one buys room rather than a countdown.
 */
export function waveAtPopulation(wave: number): number {
  return Math.round(250 * Math.pow(Math.max(1, wave), 1.5));
}

/** How many more residents before the island notices. Infinity is not a thing here; zero means now. */
export function residentsUntilWave(wave: number, population: number): number {
  return Math.max(0, waveAtPopulation(wave) - Math.max(0, population));
}

export interface WaveClock {
  /** The simulation clock, used only to time a fight that is already happening. */
  readonly elapsedSeconds: number;
  readonly active: ActiveWave | null;
  /** No kaiju comes before this. Absent on pre-quiet saves, where it reads as zero. */
  readonly quietUntilSeconds: number;
}

export interface ActiveWave {
  readonly startedAtSeconds: number;
  readonly threat: number;
  readonly hitPoints: number;
}

export function createWaveClock(): WaveClock {
  return { elapsedSeconds: 0, active: null, quietUntilSeconds: 0 };
}

/** Whether the island is still owed its peace, and for how much longer. */
export function quietSecondsLeft(clock: WaveClock): number {
  return Math.max(0, clock.quietUntilSeconds - clock.elapsedSeconds);
}

export function advanceWaveClock(clock: WaveClock, dtSeconds: number): WaveClock {
  return { ...clock, elapsedSeconds: clock.elapsedSeconds + Math.max(0, dtSeconds) };
}

/** Summons a kaiju if the city has grown into one. Its size is fixed here and does not move again. */
export function summonIfDue(clock: WaveClock, wave: number, population: number, threat: number): WaveClock {
  if (clock.active || quietSecondsLeft(clock) > 0 || residentsUntilWave(wave, population) > 0) return clock;
  return { ...clock, active: { startedAtSeconds: clock.elapsedSeconds, threat, hitPoints: threat } };
}

/** The player asking for it early, before the city is big enough to have earned it. */
export function callWaveNow(clock: WaveClock, threat: number): WaveClock {
  return clock.active ? clock : { ...clock, active: { startedAtSeconds: clock.elapsedSeconds, threat, hitPoints: threat } };
}

/**
 * A wave is over. The next one waits on the city growing past a higher bar -- and, before that, on
 * the island getting its quiet back.
 */
export function scheduleNextWave(clock: WaveClock): WaveClock {
  return { ...clock, active: null, quietUntilSeconds: clock.elapsedSeconds + WAVE_STARTING_VALUES.peaceSeconds };
}

export function damageWaveClock(clock: WaveClock, damage: number): WaveClock {
  if (!clock.active) return clock;
  const hitPoints = Math.max(0, clock.active.hitPoints - Math.max(0, damage));
  return { ...clock, active: { ...clock.active, hitPoints } };
}

/** How big the kaiju is when it lands -- a separate question from what brought it. */
export function waveThreat(wave: number, population: number, parcels: number): number {
  return Math.ceil(WAVE_STARTING_VALUES.kaijuHitPoints + Math.max(0, wave - 1) * 150 + Math.max(0, population) * 9 + Math.max(0, parcels) * 8);
}
