## spec_002_derive_building_slots_from_segments_and_render_them_as_thin_instances_first_pass_spec - Derive building slots from segments and render them as thin instances first-pass spec
> From version: 0.1.0
> Status: Settled
> Understanding: 100%
> Confidence: 95%

# Overview
Every road segment produces frontage slots and a visible buildable grid on both sides.
Cells follow short groups of similarly oriented slots so curves can recover useful depth,
and a cell is accepted only when its ground polygon does not overlap an older cell.

# Goals
- Show where road access permits construction before zoning semantics exist.
- Preserve up to five cells of depth around straight and gently curved roads.
- Guarantee that no ground area is allocated to two buildable cells.
- Render a large derived city with a bounded number of building draw calls.

# Non-goals
- Residential, commercial, or industrial zoning and demand.
- Lot ownership, construction timing, demolition, economy, and free building placement.
- Resolving overlap between the placeholder building meshes themselves.

# Users & use cases
- A player reads the cyan grid as the land a road makes constructible.
- A future zoning system consumes the same accepted cells rather than inventing another
  land-allocation model.

# Scope
- In:
  - Frontage slots, buildable-cell generation, overlap rejection, curve grouping, and
    placeholder building instances.
- Out:
  - Zone types, growth state, parcel merging chosen by the player, and persistence.

# Requirements
- Frontage slots are spaced every 16 m by segment arc length, offset 5 m beyond the road
  half-width, oriented toward the road, and cleared away from junction surfaces.
- Buildable cells are 8 m square and extend at most five rows perpendicular to the road.
- Consecutive same-side slots are grouped in blocks of at most three while their average
  heading differs by no more than 10 degrees; each block uses one stable local grid.
- Candidate polygons are checked against accepted nearby cells on separating axes. Touching
  edges are allowed; positive-area overlap is rejected.
- Segments are evaluated in graph creation order, so an older accepted cell wins a conflict.
- Buildings use the frontage slots and render as thin instances of shared GLB meshes.

# Acceptance criteria
- AC1: A sufficiently long straight road shows up to five complete 8 m rows on both sides.
- AC2: A gentle curve groups nearby frontage slots and produces deeper blocks than a
  one-column-per-sample layout where space permits.
- AC3: No two accepted buildable-cell polygons overlap, including cells from different
  roads around intersections and tight curves.
- AC4: Cells stay clear of junction geometry and every frontage slot faces its source road.
- AC5: At least one thousand buildings render as thin instances with the measured frame
  rate, count, and environment recorded.

# Validation / test plan
- `npx vitest run src/sim/slots.test.ts`
- `npm run test:e2e` checks visible grid depth and road-derived buildings.
- `npm run test:visual -- http://localhost:5173 city.png city` records the large scenario.

# Open questions
- Which accepted cells should merge into player-facing parcels once zone types and growth
  rules are scoped?

# Backlog
- source backlog: `item_005_derive_building_slots_from_segments_and_render_them_as_thin_instances`
