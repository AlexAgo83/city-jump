## prod_001_a_city_that_grows_from_the_roads_you_draw - A city that grows from the roads you draw
> Date: 2026-08-26
> Status: Settled
> Related request: `req_000_draw_a_road_network_the_city_grows_from`
> Related backlog: `item_001_stand_up_the_babylon_scene_and_the_dev_loop`
> Related task: `task_001_deliver_the_drawable_road_network_and_the_city_that_grows_from_it`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.
> Indicators reviewed: 2026-08-26 17:54:17

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
- In: scaffolded request, product, backlog, orchestration task, validation, and handoff context.
- Out: unrelated workflow docs and implementation of generated tasks.

# Key product decisions
- Use structured input as the source of truth for generated docs.
- Keep generated write paths local and repo-bounded.

# Success signals
- Generated docs pass lint and audit without broad manual rewrites.
- Context-pack output can be handed to an implementation agent directly.

# References
- Product back-reference: `item_001_stand_up_the_babylon_scene_and_the_dev_loop`
- Task back-reference: `task_001_deliver_the_drawable_road_network_and_the_city_that_grows_from_it`
