## run_007_the_code_says_it_drew_it_and_the_screen_disagrees - The code says it drew it and the screen disagrees
> Status: Active
> Category: other
> Verified: 2026-08-30 against the crossing-paint work in `src/render/roadMesh.ts` and `src/sim/transfers.ts`, and the dirty-region rebuild review of `src/render/roadMesh.ts`
> Related request: (none yet)
> Related backlog: (none yet)
> Related task: (none yet)
> Reminder: Update status, category, verification, and linked refs when you edit this doc.
> Indicators reviewed: 2026-08-30 11:21:15

# Trigger
- A feature is implemented, the counters say it exists, and it is not on screen.
- The operator sends the same screenshot again saying it is still missing.
- Something renders on some roads, junctions or arms and not on others, with no obvious pattern.

# Prerequisites
- Accept the premise before diagnosing: if the operator says it is not there, it is not there. The crossing paint was reported missing repeatedly while the counter reported it as painted — the counter was counting intent, not pixels.
- The debug surface (`installDebugApi`) exposes scene counts; use it to separate "not computed" from "not rendered", which are different bugs with different fixes.

# Procedure
Work down this ladder. Each rung is a bug that actually happened here.

1. **Was it drawn and then thrown away?** Since rebuilds became region-based, a renderer can dispose geometry and then decline to recreate it, and every counter still reports it as present because it is still in the graph. Force a full rebuild -- reload the page, or call `rebuild()` with no dirty box. If it comes back, the bug is a partial rebuild whose dispose test is wider than its recreate test, and `run_008_repaint_only_part_of_the_world_without_losing_what_you_did_not_repaint` is the procedure. This rung is first because it is cheap and because it explains the shape the operator reports most often: it was there, an unrelated edit happened somewhere else, and now it is not.
2. **Is it computed at all?** Read the count from the debug surface. If it is zero, the problem is upstream and nothing about rendering matters yet. Check the count is not itself stale -- a statistic copied into a variable that the renderer updates behind the copy's back reports the last thing anyone told it, not the truth.
3. **Did a silent guard skip it?** A space check reserved twice the trim of one end, so every arm shorter than `2 × ring radius + 5.6 m` was refused **with no message and no counter change**. A guard that returns early without saying so is indistinguishable from a feature that was never asked for. Make guards count their refusals.
4. **Is it facing away from the camera?** This was the crossing bug: the strips were built walking outward from the junction, so on an arm whose junction sits at the **start** of the segment they came out wound the other way — faces pointing down, removed by back-face culling. It existed in memory and was never rendered. Winding depends on which way each piece walks its points, and a ring, an arm and a junction polygon do not all walk the same way.
5. **Prove it by removing the variables**: hide everything else in the scene and turn off culling. If the geometry appears at once, the bug is orientation or occlusion, not computation. This is the single test that ended a multi-hour loop.
6. **Is it under something, or fighting for the same depth?** Flat overlays on a road live within centimetres of the surface; the paving deliberately lifts its marks (`MARK_LIFT`) for this reason.
7. **Is the browser showing the old build?** The scene only redraws on a rebuild, so after an HMR update the previous geometry stays on screen until a road is edited or the page is reloaded. More than one "still broken" report was the previous build.

Once it is understood, prefer the fix that removes the class of bug over the one that fixes the case: the paving material sets `backFaceCulling = false` because these marks are flat and seen from above, so drawing both faces is cheaper than getting every winding right in every walk direction — the reasoning is recorded at `src/render/roadMesh.ts:77`.

# Verification
- Reproduce **the operator's exact view** before claiming a fix — same camera, same city, same save. A different view is not evidence.
- Check every variant, not the one that was broken: all four arms of a crossroads, a T, a bend, a roundabout arm, and an arm at each end of its segment. Rung 4's bug only affected half of them, which is exactly why it looked intermittent.
- Do not explain a screenshot away with perspective, camera angle or neighbouring geometry until the ladder above is exhausted. That reasoning was used three times in a row on a different bug and was wrong every time — see `run_002_put_an_object_on_top_of_a_building_without_it_landing_in_the_street`.
- Then `npm run test:visual` and `npm run test:e2e`.

# Rollback
- Rendering-only; reverting restores the previous appearance with no data implications.

# References
- `src/render/roadMesh.ts` -- the paving material's `backFaceCulling` comment and `MARK_LIFT`.
- `src/render/roadMesh.ts:659` -- `walkTransferPaths`, the single list the Traffic view draws, the pedestrians walk, and the crossing paint is derived from.
- `src/render/debugApi.ts` -- the counters that separate "not computed" from "not rendered".
- [[run_002_put_an_object_on_top_of_a_building_without_it_landing_in_the_street]]
