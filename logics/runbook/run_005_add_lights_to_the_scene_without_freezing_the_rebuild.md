## run_005_add_lights_to_the_scene_without_freezing_the_rebuild - Add lights to the scene without freezing the rebuild
> Status: Active
> Category: other
> Verified: 2026-08-30 against `src/render/streetlights.ts` and `src/render/traffic.ts` as shipped
> Related request: (none yet)
> Related backlog: (none yet)
> Related task: (none yet)
> Reminder: Update status, category, verification, and linked refs when you edit this doc.

# Trigger
- Adding any real light source: street lamps, headlights, signal lamps, window glow, a beacon.
- Drawing a road, bulldozing or switching view freezes the app for seconds on a real city.
- The frame rate drops when the camera pulls back, but not when it is close in.

# Prerequisites
- Know the measured shape of this problem before proposing anything: it was diagnosed by timing each step of the rebuild, and the answer was not where it was assumed to be.
- `src/render/streetlights.ts` (`rebuildLights`, the pool) and `src/render/traffic.ts` (the headlight pool and `ClusteredLightContainer`).

# Procedure
1. **Never create or dispose lights per rebuild — pool them.** Creating or disposing a light in Babylon walks every mesh in the scene, so the cost is lights × meshes. On a real city that was 714 lights (two per lamp) churned on every rebuild: **2.5 s to create, 1.0 s to dispose, 3450 ms of a 3.9 s rebuild**, against 136 ms for all the roads and 12 ms for all the traffic. Keep the lights and move them; create or dispose only the difference in count, which for one road drawn is a handful. Rebuild went 3.9 s → 0.41 s.
2. **Do not chase the material dirty mechanism.** Blocking it around the light churn changes nothing — it is the light objects themselves walking the scene, not shader recompiles. This was tried first and cost time.
3. **Put real lights in a `ClusteredLightContainer`.** Both the streetlight pool and the car headlights use one; it is what makes a few hundred simultaneous lights viable at all.
4. **Light only what is actually lit.** The streetlight pool is sized to the lamps that exist, headlights exist only at night (`lightsOn()`), and each is aimed at its car rather than parented to it.
5. **Budget before adding.** Headlights cost **8 fps at a whole-city view (59 → 51)** and nothing at all at street level (120 → 120) — the lost frames go into beams too small to see at that distance. That is why traffic signals render as instanced coloured lamps with **no real light at all**: the visual gain did not justify a second headlight-sized bill. Decide this explicitly rather than discovering it afterwards.
6. **A distance cull is the known next step**, not yet taken: culling beams beyond a camera distance would recover the wide-view frames. Do it if the pulled-back view becomes the one that matters.

# Verification
- **Time each step of the rebuild before attributing the freeze.** The freeze was assumed to be the traffic; traffic was 12 ms. Timing every step is what found it, and it took one measurement to overturn the assumption.
- Measure fps at **two camera distances** — whole city and street level. A light cost that is invisible up close can be most of the frame budget pulled back.
- Check the light count through the debug surface (`realStreetlights` reports the pooled total), so a regression that starts churning lights again shows up as a count that moves when it should not.
- Draw a road on a large city and confirm the rebuild stays sub-second.

# Rollback
- The pool is an implementation detail of the renderers; reverting restores the previous behaviour with no data implications. The freeze fix was deliberately committed on its own (`516d99d`) so it can be cherry-picked or reverted independently of the traffic work around it.

# References
- `src/render/streetlights.ts` -- `rebuildLights`, the pool, `realLightCount`.
- `src/render/traffic.ts` -- headlight pool, `ClusteredLightContainer`, `lightsOn()`.
- `src/render/signals.ts` -- instanced lamp colours, the deliberate no-real-light decision.
- Commit `516d99d` (the freeze fix, with the measured numbers in its message).
