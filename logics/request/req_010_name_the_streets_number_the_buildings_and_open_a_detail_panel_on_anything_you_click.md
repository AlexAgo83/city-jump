## req_010_name_the_streets_number_the_buildings_and_open_a_detail_panel_on_anything_you_click - Name the streets, number the buildings, and open a detail panel on anything you click
> From version: 0.2.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: City legibility
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: The city has no streets, only unrelated Bezier segments, so nothing can be named or addressed; buildings and cars are also unselectable. Adds street chaining (reusing the signal phases' facing rule), an English naming scheme with an unbounded escalation ladder, odd/even house numbers from existing parcel data, and the two missing detail-panel cases.
- Keywords: name, streets, number, buildings, open, detail, panel, anything, you, click
- Use when: Working on street identity, road or building naming, addresses, the selection panel in `src/ui/hud.ts`, or the selection resolver in `src/render/drawTool.ts`.
- Skip when: The work is about editing names by hand, in-scene labels or a map view, districts or postcodes, or making addresses drive simulation.

# Needs
- Clicking a building or a car tells the player nothing. The select tool already opens a detail panel for a road, a roundabout and a tree (`showSelection` in `src/ui/hud.ts`, fed by `SelectionInfo` from `src/render/drawTool.ts`), but a building and a vehicle -- the two things a player looks at most -- are not selectable at all.
- A building has no address, because the city has no streets to have an address on. Roads exist only as individual Bezier segments: a road drawn through three junctions is three unrelated segments, and no part of the model says they are the same street. `12 Lilac Street` means twelve along the whole street, so an address cannot be derived until a street exists as a thing.
- Nothing names a road. Every road is shown by its type (`Street`, `Avenue`, `Highway`), never by a name, so two roads of the same type are indistinguishable in the panel and unreferenceable in conversation.
- A naming scheme that runs out is not acceptable. The operator asked explicitly for one that is not limited by its number of combinations, so a fixed word list on its own will not do -- there has to be a way past exhaustion that still reads as a real street name.

# Context
- The chaining rule this needs already exists in the codebase. `signalCycle` in `src/sim/signals.ts` pairs the arms of a junction that face each other within `OPPOSITE` (45 degrees), and its own comment states the idea exactly: two roads meeting is a bend in one road. A street is that same pairing followed across junctions, so this should reuse the rule rather than invent a second one that can disagree with it.
- The address arithmetic is nearly free from data that already exists. `BuildableCell` in `src/sim/slots.ts` carries `segment`, `side` (-1 for the right of the segment, +1 for the left) and `column` (its position along that segment), and every cell of a parcel comes from one segment -- so which street a parcel is on, which side, and how far along are all already known.
- Selection must not go through mesh picking. `bulldozeTarget` (used by `selectAt`) picks the *ground* and then finds the nearest thing to that point; buildings are thin instances with `isPickable = false` and cars move every frame, so making them pickable meshes is the expensive path. Parcels are already computed on every rebuild and movers are a flat list -- a nearest-match against the picked ground point is the same mechanism the tool already uses for roads, trees and roundabouts.
- Street names are drawn once and persisted, not derived from geometry. A name recomputed from position would change when an unrelated road is drawn, which makes an address worthless. Identity therefore has to survive `splitSegment` in `src/sim/graph.ts`, which replaces one segment with two.
- Names are in English, matching the rest of the UI (`Road`, `Roundabout`, `Tree`).
- Cities saved before this exists carry no names, and must get freshly generated ones when they load -- the operator confirmed this. That makes save compatibility a first-class part of this work, and `run_006_change_what_a_save_contains_without_losing_the_player_s_city` is the procedure: `parseCity` currently requires a segment tuple of exactly 6 entries, so a seventh field rejects every existing city unless the length check is relaxed first.

# Acceptance criteria
- AC1: Connected road segments that continue through a junction are recognised as one street, using the same facing rule the signal phases already use, and a street's identity survives a segment being split.
- AC2: Every street carries a generated English name, drawn once and stable for the life of that street; the scheme cannot run out of names, and a name that would collide still reads as a plausible street name.
- AC3: Every building has an address: a number and its street name, with odd numbers on one side of the street and even on the other, growing with distance from the street's origin.
- AC4: Clicking a building opens the existing detail panel showing at least its address; clicking a car opens it for that vehicle.
- AC5: Street names survive a save and reload unchanged, and a city saved before this feature existed loads successfully and is given generated names.
- AC6: The street chaining, the name generation and the address arithmetic are pure functions in `src/sim`, unit-tested without a Babylon scene, and `tests/architecture.mjs` still passes.
- AC7: No existing check is weakened: the older-build save check in `scripts/interact.mjs` is extended to cover the new field rather than relaxed.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_007_a_city_you_can_point_at_and_name`
- Architecture decision(s): (none yet)

# References
- src/render/drawTool.ts
- src/ui/hud.ts
- src/sim/slots.ts
- src/sim/signals.ts
- src/sim/junction.ts
- src/sim/graph.ts
- src/sim/save.ts
- src/render/traffic.ts
- scripts/interact.mjs
- logics/runbook/run_006_change_what_a_save_contains_without_losing_the_player_s_city.md

# Backlog
- `item_034_chain_road_segments_into_streets_that_survive_a_split`
- `item_035_generate_english_street_names_that_cannot_run_out`
- `item_036_give_every_building_an_odd_or_even_address_number`
- `item_037_persist_street_names_and_name_the_cities_saved_before_this_existed`
- `item_038_open_the_detail_panel_on_a_building_or_a_car`
