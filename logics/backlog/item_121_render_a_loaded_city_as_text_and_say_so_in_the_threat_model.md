## item_121_render_a_loaded_city_as_text_and_say_so_in_the_threat_model - Render a loaded city as text, and say so in the threat model
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 60%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 15:45:34

# AI Context
- Summary: Safe today only because streetName composes from a fixed word list and city names use textContent. prod_007 points at naming as a direction, which is what makes this worth fixing while it is free.
- Keywords: innerHTML, textContent, replaceChildren, CSP, shared link rendering, threat model control
- Use when: touching how a loaded city reaches the DOM, or adding a security header.
- Skip when: making streets nameable, changing parseCity or the fragment caps.

# Problem
- src/ui/hud.ts builds eight fragments with interpolated innerHTML, including row("Street", info.street) at :187. This is safe today only because streetName composes from a fixed word list, and prod_007 points at naming as a direction.
- docs/shared-link-threat-model.md covers parsing a fragment but not rendering what comes out of it.
- render.yaml serves five security headers but no CSP, and the app loads nothing cross-origin.

# Scope
- In:
  - Replace the interpolated row helpers with node construction and textContent, using replaceChildren as showCityStats at src/ui/hud.ts:65 already does.
  - Add a CSP to render.yaml, at least default-src 'self', object-src 'none', base-uri 'none'.
  - Add a required control to docs/shared-link-threat-model.md: a value from a loaded city is rendered with textContent, never innerHTML.
  - Check the CSP does not break the inline style block or the four-line inline script in index.html; adjust the policy or move the style rather than dropping the policy.
- Out:
  - Making streets nameable, which is a separate product decision.
  - Changing parseCity or the fragment caps.
  - Extracting the stylesheet for its own sake, which req_039 owns.

# Acceptance criteria
- AC1: No city-derived value reaches the DOM through innerHTML.
- AC2: The selection panel and the ledger render unchanged.
- AC3: A CSP is served and the app still loads, draws and saves.
- AC4: The threat model states the rendering rule.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: No city-derived value reaches the DOM through innerHTML.
- request-AC5 -> This backlog slice. Proof: AC2: The selection panel and the ledger render unchanged.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_029_a_release_that_proves_it_shipped_and_a_link_that_cannot_write_to_the_page`
- Architecture decision(s): (none yet)
- Request: `req_038_harden_the_release_path_and_the_shared_link_surface`
- Primary task(s): `task_040_orchestrate_the_release_and_client_hardening`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- 2026-09-03 implementation wave: `src/ui/hud.ts` no longer writes HUD, ledger, or selection values through `innerHTML`; all rows are built as nodes and populated with `textContent`/element properties.
- 2026-09-03 implementation wave: `render.yaml` now serves a CSP with `default-src 'self'`, `object-src 'none'`, `base-uri 'none'`, and hashes for the existing inline style/script instead of `style-src 'unsafe-inline'`.
- 2026-09-03 implementation wave: `docs/shared-link-threat-model.md` now requires loaded-city values to render through `textContent` or equivalent node properties, never `innerHTML`.
- 2026-09-03 validation: `rtk npm run ci` passed; `rtk npm run test:visual` passed with 551 buildings rendered in a real browser.
- 2026-09-03 validation: `rtk npm run test:e2e` passed the HUD/ledger/save checks before timing out at `scripts/interact.mjs:1021` on the known zone-clear wait that predates this slice.
