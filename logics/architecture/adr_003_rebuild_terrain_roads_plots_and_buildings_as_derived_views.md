## adr_003_rebuild_terrain_roads_plots_and_buildings_as_derived_views - Rebuild terrain roads plots and buildings as derived views
> Date: 2026-08-27
> Status: Settled
> Related request: `req_002_establish_modular_repository_foundations`
> Related backlog: item_008_establish_modular_repository_foundations
> Related task: task_002_establish_modular_repository_foundations
> Drivers: (drivers to document)
> Reminder: Update status, linked refs, decision rationale, consequences, and follow-up work when you edit this doc.
> Indicators reviewed: 2026-08-27 11:17:09

# Overview
After a graph edit, rebuild disposable terrain and rendering projections in a fixed order
instead of synchronizing mutable copies of city geometry.

```mermaid
flowchart LR
  edit[Graph edit] --> conform[Conform heightmap]
  conform --> ground[Refresh ground and grid]
  ground --> roads[Rebuild roads and junctions]
  roads --> plots[Allocate plots]
  plots --> buildings[Rebuild building instances]
```

# Context
One road edit can change the heightmap, road surface, junction polygon, buildable plots,
and building instances. Updating those structures independently creates ordering bugs and
orphaned geometry while the current prototype rebuild cost remains comfortably interactive.

# Decision
- The application rebuild sequence is: conform the heightmap to the graph, refresh the
  ground and global grid, rebuild roads and junctions, then rebuild plots and buildings.
- Each renderer reads the current graph and replaces its disposable output. Rendered
  meshes and plot allocation are never edited as authoritative state.
- Plot overlap resolution is recalculated for the whole graph so road ordering cannot
  allocate the same ground twice.
- Keep the full rebuild until measured frame time shows that it misses the interaction
  budget. Any later incremental path must produce the same result as a clean rebuild.

# Consequences
- Reset, terrain changes, debug scenarios, and ordinary edits share one code path.
- The output is deterministic for a graph and terrain preset, which keeps browser checks
  reproducible.
- Full regeneration trades some CPU time for much simpler correctness today.
- Future optimization can invalidate affected graph regions without changing ownership or
  persistence boundaries.

# References
- Related request: `req_002_establish_modular_repository_foundations`
- Related backlog: (none yet)
- Related task: (none yet)
