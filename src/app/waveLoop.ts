import type { createKaijuRenderer } from "../render/kaiju";
import type { createMissileRenderer, MissileTrail } from "../render/missiles";
import type { createWaveMarkerRenderer } from "../render/waveMarkers";
import type { Vec3 } from "../sim/vec";

export type WaveVerdict = "held" | "breached";
export type PendingMissile = { readonly from: Vec3; readonly launchedAt: number; readonly impactAt: number; readonly damage: number };

type WaveVisuals = {
  readonly kaiju: ReturnType<typeof createKaijuRenderer>;
  readonly missiles: ReturnType<typeof createMissileRenderer>;
  readonly markers: ReturnType<typeof createWaveMarkerRenderer>;
};

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
