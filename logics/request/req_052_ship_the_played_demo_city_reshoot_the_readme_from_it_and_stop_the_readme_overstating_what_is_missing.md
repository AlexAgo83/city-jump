## req_052_ship_the_played_demo_city_reshoot_the_readme_from_it_and_stop_the_readme_overstating_what_is_missing - Ship the played Demo city, reshoot the README from it, and stop the README overstating what is missing
> From version: 0.5.1
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 14:33:40

# AI Context
- Summary: The bundled Demo was a pre-zoning version-4 save and the README described an older game than the one that ships, including a frame rate nothing in the repository measured.
- Keywords: demo save, readme, screenshots, stale claims, perf provenance, shop window
- Use when: changing the bundled Demo, the README captures, or any claim the README makes about the game.
- Skip when: changing the game itself, the benchmark fixture, or the deployment documents prod_010 settled.

# Needs
- Ship a Demo city that has actually been played, instead of a version-4 road network.
- Take the README captures from that Demo, on the framing the save itself carries.
- Stop the README claiming features are absent that ship, and stop it quoting a frame rate nothing measured.

# Priority
- High: item_184 and item_186. Medium: item_185.
- Rationale: the two High slices are both a published product misdescribing itself - the first city
  a visitor loads could not show the loop the same page describes, and the page listed shipped
  features as missing while quoting an unmeasured frame rate. item_185 is the tooling that makes
  the captures retakeable; valuable, but nothing is wrong today because of its absence.

# Context
- The bundled Demo was a version-4 save: 68 segments, 427 nodes, no zones and no buildings at all, against a current SAVE_VERSION of 14. It predates zoning, the economy, the workforce and waves, so the city a first-time visitor loaded could not show any of them.
- The supplied replacement is a played city at the same coordinates as the `large-demo-v14` perf fixture but a later state: 131 segments, 8,318 zoned lots, 1,275 buildings, 13,336 residents, day 41, wave 17, hour 20.5. It carries the camera it was exported with, which is the framing the README captures now use.
- The README's `Where it's going` paragraph listed demand, an economy and progression as not yet there, while the Mermaid loop later in the same document described all three in detail and the code ships them - `parcelDemandLimits`, `CityEconomy` and `incomePerSecond`, the upgrade web, prestige and evacuation. The step it named as next, whether a plot fills at all, is what `admittedParcels` already decides. It also pointed at `logics/roadmap/` as the plan, where all three roadmaps are settled or superseded.
- Three feature claims were stale rather than merely incomplete: zoning was described as painting `low or dense`, which survive only as legacy values a pre-kind save may carry, when zoning is by building kind; the road list named five of the eight types the toolbar offers and omitted bulldoze; and the view list named two of the five select views. Power and water appeared nowhere in the feature list at all.
- The README claimed 1,688 buildings and 237 cars at 50 fps on an Apple M3 Pro. All 41 runs in `perf/history.jsonl` are on a software rasteriser or carry no renderer at all: nothing in the repository backs a device frame rate, and req_045 already recorded that these samples do not establish real-device GPU performance.
- Out of scope: `perf/cities/ma-ville.json` is left alone. It is the `large-demo-v14` benchmark baseline that req_045 established deliberately, and swapping it would silently break comparability with every recorded measurement.

# Acceptance criteria
- AC1: The bundled Demo is a current-version played city, its assertions pin what the screenshots depend on, and the browser interaction suite still passes.
- AC2: One command retakes the three README captures from the bundled Demo, on the camera the save carries, refusing to shoot if that camera has drifted.
- AC3: No README statement about what the game does or does not have contradicts the code, and no performance figure is quoted that the repository cannot source.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_039_a_shop_window_that_shows_the_game_that_exists`
- Architecture decision(s): (none yet)

# References
- public/default-demo.json
- tests/default-demo.mjs
- scripts/readme-shots.mjs
- docs/media/city-jump.png
- docs/media/city-jump-curves.png
- docs/media/city-jump-traffic.png
- README.md
- perf/history.jsonl
- src/sim/zones.ts
- src/sim/roadTypes.ts
- src/sim/buildingKinds.ts

# Backlog
- `item_184_replace_the_bundled_demo_with_a_city_that_has_been_played`
- `item_185_retake_the_readme_captures_from_the_demo_on_its_own_framing`
- `item_186_make_every_readme_claim_one_the_code_or_the_record_can_support`
