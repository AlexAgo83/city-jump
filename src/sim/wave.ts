export const WAVE_STARTING_VALUES = {
  firstWaveSeconds: 60,
  betweenWaveSeconds: 60,
  kaijuSpeedMps: 16,
  kaijuHitPoints: 900,
  batteryRangeM: 220,
  damagePerParcelCell: 12,
  reloadSeconds: 4,
  missileTravelSecondsAtRange: 1.5,
  destructionRadiusM: 25,
} as const;

export interface WaveClock {
  readonly elapsedSeconds: number;
  readonly nextWaveAtSeconds: number;
  readonly accumulatedThreat: number;
  readonly active: ActiveWave | null;
}

export interface ActiveWave {
  readonly startedAtSeconds: number;
  readonly threat: number;
  readonly hitPoints: number;
}

export function createWaveClock(): WaveClock {
  return { elapsedSeconds: 0, nextWaveAtSeconds: WAVE_STARTING_VALUES.firstWaveSeconds, accumulatedThreat: 0, active: null };
}

export function advanceWaveClock(clock: WaveClock, dtSeconds: number): WaveClock {
  return advanceWaveClockWithThreat(clock, dtSeconds, WAVE_STARTING_VALUES.kaijuHitPoints);
}

export function advanceWaveClockWithThreat(clock: WaveClock, dtSeconds: number, threat: number): WaveClock {
  const elapsedSeconds = clock.elapsedSeconds + Math.max(0, dtSeconds);
  if (clock.active) return { ...clock, elapsedSeconds };
  const rate = threatRate(threat);
  const accumulatedThreat = clock.accumulatedThreat + rate * Math.max(0, dtSeconds);
  const nextWaveAtSeconds = accumulatedThreat >= WAVE_STARTING_VALUES.kaijuHitPoints
    ? elapsedSeconds
    : elapsedSeconds + (WAVE_STARTING_VALUES.kaijuHitPoints - accumulatedThreat) / rate;
  if (accumulatedThreat < WAVE_STARTING_VALUES.kaijuHitPoints) return { ...clock, elapsedSeconds, accumulatedThreat, nextWaveAtSeconds };
  return { elapsedSeconds, nextWaveAtSeconds, accumulatedThreat, active: { startedAtSeconds: elapsedSeconds, threat, hitPoints: threat } };
}

export function callWaveNow(clock: WaveClock): WaveClock {
  return clock.active ? clock : { ...clock, accumulatedThreat: WAVE_STARTING_VALUES.kaijuHitPoints, nextWaveAtSeconds: clock.elapsedSeconds };
}

export function scheduleNextWave(clock: WaveClock, delaySeconds: number = WAVE_STARTING_VALUES.betweenWaveSeconds): WaveClock {
  return { elapsedSeconds: clock.elapsedSeconds, nextWaveAtSeconds: clock.elapsedSeconds + delaySeconds, accumulatedThreat: 0, active: null };
}

export function damageWaveClock(clock: WaveClock, damage: number): WaveClock {
  if (!clock.active) return clock;
  const hitPoints = Math.max(0, clock.active.hitPoints - Math.max(0, damage));
  return { ...clock, active: { ...clock.active, hitPoints } };
}

export function waveCountdownSeconds(clock: WaveClock): number {
  return Math.max(0, clock.nextWaveAtSeconds - clock.elapsedSeconds);
}

export function waveThreat(wave: number, population: number, parcels: number): number {
  return Math.ceil(WAVE_STARTING_VALUES.kaijuHitPoints + Math.max(0, wave - 1) * 150 + Math.max(0, population) * 2 + Math.max(0, parcels) * 8);
}

export function threatRate(threat: number): number {
  return Math.max(1, threat / WAVE_STARTING_VALUES.firstWaveSeconds);
}
