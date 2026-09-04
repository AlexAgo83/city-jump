## task_046_record_the_bridge_landing_the_starter_island_and_the_elevation_rule - Record the bridge landing, the starter island and the elevation rule
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: claude
> Indicators reviewed: 2026-09-04 21:23:24

# AI Context
- Summary: Three slices, all delivered in 23fbb1a and 1b895d8: land the deck and join the landfall, carry the island as an asset read for its design only, and stop the elevation at a landed deck with a shared rule and tests that fail without it.
- Keywords: bridge landing, starter island asset, elevation rule, shared predicate, npm run ci, live landfall check
- Use when: reading what shipped in the bridge and starter-island work and how it was verified.
- Skip when: treating this as open work; it records delivery rather than planning it.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Land the deck at ground height and keep the span a cable bridge.
- [x] 2. Reuse the landfall node so the bridge joins whatever reaches it.
- [x] 3. Move the starter island into an asset read for its design only, and derive its utilities from its geometry.
- [x] 4. Stop the elevation at a landed deck, share the rule between the commit and the preview, and cover it with tests that fail without it.
- [x] 5. Verify with npm run ci and with live checks on the landfall, the fresh island and the New island button.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_162_land_the_deck_on_the_ground_and_join_what_reaches_it`
- `item_163_carry_the_starter_island_as_an_asset_the_operator_designs_by_playing`
- `item_164_stop_the_elevation_where_a_bridge_lands`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_162_land_the_deck_on_the_ground_and_join_what_reaches_it`. Proof deferred to slice closeout.
- request-AC2 -> `item_162_land_the_deck_on_the_ground_and_join_what_reaches_it`. Proof deferred to slice closeout.
- request-AC3 -> `item_163_carry_the_starter_island_as_an_asset_the_operator_designs_by_playing`. Proof deferred to slice closeout.
- request-AC4 -> `item_163_carry_the_starter_island_as_an_asset_the_operator_designs_by_playing`. Proof deferred to slice closeout.
- request-AC5 -> `item_163_carry_the_starter_island_as_an_asset_the_operator_designs_by_playing`. Proof deferred to slice closeout.
- request-AC6 -> `item_164_stop_the_elevation_where_a_bridge_lands`. Proof deferred to slice closeout.
- request-AC7 -> `item_164_stop_the_elevation_where_a_bridge_lands`. Proof deferred to slice closeout.
- request-AC8 -> `item_164_stop_the_elevation_where_a_bridge_lands`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)
- rtk npm run ci passed on 2026-09-04: version check OK, biome clean over 130 files, 329 vitest tests, 16 architecture tests, scenarios 31 of 31 waves held inside the 13-85s / 4-21 salvo band with 5 of 6 runs reaching wave 6 (unchanged from before this work), build and typecheck, logics lint/audit/i18n green
- live browser checks on 2026-09-04: bridge assertion PASS (6 pylons, 6 piers, bend 381), one network of 14 nodes with 0 coincident positions, fresh island 17 segments / 1039 zones / 10 utilities / worst road clearance 0.77 m, roads drawn off the landfall unelevated with 1 elevated segment left
- Finish workflow executed on 2026-09-04.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-09-04.
- Linked backlog item(s): `item_162_land_the_deck_on_the_ground_and_join_what_reaches_it`, `item_163_carry_the_starter_island_as_an_asset_the_operator_designs_by_playing`, `item_164_stop_the_elevation_where_a_bridge_lands`
- Related request(s): `req_044_land_the_bridge_open_a_run_on_a_designed_island_and_stop_the_elevation_where_a_bridge_lands`

# Links
- Request: `req_044_land_the_bridge_open_a_run_on_a_designed_island_and_stop_the_elevation_where_a_bridge_lands`
- Product brief(s): `prod_035_an_island_that_hands_the_player_a_road_and_a_bridge_that_knows_when_it_has_landed`
- Architecture decision(s): (none yet)

# Evidence
- AC1 | date: 2026-09-04 | command: `node scripts/with-dev-server.mjs .tmp/bridgecheck.mjs` | result: pass | Landward node at ground height: 52.44 m against ground at 52.45 m, was 66.44 m. Deck still peaks at 62.9 m over the sea and renders as a cable bridge (6 pylons, 6 piers, bend 381, length 3199), matching the assertion scripts/interact.mjs makes. Shipped in 1b895d8.
- AC2 | date: 2026-09-04 | command: `node scripts/with-dev-server.mjs .tmp/connectivity.mjs` | result: one network, 0 coincident nodes | Landfall node reused within RULES.nodeSnapRadius instead of always built. Before: two nodes at (-360,1500) and two networks of 13 and 2. After: one network of 14 nodes, no coincident positions, 2 arms at the landfall. Shipped in 1b895d8.
- AC3 | date: 2026-09-04 | command: `node scripts/with-dev-server.mjs .tmp/newisland.mjs` | result: kit, zoning, roundabout and utilities rebuilt | A fresh island and the New island button both open on public/starter-kit.json: 17 segments (16 kit plus the bridge), 1039 zoned lots, the roundabout, 3 avenues and 3 pedestrian paths. Shipped in 1b895d8.
- AC4 | date: 2026-09-04 | command: `node scripts/with-dev-server.mjs .tmp/kitcheck.mjs` | result: rubble 0, money from startingmoney | Only the design fields are read over emptyCity(), so the export's own session state never reaches the island: a fresh run opens at $100,000 and 11:00 rather than the file's $78,440.50 and 12.83, with 0 rubble against the file's 36.
- AC5 | date: 2026-09-04 | command: `node scripts/with-dev-server.mjs .tmp/finalcheck.mjs` | result: utilities 10, worst clearance 0.77 m | Ten utilities placed from the kit's own geometry -- a producer at the centroid of the zoning, diffusers at least 168 m apart on segment midpoints -- with no coordinates written by hand. Kit roads sit flush: worst road-to-ground gap 0.77 m, down from 3.25 m before the nodes were reseated on the terrain.
- AC6 | date: 2026-09-04 | command: `node scripts/with-dev-server.mjs .tmp/landfalldraw.mjs` | result: both surface, 1 elevated total | Roads drawn off the landfall in the running game are surface roads and do not cascade: landfall clearance -0.59 m, two roads drawn in succession both unelevated, one elevated segment left on the map. Shipped in 23fbb1a.
- AC7 | date: 2026-09-04 | command: `rtk npm exec -- vitest run src/sim/rules.test.ts` | result: 24 passed | Extending a deck that is still aloft still yields a bridge: the pre-existing test 'extends an elevated bridge with another elevated road' passes unchanged, and the new test covers both ends of one landing deck.
- AC8 | date: 2026-09-04 | command: `rtk npm run ci` | result: 329 tests, 16 architecture tests, scenarios in band, build and logics green | touchesElevated exported from src/sim/rules.ts and imported by src/app/drawController.ts, replacing two verbatim copies that decided the commit and the preview separately. Removing the rule fails two tests, checked by removing it. Shipped in 23fbb1a.
