## item_185_retake_the_readme_captures_from_the_demo_on_its_own_framing - Retake the README captures from the Demo on its own framing
> From version: 0.5.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 14:33:41
> Owner: Claude

# AI Context
- Summary: The README captures came from a scripted city, not the Demo their alt text names, and nothing could retake them on the same framing.
- Keywords: screenshots, camera, saved framing, capture script, readme
- Use when: retaking the README captures, or changing what framing they use.
- Skip when: scripts/shot.mjs, which still drives the scripted visual acceptance scenarios.

# Problem
- The three README captures were taken from a scripted city built by `scripts/shot.mjs`, not from the Demo the alt text names.
- Nothing could retake them: reproducing the framing meant matching a camera by hand.
- The save now carries its own camera, so the framing is a fact in the fixture rather than a thing to reproduce.

# Scope
- In:
  - A script that loads the bundled Demo, lets the load apply the saved camera, and captures Select, Roads and Traffic.
  - A refusal to shoot when the live camera does not match the save's, so a drifted framing cannot ship as a capture.
  - Waiting for every building model before shooting, so the city is never photographed half-built.
- Out:
  - Changing `scripts/shot.mjs`, which still drives the scripted visual acceptance scenarios.
  - Touching the camera in the capture script: the framing belongs to the save.
  - The other captures in `docs/media/`.

# Acceptance criteria
- AC1: One command produces all three README captures.
- AC2: The three differ only in the view selected, which is what the README claims about them.
- AC3: The script exits non-zero if the camera has drifted from the save's, or if the page reports an error.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: One command produces all three README captures.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- Follow-up after the first attempt shipped empty streets. The city boots paused, so the captures were of stationary traffic sitting on its spawn points. The script now presses Play, waits until stats().moverPositions actually changes between two reads - the hook src/app/app.ts documents as existing so a harness can prove the city was running - lets the cars spread for six seconds, then pauses again. Pausing before the shot matters because a screenshot cannot show motion, only position, while running on costs about an hour of game time per eight seconds of wall clock and reshot the city in a different light than the save records. The saved hour is then written back through the sun slider and asserted within 0.05 before shooting, for the same reason the camera is never touched: the fixture decides what the captures look like. Two new refusals: no traffic on the roads, and an hour that is not the save's.
- Second capture changed from the Roads tool to the Zones select view. Roads mode differed from the first capture only by a faint frontage overlay and a different toolbar row, so two of the three README images were nearly the same picture. The three are now the three select views the README's Read it bullet describes - All, Zones, Traffic - on one framing, which is also what their alt text claims. The filename city-jump-curves.png is kept despite no longer describing its contents: docs/media/README.md warns that a capture may be cited from published release notes this repository cannot see, and a rename would break precisely such a citation. The stale name is recorded in the index row instead.

# Links
- Product brief(s): `prod_039_a_shop_window_that_shows_the_game_that_exists`
- Architecture decision(s): (none yet)
- Request: `req_052_ship_the_played_demo_city_reshoot_the_readme_from_it_and_stop_the_readme_overstating_what_is_missing`
- Primary task(s): `task_054_orchestrate_the_demo_swap_and_readme_correction`

# Priority
- Priority: Medium
- Rationale: Nothing is wrong today because this script is missing; it makes the captures reproducible now that the framing is a fact in the save rather than a camera to match by hand.

# Tasks
- `task_054_orchestrate_the_demo_swap_and_readme_correction`

# Notes
- Task `task_054_orchestrate_the_demo_swap_and_readme_correction` was finished via `logics-manager flow finish task` on 2026-09-07.
