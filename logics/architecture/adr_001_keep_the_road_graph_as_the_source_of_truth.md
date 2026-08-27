## adr_001_keep_the_road_graph_as_the_source_of_truth - Keep the road graph as the source of truth
> Date: 2026-08-27
> Status: Settled
> Related request: `req_002_establish_modular_repository_foundations`
> Related backlog: item_008_establish_modular_repository_foundations
> Related task: task_002_establish_modular_repository_foundations
> Drivers: (drivers to document)
> Reminder: Update status, linked refs, decision rationale, consequences, and follow-up work when you edit this doc.
> Indicators reviewed: 2026-08-27 11:17:09

# Overview
The authored shape of a city is its road graph; every spatial city feature derives from
that graph or attaches simulation state to its stable identifiers.

```mermaid
flowchart LR
  input[Road drawing] --> graph[(Road graph)]
  graph --> roads[Roads and junctions]
  graph --> plots[Buildable plots]
  graph --> buildings[Building instances]
  graph --> terrain[Terrain conformance]
  graph -. stable IDs .-> future[Future zoning and traffic state]
```

# Context
Road surfaces, junctions, plots, buildings, terrain conformance, and later traffic all
need the same network topology. Persisting any of those projections independently would
allow them to disagree after a split, removal, or terrain change.

# Decision
- Store roads as nodes and quadratic Bezier segments. Nodes own fixed three-dimensional
  positions; segments own endpoint references, one control point, and a road type.
- Keep the graph in `src/sim/graph.ts` independent from rendering concerns.
- Address future traffic, zoning, and persistence state through graph node or segment
  identifiers instead of copying road geometry into another model.
- Never treat Babylon meshes, plot polygons, or building instance matrices as authored
  city state.

# Consequences
- Splitting or removing a segment has one canonical operation and every consumer sees the
  same topology on rebuild.
- Save data can begin with the graph and add explicit simulation state as features arrive.
- Consumers pay the cost of deriving their views. Incremental caches are allowed later
  only when measurement requires them and must remain disposable.
- Bridges, tunnels, and lane direction will extend segment data when scoped; they do not
  require a parallel network representation.

# References
- Related request: `req_002_establish_modular_repository_foundations`
- Related backlog: (none yet)
- Related task: (none yet)
