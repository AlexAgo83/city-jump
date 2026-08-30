## run_001_author_a_building_model_that_lands_on_its_parcel - Author a building model that lands on its parcel
> Status: Active
> Category: other
> Verified: 2026-08-30 against the 20-model library in `public/buildings/` and `scripts/gen_buildings.py`
> Related request: `req_009_building_geometry_facts_are_written_twice_in_two_languages_with_nothing_tying_them_together`
> Related backlog: `item_031_give_the_renderer_one_place_to_learn_a_model_s_geometry`
> Related task: `task_011_implement_one_source_of_truth_for_building_model_geometry`
> Reminder: Update status, category, verification, and linked refs when you edit this doc.
> Indicators reviewed: 2026-08-30 12:37:04

# Trigger
- Adding, regenerating or hand-authoring a `.glb` in `public/buildings/`.
- A building renders at the wrong scale, faces the wrong way, floats, sinks, or sits beside its parcel instead of on it.
- A regenerated model looks unchanged in the browser after a deploy.

# Prerequisites
- `docs/assets.md` is the contract; this runbook is the procedure and the traps around it. Read the contract first, it is short.
- Blender installed if regenerating: `/Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/gen_buildings.py`.
- Know that `src/render/buildings.ts` post-processes every loaded model; a model is not "done" when it exports.

# Procedure
1. **Build in Blender coordinates, not glTF ones.** Blender is Z-up; its glTF exporter maps Blender `+Z` to glTF `+Y` and Blender `+Y` to glTF `-Z`. A box built from `(0, 0, 0)` to `(w, d, h)` in Blender exports exactly onto the convention: origin at the front-left footprint corner, `x ∈ [0, width]`, `y ∈ [0, height]`, `z ∈ [-depth, 0]`, facade facing `+Z`. Do not attempt the mapping by hand in glTF space; build in Blender space and let the exporter do it.
2. **Keep the footprint honest.** The renderer reads the bounding box after loading and centres the model on the parcel's frontage, so a model whose geometry does not actually fill its declared `lot_<frontage>x<depth>` extent will be centred wrong. Generated lots are `cells * 8 - 1.5` metres, the 1.5 m being the gap inside the parcel.
3. **One material, no root transform.** Bake the geometry; do not pose it. Textures, if any, are embedded in the `.glb`, never sibling files.
4. **Keep the manifest with the mesh.** `scripts/gen_buildings.py` writes `public/buildings/manifest.json` next to the `.glb` files. Footprint dimensions come from the loaded mesh; roof deck, pitched ridge and setback bounds come from that manifest. A hand-authored model without a manifest entry still loads, but roof props use the mesh's top as a flat fallback.
5. **Bump `BUILDING_ASSET_VERSION`** in `src/render/buildings.ts` whenever a `.glb` changes. `render.yaml` serves `/buildings/*` with `public, max-age=31536000, immutable`; without the bump, returning visitors keep the old mesh forever.
6. **Expect the loader-side post-processing.** `loadModel` merges the parts, reparents off glTF's `__root__` handedness node with `setParent(null)`, bakes that transform into the vertices (so the thin-instance matrices replace an identity transform, not a flipped one), flat-shades, refreshes bounds, and enables edge rendering. Anything that assumes the mesh's local space must assume it **after** that bake, not as exported.

# Verification
- `npm run test:architecture` verifies the manifest against the shipped GLBs; `npm run test:visual` verifies the facade faces the road, the building sits inside its plot, and its height reads as plausible next to its neighbours.
- Check one model at both extremes of the library (`lot_1x1` and `lot_4x4`): scale errors that are invisible on a small lot are obvious on a large one.
- After a `.glb` change, hard-reload once and confirm the new mesh actually appears — if it does not, `BUILDING_ASSET_VERSION` was not bumped.

# Rollback
- `git checkout <ref> -- public/buildings/` restores the previous library; the `.glb` files are tracked.
- Reverting a model without reverting `BUILDING_ASSET_VERSION` is fine (a bump is only a cache key, never a correctness condition).

# References
- `docs/assets.md` -- the authoring contract.
- `scripts/gen_buildings.py` -- the reference implementation of the coordinate mapping.
- `src/render/buildings.ts` -- `loadModel`, `roofPropY`, `BUILDING_ASSET_VERSION`.
- Commit `7c342f9` (asset version introduced alongside a full library regeneration).
- [[run_002_put_an_object_on_top_of_a_building_without_it_landing_in_the_street]]
