## req_031_a_panel_that_sells_nothing_nine_upgrades_with_no_effect_permanently_on_the_play_screen - A panel that sells nothing: nine upgrades with no effect, permanently on the play screen
> From version: 0.3.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 10:38:29

# AI Context
- Summary: The prestige web sells nine upgrades that change nothing and sits permanently on the play screen beside two unconfirmed destructive controls: make the nodes real or drop them, and move the purchase screen off the game.
- Keywords: panel, sells, nothing, nine, upgrades, effect, permanently, play, screen
- Use when: Working on the prestige web, the run panel, or what stays permanently on screen during play.
- Skip when: You need the wave, the city economy, or how a run ends.

# Needs
- Not one of the nine prestige upgrades does anything. `battery-readiness`, `utility-survey`, `evac-drill`, `starter-funds`, `starter-materials`, `starter-services`, `wave-forecast`, `coverage-map` and `risk-ledger` appear exactly twice in the codebase each: in the list that declares them and in the tests over that list. `profile.upgrades` is written, persisted, read back on load, and consulted in one place -- `button.dataset.owned`, which turns the button green. The web spends a currency to recolour itself.
- The acceptance criterion that covers this is satisfied vacuously. the run slice's AC3 says prestige is spent on capabilities, starting conditions and information and never on multipliers over the loop's own scarcities, proven by a test asserting no node touches a core rate. The test asserts that the three branch *labels* are present. No node touches a core rate because no node touches anything, and no test that could be written over the current code would fail.
- That web is permanently on the play screen. `#run-panel` is `position: fixed` with no hidden state, and it carries a wave counter, a science counter, a prestige counter, a hardcore checkbox, an Evacuate button, and nine upgrade buttons that wrap across up to 560 pixels. Their labels are the raw identifiers with the price appended -- `battery-readiness 5` -- which is a developer surface shown to a player.
- The interface slice immediately before it decided the opposite rule. the interface slice's AC6: no permanent readout is added without another being removed or folded. The very next task added six permanent elements and folded nothing.
- Prestige is a between-runs currency and there is nothing to do with it during a run. Science only becomes prestige through `carryScience`, which fires on evacuation, so the number the panel shows cannot change while the player is playing. The buttons are therefore not merely ineffective -- for most of a run they are also unspendable, and they sit in the corner of the screen throughout.
- Two of the panel's controls are destructive and both are one unconfirmed click away, permanently. Evacuate ends the run outright the moment it is pressed. The hardcore checkbox decides whether a defeat deletes the run's save, and it can be toggled at any point during the run it governs, next to nothing that asks whether that was meant.
- What this costs is not only screen space. A player learning the game reads that panel as a promise: nine capabilities to work towards. Every one of them is a promise the game does not keep, and the first time that is noticed it is the whole prestige loop that stops being believed.

# Context
- The prestige web itself is a good design and the survival brief is specific about it: capabilities, starting conditions and information, never multipliers over the loop's own scarcities. Nothing here argues against the web. The argument is that a node which changes nothing should not be purchasable, and that a purchase screen is not a play screen.
- Each branch says plainly what it should reach: `starting` upgrades belong to how a run opens, which the run slice's AC5 already describes as the bridge, the road and the starter kit; `capability` upgrades belong to the batteries, the utilities and the evacuation; `information` upgrades belong to what the gauges and the wave banner are allowed to tell the player before the wave lands.
- The starting-condition upgrades are the cheapest to make real and the easiest to test: `starter-funds`, `starter-materials` and `starter-services` are three numbers that a new run already reads from constants.
- The information upgrades interact with the interface slice's own rule about permanent readouts, and are the natural answer to it: an upgrade that unlocks a readout is a readout the player asked for, which is a better reason for it to be permanent than the one the panel currently has.
- `prod_019_an_interface_for_a_city_you_can_lose` is the brief that governs where things belong on screen. This request is that brief applied to the panel the run slice added after it.
- There is a smaller answer available for any node that turns out to be expensive: remove it from the web until it does something. A web of four upgrades that work is better than nine that do not, and shrinking it costs nothing but a list.
- Nothing here needs new prestige, new branches or new currency. Every defect is a control that exists and reaches nothing, or a control that exists in the wrong place.

# Acceptance criteria
- AC1: Every upgrade the web offers changes something the player can observe, or it is not offered.
- AC2: That each upgrade has an effect is proven by a test over the effect, not by a test over the list's branch labels.
- AC3: The prestige web is reached where prestige is earned and spent -- between runs -- rather than sitting permanently on the play screen.
- AC4: Upgrades are named and described by what they do, not by their identifier and a number.
- AC5: The permanent run readouts obey the rule the interface slice set: nothing is added permanently without something being removed or folded.
- AC6: Ending a run is not a single unconfirmed click, and the hardcore setting is chosen where a run begins rather than toggled during the run it governs.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_022_a_purchase_screen_is_not_a_play_screen`
- Architecture decision(s): (none yet)

# References
- src/sim/run.ts
- src/app/app.ts
- src/ui/saves.ts
- src/sim/run.test.ts
- index.html
- logics/request/req_027_the_interface_the_wave_demands_game_state_leaves_the_settings_menu.md
- logics/request/req_028_runs_science_and_prestige_leaving_an_island_with_something.md
- logics/product/prod_019_an_interface_for_a_city_you_can_lose.md

# Backlog
- `item_086_upgrades_that_do_something_or_upgrades_that_are_not_offered`
- `item_087_a_run_panel_that_carries_what_the_player_is_playing_with`
