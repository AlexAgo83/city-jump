## item_027_ship_only_the_gltf_loader_features_the_models_actually_use - Ship only the glTF loader features the models actually use
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 82%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 13:19:50

# AI Context
- Summary: `import "@babylonjs/loaders/glTF"` registers every glTF extension, putting 93 KB gz of gaussian splatting and ~30 KB gz of other unused extensions into the eager 561 KB gz first load.
- Keywords: ship, only, gltf, loader, features, models, actually
- Use when: Changing the glTF loader import in `src/render/buildings.ts` or auditing what the eager bundle contains.
- Skip when: The work re-authors the GLBs, changes model format, or adds mesh compression (that is item_028).

# Problem
- `import "@babylonjs/loaders/glTF"` registers every glTF extension, so the eager bundle carries `gaussianSplattingMesh` (93 KB gz, 17% of the 561 KB gz first load), ten `flowGraph` chunks for KHR_interactivity (13 KB gz), `glTFLoaderAnimation` (10 KB gz), the OpenPBR adapter (7 KB gz), `bone`, `environmentTextureTools` and `workerPool`.
- The project's own models are static, unanimated and untextured, so none of that is reachable at runtime.

# Scope
- In:
  - Import the glTF 2.0 loader directly and register only the extensions the project's GLBs actually declare.
  - Verify against the shipped models that nothing needed was dropped -- every building still loads and renders.
  - Record the before and after eager gzipped payload.
- Out:
  - Switching model format, or re-authoring the GLBs.
  - Adding Draco or meshopt compression, which belongs with the startup item.

# Acceptance criteria
- AC1: The eager first-load payload no longer contains the gaussian splatting implementation or the other unused glTF extensions, and the before/after gzipped sizes are recorded.
- AC2: All 20 building models still load and render correctly, confirmed by the visual and interaction checks.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: The eager first-load payload no longer contains the gaussian splatting implementation or the other unused glTF extensions, and the before/after gzipped sizes are recorded.
- request-AC7 -> This backlog slice. Proof: AC2: All 20 building models still load and render correctly, confirmed by the visual and interaction checks.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_005_a_city_builder_that_stays_responsive_as_the_city_grows`
- Architecture decision(s): (none yet)
- Request: `req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses`
- Primary task(s): `task_010_implement_the_rebuild_granularity_and_startup_payload_performance_work`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
