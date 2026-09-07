## req_049_residential_and_commercial_variety_with_a_mixed_skyline - Residential and commercial variety with a mixed skyline
> From version: 0.5.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 11:32:51

# AI Context
- Summary: 68 authored urban assets selected by zone, footprint and stable position; pedestrian frontage remains below 14 m.
- Keywords: residential, commercial, variety, mixed, skyline
- Use when: changing urban silhouettes, model selection, terrace roof facts or skyline validation.
- Skip when: changing economics, density controls, kaiju or non-urban asset families.

# Needs
- Replace same-size residential and commercial lookalikes with distinct low, medium and tall silhouettes.

# Context
- Operator approved model variants and four tower silhouettes without economic or player density changes.
- Pedestrian cells require low-rise models; zone packing offers different footprint sets.

# Acceptance criteria
- AC1: Residential and commercial parcels use distinct authored libraries with two stable variants per footprint and four additional tower silhouettes on zone-eligible large footprints.
- AC2: Towers remain a minority of eligible parcels and pedestrian frontage always selects a model below 14 m; zoning, economy and saves retain their existing rules.
- AC3: Generated GLBs stay within their parcel and geometry budgets; manifest roof surfaces agree with geometry and serve roof props, construction and distant heights.
- AC4: A mixed in-game neighbourhood and individual towers are inspected at close, distant and mobile views; CI and E2E pass and the authoring runbook records generation and pitfalls.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_036_a_varied_residential_and_commercial_skyline`
- Architecture decision(s): (none yet)

# References
- scripts/gen_buildings.py
- src/render/buildings.ts
- src/sim/slots.ts
- tests/building-assets.mjs
- logics/runbook/run_001_author_a_building_model_that_lands_on_its_parcel.md

# Backlog
- `item_174_author_and_integrate_residential_commercial_variants_and_four_towers`
