import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";

import type { NodeId, RoadGraph, SegmentId } from "../sim/graph";
import type { TerrainBounds } from "../sim/heightmap";
import { allJunctions, type JunctionArm, type JunctionGeometry } from "../sim/junction";
import { roadType } from "../sim/roadTypes";
import { signalAt, signalCycle, type SignalCycle, type SignalState } from "../sim/signals";
import { armPoint, CROSSING_DEPTH, crossingNear } from "../sim/transfers";
import { normalizeXZ, perpXZ } from "../sim/vec";

/** Post height, where the head sits on it, and how far apart the three lamps are. */
const POST = 3.2;
const HEAD = 1.3;
const LAMP_PITCH = 0.4;

/** Lit and unlit, for each lamp in turn: stop, wait, go. */
const LAMP_COLORS: Record<SignalState, Color4> = {
  red: new Color4(1, 0.16, 0.12, 1),
  amber: new Color4(1, 0.66, 0.1, 1),
  green: new Color4(0.24, 0.92, 0.36, 1),
};
const LAMP_DARK = new Color4(0.11, 0.11, 0.12, 1);
const LAMP_ORDER: readonly SignalState[] = ["red", "amber", "green"];

interface Mast {
  readonly node: NodeId;
  readonly segment: SegmentId;
  readonly x: number;
  readonly z: number;
  readonly lamps: InstancedMesh[];
  readonly meshes: (Mesh | InstancedMesh)[];
}

/**
 * The signals themselves: a mast on each arm of every signalled junction, its three lamps lit
 * from the same cycle the traffic obeys. Which arms have one, and what they show, is all decided
 * in `sim/signals`; nothing here has an opinion of its own.
 */
