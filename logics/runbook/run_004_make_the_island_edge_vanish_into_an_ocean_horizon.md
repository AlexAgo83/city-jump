## run_004_make_the_island_edge_vanish_into_an_ocean_horizon - Make the island edge vanish into an ocean horizon
> Status: Active
> Category: other
> Verified: 2026-08-30 against `src/render/ground.ts` and `src/render/scene.ts` as shipped
> Related request: (none yet)
> Related backlog: (none yet)
> Related task: (none yet)
> Reminder: Update status, category, verification, and linked refs when you edit this doc.

# Trigger
- The square edge of the 5400 m terrain is visible against the sky.
- The distance fades to a milky white wall instead of reading as open sea.
- A hard line, band or seam appears between the animated water and whatever is beyond it.
- Bright regular patches appear on the far water.

# Prerequisites
- This took roughly three hours across sessions before it worked. Read the failure list below before proposing anything; every entry is something that was tried and looked plausible.
- `src/render/ground.ts`: `createOcean`, `createFarOcean`, `waterFresnel`. `src/render/scene.ts`: the fog block and `horizonColor`.

# Procedure
The working combination is three things that only work together. Doing one of them alone is what produces each of the failure modes.

1. **A far ocean ring beyond the terrain**, `createFarOcean` in `src/render/ground.ts`. A **ring, not a disc** — a disc covers the beach. Fixed to the world, not parented to the camera. Sitting at `SEA_LEVEL - 4`: at `-1.5` it pierced through the animated water's wave troughs and showed as regular bright patches.
2. **The same Fresnel on both water surfaces.** `waterFresnel()` is shared by the animated water and the far ring. Putting it on the far ring only was the visible seam: the distant water brightened at grazing angles and the near water did not, and the join between them read as a hard line. This was diagnosed twice as something else before the shared-Fresnel cause was found.
3. **EXP2 fog whose colour is the horizon colour, not the water colour.** `scene.fogMode = FOGMODE_EXP2`, `fogDensity = 0.00016`, `scene.fogColor` driven by `horizonColor()` — the same function that colours the bottom of the skybox, so it follows the day cycle (pale blue at 14:00, orange at dusk, deep blue at night). Fog tinted toward the ocean instead makes the water dissolve into a blue mass with a hard top edge rather than into the sky. The skybox and the sun/moon discs set `fogEnabled = false`.

Supporting settings that are part of the effect, not incidental:
- `camera.maxZ = 60_000` with `camera.minZ = 2` — the far plane has to be beyond the ring, and the near plane is raised to keep depth precision usable at that range.
- `fogDensity` is the only knob EXP2 offers, and it has a floor: the fog must reach full opacity **before** the ring's outer edge, or the rim reappears. Lowering density means growing the ring and the far plane first, in that order.

# Verification
Every one of these was a wrong answer that looked right at the time:
- **Fog alone**: reads as thick white fog, not as sea. If the result looks milky, the density is doing work the ring should be doing.
- **A camera-parented disc**: unnecessary once the ring is large enough, and it introduces its own artefacts.
- **A disc instead of a ring**: hides the beach.
- **Fresnel on the far water only**: creates exactly the seam it was meant to remove.
- **Waiting for a sun glitter path on the water**: it cannot appear. `scene.ts` sets `sun.direction.y = -Math.max(0.05, daylight)`, so the sun stays near the zenith all day and only its azimuth turns; a specular highlight on a horizontal plane can never reach a grazing camera. The Fresnel compensates for the look; the real fix would be to the sun's own elevation, which is a separate change.

How to actually check:
1. Take a **grazing camera shot**, not a top-down one — this effect only exists at grazing angles, and an overhead shot shows nothing.
2. Look at three distances in the same frame: the beach, the animated water, and the far ring. All three transitions must be invisible.
3. Sweep the sun hour: the fog colour tracks `horizonColor()`, so an error shows up at dusk that does not show at 14:00.
4. `npm run test:visual` for the committed reference shot.

# Rollback
- Purely visual and entirely derived; reverting `ground.ts` and the fog block in `scene.ts` restores the previous look with no data implications.

# References
- `src/render/ground.ts` -- `createOcean`, `createFarOcean`, `waterFresnel`.
- `src/render/scene.ts` -- fog block (`fogMode`, `fogDensity`, `fogColor`), `horizonColor`, `camera.minZ`/`maxZ`, and the sun elevation note at the `sun.direction` assignment.
- Commit `909237e` (ocean blended into the horizon).
