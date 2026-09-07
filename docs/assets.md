# Building asset convention

Anything that authors a building model for city-jump — MeshAnvil, Blender by hand, or
whatever comes next — obeys this. It is fixed now on purpose: correcting it once two
hundred models exist is a two-hundred-model correction.

## Format

- **glTF binary (`.glb`)**, one file per building, in `public/buildings/`.
  Babylon's loader reads it with no conversion step.
- The filename without its extension is the model's id.
- One material per model is enough. Textures are allowed but must be embedded in the
  `.glb`, not referenced as sibling files.

## Units and orientation

glTF is Y-up. In the exported file:

- **Scale is metres.** A three-storey building is about 9 units tall, not 0.09 and not 900.
- **Origin** sits at the **front-left corner of the footprint, at ground level** — so the
  model occupies `x ∈ [0, width]`, `y ∈ [0, height]`, `z ∈ [-depth, 0]`.
- **The facade faces `+Z`.** The plane `z = 0` is the front of the building, the side that
  meets the street.
- No transform on the root node: the geometry is baked, not posed.

The renderer reads each model's bounding box after loading and centres it on the slot's
frontage, so footprint dimensions come from the mesh. Roof facts that the bounding box
cannot say honestly are declared in `public/buildings/manifest.json`: flat deck height,
pitched ridge height, setback deck bounds, or a list of rectangular terrace decks. If a model has no manifest entry, it still
loads; roof props use the mesh's top as a flat fallback. Today `block.glb`, `house.glb`,
`shop.glb`, and `tower.glb` use that fallback; architecture tests still check that each
one has usable GLB height.

## Fitting a slot

Buildable cells are 8 m square. The generated `lot_<frontage>x<depth>.glb` library covers
every rectangular footprint from 1x1 through 4x4 cells, with a small gap inside each
parcel. `buildingParcels` packs the free cells and the renderer loads the matching model.
Residential and commercial parcels now select their own
`<kind>_<frontage>x<depth>_<a|b>.glb` libraries. Twelve tower assets (`_tower`, `_tower_steps`, `_tower_offset` per footprint) cover
residential 3x3/4x4 and commercial 3x4/4x3. Variant choice is deterministic from parcel
position and size; any pedestrian cell forces the low `a` variant.

Urban `terraced` manifest entries contain the footprint `width` and `decks`, each with
`minX`, `maxX`, `minZ`, `maxZ`, `deckY` in exported coordinates. The highest deck containing
a point supports its roof prop. These facts come from the same volumes as the meshes;
their overall bounds also drive construction and the optional distant boxes.

## Authoring with Blender

`scripts/gen_buildings.py` generates the building library and is the reference for the
coordinate mapping. It writes both the `.glb` files and `public/buildings/manifest.json`:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/gen_buildings.py
```

Blender is Z-up. Its glTF exporter maps Blender `+Z` to glTF `+Y` and Blender `+Y` to
glTF `-Z`, so a box built in Blender from `(0, 0, 0)` to `(w, d, h)` lands exactly on the
convention above. Build with the footprint in `+X`/`+Y` and the height in `+Z`, with the
front edge on `y = 0`, and the export takes care of the rest.

## Improving and verifying models

For the authoring procedure, runtime material overrides, cache behaviour, partial
regeneration and visual checks, see
[the model authoring runbook](../logics/runbook/run_001_author_a_building_model_that_lands_on_its_parcel.md).
Change the generator and ship its regenerated GLBs together. `-- --lots-only` refreshes
only the 16 lot models when roof facts are unchanged; use full generation when changing
the manifest. The GLB tests bound footprint, transforms, roof heights and geometry cost.

`-- --industrial-only` regenerates the four deep industrial works and three residual
1x1 variants, updating the small variants' manifest entries. `-- --industrial-small-only`
refreshes just `industrial_1x1_a`, `_b` and `_c`. See the runbook for their layouts and browser checks.

`-- --farms-only` refreshes the four farm layouts. Their authoring traps and
repeatable visual checks are also documented in the model authoring runbook.

The articulated kaiju has a different transform contract: retain its eight named
pivot groups and embedded PBR textures. The runbook's kaiju section covers generation,
height normalisation, animation ownership and desktop/mobile inspection.

`-- --urban-only` regenerates the 64 residential/commercial variants and twelve towers,
and updates their manifest entries while preserving the other asset families.

`-- --towers-only` regenerates just the twelve towers and their roof metadata.
