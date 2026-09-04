import type { RoadGraph, Segment } from "../sim/graph";
import type { TerrainBounds } from "../sim/heightmap";
import type { Snap } from "../sim/rules";
import { commitSegment, quadraticLengthXZ } from "../sim/rules";
import { roundaboutRadius } from "../sim/junction";
import { demolitionRefund } from "../sim/economy";
import type { Vec3 } from "../sim/vec";
import type { RoadTypeId, DrawController } from "../render/drawTool";
import type { DebugRoadController } from "../render/debugApi";

type Controller = DrawController & DebugRoadController;
const ROAD_DIRTY_PAD = 140;

interface DrawControllerOptions {
  roadCost(type: RoadTypeId, metres: number): number;
  spend(cost: number, allowDebt?: boolean): boolean;
  refund(amount: number): void;
  onCommitted(dirty?: TerrainBounds): void;
}

export function createDrawController(graph: RoadGraph, options: DrawControllerOptions): Controller {
  return {
    commitRoad(from: Snap, to: Snap, control: Vec3, type: RoadTypeId, dirty: TerrainBounds, effects = true) {
      const cost = options.roadCost(type, quadraticLengthXZ(from.position, control, to.position));
      const result = commitSegment(graph, from, to, control, type);
      if (!result.ok) return result;
      if (effects) {
        if (cost > 0) options.spend(cost, true);
        options.onCommitted(expandBounds(dirty, ROAD_DIRTY_PAD));
      }
      return { ok: true };
    },
    removeRoad(segment: Segment, dirty: TerrainBounds, effects = true) {
      const refund = demolitionRefund(options.roadCost(segment.type, segment.length));
      graph.removeSegment(segment.id);
      if (effects) {
        if (refund > 0) options.refund(refund);
        options.onCommitted(expandBounds(dirty, ROAD_DIRTY_PAD));
      }
      return true;
    },
    setRoundabout(node: number, enabled: boolean, lanes?: 1 | 2) {
      const pos = graph.node(node).pos;
      const radius = roundaboutRadius(graph, node) + ROAD_DIRTY_PAD;
      graph.setRoundabout(node, enabled, lanes);
      options.onCommitted({ minX: pos.x - radius, maxX: pos.x + radius, minZ: pos.z - radius, maxZ: pos.z + radius });
      return true;
    },
  };
}

function expandBounds(bounds: TerrainBounds, by: number): TerrainBounds {
  return { minX: bounds.minX - by, maxX: bounds.maxX + by, minZ: bounds.minZ - by, maxZ: bounds.maxZ + by };
}
