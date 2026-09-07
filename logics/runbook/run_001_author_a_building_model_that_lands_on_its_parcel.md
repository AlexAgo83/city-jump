## run_001_author_a_building_model_that_lands_on_its_parcel - Author a building model that lands on its parcel
> Status: Active
> Category: other
> Verified: 2026-09-07 urban variants and four towers: GLB budgets, stable selection, terrace roofs and district/distant/mobile captures; earlier building and kaiju checks retained
> Related request: `req_009_building_geometry_facts_are_written_twice_in_two_languages_with_nothing_tying_them_together`
> Related backlog: `item_031_give_the_renderer_one_place_to_learn_a_model_s_geometry`
> Related task: `task_011_implement_one_source_of_truth_for_building_model_geometry`
> Reminder: Update status, category, verification, and linked refs when you edit this doc.
> Indicators reviewed: 2026-09-07 11:37:19

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
3. **One merged mesh, few materials, no root transform.** Bake the geometry; do not pose it. Multiple material slots are supported and needed for wall/glass/trim. Each exported primitive adds rendering work across instances. Textures, if any, must be embedded; the current building material conversion does not preserve their maps, so texture work also needs renderer support and browser proof.
4. **Keep the manifest with the mesh.** `scripts/gen_buildings.py` writes `public/buildings/manifest.json` next to the `.glb` files. Footprint dimensions come from the loaded mesh; roof deck, pitched ridge and setback bounds come from that manifest. A hand-authored model without a manifest entry still loads, but roof props use the mesh's top as a flat fallback.
5. **Ship asset changes in a versioned release.** `src/render/assets.ts` derives the model cache key from `package.json`. `render.yaml` serves `/buildings/*` with `public, max-age=31536000, immutable`; without a release version change, returning visitors can keep the old mesh for up to a year.
6. **Expect the loader-side post-processing.** `loadModel` merges the parts, reparents off glTF's `__root__` handedness node with `setParent(null)`, bakes that transform into the vertices (so the thin-instance matrices replace an identity transform, not a flipped one), and refreshes bounds. It deliberately does not call `convertToFlatShadedMesh`: that previously dropped material submeshes. Author flat faces in the asset. Anything that assumes the mesh's local space must assume it **after** that bake, not as exported.

# Improving existing models
- Edit `scripts/gen_buildings.py`, then regenerate the GLBs; changing only a binary is lost on the next generation. `building_specs()` owns lot sizes, heights and style selection. That legacy lot style is selected by footprint; residential/commercial now use `urban_specs()` and `build_urban()` with their own kind and variant.
- For facade-only work with unchanged roof facts, run `/Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/gen_buildings.py -- --lots-only`. This refreshes the 16 `lot_*` assets without overwriting farms, industry, military or the manifest. If heights/setbacks change, use the full generation command and review the manifest diff too. `--military-only` is the existing separate military workflow.
- `buildingModelId()` in `src/render/buildings.ts` selects the runtime asset: farms, industry and military use their dedicated models on depth-four parcels. The legacy `house`, `shop`, `block`, `tower` files are not the generated lot library. Residential/commercial use their own suffixed assets; editing only `shop.glb` or `lot_*.glb` will not improve those districts.
- Preserve the body dimensions and existing projections: the body leaves 0.75 m per cell edge; window frames project 0.62 m, commercial awnings 0.75 m toward the road. Detail must not enlarge the whole model arbitrarily because the loader derives its frontage centre from actual bounds.
- Window glass is 0.44–0.50 m outside the wall, frames 0.50–0.62 m. A mullion placed at 0.12 m is behind the glass and cannot divide the window. Check front, side and distant views, not only Blender.
- `normalizeBuildingMaterial` converts imported PBR materials to StandardMaterial. `_glass`, `_trim`, `_door`, `_sign` and `_awning` names trigger specific runtime colours/reflections; roughness/metallic changes in Blender alone do not establish the game appearance. Keep windows opaque; use geometry for frame separation.
- Roof huts currently reach deck + 1.5 m. Pitched ridge heights and setback decks are asserted by `tests/building-assets.mjs`. Keep new details below those maxima unless deliberately updating the roof contract. Runtime roof clutter is separate: consult run_002 before changing its placement.
- Prefer silhouette, bay spacing, visible entrances and a few roof details over tiny repeated parts. Current lot checks cap each GLB at 750 kB, 14,000 triangles, seven primitives and one merged mesh; these are regression ceilings, not performance targets.
- Kaiju work follows `scripts/gen_kaiju.py`, `public/kaiju.manifest.json`, `src/render/kaiju.ts`, `tests/kaiju-assets.mjs` and `scripts/kaiju-shot.mjs`. Preserve named animated nodes/pivots. Vehicles are procedural in `src/render/vehicleModels.ts`, not building GLBs.

