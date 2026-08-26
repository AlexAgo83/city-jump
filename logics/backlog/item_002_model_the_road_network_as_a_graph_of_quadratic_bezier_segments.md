## item_002_model_the_road_network_as_a_graph_of_quadratic_bezier_segments - Model the road network as a graph of quadratic Bezier segments
> From version: 1.0.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 65%
> Complexity: Medium
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-26 17:33:17

# AI Context
- Summary: Settles the network's data model -- nodes, quadratic Bezier segments, one control point -- and the arc-length parameterisation every consumer depends on; three-dimensional positions behind a terrain-height function that returns zero.
- Keywords: road graph, node, segment, quadratic Bezier, arc length, cumulative distance table, split segment, terrainHeight, headless tests
- Use when: reading or changing the network's representation, asking for a position at a distance along a segment, splitting a segment, or deciding where an elevation comes from.
- Skip when: the work is rendering, drawing interaction or terrain relief -- this item deliberately contains no engine dependency.

# Problem
- Every later feature -- zoning, rendering, growth, traffic -- reads the network, so its representation has to be settled before any of them exists.
- A Bezier is not parameterised by length, so evenly spaced points along a curve cannot be obtained by stepping the curve parameter evenly; without solving this once, every consumer of the network gets the spacing wrong in the same way.

# Scope
- In:
  - A graph of nodes and segments, with a segment defined by two endpoint nodes and one control point.
  - Arc-length parameterisation: a per-segment polyline sample with cumulative distances, and a lookup answering position and tangent at a given distance.
  - Three-dimensional node positions and a single terrain-height function returning zero, sampled once when a node is placed.
  - Segment elevation interpolated between its nodes, and the gradient that follows from it.
  - Splitting a segment at a distance along it, preserving the shape of the original curve on both sides.
  - Tests covering the graph operations, the parameterisation and the split, running with no browser.
- Out:
  - Any rendering of the network.
  - Drawing, snapping, and the validation rules that belong to the tool.
  - Road types, lane counts and directions.

# Acceptance criteria
- AC1: Nodes and segments can be created, queried and removed, and a segment resolves its two nodes and its control point.
- AC2: Points requested every d metres along a curved segment and along a straight segment of the same length come back in the same number and evenly spaced on both.
- AC3: Node positions are three-dimensional and every elevation comes from the terrain-height function; no elevation is computed anywhere else.
- AC4: A segment reports its length and its gradient.
- AC5: Splitting a segment yields two segments that share a node and together trace the original curve.
- AC6: The tests run with no browser and no GPU, and a failure names the operation that broke.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: Nodes and segments can be created, queried and removed, and a segment resolves its two nodes and its control point.
- request-AC3 -> This backlog slice. Proof: AC2: Points requested every d metres along a curved segment and along a straight segment of the same length come back in the same number and evenly spaced on both.
- request-AC4 -> This backlog slice. Proof: AC3: Node positions are three-dimensional and every elevation comes from the terrain-height function; no elevation is computed anywhere else.
- request-AC13 -> This backlog slice. Proof: AC4: A segment reports its length and its gradient.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_001_a_city_that_grows_from_the_roads_you_draw`
- Architecture decision(s): (none yet)
- Request: `req_000_draw_a_road_network_the_city_grows_from`
- Primary task(s): `task_001_deliver_the_drawable_road_network_and_the_city_that_grows_from_it`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
