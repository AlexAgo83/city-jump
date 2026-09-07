## item_184_replace_the_bundled_demo_with_a_city_that_has_been_played - Replace the bundled Demo with a city that has been played
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
- Summary: The bundled Demo was a version-4 save with no zones and no buildings, against SAVE_VERSION 14 - it predates everything the README's loop describes.
- Keywords: default-demo, save version, played city, fixture, load menu
- Use when: changing the bundled Demo or the assertions that pin it.
- Skip when: the perf benchmark fixture or the starter kit a New run opens on.

# Problem
- `public/default-demo.json` was a version-4 save with 68 segments, no zones and no buildings, against SAVE_VERSION 14.
- It predates zoning, the economy, the workforce and waves, so the first city a visitor loads cannot show any of the loop the README describes.
- `tests/default-demo.mjs` pinned only version, hour and three lengths, none of which would notice an empty city.

# Scope
- In:
  - Install the supplied played save as the bundled Demo.
  - Pin what the README captures depend on: the grown city's zone and building counts, the day, and the camera radius.
  - Confirm the browser interaction suite still passes with the larger Demo in the load menu.
- Out:
  - `perf/cities/ma-ville.json`, the benchmark baseline req_045 established.
  - The starter kit a New run opens on.
  - Any change to save loading or the save format.

# Acceptance criteria
- AC1: The bundled Demo parses at the current save version and loads as a populated city.
- AC2: Its assertions fail if the city arrives empty or the framing changes.
- AC3: `npm run test:e2e` passes with it bundled.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The bundled Demo parses at the current save version and loads as a populated city.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- public/default-demo.json is now the supplied played save: version 14, 131 segments, 85 nodes, 8318 zoned lots, 1275 buildings, 13336 residents, day 41, wave 17, hour 20.5, carrying its own camera. It replaces a version-4 save of 68 segments with no zones and no buildings at all. Size went 48 KB to 286 KB; it is fetched once and written to localStorage, well inside the ~5 MB budget ui/saves.ts documents. tests/default-demo.mjs now pins the zone and building counts, the day and the camera radius as well, so an empty city or a reframed one fails rather than passing quietly. perf/cities/ma-ville.json is deliberately untouched: it is the same city at an earlier state and is the large-demo-v14 benchmark baseline, so swapping it would break comparability with all 41 recorded runs.

# Links
- Product brief(s): `prod_039_a_shop_window_that_shows_the_game_that_exists`
- Architecture decision(s): (none yet)
- Request: `req_052_ship_the_played_demo_city_reshoot_the_readme_from_it_and_stop_the_readme_overstating_what_is_missing`
- Primary task(s): `task_054_orchestrate_the_demo_swap_and_readme_correction`

# Priority
- Priority: High
- Rationale: The first city a visitor loads, and it could not demonstrate zoning, the economy, the workforce or a wave. High because it is the product's own sample, not a test fixture.

# Tasks
- `task_054_orchestrate_the_demo_swap_and_readme_correction`

# Notes
- Task `task_054_orchestrate_the_demo_swap_and_readme_correction` was finished via `logics-manager flow finish task` on 2026-09-07.
