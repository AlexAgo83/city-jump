## req_011_share_a_city_as_a_link_that_needs_no_server - Share a city as a link that needs no server
> From version: 0.2.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: City legibility
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 11:54:57

# AI Context
- Summary: Sharing a city with no server, by carrying it in the URL fragment. The Demo save is 48 KB and encodes to ~22,900 characters raw, ~8,850 once node elevations are rounded to 10 cm, so quantisation is what makes the feature possible; the fragment is untrusted input needing a size cap and a decompression cap that do not exist yet.
- Keywords: share, city, link, needs, server
- Use when: Working on the saves panel in `src/ui/controls.ts`, share links, the URL fragment, or encoding a `CitySave` for transport.
- Skip when: The work needs a server, a link shortener, accounts or a gallery; changes the local save format; or exports a city as a downloadable file.

# Needs
- A city cannot leave the browser it was built in. Saves live in `localStorage` under one key per city (`src/ui/saves.ts`), and the settings panel offers Save, Load and Delete but no way to give a city to anyone else. The operator wants a Share button next to them that produces a link.
- There is no server to share through, and there should not be one. `render.yaml` declares `runtime: static` with `staticPublishPath: dist`; the whole application is files on a CDN. Any design that needs to store a city somewhere to hand out a short link contradicts the deployment and puts other people's cities on infrastructure that does not exist.
- The naive encoding does not fit in a link. Measured against the bundled Demo save (48,175 bytes of JSON; 68 segments, 427 nodes, 605 hand-planted trees): gzip plus base64url gives roughly 22,900 characters. Rounding node elevations to 10 cm before compressing brings the same city to roughly 8,850 characters, because the save stores them at full float precision -- `[1, -802, 9.54109501838684, -884]` is a real line from the file. Without that step the feature does not work on a city anyone would want to share.
- A shared link is untrusted input from a stranger, and two of the three defences are missing. `parseCity` already validates the JSON at that boundary and already refuses a save from a newer build, but nothing caps how large a fragment may be before it is parsed, and nothing caps how far a compressed payload may expand while it is being decompressed -- a few kilobytes of crafted gzip can unfold into gigabytes.
- The city's name does not travel with it. A save's name is its `localStorage` key, not a field of `CitySave`, so a shared payload carries an unnamed city and the receiver has nothing to call it.

# Context
- `SECURITY.md` requires a threat-model review before user-generated asset work ships, and a city arriving from a stranger's link is user-generated content. That review is the threat-model slice of `req_013_the_game_is_deployed_in_public_while_its_documents_and_its_input_model_still_describe_a_local_dev_toy`, and it has to land before this feature is released.
- `adr_004_stay_a_static_client_with_no_server_of_its_own` records why this cannot be a short link: the deployment has no server to store a city in, deliberately.
- The link must use the URL **fragment** (`#city=...`), not a query string. A fragment is never sent to the server, so a shared city never reaches Render, its logs, or any CDN in between; a query string would put someone's city in request logs it has no business being in.
- Compression is available natively. the browser's own gzip CompressionStream and DecompressionStream APIs reached all three engines in May 2023 (Chrome 80, Safari 16.4, Firefox 113) and are Baseline, verified August 2026, so this needs no new dependency.
- The 10 cm rounding applies to the shared payload only, never to the local save. `src/sim/save.ts`'s own header explains why that is safe: node elevations are stored so a reload is deterministic, only the heights *between* two nodes can differ slightly from the original session, and `conformToRoads` reshapes the ground under them anyway.
- Browsers handle a nine-thousand-character URL comfortably, but the channels people share links through do not always: chat clients, mail clients, link crawlers and QR codes degrade well before that. The size ceiling is therefore about the sharing channel, not the browser, and it has to be a refusal with an explanation rather than a link that silently breaks for the receiver.
- The existing save UI is built from `window.prompt` and `window.confirm` (see `bindSaves` in `src/ui/controls.ts`), deliberately -- a modal is a lot of markup for one string. The import and overwrite prompts should follow that, not introduce a dialog system.
- A shared link is an immutable snapshot, not a live document. Editing the city afterwards does not change what a previously shared link contains, and the button's wording should not suggest otherwise.
- The architecture test forbids `src/sim` from touching browser globals, so the split is: quantisation, the envelope, validation and the size rules are pure and live in `src/sim`; gzip and base64 transport, the clipboard and the URL live in `src/ui`.

# Acceptance criteria
- AC1: A Share button in the saves panel turns the selected city into a link and puts it on the clipboard, telling the player it was copied.
- AC2: The payload is quantised and compressed so that a city the size of the bundled Demo produces a usable link; above a documented ceiling the button refuses with an explanation instead of emitting a link that will break for the receiver.
- AC3: The city travels in the URL fragment, never in a query string, and carries its name.
- AC4: Opening a share link offers to import the city; if a city of that name already exists the player can overwrite it or keep both; after importing, the link is offered for loading and the fragment is removed from the address bar so a reload does not ask again.
- AC5: A hostile or malformed link is refused safely: the fragment is size-capped before parsing, decompression is capped while it streams so a compression bomb cannot exhaust memory, `parseCity` validates the result, and a city from a newer build is refused with a message that says so rather than calling the link invalid.
- AC6: Quantisation, the envelope, and the size rules are pure functions in `src/sim`, unit-tested without a browser, and `tests/architecture.mjs` still passes.
- AC7: Save, Load and Delete behave exactly as before, and the browser interaction suite covers a round trip: share a city, arrive on the link, import it, and get the same city back.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_008_a_city_you_can_hand_to_someone_else`
- Architecture decision(s): (none yet)

# References
- src/ui/controls.ts
- src/ui/saves.ts
- src/sim/save.ts
- index.html
- render.yaml
- public/default-demo.json
- scripts/interact.mjs
- logics/runbook/run_006_change_what_a_save_contains_without_losing_the_player_s_city.md

# Backlog
- `item_039_turn_a_city_into_a_link_sized_payload_and_read_one_back_safely`
- `item_040_add_the_share_button_to_the_saves_panel`
- `item_041_offer_to_import_the_city_when_someone_arrives_on_a_share_link`
