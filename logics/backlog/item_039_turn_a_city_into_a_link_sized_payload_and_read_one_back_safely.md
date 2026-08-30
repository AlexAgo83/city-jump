## item_039_turn_a_city_into_a_link_sized_payload_and_read_one_back_safely - Turn a city into a link-sized payload and read one back safely
> From version: 0.2.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 11:52:56

# AI Context
- Summary: The Demo save encodes to ~22,900 characters raw and ~8,850 once elevations are rounded to 10 cm; the decoder also needs a fragment size cap and a cap enforced while decompressing, since neither exists.
- Keywords: turn, city, link, sized, payload, read, back, safely
- Use when: Writing the share envelope, the quantisation, the size rules, or the gzip/base64 transport.
- Skip when: The work changes the local save format, adds UI, or replaces JSON with a binary encoding.

# Problem
- The Demo save is 48,175 bytes and encodes to roughly 22,900 characters of base64url, which is not a link anyone can send; rounding node elevations to 10 cm first brings it to roughly 8,850.
- A shared payload is untrusted: nothing today caps the size of a fragment before it is parsed, and nothing caps how far a compressed payload may expand while decompressing.
- A save's name is its `localStorage` key, not part of `CitySave`, so it does not travel with the city.

# Scope
- In:
  - Pick the ceiling against evidence, not a guess. Verified August 2026: browsers are not the constraint (Chrome and Edge accept roughly 32,000 characters, Firefox roughly 65,000, Safari roughly 80,000), and because the city rides in the fragment it never meets a CDN or load-balancer limit at all. The binding constraint is the sharing channel: roughly 2,048 characters is the length that survives every mail client, chat app and QR code intact, and beyond that truncation risk rises with no hard cliff. The Demo city needs about 8,850. The ceiling is therefore a judgement between reach and how large a city may be shared, and it has to be recorded with its reasoning rather than left as a constant.
  - A pure module in `src/sim`: an envelope carrying the city and its name, quantisation of node and control-point coordinates to the precision the save's own header shows is safe, and the size rules -- a maximum encoded length and a maximum decoded length.
  - The browser-side transport in `src/ui`: gzip through `CompressionStream`, base64url, and the reverse, with the decompression cap enforced while the stream is consumed rather than after.
  - Feed the decoded result through the existing `parseCity` rather than adding a second validator.
  - Unit tests: a round trip returns an equivalent city, quantisation stays within tolerance, an over-long payload is refused, a payload that expands past the cap is refused mid-stream, and a payload claiming a newer version is refused as such.
- Out:
  - Changing the local save format, or applying quantisation to locally saved cities.
  - Any UI.
  - A binary encoding of the save; quantisation plus gzip is what the measurements say is needed.

# Acceptance criteria
- AC1: A city the size of the bundled Demo encodes to a payload within the documented ceiling, verified against `public/default-demo.json`.
- AC2: Decoding refuses an over-long fragment before parsing, and refuses a payload that expands beyond the cap while it is still decompressing.
- AC3: A round trip through encode and decode yields a city that loads and renders the same, within the stated coordinate tolerance.
- AC4: The pure half lives in `src/sim` with no browser globals, and `tests/architecture.mjs` passes.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: A city the size of the bundled Demo encodes to a payload within the documented ceiling, verified against `public/default-demo.json`.
- request-AC3 -> This backlog slice. Proof: AC2: Decoding refuses an over-long fragment before parsing, and refuses a payload that expands beyond the cap while it is still decompressing.
- request-AC5 -> This backlog slice. Proof: AC3: A round trip through encode and decode yields a city that loads and renders the same, within the stated coordinate tolerance.
- request-AC6 -> This backlog slice. Proof: AC4: The pure half lives in `src/sim` with no browser globals, and `tests/architecture.mjs` passes.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_008_a_city_you_can_hand_to_someone_else`
- Architecture decision(s): (none yet)
- Request: `req_011_share_a_city_as_a_link_that_needs_no_server`
- Primary task(s): `task_013_implement_sharing_a_city_by_link`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
