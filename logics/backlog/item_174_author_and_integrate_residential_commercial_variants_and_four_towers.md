## item_174_author_and_integrate_residential_commercial_variants_and_four_towers - Author and integrate residential commercial variants and four towers
> From version: 0.5.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 11:32:52
> Owner: Codex

# AI Context
- Summary: 68 authored urban assets selected by zone, footprint and stable position; pedestrian frontage remains below 14 m.
- Keywords: author, integrate, residential, commercial, variants, four, towers
- Use when: changing urban silhouettes, model selection, terrace roof facts or skyline validation.
- Skip when: changing economics, density controls, kaiju or non-urban asset families.

# Problem
- Size alone selects shared lot assets and limits skyline variety.

# Scope
- In:
  - Two variants per size per kind, four towers, stable renderer selection, roof facts, browser and asset checks, runbook.
- Out:
  - Simulation or save schema changes; release and push.

# Acceptance criteria
- AC1: Residential and commercial parcels use distinct authored libraries with two stable variants per footprint and four additional tower silhouettes on zone-eligible large footprints.
- AC2: Towers remain a minority of eligible parcels and pedestrian frontage always selects a model below 14 m; zoning, economy and saves retain their existing rules.
- AC3: Generated GLBs stay within their parcel and geometry budgets; manifest roof surfaces agree with geometry and serve roof props, construction and distant heights.
- AC4: A mixed in-game neighbourhood and individual towers are inspected at close, distant and mobile views; CI and E2E pass and the authoring runbook records generation and pitfalls.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Residential and commercial parcels use distinct authored libraries with two stable variants per footprint and four additional tower silhouettes on zone-eligible large footprints.
- request-AC2 -> This backlog slice. Proof: AC2: Towers remain a minority of eligible parcels and pedestrian frontage always selects a model below 14 m; zoning, economy and saves retain their existing rules.
- request-AC3 -> This backlog slice. Proof: AC3: Generated GLBs stay within their parcel and geometry budgets; manifest roof surfaces agree with geometry and serve roof props, construction and distant heights.
- request-AC4 -> This backlog slice. Proof: AC4: A mixed in-game neighbourhood and individual towers are inspected at close, distant and mobile views; CI and E2E pass and the authoring runbook records generation and pitfalls.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_036_a_varied_residential_and_commercial_skyline`
- Architecture decision(s): (none yet)
- Request: `req_049_residential_and_commercial_variety_with_a_mixed_skyline`
- Primary task(s): `task_051_deliver_residential_commercial_variety_and_skyline`

# Priority
- Priority: Medium
- Rationale: Medium visual improvement requested by the operator; no active higher-priority dependency.

# Tasks
- `task_051_deliver_residential_commercial_variety_and_skyline`

# Notes
- Task `task_051_deliver_residential_commercial_variety_and_skyline` was finished via `logics-manager flow finish task` on 2026-09-07.
