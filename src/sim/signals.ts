/**
 * Traffic signals. A junction's phases come from the bearings its arms already carry: roads
 * facing each other run together, everything else waits its turn. The whole thing is a pure
 * function of the graph and the clock, so the renderer that draws a lamp and the traffic that
 * obeys it work it out separately and cannot disagree.
 *
 * A roundabout is the one junction with no signals: it is its own way of taking turns.
 */
import type { NodeId, RoadGraph, SegmentId } from "./graph";
import { junctionGeometry, type JunctionGeometry } from "./junction";
import { roadType } from "./roadTypes";

export type SignalState = "green" | "amber" | "red";

/** Seconds of each, per phase. Amber is long enough to stop for and short enough to be a warning. */
const GREEN = 9;
const AMBER = 2;
/**
 * Everything red, long enough for whoever went last to be out of the junction before the next
 * phase starts: a car crossing a wide junction at road speed needs a good two seconds of it.
 */
const ALL_RED = 2.5;
const PHASE = GREEN + AMBER + ALL_RED;

/** Two arms run together when they face each other within this much. */
const OPPOSITE = Math.PI / 4;

export interface SignalCycle {
  /** Each phase is the arms that get their green at the same time. */
  readonly phases: readonly (readonly SegmentId[])[];
  /** Every arm the cycle speaks to, which is every arm traffic arrives on. */
  readonly arms: readonly SegmentId[];
  /** Where in the cycle this junction starts, so a city does not blink in unison. */
  readonly offset: number;
  readonly length: number;
}

/**
 * The cycle for a junction, or null where there should be none: a roundabout, or a node that is
 * not really an intersection at all -- two roads meeting is a bend in one road.
 */
export function signalCycle(graph: RoadGraph, nodeId: NodeId, geometry?: JunctionGeometry): SignalCycle | null {
  if (graph.node(nodeId).roundabout) return null;
  const all = (geometry ?? junctionGeometry(graph, nodeId)).arms;
  if (all.length < 3) return null;
  // Only a road traffic can arrive on needs telling when to stop. A one-way leaving the junction
  // carries nobody towards it, so it gets no phase and, in the end, no mast either.
  const arms = all.filter((arm) => {
    const seg = graph.segment(arm.segment);
    const type = roadType(seg.type);
    if (type.pedestrian || type.tunnelDepth) return false;
    return !type.oneWay || seg.b === nodeId;
  });
  if (arms.length < 3) return null;

  const phases: SegmentId[][] = [];
  const taken = new Set<SegmentId>();
  for (const arm of arms) {
    if (taken.has(arm.segment)) continue;
    taken.add(arm.segment);
    const phase = [arm.segment];
    // Whichever arm most nearly faces this one shares its green.
    const facing = arms
      .filter((other) => !taken.has(other.segment))
      .map((other) => ({ other, off: Math.abs(Math.PI - angleBetween(arm.angle, other.angle)) }))
      .sort((l, r) => l.off - r.off)[0];
    if (facing && facing.off <= OPPOSITE) {
      taken.add(facing.other.segment);
      phase.push(facing.other.segment);
    }
    phases.push(phase);
  }

  // One phase means nothing ever has to wait, so there is nothing to signal.
  if (phases.length < 2) return null;
  return {
    phases,
    arms: arms.map((arm) => arm.segment),
    offset: (nodeId * 3.7) % (phases.length * PHASE),
    length: phases.length * PHASE,
  };
}

/** What the light on this arm is showing at this moment. */
export function signalAt(cycle: SignalCycle, segment: SegmentId, time: number): SignalState {
  const t = ((time + cycle.offset) % cycle.length + cycle.length) % cycle.length;
  const index = Math.min(cycle.phases.length - 1, Math.floor(t / PHASE));
  if (!cycle.phases[index]!.includes(segment)) return "red";
  const within = t - index * PHASE;
  return within < GREEN ? "green" : within < GREEN + AMBER ? "amber" : "red";
}

/** Only a green lets anyone in. Amber is for stopping, not for going. */
export const canGo = (state: SignalState): boolean => state === "green";

/** Smallest turn from one bearing to the other, in [0, PI]. */
function angleBetween(a: number, b: number): number {
  const d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}