## Residential/commercial variants and towers
- Regenerate with `/Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/gen_buildings.py -- --urban-only`. Ship all 76 urban GLBs and the updated `public/buildings/manifest.json`. Full generation includes them too; `--lots-only` intentionally remains a legacy-only refresh.
- Each kind has `a` and `b` variants on all 16 footprints. `a` is a low house/collective or shop (under 14 m); `b` uses residential windows/balconies or office glazing and larger, asymmetric setbacks. Keep small frontage usable: individual residential panes, and floor bands/continuous office piers, avoid a separate frame mesh per pane on tall models.
- Four original towers: `residential_3x3_tower` (64.5 m including plant), `residential_4x4_tower` (twin shafts, 85.5 m), `commercial_3x4_tower` (stepped, 109.5 m), `commercial_4x3_tower` (slender, 133.5 m). These are zone-eligible footprints: residential packing uses `LOW_RISE_SIZES`, commercial uses `DENSE_SIZES`. Those names are packing palettes, not sufficient height guards.
- `buildingModelId()` reuses the stable position/size roof seed: about one in seven eligible large parcels receives a tower; higher seed bits select one of its three silhouettes; the others split between `a` and `b`. Use higher seed bits for that split to avoid grid parity bias. No height, clock, array order or runtime random state enters the choice. Any `parcel.cells[].lowRise` forces `a`, even with commercial zoning. No economy or save schema change is involved.
- Each eligible footprint also has `_tower_steps` and `_tower_offset`: residential terraced slabs (79.5 m) and unequal L wings (97.5 m); commercial crowned towers (121.5 m) and offset upper shafts (115.5 m). Terraced residential models use warm masonry; L wings have sparse balcony bands; crowned offices omit horizontal spandrels and offset towers omit vertical piers. These alter massing and facade rhythm, not just tint. Regenerate all twelve with `-- --towers-only`; the other families are preserved. The selection test covers every variant, pedestrian exclusion and stable save/reload selection; GLB tests require distinct deck layouts within each footprint.
- A `terraced` roof stores the rectangular decks generated directly from the authored volumes. `roofPropY` picks the highest containing deck; the gap between twin shafts is the podium, not the tallest roof. Preserve the baked-handedness X mapping used by existing setback roofs. GLB bounds remain the source for construction and optional box heights.
- Keep each urban GLB below 750 kB, 14,000 triangles and six material primitives; keep the family below 12 MiB. Check with `node --test tests/building-assets.mjs`; model selection and terrace placement are covered by `src/render/buildings.test.ts`.
- Capture with `node scripts/with-dev-server.mjs scripts/buildings-shot.mjs /tmp/city-jump-urban urban`. This builds a mixed, fully grown debug city through actual zoning/packing, captures district/distant/mobile views, then isolates representative models through the same imported materials. It is a visual fixture, not an economic playthrough. Inspect the images, especially masonry versus office glass and podiums between towers.
- The library now loads 107 models including legacy lots, compounds and three residual industrial 1x1 variants. Loading stays asynchronous and rebuilds remain debounced. The E2E model inventory and zoning checks must include residential/commercial names; filtering only `building_lot_` silently misses the new city.
- Verified the twelve tower models, mixed district and desktop/distant/mobile captures on 2026-09-07; `npm run ci` and `npm run test:e2e` passed.
- Reference captures after the tower variety pass: `docs/media/buildings-towers-district.png`, `docs/media/buildings-towers-distant.png` and `docs/media/buildings-towers-mobile.png`. Asset cache keys still follow the release version; local changes are not a production release.

## Industrial layouts
- Refresh only industry with `/Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/gen_buildings.py -- --industrial-only`. The four `industrial_*x4` models retain `cells * 8 - 1.5` width, 30.5 m depth and a 7.5 m shed deck; the manifest is unchanged. The foundation anchors exact bounds at ground/front-left.
- Layouts: 1x4 tank depot, 2x4 boiler/stack, 3x4 freight warehouse, 4x4 combined works. Size equipment against usable width: the former 3 m tank at x=4 could never fit the 6.5 m narrow depot. Keep the large works' tanks to the right of its warehouse, with the overhead pipe rack ending before them.
- Reuse `box`, `prism`, `gabled_roof_at`, `material` and `export_parts`. A cylinder along X can bake `(x,y,z)` to `(offset+z, centre+y, height-x)`; swapping X/Z without negating one axis reflects face winding instead of rotating it.
- Ribbed cladding, shutter seams, clerestory bars, gutters, chimney ladder, service walkway, tank bands and loading docks use eight materials at most. GLB tests enforce exact footprint, baked transforms, tank presence/separation, <10,000 triangles and <600 kB per works.
- Browser inspection: `node scripts/with-dev-server.mjs scripts/buildings-shot.mjs /tmp/city-jump-industrial industrial`. Verified all four on 2026-09-07; reference capture: `docs/media/buildings-industrial-4x4.png`. Inspect all four sizes: a large model looking correct does not prove a narrow model contains the equipment its name promises.

