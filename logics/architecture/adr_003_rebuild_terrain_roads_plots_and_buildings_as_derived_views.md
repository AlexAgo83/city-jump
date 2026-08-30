## adr_003_rebuild_terrain_roads_plots_and_buildings_as_derived_views - Rebuild terrain roads plots and buildings as derived views
> Date: 2026-08-27
> Status: Settled
> Related request: `req_002_establish_modular_repository_foundations`
> Related backlog: item_008_establish_modular_repository_foundations
> Related task: task_002_establish_modular_repository_foundations
> Drivers: (drivers to document)
> Reminder: Update status, linked refs, decision rationale, consequences, and follow-up work when you edit this doc.
> Indicators reviewed: 2026-08-30 13:53:02

# Overview
After a graph edit, refresh disposable terrain and rendering projections in a fixed order
instead of synchronizing mutable copies of city geometry. Ordinary edits may pass dirty
bounds so renderers update only the affected region; reset, load, and terrain regeneration
still use the full path.

```mermaid
flowchart LR
  edit[Graph edit] --> conform[Conform heightmap]
  conform --> ground[Refresh ground and grid]
  ground --> roads[Refresh roads and junctions]
  roads --> plots[Allocate plots]
  plots --> buildings[Rebuild building instances]
```

# Context
One road edit can change the heightmap, road surface, junction polygon, buildable plots,
and building instances. Updating those structures independently creates ordering bugs and
orphaned geometry while the current prototype rebuild cost remains comfortably interactive.

# Decision
- The application refresh sequence is: conform the heightmap to the graph, refresh the
  ground and global grid, refresh roads and junctions, then rebuild plots and buildings.
- Each renderer reads the current graph and updates disposable output. Rendered meshes
  and plot allocation are never edited as authoritative state.
- Plot overlap resolution is recalculated for the whole graph so road ordering cannot
  allocate the same ground twice.
- Dirty refresh paths must produce the same result as a clean rebuild for the affected
  region. Full rebuild remains the correctness baseline and the load/reset path.

# Consequences
- Reset, terrain changes, and debug scenarios keep the full rebuild path; ordinary graph
  edits reuse the same order with dirty bounds.
- The output is deterministic for a graph and terrain preset, which keeps browser checks
  reproducible.
- Dirty refresh avoids recreating untouched terrain rows, road meshes, and traffic movers
  without changing ownership or persistence boundaries.

# References
- Related request: `req_002_establish_modular_repository_foundations`
- Related backlog: (none yet)
- Related task: (none yet)
