## item_086_upgrades_that_do_something_or_upgrades_that_are_not_offered - Upgrades that do something, or upgrades that are not offered
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 14:26:06

# AI Context
- Summary: The delivery slice for the web itself: each node gets a real effect along its own branch or leaves the web, and the branch-label test is replaced by tests over effects.
- Keywords: upgrades, something, not, offered
- Use when: Working on what a prestige upgrade does or on `FIRST_UPGRADE_WEB`.
- Skip when: You need where the web is displayed, which is the panel slice.

# Problem
- Each of the nine upgrade identifiers appears twice in the codebase: in `FIRST_UPGRADE_WEB` and in the tests over it. Nothing else reads them.
- `profile.upgrades` is persisted and restored and consulted in exactly one place, `button.dataset.owned`, which sets the button's colour.
- The acceptance criterion covering this is proven by a test asserting the three branch labels exist. It cannot fail, and would not fail if every upgrade were deleted from the game's rules -- which is the state the code is in.
- The labels are the raw identifiers with a price appended, so what a player is offered is `battery-readiness 5`.

# Scope
- In:
  - Give each node a real effect along its own branch, or remove it from the web until it has one -- a web of four that work beats nine that do not.
  - The starting-condition nodes are the cheapest to make real: `starter-funds`, `starter-materials` and `starter-services` are three numbers a new run already reads from constants.
  - Capability nodes reach the batteries, the utilities and the evacuation; information nodes reach what the gauges and the wave banner may show before a wave lands.
  - Name and describe each node by what it does, so the player is reading an offer rather than an identifier.
  - Replace the branch-label test with tests over the effects: owning a node changes an observable outcome, and not owning it does not.
  - Keep the survival brief's rule intact -- capabilities, starting conditions and information, never multipliers over the loop's own scarcities -- and prove it against what the nodes do rather than what they are called.
- Out:
  - New branches, new currencies, or new nodes beyond what the existing nine become.
  - Rebalancing prestige costs beyond what making a node real requires.
  - Where the web is displayed, which is the other slice.

# Acceptance criteria
- AC1: Every node still in the web changes an observable outcome; nodes that do not are gone.
- AC2: Each node's effect is covered by a test that fails when the effect is removed.
- AC3: No node touches a core rate, proven against its effect rather than its branch label.
- AC4: Nodes are named and described by what they do.

# Report
- Delivered in `task_033`: the offered web now contains only `starter-funds`, `starter-materials`, and `starter-services`.
- Each remaining node has a concrete starting-condition effect: extra starting money, starting materials, or starting services.
- The six capability/information nodes were removed from the offered web until they have observable effects.
- `src/sim/run.test.ts` now asserts effects and removal of `coverage-map`, replacing the old branch-label-only test.
- Upgrade buttons render player-facing names and descriptions instead of raw identifiers.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Every node still in the web changes an observable outcome; nodes that do not are gone.
- request-AC2 -> This backlog slice. Proof: AC2: Each node's effect is covered by a test that fails when the effect is removed.
- request-AC4 -> This backlog slice. Proof: AC3: No node touches a core rate, proven against its effect rather than its branch label.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_022_a_purchase_screen_is_not_a_play_screen`
- Architecture decision(s): (none yet)
- Request: `req_031_a_panel_that_sells_nothing_nine_upgrades_with_no_effect_permanently_on_the_play_screen`
- Primary task(s): `task_033_make_the_prestige_web_real_and_take_it_off_the_play_screen`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_033_make_the_prestige_web_real_and_take_it_off_the_play_screen`

# Notes
- Task `task_033_make_the_prestige_web_real_and_take_it_off_the_play_screen` was finished via `logics-manager flow finish task` on 2026-09-01.
