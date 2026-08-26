import type { RoadGraph, NodeId } from "./graph";
import { roadType } from "./roadTypes";

/** Widest incident carriageway; the junction has to cover at least that. */
export function widestIncidentWidth(graph: RoadGraph, nodeId: NodeId): number {
  let widest = 0;
  for (const segId of graph.node(nodeId).segments) {
    widest = Math.max(widest, roadType(graph.segment(segId).type).width);
  }
  return widest;
}

/** Radius the incident roads are covered to. A little over half-width closes the wedge
 * a bend leaves on its outside. */
export function junctionRadius(graph: RoadGraph, nodeId: NodeId): number {
  return widestIncidentWidth(graph, nodeId) * 0.75;
}