## Small industrial residual lots
- `buildingParcels()` falls back to a 1x1 when no preferred industrial depth-four rectangle fits. These parcels previously selected generic `lot_1x1`. Keep packing and demand unchanged; `buildingModelId()` now selects `industrial_1x1_a`, `_b` or `_c` using the stable position/size roof seed.
- Variants: pitched-roof workshop with side glazing and vent; flat-roof delivery depot with loading canopy and crates; narrow boiler house with a separate cuve and 8 m stack. All sit inside 6.5 x 6.5 m, with a ground/front-left foundation anchoring exact bounds. Runtime roof props remain disabled for industry.
- Generate only these three with `/Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/gen_buildings.py -- --industrial-small-only`. `--industrial-only` and full generation include them too. Ship the GLBs and manifest; the small command preserves all other entries/assets.
- `tests/building-assets.mjs` checks bounds, transforms, equipment and limits of 2,000 triangles / 150 kB / eight materials per model. The renderer test runs actual single-cell industrial packing and verifies that all three models are selected across different world positions. Cell column metadata alone is not a world-position fixture.
- `node scripts/with-dev-server.mjs scripts/buildings-shot.mjs /tmp/city-jump-industrial-small industrial-small` verifies all three have instances in a zoned industrial city, captures that district and isolates each model through the real loader/material conversion. Reference: `docs/media/buildings-industrial-1x1-c.png`.
- Verified on 2026-09-07: 49 workshop, 69 depot and 47 boiler-house instances in the industrial fixture. Individual references: `docs/media/buildings-industrial-1x1-a.png`, `docs/media/buildings-industrial-1x1-b.png` and `docs/media/buildings-industrial-1x1-c.png`. CI and E2E passed; the initial E2E run failed the unrelated FPS comparison (800 ms measurement versus 500 ms HUD window), then passed on rerun without code changes.

## Farm layouts
- Regenerate only farms with `/Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/gen_buildings.py -- --farms-only`. Variants remain 1x4 market garden, 2x4 grain, 3x4 orchard, 4x4 livestock. The manifest retains the existing 5 m deck fact; farm roofs receive no runtime roof props.
- Keep the 11 m front yard and 30.5 m total depth. Include the crop bed after each greenhouse in the loop's depth condition: testing only the tunnel length previously let the final bed extend beyond the plot. The yard/soil now anchor exact ground/front-left bounds.
- Barrel greenhouses use eight roof segments and outward-wound caps, with opaque polythene and separate arch strips. Transparent glass would need a separate runtime material decision. Rounded silos use 20 sides; two low-resolution icosphere lobes per orchard tree give a deterministic crown without random generation.
- Fences are posts with two rails, including an opening between paddocks. Livestock shelter is open on three sides, water sits inside the trough, and horizontal hay bales use the same orientation-preserving cylinder rotation as industrial pipes. Keep crown extents, silo bands and trough geometry within the real parcel bounds.
- Crop colours are intentionally muted and grain uses thin rows instead of solid slabs. Check from the normal game camera as well as close up: fine rows may merge at distance, while a bright flat field dominates the neighbourhood.
- `node scripts/with-dev-server.mjs scripts/buildings-shot.mjs /tmp/city-jump-farms farm` captures all four farm variants through runtime materials. `tests/building-assets.mjs` checks bounds (including the last crop bed), baked transforms, distinctive material geometry, <8,000 triangles, <500 kB and at most ten primitives per farm.

