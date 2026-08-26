## req_000_draw_a_road_network_the_city_grows_from - Draw a road network the city grows from
> From version: 1.0.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: City simulation core
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-26 17:54:16

# AI Context
- Summary: Settles the road network's representation -- a graph of quadratic Bezier segments, arc-length parameterised, drawn under snapping rules -- and everything the first playable loop derives from it: road surface, junctions, building slots as thin instances, and a heightmap the roads conform to.
- Keywords: road graph, quadratic Bezier, arc length, snapping, junction, building slots, thin instances, heightmap, Babylon.js, MeshAnvil GLB
- Use when: touching the road network, its geometry or its drawing tool; placing buildings; deciding how relief interacts with roads; or judging whether a new feature should read the graph rather than invent its own representation.
- Skip when: the work is traffic simulation, economy, bridges and tunnels, save/load, or junction detailing -- all named non-goals here and owned by later requests.

# Needs
- The repository is empty. `city-jump` is a 3D city-building game whose first playable loop is drawing roads and watching buildings appear along them, and nothing of it exists yet -- no engine, no scene, no data model, no dev command.
- The road network is not one feature among several; it is the structure every later feature reads. Zoning, building placement, growth and eventually traffic all derive from the same network. Choosing its representation late, or choosing it wrong, means rewriting everything built on top of it. It is therefore the first thing to model and the thing this request is about.
- Free-form placement of buildings anywhere on the map was the initial instinct and it is the wrong target. In the Cities:Skylines lineage the roads are freely drawn but the buildings are not: a building attaches to a road segment, aligned to that segment's normal, spaced along its frontage. The organic look comes from the curvature of the roads, not from arbitrary building positions. Following that model removes the need for arbitrary collision resolution, for orientation heuristics, and for any check that a building has road access -- properties that would each be a project of their own if placement were genuinely free.
- A network drawn without constraints degenerates: three-degree angles, forty-centimetre segments, and near-coincident nodes that are not the same node. Every one of those breaks junction geometry downstream. Constraints have to exist at draw time, in the tool, not as a cleanup pass afterwards.
- The engine has been chosen -- Babylon.js -- and the reason is that it already ships what a city renderer needs (thin instances, a glTF loader, a GUI layer, an inspector) so that none of it has to be written here. That decision only pays off if the project does not then wrap it in an abstraction of its own.
- Terrain relief is wanted, but building a terrain system before a single road is on screen would be building the hardest part first with nothing to check it against. What is needed now is not the relief itself but the shape that admits it later without a rewrite.

# Context
- The network is a graph, not a list of curves: a node is a point of the network (an endpoint or a junction), a segment joins two nodes. Everything else -- meshes, slots, later traffic -- is derived and disposable. The graph is the only thing persisted.
- A segment's curve is a quadratic Bezier: two endpoint nodes and exactly one control point. This is the Cities:Skylines model, and it is chosen over a cubic Bezier or a Catmull-Rom spline deliberately: one control point means one drag handle in the UI, no tangent continuity to reconcile between adjacent segments, and a curve that cannot loop back on itself. A cubic curve buys expressiveness this project does not need and costs constraints it would then have to enforce.
- A Bezier is not parameterised by length: the curve parameter at 0.5 is not the midpoint of the curve. Placing building slots at even curve-parameter intervals crowds them in the curves and stretches them on the straights, and it is immediately visible. The fix is to sample each segment into a polyline at roughly one point per metre when it is created and store the cumulative distances, so `position at d metres` is a binary search in that table. It is a small piece of code, and it is the piece that every consumer of the network depends on: slots, surface mesh, displayed length, construction cost, and later traffic.
- Snapping is what creates junctions. The player never places an intersection: a junction is what a node becomes when a third segment snaps to it, or when a segment is drawn onto an existing one and splits it. Four rules cover it -- snap to an existing node within a radius of a few metres, split an existing segment drawn onto, quantise positions to a small fixed step so two nodes at the same place are the same node, and refuse a segment below a minimum length. Angle snapping is deliberately absent: it is what would make the result look gridded rather than organic.
- Junction geometry has three tiers and the cheapest one is enough to unblock everything downstream: a flat disc of road surface laid over the node hides the segment ends and is a few lines; trimming each incident segment back by the junction radius and closing the gap with a polygon is correct in the overwhelming majority of cases; real junctions -- curb fillets, lane markings, signals -- are a multi-year subject that Cities:Skylines staffed a team for. This request delivers the first, then the second, and states the third as out of scope.
- Relief is handled by writing its interface now and shipping the flat implementation. Node positions are three-dimensional from the first line -- never a two-component pair -- and every elevation in the system is read from one `terrainHeight(x, z)` function that returns zero in the first pass. A node samples its elevation once, when it is placed, and keeps it; a placed road is a fixed road, which is what makes embankments possible later. A segment interpolates elevation between its nodes, which gives it a gradient, which gives the validation rules a maximum-gradient constraint that does nothing on flat ground and is ready when the ground is not flat.
- The real cost of relief is not the road going uphill, it is the terrain that has to be flattened beneath it -- without that, roads float over slopes or sink into them. On a heightmap that is a short routine: walk the segment's polyline, overwrite the cells within the road's width plus an embankment margin. On an arbitrary terrain mesh it is a project. The terrain is therefore a heightmap, and that is a decision, not a placeholder.
- Building models come from the sibling MeshAnvil pipeline as GLB, which Babylon's loader reads directly with no conversion step. The asset convention has to be fixed before the model library grows: one GLB per building, origin at the footprint corner, metre scale, a single fixed orientation. Fixing it after two hundred models exist is a two-hundred-model correction.
- Draw-call budget is the constraint that decides whether a city renders at all. Buildings are thin instances -- one matrix per building against a shared mesh -- which is why free placement was never in tension with performance: an instance matrix carries any position and rotation. What the slot model buys is not performance, it is the absence of a placement problem.
- The graph, the arc-length parameterisation and the validation rules are pure logic with no dependency on the engine, and they are where the defects that are hard to see will live. They are testable without a browser and without a GPU, and that is where the tests go. Rendering is checked by looking at it.

