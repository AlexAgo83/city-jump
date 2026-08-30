## run_007_the_code_says_it_drew_it_and_the_screen_disagrees - The code says it drew it and the screen disagrees
> Status: Active
> Category: other
> Verified: 2026-08-30 against the crossing-paint work in `src/render/roadMesh.ts` and `src/sim/transfers.ts`
> Related request: (none yet)
> Related backlog: (none yet)
> Related task: (none yet)
> Reminder: Update status, category, verification, and linked refs when you edit this doc.

# Trigger
- A feature is implemented, the counters say it exists, and it is not on screen.
- The operator sends the same screenshot again saying it is still missing.
- Something renders on some roads, junctions or arms and not on others, with no obvious pattern.

# Prerequisites
- Accept the premise before diagnosing: if the operator says it is not there, it is not there. The crossing paint was reported missing repeatedly while the counter reported it as painted — the counter was counting intent, not pixels.
- The debug surface (`installDebugApi`) exposes scene counts; use it to separate "not computed" from "not rendered", which are different bugs with different fixes.

# Procedure
Work down this ladder. Each rung is a bug that actually happened here.

1. **Is it computed at all?** Read the count from the debug surface. If it is zero, the problem is upstream and nothing about rendering matters yet.
2. **Did a silent guard skip it?** A space check reserved twice the trim of one end, so every arm shorter than `2 × ring radius + 5.6 m` was refused **with no message and no counter change**. A guard that returns early without saying so is indistinguishable from a feature that was never asked for. Make guards count their refusals.
3. **Is it facing away from the camera?** This was the crossing bug: the strips were built walking outward from the junction, so on an arm whose junction sits at the **start** of the segment they came out wound the other way — faces pointing down, removed by back-face culling. It existed in memory and was never rendered. Winding depends on which way each piece walks its points, and a ring, an arm and a junction polygon do not all walk the same way.
4. **Prove it by removing the variables**: hide everything else in the scene and turn off culling. If the geometry appears at once, the bug is orientation or occlusion, not computation. This is the single test that ended a multi-hour loop.
5. **Is it under something, or fighting for the same depth?** Flat overlays on a road live within centimetres of the surface; the paving deliberately lifts its marks (`MARK_LIFT`) for this reason.
6. **Is the browser showing the old build?** The scene only redraws on a rebuild, so after an HMR update the previous geometry stays on screen until a road is edited or the page is reloaded. More than one "still broken" report was the previous build.

Once it is understood, prefer the fix that removes the class of bug over the one that fixes the case: the paving material sets `backFaceCulling = false` because these marks are flat and seen from above, so drawing both faces is cheaper than getting every winding right in every walk direction — the reasoning is recorded at `src/render/roadMesh.ts:77`.

# Verification
- Reproduce **the operator's exact view** before claiming a fix — same camera, same city, same save. A different view is not evidence.
- Check every variant, not the one that was broken: all four arms of a crossroads, a T, a bend, a roundabout arm, and an arm at each end of its segment. Rung 3's bug only affected half of them, which is exactly why it looked intermittent.
- Do not explain a screenshot away with perspective, camera angle or neighbouring geometry until the ladder above is exhausted. That reasoning was used three times in a row on a different bug and was wrong every time — see `run_002_put_an_object_on_top_of_a_building_without_it_landing_in_the_street`.
- Then `npm run test:visual` and `npm run test:e2e`.

# Rollback
- Rendering-only; reverting restores the previous appearance with no data implications.

# References
- `src/render/roadMesh.ts` -- the paving material's `backFaceCulling` comment and `MARK_LIFT`.
- `src/sim/transfers.ts` -- `walkTransferPaths`, the single list the Traffic view draws, the pedestrians walk, and the paint is derived from.
- `src/render/debugApi.ts` -- the counters that separate "not computed" from "not rendered".
- [[run_002_put_an_object_on_top_of_a_building_without_it_landing_in_the_street]]
