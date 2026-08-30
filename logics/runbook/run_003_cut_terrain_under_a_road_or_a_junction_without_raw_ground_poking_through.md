## run_003_cut_terrain_under_a_road_or_a_junction_without_raw_ground_poking_through - Cut terrain under a road or a junction without raw ground poking through
> Status: Active
> Category: other
> Verified: 2026-08-30 against `src/sim/heightmap.ts` and commits `aa8167e`, `1b45ae4`, `69d448c`, `70a112a`, `17ebabb`
> Related request: (none yet)
> Related backlog: (none yet)
> Related task: (none yet)
> Reminder: Update status, category, verification, and linked refs when you edit this doc.

# Trigger
- A wedge, notch or sliver of untouched terrain shows through a road surface, a junction plaza or a roundabout ring.
- A seam or gap appears where a road meets a junction on sloped ground.
- Speckle appears on a road drawn at exactly the terrain's own elevation.
- Adding a new kind of surface that has to sit on the ground (a new junction shape, a bridge deck, a plaza, a car park).

# Prerequisites
- `src/sim/heightmap.ts`: `conformToRoads`, `stamp`, `stampPolygon`, and the constants `EMBANKMENT`, `ROAD_BED_DROP`, `TUNNEL_COVER`, `JUNCTION_PRIORITY`.
- Understand the two-layer model: `base` is the ground as authored, `current` is the ground as the roads left it, and `claim` records how far the nearest claiming road was. Removing a road restores what was under it because `conformToRoads` starts from `base` again.

# Procedure
1. **The ground must be cut from the same geometry the surface is drawn from.** This is the rule every bug here has violated. An ordinary junction is rendered as an irregular hull — a wide-angle corner sits sideways as well as outward from the node — so flattening a *circle* sized off the widest arm's trim undercounts exactly that corner. Use `stampPolygon` with the junction's own `ring`, vertex for vertex, matching `junctionMesh`'s triangle fan.
2. **A varying surface needs a varying cut.** A roundabout ring follows each arm's own approach height, so the ground under it must read the same function at the same angle — that is why `stamp` accepts `elevation` as `(angle) => number` and why `ringElevation` is shared between the render mesh and the ground under it. One flat plane at the node's elevation leaves a gap at the seam on any slope.
3. **Nearest-wins is the default, and it is not always right.** Each arm keeps sampling and stamping every half cell right up to the node it ends at, so its stamps land inside the junction's own disc — and being far denser than the disc's single stamp, they win the distance race almost everywhere except the exact centre, leaving a jagged notch. The flat disc must beat them, which is what the `priority` bias is for.
4. **Scope the priority bias to the flat zone only.** `priority` applies where `distance <= half`, never across the embankment. Biasing the whole reach pushed the flat plateau out past where the road's own surface begins and moved the seam rather than removing it — in the embankment band a nearby road grades between the junction's height and natural terrain *along its own path*, which is the more locally accurate source, so leave that band as unbiased nearest-wins.
5. **Keep `ROAD_BED_DROP`.** The bed is cut slightly below the carriageway because bilinear sampling between cells otherwise lifts the terrain above a road drawn at the same elevation, and it shows as speckle.
6. **Tunnels are stamped like any other road, but only where they are not yet buried.** Skip the stamp where the untouched ground sits more than `TUNNEL_COVER` above the roadway; that confines the cut to the approach trench at each end and leaves the hill whole over the middle, which is the entire point of a tunnel.
7. **Any new constant here is a calibration knob, not a magic number.** `EMBANKMENT`, `ROAD_BED_DROP`, `TUNNEL_COVER` and `JUNCTION_PRIORITY` are all tuned against how the geometry actually renders; changing one is a visual change, and each carries the reasoning for its value in a comment. Keep that comment current.

# Verification
- **Numerically, not visually first.** A flattened disc should be a genuine plateau — assert it, do not squint at it. The earlier "fixed" states all looked plausible in a screenshot.
- **Add a heightmap regression test and confirm it fails against the previous behaviour before restoring the fix.** That is how `70a112a` was validated, and it is the only way to know the test tests anything.
- **Check against the real saved city, not a toy one.** The roundabout bugs only reproduced at scale: the Demo save's roundabouts were the subject, spot-checked at both the disc and its outer edge.
- **Check the edge as well as the middle.** Two of these bugs did not remove the seam, they moved it — to the disc boundary, or to where the embankment starts. Inspect both.
- Then `npm run test:visual` and `npm run test:e2e`.

# Rollback
- Terrain conformance is derived from the graph on every rebuild and nothing about it is persisted (node elevations in a save are recorded against the *pristine* heightmap, see `src/sim/save.ts`). Reverting the code fully restores the previous ground on the next rebuild; no save migration is ever needed.

# References
- `src/sim/heightmap.ts` -- `conformToRoads`, `stamp`, `stampPolygon`.
- `src/sim/junction.ts` -- `allJunctions`, `ringElevation`, the geometry the ground must match.
- `src/sim/heightmap.test.ts` -- the regression tests for each of these cases.
- Commits `aa8167e` (flatten every junction), `1b45ae4` (the disc must be authoritative), `69d448c` (scope the bias to the disc), `70a112a` (flatten the rendered polygon; ring elevation follows the arms), `17ebabb` (tunnel cover).
