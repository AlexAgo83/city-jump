## spec_003_put_the_network_on_a_heightmap_and_flatten_the_terrain_beneath_it_first_pass_spec - Put the network on a heightmap and flatten the terrain beneath it first-pass spec
> From version: 0.1.0
> Status: Settled
> Understanding: 100%
> Confidence: 95%

# Overview
The prototype provides rolling and rugged heightmap presets, a terrain-following reference
grid, and a controllable 24-hour directional light. Roads keep the elevation sampled when
their nodes are placed, and the ground is rebuilt around those fixed roads.

# Goals
- Exercise road placement and buildable plots on meaningful relief.
- Keep roads visually seated in the terrain without changing graph ownership.
- Let development inspect the same city under different sun directions and night light.

# Non-goals
- Player terrain sculpting, erosion, water, seasons, weather, or geographic sun accuracy.
- Moving an existing road vertically when the terrain preset changes.
- Bridges and tunnels, which require explicit segment state that suppresses conformance.

# Users & use cases
- A player uses the global grid and optional 2 m snap as spatial references on relief.
- A developer switches to rugged terrain and changes the sun hour to inspect road, plot,
  and building readability under harder conditions.

# Scope
- In:
  - Procedural heightmap presets, road-bed conformance, terrain reset behavior, reference
    grid visibility, grid snap, and directional daylight controls.
- Out:
  - Geographic simulation, dynamic shadows beyond Babylon defaults, and authored maps.

# Requirements
- Every elevation consumer reads the active terrain implementation; a graph node samples
  elevation once when placed and retains it.
- Rolling terrain uses the default gentle generator. Rugged terrain uses higher amplitude
  and shorter wavelength and must provide more than 20 m of measured relief.
- Changing terrain with existing segments asks for confirmation, then clears the fixed-
  elevation graph before regenerating the heightmap.
- Conformance starts from untouched base terrain on every rebuild, lowers the road bed by
  0.3 m, and blends back to base terrain across a 10 m embankment margin.
- The closest road sample owns a contested terrain cell; removing a road restores base
  terrain on the next rebuild.
- The reference grid follows terrain elevation and can be toggled independently from the
  2 m placement snap.
- The sun control spans 0 through 24 hours in 15-minute steps and updates direction,
  intensity, color, ambient contribution, sky color, and a formatted time label.

# Acceptance criteria
- AC1: Rolling and rugged presets produce different heightmaps; rugged relief exceeds
  20 m in the browser check.
- AC2: Accepted roads, plots, and buildings follow terrain, while a road above 10% grade
  is refused before entering the graph.
- AC3: The road bed remains below the road surface and blends to untouched terrain without
  floating or visible ground penetration in the checked scenarios.
- AC4: A confirmed terrain change clears the road graph; a cancelled change preserves it.
- AC5: Grid visibility, placement snap, and sun hour can be changed independently.
- AC6: Night hours reduce direct light while preserving enough ambient and sky response to
  inspect the scene.

# Validation / test plan
- `npx vitest run src/sim/heightmap.test.ts`
- `npm run test:e2e` checks terrain reset, relief, grid controls, sun change, and road render.
- Compare visual captures at representative daytime and night hours when lighting changes.

# Open questions
- Should changing terrain remain destructive once save/load and road editing exist, or
  should a future migration resample nodes and report invalid grades?

# Backlog
- source backlog: `item_007_put_the_network_on_a_heightmap_and_flatten_the_terrain_beneath_it`
