## run_002_put_an_object_on_top_of_a_building_without_it_landing_in_the_street - Put an object on top of a building without it landing in the street
> Status: Active
> Category: other
> Verified: 2026-08-30 against the roof-prop placement in `src/render/buildings.ts` and commits `4f06cc6`..`c9d9df1`
> Related request: (none yet)
> Related backlog: (none yet)
> Related task: (none yet)
> Reminder: Update status, category, verification, and linked refs when you edit this doc.
> Indicators reviewed: 2026-08-30 11:16:54

# Trigger
- Placing anything on or against a building: roof clutter, a sign, an aerial, a balcony, a rooftop light.
- A placed object appears on the pavement, on the street-facing wall, on the corner of the roof, or on a neighbour's roof.
- Any placement that is "a small offset from the building".

# Prerequisites
- Know that this exact bug was fixed four times in a row (`4f06cc6`, `1b8f94e`, `af0ff4d`, `c9d9df1`) before the real cause was found. Every earlier fix was locally reasonable and still wrong.
- `src/render/buildings.ts`: `matrixFor`, the roof-prop loop, `roofPropY`.

# Procedure
1. **Never re-derive the placement transform.** `matrixFor(parcel, centerX)` already seats a building on its parcel. Express the object as a point in the building's own local space and push it through that same matrix with `Vector3.TransformCoordinates`. A hand-rolled rotation next to it will disagree — the first attempt got a sign flip on the cross terms that only showed up on roads that were not at a right angle.
2. **Know what the anchor means.** `parcel.position` is the **frontage edge facing the road**, not the centre of the roof. The footprint runs backward from it by the parcel's full depth along the building's local `-Z`. A "small offset from the parcel position" therefore lands on the street-facing wall, which is exactly what kept appearing in the screenshots. Reach the actual middle with `localZ = -halfDepth + offset`, where `halfDepth = (depthCells * 8 - 1.5) / 2`.
3. **Add `centerX` back on the local point.** `matrixFor`'s translation subtracts the model's own frontage centre (`centerX`), because a baked building vertex is still in that uncorrected local space. A point you author yourself is not — so `localX = offset + centerX`. Forget this and the object is displaced by `centerX`: unnoticeable on a 1x1 lot, a couple of car lengths on a 4-wide one.
4. **Keep the offsets small enough to be right by size, not by formula.** Every authored offset stays well under the 4 m half-width of the smallest lot it is offered to. A footprint-scaled, rotation-corrected offset is a formula that can be wrong; a small constant cannot be.
5. **Get the height from the model's own spec, not the bounding box alone.** `roofPropY` accounts for parapets, roof huts and pitched roofs; `boundsMaxY` alone puts objects on top of the parapet rather than on the deck.
6. **Seed layout choice off the parcel's own position** so a roof's clutter is stable across rebuilds, and leave most roofs bare — clutter everywhere reads as noise, not detail.

# Verification
Self-consistency is what made three of the four fixes look correct. Verify against independent geometry instead:
1. **Pair each placed instance against the exact parcel it came from.** Not a nearest-neighbour search across the city — in a dense block the nearest building is often not the right one, and the search reports success on a wrong placement.
2. **Compare to ground truth that knows nothing about the placement code:** the real centroid of the parcel's own buildable cells. Every prop should land within roughly its own offset of that centroid (2 m for the current layouts).
3. **Render bird's-eye, no perspective.** A perspective shot will happily show an object on the roof of the building behind it.
4. **Then look at a pulled-back shot of one specific object** next to a taller neighbour, to confirm what you are seeing is a dense block with mixed heights and not a misplacement.
5. **Test on `demoCity()`, not a toy scenario.** One of the "verified" states was checked against a scenario simple enough that the bug could not appear. A city with thousands of adjacent buildings is where a placement error shows.
6. Unit-test the pure part: `roofPropY` is covered in `src/render/buildings.test.ts` and needs no scene.

## Two traps that cost the most time
- **Do not explain the operator's screenshot away as perspective.** Three times in a row the placement was declared correct and the screenshots dismissed as a camera-angle illusion — a distant building's walls fading into the sky while its higher-contrast roof object stayed visible, or a neighbour of a different height. The reasoning was plausible each time and wrong each time. When a screenshot disagrees with your verification, the verification is measuring the wrong thing; go and reproduce exactly the view in the screenshot before saying anything.
- **A code fix does not appear in a live tab on its own.** The scene only redraws on a rebuild, so after an HMR reload the old placement is still on screen until a road is edited or the page is reloaded. More than one "still broken" report was the previous build.

# Rollback
- The placements are derived, not persisted: reverting the code restores correct rendering on the next rebuild, with no save migration.

# References
- `src/render/buildings.ts` -- `matrixFor` (the one transform), the roof-prop loop, `roofPropY`.
- `src/render/buildings.test.ts` -- the scene-free height test.
- Commits `4f06cc6` (feature + first fix), `1b8f94e` (missing `centerX`), `af0ff4d` (fixed small offsets), `c9d9df1` (the real cause: frontage edge, not roof centre).
- [[run_001_author_a_building_model_that_lands_on_its_parcel]]
- Session transcript, 2026-08-29 (the four-attempt loop, including the three self-consistent verifications that reported success).
