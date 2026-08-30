## item_035_generate_english_street_names_that_cannot_run_out - Generate English street names that cannot run out
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 13:02:46

# AI Context
- Summary: Roads have no names, and a fixed word list runs out; the scheme needs a suffix that follows the road type plus a cardinal-then-ordinal ladder past exhaustion.
- Keywords: generate, english, street, names, cannot, run, out
- Use when: Writing or changing the street-name generator, its word lists, or its collision ladder.
- Skip when: The work is hand-editing names, localisation, or naming above the street level.

# Problem
- No road has a name, so two roads of the same type are indistinguishable and unreferenceable.
- A fixed word list runs out, which the operator explicitly ruled out.

# Scope
- In:
  - A generator producing `<core> <suffix>` English names, where the suffix follows the road's own type and shape -- Avenue for an avenue, Boulevard or Expressway for a highway, Walk or Mews for a pedestrian way, Close for a dead end -- so the name states something true about the road.
  - An escalation ladder past the base combinations: a cardinal qualifier (North, South, East, West), then an ordinal, so the supply is unbounded and every rung still reads as a plausible street name.
  - A name drawn once per street from a seed, stable for the life of that street.
  - Unit tests: no two streets in one city share a name, the ladder is exercised by forcing exhaustion, and the same seed gives the same name twice.
- Out:
  - Editing or overriding a name by hand.
  - Localised or non-English names.
  - Themed naming by district or region.

# Acceptance criteria
- AC1: Every street gets a distinct English name whose suffix matches the road's type or shape.
- AC2: A test that exhausts the base combinations shows the ladder producing further distinct, plausible names rather than repeating or failing.
- AC3: The generator is pure and deterministic for a given seed.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: Every street gets a distinct English name whose suffix matches the road's type or shape.
- request-AC6 -> This backlog slice. Proof: AC2: A test that exhausts the base combinations shows the ladder producing further distinct, plausible names rather than repeating or failing.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_007_a_city_you_can_point_at_and_name`
- Architecture decision(s): (none yet)
- Request: `req_010_name_the_streets_number_the_buildings_and_open_a_detail_panel_on_anything_you_click`
- Primary task(s): `task_012_implement_street_names_building_addresses_and_the_extended_detail_panel`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_012_implement_street_names_building_addresses_and_the_extended_detail_panel`

# Notes
- Task `task_012_implement_street_names_building_addresses_and_the_extended_detail_panel` was finished via `logics-manager flow finish task` on 2026-08-30.
