## item_186_make_every_readme_claim_one_the_code_or_the_record_can_support - Make every README claim one the code or the record can support
> From version: 0.5.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 14:33:41
> Owner: Claude

# AI Context
- Summary: The README listed shipped features as absent, described zoning and roads as they were two versions ago, and quoted a device frame rate no recorded run supports.
- Keywords: readme claims, stale features, perf provenance, roadmap link, zoning kinds
- Use when: editing any README statement about what the game has, or quoting a performance number.
- Skip when: the loop and workforce diagrams, which were checked and are accurate, and the version badges check:versions gates.

# Problem
- `Where it's going` listed demand, an economy and progression as absent while the loop diagram in the same document described them and the code ships them.
- Zoning was described as `low or dense`, which survive only as legacy save values; the road list named five of eight types; the view list named two of five; power and water were absent entirely.
- A frame rate on an Apple M3 Pro was quoted although all 41 recorded runs are software-rasteriser, which req_045 had already flagged as not establishing device performance.
- `logics/roadmap/` was offered as the plan, where every roadmap is settled or superseded.

# Scope
- In:
  - Rewrite what is missing down to what actually is: services, and redevelopment of a built plot.
  - Correct the road, zoning, view and utility claims against the code.
  - Replace the unsourced frame rate with the city size the record does hold, and say plainly that no device frame rate has been measured.
  - Say that there is no active roadmap rather than linking to one.
- Out:
  - The loop, workforce and what-feeds-what diagrams, which were checked and are accurate.
  - The version badges, which `check:versions` already gates.
  - Taking a real-GPU measurement, which needs different launch flags and is its own piece of work.

# Acceptance criteria
- AC1: Every feature claim in the README matches the code, checked claim by claim.
- AC2: No performance number appears that `perf/history.jsonl` cannot source.
- AC3: What the README says is missing is missing, and what it says is next is not already built.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: Every feature claim in the README matches the code, checked claim by claim.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- Six corrections, each checked against a named source. Where it's going: demand (parcelDemandLimits), the economy (CityEconomy, incomePerSecond) and progression (the upgrade web, prestige, evacuate) all ship, and the step it called next is what admittedParcels already decides; rewritten to services and redevelopment, which genuinely do not exist - grep for police, fire, hospital and school returns nothing. Zoning: low and dense are legacy SavedZoneKind values only; zoning is by BuildingKind, five kinds. Roads: eight types in roadTypes.ts, five were listed, and bulldoze was absent. Views: five select-view radios in index.html, two were listed. Utilities: power and water appeared nowhere in the feature list. Performance: the Apple M3 Pro figure has no source - all 41 entries in perf/history.jsonl are swiftshader or carry no renderer, which req_045 already recorded as not establishing device performance; replaced with the city size the record does hold plus an explicit statement that no device frame rate has been measured. The three Mermaid diagrams were checked claim by claim and left unchanged.

# Links
- Product brief(s): `prod_039_a_shop_window_that_shows_the_game_that_exists`
- Architecture decision(s): (none yet)
- Request: `req_052_ship_the_played_demo_city_reshoot_the_readme_from_it_and_stop_the_readme_overstating_what_is_missing`
- Primary task(s): `task_054_orchestrate_the_demo_swap_and_readme_correction`

# Priority
- Priority: High
- Rationale: A published game whose front page contradicts itself: the loop diagram described demand and an economy while the paragraph above it called them missing. High for the same reason prod_010 existed.

# Tasks
- `task_054_orchestrate_the_demo_swap_and_readme_correction`

# Notes
- Task `task_054_orchestrate_the_demo_swap_and_readme_correction` was finished via `logics-manager flow finish task` on 2026-09-07.
