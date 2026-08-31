## item_070_the_wave_in_one_slice_a_kaiju_lands_and_the_city_holds_or_does_not - The wave, in one slice: a kaiju lands and the city holds or does not
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-31 23:10:28

# AI Context
- Summary: The delivery slice for the first attack: a wave clock, a kaiju that lands and walks, batteries that fire, and a banner that says how it went.
- Keywords: wave, slice, kaiju, lands, city, holds, does, not
- Use when: Planning or reviewing this slice of `road_002_city_jump_a_city_worth_defending`.
- Skip when: You need another slice of the roadmap, or the product reasoning behind this one.

# Problem
- It answers the question the other seven slices depend on.

# Scope
- In:
  - Wave clock and the countdown, with the threat fixed when the wave starts.
  - `sim/kaiju.ts`: landing edge away from the bridge, the nearest coast point, then the nearest building; position at time t.
  - `render/kaiju.ts`: a generated GLB beside the building library, articulated in code, fifty metres, casting a shadow.
  - Destruction on contact through the existing removal path, leaving rubble, repainting the dirty region.
  - Batteries: every military parcel, one range, damage by area, fixed reload, missiles with travel time that always hit.
  - A banner: threat against firepower before, held or breached after.
  - The zone brush painting all five businesses, painted beating the road's default -- the
    prerequisite for putting a military district where a wave can be tested against it.
  - The edge marker and the target highlight, which are what makes a wave readable at all.
- Out:
  - Hardcoded constants; the balance harness is `req_028`.
  - Economy, workers, money, utilities, runs and prestige.
  - Buildings coming apart in pieces -- rubble is enough to learn from.

# Acceptance criteria
- AC1: The backlog slice stays bounded for the wave, in one slice: a kaiju lands and the city holds or does not.
- AC2: The backlog slice is reviewable and promotable into a task.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: the wave clock and the countdown; proven by `sim/wave.ts` unit tests from a fixed seed.
- request-AC2 -> This backlog slice. Proof: destruction and the graph surviving it; proven by unit tests plus an interaction check that undo refuses to reach across a wave.
- request-AC3 -> This backlog slice. Proof: batteries derived from military parcels; proven by unit tests over a city with parcels of several sizes.
- request-AC4 -> This backlog slice. Proof: the kaiju's hit points and the banner's verdict; proven by an interaction check that runs a wave end to end.
- request-AC5 -> This backlog slice. Proof: `sim/kaiju.ts` purity; proven by tests that import it with no Babylon and replay the same seed twice.
- request-AC6 -> This backlog slice. Proof: the zone brush and the painted-beats-road rule; proven by unit tests on `parcelKind` and an interaction check on the palette.
- request-AC7 -> This backlog slice. Proof: the edge marker and the target highlight; proven by an interaction check during a live wave.
- request-AC8 -> This backlog slice. Proof: the frame budget; proven by a `npm run perf` run recorded in `perf/history.jsonl`.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)
- Request: `req_021_the_wave_in_one_slice_a_kaiju_lands_and_the_city_holds_or_does_not`
- Primary task(s): `task_023_the_wave_in_one_slice_a_kaiju_lands_and_the_city_holds_or_does_not`

# Priority
- Priority: High
- Rationale: It answers the question the other seven slices depend on.

# Notes
- Sequenced by `road_002_city_jump_a_city_worth_defending`; the order there is a risk order.

# Tasks
- `task_023_the_wave_in_one_slice_a_kaiju_lands_and_the_city_holds_or_does_not`
