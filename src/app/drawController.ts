import type { RoadGraph, Segment } from "../sim/graph";
import type { Snap } from "../sim/rules";
import { commitSegment } from "../sim/rules";
import type { Vec3 } from "../sim/vec";
import type { RoadTypeId, DrawController } from "../render/drawTool";
import type { DebugRoadController } from "../render/debugApi";

type Controller = DrawController & DebugRoadController;

export function createDrawController(graph: RoadGraph): Controller {
  return {
    commitRoad: (from: Snap, to: Snap, control: Vec3, type: RoadTypeId) => commitSegment(graph, from, to, control, type),
    removeRoad: (segment: Segment) => graph.removeSegment(segment.id),
    setRoundabout: (node: number, enabled: boolean, lanes?: 1 | 2) => graph.setRoundabout(node, enabled, lanes),
  };
}