export function createSignalRenderer(scene: Scene, graph: RoadGraph, frameDelta: () => number) {
  const metal = new StandardMaterial("signal_metal", scene);
  metal.diffuseColor = new Color3(0.1, 0.11, 0.11);
  metal.specularColor = new Color3(0.2, 0.2, 0.2);

  const lampMaterial = new StandardMaterial("signal_lamp", scene);
  lampMaterial.disableLighting = true;
  lampMaterial.emissiveColor = new Color3(1, 1, 1);

  // One post, one lamp, and every signal in the city is an instance of the two. The lamp carries
  // its colour per instance, so turning a light green costs a vector, not a material.
  // Built standing on the ground, so an instance is placed at the foot of its post rather than
  // halfway through it.
  const post = MeshBuilder.CreateCylinder("signal_post", { height: POST, diameterTop: 0.14, diameterBottom: 0.2, tessellation: 6 }, scene);
  post.position.y = POST / 2;
  const head = MeshBuilder.CreateBox("signal_head", { width: 0.44, height: HEAD, depth: 0.36 }, scene);
  head.position.y = POST + HEAD / 2 - 0.1;
  const merged = Mesh.MergeMeshes([post, head], true, true, undefined, false, false);
  if (!merged) throw new Error("signal mast failed to merge");
  const mastMesh: Mesh = merged;
  mastMesh.name = "signal_mast";
  mastMesh.material = metal;
  mastMesh.isPickable = false;
  mastMesh.isVisible = false;

  const lamp = MeshBuilder.CreateSphere("signal_lamp_lens", { diameter: 0.3, segments: 6 }, scene);
  lamp.material = lampMaterial;
  lamp.isPickable = false;
  lamp.isVisible = false;
  lamp.registerInstancedBuffer(VertexBuffer.ColorKind, 4);
  lamp.instancedBuffers[VertexBuffer.ColorKind] = LAMP_DARK;

  let masts: Mast[] = [];
  let meshes: (Mesh | InstancedMesh)[] = [];
  const cycles = new Map<NodeId, SignalCycle>();
  let paused = false;
  let timeScale = 1;
  let simTime = performance.now() / 1000;

  function rebuild(junctions: Map<NodeId, JunctionGeometry> = allJunctions(graph), dirty?: TerrainBounds): void {
    if (dirty) {
      const kept: Mast[] = [];
      for (const mast of masts) {
        const junction = junctions.get(mast.node);
        if (signalMastTouchesBounds(mast, dirty) || !junction || signalJunctionTouchesBounds(graph, junction, dirty)) {
          for (const mesh of mast.meshes) mesh.dispose();
        } else {
          kept.push(mast);
        }
      }
      masts = kept;
      meshes = kept.flatMap((mast) => mast.meshes);
    } else {
      for (const mesh of meshes) mesh.dispose();
      meshes = [];
      masts = [];
    }
    cycles.clear();
    for (const mast of masts) {
      if (cycles.has(mast.node)) continue;
      const junction = junctions.get(mast.node);
      const cycle = junction ? signalCycle(graph, mast.node, junction) : null;
      if (cycle) cycles.set(mast.node, cycle);
    }

    for (const junction of junctions.values()) {
      if (dirty && !signalJunctionTouchesBounds(graph, junction, dirty)) continue;
      const cycle = signalCycle(graph, junction.node, junction);
      if (!cycle) continue;
      cycles.set(junction.node, cycle);
      for (const arm of junction.arms) {
        // Only the arms the cycle actually speaks to: a one-way leaving the junction has nobody
        // arriving on it to stop.
        if (!cycle.arms.includes(arm.segment)) continue;
        masts.push(placeMast(junction.node, arm, roadType(graph.segment(arm.segment).type).width));
      }
    }
  }

  /** A mast stands at the stop line, on the kerb side of the road it faces. */
  function placeMast(nodeId: NodeId, arm: JunctionArm, width: number): Mast {
    const seg = graph.segment(arm.segment);
    const atStart = seg.a === nodeId;
    const at = crossingNear(arm, seg.length - arm.trim) + CROSSING_DEPTH + 1.2;
    const base = armPoint(graph, nodeId, arm, 0, at);
    const { tangent } = graph.pointAt(arm.segment, atStart ? at : seg.length - at);
    const n = perpXZ(normalizeXZ(tangent));
    // The mast stands on the kerb the arriving driver is nearest, which is their right. Traffic
    // arrives along the segment's own direction when the node is its far end and against it when
    // the node is its start; right of that heading is `(z, -x)`, and `perpXZ` points the other
    // way, so the offset takes the opposite sign to the direction of arrival.
    const side = atStart ? 1 : -1;
    const offset = (width / 2 + 1.2) * side;

    const mast = mastMesh.createInstance(`signal_${arm.segment}_${nodeId}`);
    mast.isPickable = false;
    mast.position.set(base.x + n.x * offset, base.y, base.z + n.z * offset);
    // Facing back down the road at the traffic arriving on it -- the opposite way to that
    // traffic's own direction of travel, which is `tangent` itself from the far end and against
    // it from the start (the same sense `side`, just above, is worked out from).
    const facing = normalizeXZ(atStart ? tangent : { x: -tangent.x, y: tangent.y, z: -tangent.z });
    mast.rotation.y = Math.atan2(facing.x, facing.z);
    meshes.push(mast);

    const lamps = [0, 1, 2].map((i) => {
      const lens = lamp.createInstance(`signal_lamp_${arm.segment}_${nodeId}_${i}`);
      lens.isPickable = false;
      // On the housing's traffic-facing side, not its kerb-facing one: the lamps are their own
      // instances, positioned in the world rather than carried by the mast's own rotation.
      lens.position.set(
        mast.position.x + facing.x * 0.2,
        base.y + POST + HEAD - 0.32 - i * LAMP_PITCH,
        mast.position.z + facing.z * 0.2,
      );
      lens.instancedBuffers[VertexBuffer.ColorKind] = LAMP_DARK;
      meshes.push(lens);
      return lens;
    });
    return { node: nodeId, segment: arm.segment, x: mast.position.x, z: mast.position.z, lamps, meshes: [mast, ...lamps] };
  }

  /** Shows the state each mast's junction has reached. Runs every frame; it only sets colours. */
  function update(time: number): void {
    for (const mast of masts) {
      const cycle = cycles.get(mast.node);
      if (!cycle) continue;
      const state = signalAt(cycle, mast.segment, time);
      for (const [i, lens] of mast.lamps.entries()) {
        lens.instancedBuffers[VertexBuffer.ColorKind] = LAMP_ORDER[i] === state ? LAMP_COLORS[state] : LAMP_DARK;
      }
    }
  }

  // Driven from the same clock the traffic reads, so the lamp and the car agree on the moment.
  const beforeRender = () => {
    if (paused) return;
    simTime += (frameDelta() / 1000) * timeScale;
    update(simTime);
  };
  const beforeRenderObserver = scene.onBeforeRenderObservable.add(beforeRender);

  return {
    rebuild,
    setPaused: (next: boolean) => { paused = next; },
    setTimeScale(next: number) {
      timeScale = Math.max(0, next);
      paused = timeScale === 0;
    },
    count: () => masts.length,
    dispose(): void {
      scene.onBeforeRenderObservable.remove(beforeRenderObserver);
      for (const mesh of meshes) mesh.dispose();
      meshes = [];
      masts = [];
      mastMesh.dispose();
      lamp.dispose();
      metal.dispose();
      lampMaterial.dispose();
      cycles.clear();
    },
  };
}

export function signalMastTouchesBounds(mast: Pick<Mast, "x" | "z">, bounds: TerrainBounds): boolean {
  return mast.x >= bounds.minX && mast.x <= bounds.maxX && mast.z >= bounds.minZ && mast.z <= bounds.maxZ;
}

function signalJunctionTouchesBounds(graph: RoadGraph, junction: JunctionGeometry, bounds: TerrainBounds): boolean {
  const node = graph.node(junction.node);
  return (
    signalMastTouchesBounds(node.pos, bounds) ||
    junction.ring.some((p) => signalMastTouchesBounds(p, bounds)) ||
    junction.arms.some((arm) => signalMastTouchesBounds(arm.cornerLow, bounds) || signalMastTouchesBounds(arm.cornerHigh, bounds))
  );
}
