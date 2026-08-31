export const WAVE_STARTING_VALUES = {
  firstWaveSeconds: 180,
  kaijuSpeedMps: 8,
  kaijuHitPoints: 600,
  batteryRangeM: 220,
  damagePerParcelCell: 12,
  reloadSeconds: 2.5,
  missileTravelSecondsAtRange: 1.5,
  destructionRadiusM: 25,
} as const;

export interface WaveClock {
  readonly elapsedSeconds: number;
  readonly nextWaveAtSeconds: number;
  readonly active: ActiveWave | null;
}

export interface ActiveWave {
  readonly startedAtSeconds: number;
  readonly threat: number;
  readonly hitPoints: number;
}

export function createWaveClock(): WaveClock {
  return { elapsedSeconds: 0, nextWaveAtSeconds: WAVE_STARTING_VALUES.firstWaveSeconds, active: null };
}

export function advanceWaveClock(clock: WaveClock, dtSeconds: number): WaveClock {
  const elapsedSeconds = clock.elapsedSeconds + Math.max(0, dtSeconds);
  if (clock.active || elapsedSeconds < clock.nextWaveAtSeconds) return { ...clock, elapsedSeconds };
  const threat = WAVE_STARTING_VALUES.kaijuHitPoints;
  return { elapsedSeconds, nextWaveAtSeconds: clock.nextWaveAtSeconds, active: { startedAtSeconds: clock.nextWaveAtSeconds, threat, hitPoints: threat } };
}

export function damageWaveClock(clock: WaveClock, damage: number): WaveClock {
  if (!clock.active) return clock;
  const hitPoints = Math.max(0, clock.active.hitPoints - Math.max(0, damage));
  return { ...clock, active: { ...clock.active, hitPoints } };
}

export function waveCountdownSeconds(clock: WaveClock): number {
  return Math.max(0, clock.nextWaveAtSeconds - clock.elapsedSeconds);
}
