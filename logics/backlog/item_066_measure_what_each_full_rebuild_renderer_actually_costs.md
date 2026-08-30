## item_066_measure_what_each_full_rebuild_renderer_actually_costs - Measure what each full-rebuild renderer actually costs
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 50%
> Complexity: Low
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 14:56:54

# AI Context
- Summary: `measureCosts()` reports three totals and cannot say where a placement's time goes. This adds per-renderer figures for trees, world grid (hidden and visible), streetlights and signals, plus the `allJunctions` call count -- the gate that decides the two slices after it, including the option of deciding not to act.
- Keywords: measure, each, full, rebuild, renderer, actually, costs
- Use when: Extending `measureCosts()` in `src/render/debugApi.ts`, or establishing a performance baseline before touching a renderer.
- Skip when: The work changes any renderer, adds a profiling UI, or gates performance in CI.

# Problem
- `measureCosts()` reports startup, the demo build and one placement as three totals. It cannot say whether the trees, the world grid, the streetlights or the signals are where a placement's time goes.
- Without that, this chain is four optimisations chosen by how expensive they look in the source, which is how effort gets spent on the cheap one.
- The roadmap's open question is explicitly either-or -- bound them, or find their cost never justified it -- and only a measurement can answer it in the second direction.

# Scope
- In:
  - Extend `measureCosts()` in `src/render/debugApi.ts` to report the cost of each renderer's rebuild individually, against the same known city it already builds.
  - Measure both shapes of edit: a placement with a dirty box, and a full rebuild, so the gap between them is visible per renderer.
  - Measure the world grid both hidden and visible, since it returns immediately when hidden and is the most expensive thing here when not.
  - Count how many times `allJunctions` runs per rebuild, so the duplication is a number rather than a claim.
  - Record the figures on a Demo-sized city in the closeout, and again after each later slice, so every following decision cites one.
- Out:
  - Changing any renderer.
  - A profiling UI, or exposing these figures to the player.
  - Continuous performance regression gating in CI.

# Acceptance criteria
- AC1: `measureCosts()` reports per-renderer rebuild cost for trees, world grid, streetlights and signals.
- AC2: The figures distinguish a bounded placement from a full rebuild, and the world grid hidden from visible.
- AC3: The number of `allJunctions` calls per rebuild is reported.
- AC4: Baseline figures on a Demo-sized city are recorded in the closeout.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: `measureCosts()` reports per-renderer rebuild cost for trees, world grid, streetlights and signals.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_017_an_edit_that_costs_what_it_changed_everywhere`
- Architecture decision(s): (none yet)
- Request: `req_020_four_renderers_still_rebuild_the_whole_world_on_every_edit`
- Primary task(s): `task_022_finish_bounding_the_renderers_that_still_rebuild_the_whole_world`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
