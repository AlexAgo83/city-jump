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
pitched ridge height, or setback deck bounds. If a model has no manifest entry, it still
loads; roof props use the mesh's top as a flat fallback. Today `block.glb`, `house.glb`,
`shop.glb`, and `tower.glb` use that fallback; architecture tests still check that each
one has usable GLB height.

## Fitting a slot

Buildable cells are 8 m square. The generated `lot_<frontage>x<depth>.glb` library covers
every rectangular footprint from 1x1 through 4x4 cells, with a small gap inside each
parcel. `buildingParcels` packs the free cells and the renderer loads the matching model.

## Authoring with Blender

`scripts/gen_buildings.py` generates the placeholder library and is the reference for the
coordinate mapping. It writes both the `.glb` files and `public/buildings/manifest.json`:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/gen_buildings.py
```

Blender is Z-up. Its glTF exporter maps Blender `+Z` to glTF `+Y` and Blender `+Y` to
glTF `-Z`, so a box built in Blender from `(0, 0, 0)` to `(w, d, h)` lands exactly on the
convention above. Build with the footprint in `+X`/`+Y` and the height in `+Z`, with the
front edge on `y = 0`, and the export takes care of the rest.
