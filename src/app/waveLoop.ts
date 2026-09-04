import { GROUND_SIZE } from "../render/ground";
import type { createKaijuRenderer } from "../render/kaiju";
import type { createMissileRenderer, MissileTrail } from "../render/missiles";
import type { createWaveMarkerRenderer } from "../render/waveMarkers";
import { planKaiju, type KaijuPlan } from "../sim/kaiju";
import { defeat, endIfPopulationZero, settleWave, type RunState } from "../sim/run";
import type { SavedCamera } from "../sim/save";
import type { BuildingParcel } from "../sim/slots";
import { distXZ, v3, type Vec3 } from "../sim/vec";
import { scheduleNextWave, type WaveClock } from "../sim/wave";

export type WaveVerdict = "held" | "breached";
export type PendingMissile = { readonly from: Vec3; readonly launchedAt: number; readonly impactAt: number; readonly damage: number };

type WaveVisuals = {
  readonly kaiju: ReturnType<typeof createKaijuRenderer>;
  readonly missiles: ReturnType<typeof createMissileRenderer>;
  readonly markers: ReturnType<typeof createWaveMarkerRenderer>;
};

export function settleWaveOutcome(run: RunState, clock: WaveClock, verdict: WaveVerdict, calledEarly: boolean, population: number, cityLevelled = false): { run: RunState; clock: WaveClock } {
  const nextRun = verdict === "held"
    ? settleWave(run, { defeated: true, calledEarly, baseScience: 10 * run.wave })
    : cityLevelled ? defeat(settleWave(run, { defeated: false, calledEarly, baseScience: 10 * run.wave }))
    : endIfPopulationZero(settleWave(run, { defeated: false, calledEarly, baseScience: 10 * run.wave }), population);
  return { run: nextRun, clock: nextRun.ended ? clock : scheduleNextWave(clock) };
}

export function createWavePlan(seed: string, parcels: readonly BuildingParcel[]): { plan: KaijuPlan; camera: SavedCamera } {
  const half = GROUND_SIZE / 2;
  const coast = Array.from({ length: 32 }, (_, i) => {
    const a = (i / 32) * Math.PI * 2;
    return v3(Math.cos(a) * half * 0.92, 0, Math.sin(a) * half * 0.92);
  });
  const plan = planKaiju(
    seed,
    { minX: -half, maxX: half, minZ: -half, maxZ: half },
    coast,
    parcels.map((parcel) => v3(parcel.position.x, parcel.position.y, parcel.position.z)),
    v3(-360, 0, 1500),
  );
  // Suggested framing only. The wave owns markers and the banner; the camera stays where the
  // player left it, even though the kaiju starts offshore and walks in from the edge.
  const target = plan.target ?? plan.coast;
  const midX = (plan.landing.x + target.x) / 2;
  const midZ = (plan.landing.z + target.z) / 2;
  return {
    plan,
    camera: {
      targetX: midX,
      targetY: 0,
      targetZ: midZ,
      alpha: Math.atan2(plan.landing.z - target.z, plan.landing.x - target.x) - Math.PI / 2,
      beta: Math.PI / 3.2,
      radius: Math.max(700, distXZ(plan.landing, target) * 0.9),
    },
  };
}

export function clearWaveVisuals({ kaiju, missiles, markers }: WaveVisuals): void {
  kaiju.hide();
  markers.hide();
  missiles.rebuild([]);
}

export function rebuildMissileTrails(missiles: ReturnType<typeof createMissileRenderer>, pending: readonly PendingMissile[], hits: readonly PendingMissile[], target: Vec3, seconds: number): void {
  const trail = (missile: PendingMissile, impact = false): MissileTrail => ({
    from: missile.from,
    to: target,
    progress: impact ? 1 : (seconds - missile.launchedAt) / Math.max(0.01, missile.impactAt - missile.launchedAt),
    impact,
  });
  missiles.rebuild([...pending.filter((missile) => missile.launchedAt <= seconds).map((missile) => trail(missile)), ...hits.map((missile) => trail(missile, true))]);
}