## Articulated kaiju
- Author in `scripts/gen_kaiju.py` and regenerate with `/Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/gen_kaiju.py`. Ship `public/kaiju.glb` and `public/kaiju.manifest.json` together. The generator computes floor/height and normalises the complete creature to 98 m; do not scale parts independently afterwards.
- This is eight named rigid groups, not a skinned skeleton: `kaiju_body`, `kaiju_head`, `kaiju_jaw`, `kaiju_left_arm`, `kaiju_right_arm`, `kaiju_left_leg`, `kaiju_right_leg`, `kaiju_tail`. `finish()` joins details into their moving group, sets its pivot, projects UVs and retains it for export. Teeth belong to their own jaw/head; claws to the complete limb.
- Unlike buildings, **retain group translations and glTF's handedness root**. `src/render/kaiju.ts` animates group rotations directly: legs/arms/jaw around local X, tail around local Y. Merging the whole creature or zeroing pivots breaks animation. `tests/kaiju-assets.mjs` checks the pivot layout relative to the body, allowing only the common height normalisation.
- `flesh()` joins overlapping ellipsoids, voxel-remeshes at 0.32, smooths, adds dermal relief and decimates. Add overlap at shoulders/hips within the existing groups; never weld across animated groups. Inspect near maximum stride to detect a visible joint gap or an armour piece moving with the wrong parent.
- Keep the muzzle, mouth lining and teeth aligned while shaping the skull/jaw. Shallow overlapping belly shields reduce the separate-bead appearance; their centre must follow the actual torso surface. Fewer shoulder horns and varied dorsal widths leave a clearer silhouette.
- Tail control points and their radii define the rest pose; Bezier interpolation rounds the tube between them. Keep the base at its existing pivot and attach plates/scutes to the tail group. This changes the mesh silhouette, not the number of joints or the animation behaviour.
- Unlike building materials, the kaiju renderer keeps imported PBR materials and embedded base-colour/normal maps. `skin_textures()` is deterministic (seed 17); keep both maps packed, UVs present and material groups intact. Existing export ceilings are 180,000 triangles and 12 MiB; the 2026-09-07 model is 143,684 triangles / approximately 4.67 MiB.
- Run `node --test tests/kaiju-assets.mjs`, then `node scripts/with-dev-server.mjs scripts/kaiju-shot.mjs /tmp/city-jump-kaiju`. The browser harness waits for all six animated groups to rotate, captures near maximum leg stride, and checks loaded materials on desktop, side view and mobile. Open the images; rotation assertions alone do not prove good joint shape. Reference: `docs/media/kaiju-refined-profile.png`.

# Verification
- `npm run ci` checks code, scenarios, GLB geometry/manifest and Logics. `npm run test:e2e` exercises the actual application. Neither alone proves appearance.
- `node scripts/with-dev-server.mjs scripts/buildings-shot.mjs /tmp/city-jump-buildings` captures 1x1, 2x2, 3x4 and 4x4 through the actual loader/material conversion. It isolates meshes and neutralises instance tint; this is a geometry inspection, not proof of placement in a live city.
- `node scripts/with-dev-server.mjs scripts/shot.mjs /tmp/city-jump-buildings-city.png city` checks a populated city. Open the images and inspect frontage direction, neighbour clearance and readability. Store selected durable captures under `docs/media/`; keep temporary output outside the repository.
- Check one model at both extremes of the library (`lot_1x1` and `lot_4x4`): scale errors that are invisible on a small lot are obvious on a large one.
- After a `.glb` change, hard-reload once and confirm the new mesh actually appears. If it does not, confirm the shipped release version changed.

## Last verified pass — 2026-09-07
- Earlier passes regenerated the 16 legacy lots, four works and four farms. The urban pass adds 64 variants and four towers using `--urban-only`, updating their manifest entries. Military assets remain unchanged.
- `npm run ci`: 365 unit tests, 26 architecture tests, scenarios, build and Logics checks passed. `npm run test:e2e`: all interaction checks passed.
- Inspected isolated browser captures for lots, works and farms, plus the populated `city` capture. Farm references: `docs/media/buildings-farm-3x4.png` and `docs/media/buildings-farm-4x4.png`. Example: `docs/media/buildings-lot-2x2.png` (game material conversion, isolated model). The inspection harness is not a before/after performance benchmark; geometry budgets alone do not prove unchanged frame rate.

- Urban visual fixture: 1,818 buildings, 30 active urban models, 20 tower parcels covering all four tower designs. Inspected district, distant, mobile and nine isolated model captures. Urban library: 8,465,684 bytes; largest GLB 740,740 bytes (twin residential tower). This is not a performance comparison.

# Rollback
- `git checkout <ref> -- public/buildings/` restores the previous library; the `.glb` files are tracked.
- Reverting a model without reverting the release version is fine (the query value is only a cache key, never a correctness condition).

# References
- `docs/assets.md` -- the authoring contract.
- `scripts/gen_buildings.py` -- the reference implementation of the coordinate mapping.
- `src/render/buildings.ts` -- `loadModel`, `roofPropY`.
- `src/render/assets.ts` -- package-derived immutable-cache query key.
- Commit `7c342f9` (asset version introduced alongside a full library regeneration).
- [[run_002_put_an_object_on_top_of_a_building_without_it_landing_in_the_street]]
