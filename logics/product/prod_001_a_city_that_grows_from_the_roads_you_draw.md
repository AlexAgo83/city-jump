## prod_001_a_city_that_grows_from_the_roads_you_draw - A city that grows from the roads you draw
> Date: 2026-08-26
> Status: Settled
> Related request: `req_002_establish_modular_repository_foundations`
> Related backlog: `item_008_establish_modular_repository_foundations`
> Related task: `task_002_establish_modular_repository_foundations`
> Related architecture: adr_001_keep_the_road_graph_as_the_source_of_truth
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.
> Indicators reviewed: 2026-08-27 11:11:42

# Overview
The first playable loop of city-jump: draw a curved road network with the pointer, and watch buildings take their places along it. The network is a graph the whole simulation reads from, the buildings are instanced models from the MeshAnvil pipeline, and the ground under both is a heightmap the roads conform to.

```mermaid
flowchart TD
  player[Player draws with the pointer] --> tool[Drawing tool<br/>node snap, segment split,<br/>2m quantisation, min length]
  tool -->|refused: too short or too steep| reason[Reason shown<br/>nothing enters the graph]
  tool -->|accepted| graph[Road graph<br/>nodes + quadratic Bezier segments<br/>the only persisted state]
  graph --> arc[Arc-length parameterisation<br/>polyline + cumulative distances]
  arc --> surface[Road surface mesh<br/>extruded cross-section]
  arc --> slots[Building slots<br/>evenly spaced, offset, oriented]
  graph --> junction[Junction surface<br/>segments trimmed back, gap closed]
  slots --> instances[Buildings as thin instances<br/>GLB from the MeshAnvil pipeline]
  graph --> flatten[Terrain flattened under the road<br/>width + embankment margin]
  height[terrainHeight&#40;x, z&#41;<br/>flat at first, heightmap later] --> graph
  height --> surface
  height --> slots
  heightmap[(Heightmap)] --> height
  flatten --> heightmap
  surface --> scene[Babylon scene]
  junction --> scene
  instances --> scene
```

# Goals
- Drawing a road feels free and the result looks organic, without the player ever placing an intersection.
- One representation of the network -- a graph -- that zoning, rendering and later traffic all read from, so no later feature has to invent its own.
- A building always fronts a road, by construction rather than by a check.
- A city of a thousand buildings renders at an interactive frame rate on an ordinary machine.
- Relief is a change to one function and a terrain pass, not a rewrite of the network.

# Non-goals
- Traffic simulation, vehicles, pathfinding, lane counts and one-way directions -- the graph accommodates them all unchanged, and none of them is built here.
- Bridges and tunnels; they need an elevated-segment flag that suppresses terrain flattening, and that is a later request.
- Real junction geometry: curb fillets, lane markings, signals.
- Economy, population, services, or any simulation of what the buildings do.
- Undo/redo, saving and loading a city, and multiplayer.
- Terrain sculpting tools for the player; the heightmap is authored, not edited in game.
- An entity-component system, a level editor, or any framework layer above Babylon.

# Scope and guardrails
- In: road construction, road-derived buildable land, procedural building placement,
  terrain conformance, and the environmental controls needed to evaluate the result.
- The road graph remains the only authored city state. Terrain, roads, junctions,
  buildable plots, and buildings are disposable projections of it.
- Simulation rules stay deterministic and independent from Babylon and browser APIs.
- Out: traffic, economy, services, progression, persistence, multiplayer, bridges,
  tunnels, and player-authored terrain until their own product slices are scoped.

# Key product decisions
- Represent the network as nodes and quadratic Bezier segments, with arc-length lookup
  computed once for every downstream consumer.
- Create junctions only through snapping and segment splitting; the player never places
  a junction object directly.
- Derive non-overlapping buildable cells from road frontage instead of placing buildings
  freely and resolving collisions afterwards.
- Keep elevation behind one terrain-height function and conform the heightmap beneath
  fixed-elevation roads.
- Render repeated buildings as thin instances and add complexity only when measured
  performance requires it.

# Success signals
- A new road can be drawn, snapped, validated, and rendered without creating a second
  representation of the network.
- Buildable land remains readable around straight and curved roads, reaches useful depth,
  and never allocates the same ground twice.
- A terrain change exercises meaningful relief without floating or buried road surfaces.
- At least one thousand buildings remain interactive in the target browser scenario, with
  the count, frame rate, and test environment recorded.
- Pure simulation tests, architecture boundaries, browser interaction checks, and Logics
  validation all run from documented repository commands.

# References
- Product back-reference: `item_008_establish_modular_repository_foundations`
- Task back-reference: `task_002_establish_modular_repository_foundations`
- Repository overview: `README.md`
- Asset contract: `docs/assets.md`