# Acceptance criteria
- AC1: The project builds and runs in a browser from a single dev command, rendering a Babylon.js scene with a controllable camera, with no engine wrapper or abstraction layer of the project's own standing between the application and Babylon.
- AC2: The road network is a graph of nodes and segments in which a segment is a quadratic Bezier defined by its two endpoint nodes and exactly one control point; the graph is the only persisted representation of the network and every mesh is derived from it and regenerated after each edit, never edited directly.
- AC3: A segment answers `position and tangent at distance d metres along me` with spacing that does not vary with curvature: asking a straight segment and a curved segment of equal length for points every d metres yields the same count, evenly spaced along each.
- AC4: Node positions are three-dimensional from the outset and every elevation in the system is read from one terrain-height function, so that making the ground non-flat changes that function and nothing in the graph; a node samples its elevation when it is placed and retains it.
- AC5: Roads are drawn with the pointer under four snapping rules -- snap to an existing node within a radius, split an existing segment drawn onto, quantise positions to a fixed step, and refuse a segment below a minimum length -- and no angle snapping is applied.
- AC6: A segment violating a validation rule is refused at draw time with its reason shown to the player and never enters the graph; the maximum-gradient rule is among them and is enforced on the segment's interpolated elevation.
- AC7: A junction exists only as a consequence of snapping -- a node incident to three or more segments -- and is never an object the player places directly; drawing onto an existing segment splits it into two segments sharing a new node.
- AC8: The network renders as a road surface generated from the graph, with a junction node covered so that no segment end is visible as an open edge.
- AC9: A junction renders as a surface joining its incident segments with each of them trimmed back to it, showing no gap and no overlapping seam at normal play camera distance.
- AC10: Buildings occupy slots derived from segments -- evenly spaced along the segment by arc length, offset to its side, oriented to its normal -- so that a building always fronts a road and no collision resolution is required to place one.
- AC11: Buildings render as thin instances of GLB models loaded from the MeshAnvil pipeline under a stated asset convention, and a network carrying at least a thousand buildings holds an interactive frame rate; the figure is measured and reported, not asserted.
- AC12: The ground is a heightmap that roads follow, and the terrain beneath a road is flattened to that road's own elevation across its width plus an embankment margin, so that no road floats above the ground or is buried by it.
- AC13: The graph, the arc-length parameterisation, the snapping rules and the validation rules are covered by tests that run with no browser and no GPU.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_001_a_city_that_grows_from_the_roads_you_draw`
- Architecture decision(s): (none yet)

# References
- logics/instructions.md

# Backlog
- `item_001_stand_up_the_babylon_scene_and_the_dev_loop`
- `item_002_model_the_road_network_as_a_graph_of_quadratic_bezier_segments`
- `item_003_draw_roads_with_the_pointer_under_four_snapping_rules`
- `item_004_generate_the_road_surface_from_the_graph_with_covered_junctions`
- `item_005_derive_building_slots_from_segments_and_render_them_as_thin_instances`
- `item_006_replace_disc_junctions_with_trimmed_back_polygons`
- `item_007_put_the_network_on_a_heightmap_and_flatten_the_terrain_beneath_it`
