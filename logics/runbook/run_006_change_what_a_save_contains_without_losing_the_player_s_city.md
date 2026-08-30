## run_006_change_what_a_save_contains_without_losing_the_player_s_city - Change what a save contains without losing the player's city
> Status: Active
> Category: other
> Verified: 2026-08-30 against `src/sim/save.ts`, `src/ui/saves.ts`, `src/sim/save.test.ts` and the older-build check in `scripts/interact.mjs`
> Related request: (none yet)
> Related backlog: (none yet)
> Related task: (none yet)
> Reminder: Update status, category, verification, and linked refs when you edit this doc.

# Trigger
- Adding, removing or renaming anything that goes into a save (a new road property, a new kind of planting, a new setting).
- Touching `SAVE_VERSION`, `parseCity`, `serializeCity` or `restoreCity`.
- The operator reports "my city is gone", "you can't read my save any more", or "I lost my localStorage".

# Prerequisites
- Read `src/sim/save.ts`'s header comment first: it states what is stored and what is deliberately recomputed, and why node elevations are the exception.
- Know that "the city is gone" has been reported twice, and **neither time was any data actually lost**. Diagnose before apologising, and never offer to restore something that was only unreadable.

# Procedure
1. **Old saves must keep loading. Any version up to the current one is readable.** `parseCity` accepts `v >= 1 && v <= SAVE_VERSION`, and refuses only saves from a *newer* build, which may carry state this build would silently drop. Bumping `SAVE_VERSION` while requiring an exact match rejected every existing save at once — the data sat untouched in `localStorage`, only the read refused it, and the save picker looked empty.
2. **Make every new field optional and defaulting to empty**, so an older city loads as itself. That is what makes rule 1 cheap: the planting species is absent in old saves and defaults to firs; the roundabout flag is absent and means an ordinary node.
3. **Store only what cannot be recomputed.** Segment samples, `ts`, `cumulative` and `length` all come back out of `buildSamples`; persisting them would multiply the payload and force a migration on every change to the curve maths. Node elevations are the deliberate exception — replaying onto pristine terrain would otherwise land junctions at different heights.
4. **Keep save → load → save a fixed point.** If a round trip is not idempotent, something is being recomputed differently on the way back in.
5. **Leave two guards behind, every time.** Both already exist and both must keep passing: a unit test in `src/sim/save.test.ts` that parses a hand-written v1 payload, and the check in `scripts/interact.mjs` that takes the *current* autosave, strips the fields added since, stamps it version 1, reloads the page and demands the city back. A new field means extending the second one's strip list.
6. **A refused write is not a refused save.** `writeSave` returns a boolean for a full, disabled or private-mode store; `writeAutosave` currently does not (tracked in `req_007_review_findings_half_destroyed_city_on_a_failed_load_and_rebuild_config_test_hygiene`). Do not add a new write path that swallows the failure.

# Verification
Before concluding anything is lost, rule out the two causes that were both mistaken for data loss:
1. **Two dev servers, two origins, two localStorages.** Vite falls back to 5174 when 5173 is already taken, and the browser treats them as completely separate origins. A city "lost" on one port is sitting in the other's storage. Check for a second `vite` process before anything else, and try the other port in the same browser.
2. **Editing `index.html` forces a full page reload on every connected tab.** Vite cannot HMR it, so any in-progress work newer than the last autosave (debounced 2 s) is gone — and that part genuinely is unrecoverable. Say so when you are about to edit `index.html`, before editing it.
3. Only then look at the code: is the version being refused, is a field newly required, is a segment now rejected by rules that accepted it when the city was built?

Then: `npm test` for the v1 unit test, `npm run test:e2e` for the older-build reload check, and a manual reload with a real named save.

# Rollback
- Reverting a format change restores readability immediately **as long as rule 1 held** — saves written by the newer build carry the higher `v` and will then be refused by the older code, which is the intended direction of that guard, not a bug. Bumping `SAVE_VERSION` is therefore a one-way door for anyone who has already played on the new build.

# References
- `src/sim/save.ts` -- `SAVE_VERSION`, `parseCity`, `serializeCity`, `restoreCity`, and the header comment on what is and is not stored.
- `src/ui/saves.ts` -- the localStorage layer, one key per city plus an index key.
- `src/sim/save.test.ts` -- the hand-written v1 payload test.
- `scripts/interact.mjs` -- "a city saved by an older build still loads".
- `req_007_review_findings_half_destroyed_city_on_a_failed_load_and_rebuild_config_test_hygiene` -- the failed-load rollback and the autosave quota gap, both open.
