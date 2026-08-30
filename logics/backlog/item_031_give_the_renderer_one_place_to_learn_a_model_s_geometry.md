## item_031_give_the_renderer_one_place_to_learn_a_model_s_geometry - Give the renderer one place to learn a model's geometry
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 10%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:36:50

# AI Context
- Summary: The renderer parses `lot_<frontage>x<depth>` to rebuild height, footprint, roof style, setback bounds and body-height factor, while `loadModel` already reads the mesh's bounding box and then lets the derived spec override it.
- Keywords: renderer, place, learn, model, geometry
- Use when: Changing where `src/render/buildings.ts` gets a model's geometry, or adding a generator-emitted declaration beside the GLBs.
- Skip when: The work changes model appearance, parcel-to-model matching, or the generation script's output geometry.

# Problem
- `buildingSpec` re-derives height, footprint, roof style, setback bounds and body-height factor from the model id, duplicating decisions `scripts/gen_buildings.py` already made.
- `loadModel` already reads the mesh's bounding box but the derived spec overrides it.

# Scope
- In:
  - Take from the loaded mesh whatever the mesh already knows (footprint extents, overall height, roof deck height where the bounding box gives it honestly).
  - For what a bounding box cannot express -- roof style, setback tier bounds -- introduce one declaration emitted by the generator alongside the GLBs, and have the renderer read it.
  - Decide and document what happens for a model that arrives without that declaration, so a hand-authored `.glb` is still usable.
  - Delete the duplicated formulas from `buildings.ts` once nothing reads them.
- Out:
  - Changing the models themselves or how they look.
  - Changing how parcels choose a model.

# Acceptance criteria
- AC1: No geometry fact about a model is computed from its filename in `src/render/buildings.ts`.
- AC2: A model with an unrecognised id or no declaration loads and renders sensibly, with the fallback documented.
- AC3: Buildings and roof objects are visually unchanged, and `roofPropY`'s unit tests still pass.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: No geometry fact about a model is computed from its filename in `src/render/buildings.ts`.
- request-AC3 -> This backlog slice. Proof: AC2: A model with an unrecognised id or no declaration loads and renders sensibly, with the fallback documented.
- request-AC4 -> This backlog slice. Proof: AC3: Buildings and roof objects are visually unchanged, and `roofPropY`'s unit tests still pass.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_006_one_source_of_truth_for_what_a_building_model_is`
- Architecture decision(s): (none yet)
- Request: `req_009_building_geometry_facts_are_written_twice_in_two_languages_with_nothing_tying_them_together`
- Primary task(s): `task_011_implement_one_source_of_truth_for_building_model_geometry`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
