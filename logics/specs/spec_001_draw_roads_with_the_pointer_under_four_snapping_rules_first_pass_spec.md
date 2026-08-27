## spec_001_draw_roads_with_the_pointer_under_four_snapping_rules_first_pass_spec - Draw roads with the pointer under four snapping rules first-pass spec
> From version: 0.1.0
> Status: Settled
> Understanding: 100%
> Confidence: 95%

# Overview
The player creates graph segments directly on the terrain with either a two-click straight
workflow or a three-click quadratic-curve workflow. Snap resolution and validation happen
before the graph changes.

# Goals
- Make road placement predictable without forcing an angular grid.
- Make existing network attachment visible before the player commits a segment.
- Refuse invalid geometry with a player-readable reason and no partial graph mutation.

# Non-goals
- Editing, deleting, upgrading, or undoing existing roads.
- Angle snapping, automatic tangent continuity, bridges, tunnels, and lane configuration.
- Detecting crossings away from the segment endpoint; that remains
  `req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto`.

# Users & use cases
- A player draws organic local streets and deliberately connects them to existing nodes or
  road surfaces.
- A developer can change graph or picking behavior and verify the interaction without
  interpreting rendered geometry manually.

# Scope
- In:
  - Straight mode: click a start and an end.
  - Curve mode: click a start, control point, and end.
  - Node, segment, optional world-grid, and free-position resolution.
  - Preview, node highlight, cancellation, validation, and atomic commit.
- Out:
  - Post-commit road editing and intersection detection beyond endpoint snapping.

# Requirements
- Node snap has first priority within 8 m and highlights the matched node.
- Segment snap has second priority within 4 m and splits the matched segment on commit.
- A free position is quantized to 2 m when grid snap is enabled and remains exact when it
  is disabled.
- Curve preview uses the chosen control point; straight preview uses the midpoint as its
  quadratic control so both modes commit the same graph shape.
- Right-click and `Esc` cancel the active placement without changing the graph.
- A segment shorter than 8 m, steeper than 10%, or ending on its start node is refused.
- A refusal remains in the current placement stage so the player can choose another end.

# Acceptance criteria
- AC1: Straight mode commits after two left clicks and curve mode commits after three.
- AC2: A node within 8 m wins over segment and grid candidates and is highlighted before
  the click.
- AC3: Ending within 4 m of a segment splits it into two segments sharing the new endpoint.
- AC4: Grid snap rounds free positions to 2 m and can be disabled without disabling node
  or segment snap.
- AC5: Invalid segments show the minimum-length, maximum-grade, or identical-endpoint
  reason and leave the graph unchanged.
- AC6: Right-click or `Esc` returns the tool to idle and no angle snap is applied.

# Validation / test plan
- `npx vitest run src/sim/rules.test.ts src/sim/graph.test.ts`
- `npm run test:e2e` against a running development server.

# Open questions
- How should automatic crossing detection distinguish a real at-grade junction from a
  future bridge or tunnel crossing?

# Backlog
- source backlog: `item_003_draw_roads_with_the_pointer_under_four_snapping_rules`
