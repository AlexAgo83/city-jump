## road_003_city_jump_a_city_that_holds_up_when_it_is_checked - city-jump: a city that holds up when it is checked
> Date: 2026-09-03
> Status: Active
> Related product: `prod_026_a_city_that_survives_the_roads_you_draw_on_it`
> Related request: `req_035_fix_the_correctness_defects_the_0_4_0_review_found`
> Reminder: Update status, milestone scope, linked refs, risks, and success signals when you edit this doc.
> Indicators reviewed: 2026-09-03 12:40:52

# AI Context
- Summary: Five chains that follow 0.4.0, ordered by what unblocks what rather than by feature. The through-line is trust: a city that keeps its shape, harnesses that can fail, a cost that is measured rather than argued, a release that proves it shipped, and seams a test can reach.
- Keywords: roadmap, correctness, verification gates, frame cost, release hardening, structural seams, post-0.4.0
- Use when: deciding what to work on next, or placing a new request chain against the shape of the work after 0.4.0.
- Skip when: looking for the game's feature strands -- road_002 holds those, superseded once its last slice landed.

# Summary
0.4.0 made the city something that can be lost. This roadmap is what a full review of that release
found, plus what running its own harnesses found afterwards -- which was more, and worse.

The order is not a feature order and not a severity order. It is an unblocking order. Two chains
run first because everything else reads their output: the defects, because they are live and one of
them throws with the graph half-cut; and the gates, because three harnesses already produce the
right signal and gate nothing, so the next regression ships the same way this one did. The frame
cost waits on the gates, since nothing in it can be shown against a harness that measures an empty
city. The seams wait on everything, because `src/app/app.ts` carries 143 commits and refactoring it
early turns every fix above it into a conflict.

Two things found by running rather than reading set the tone for the whole roadmap. A city that
never builds power and water ends with nobody living in it, on every seed, and a band-only gate
reports that as clean. And both measurement harnesses had been dead for 47 commits, killed by the
commit that closed the settings menu -- so the evidence this project asks its contributors to
produce could not be produced at all.

# Milestones
## 1.0 - The defects, fixed










- `task_037_orchestrate_the_0_4_0_correctness_fixes`: Orchestrate the 0.4.0 correctness fixes
- `item_107_the_sim_fixes_whose_record_is_a_comment_and_a_test`: The sim fixes whose record is a comment and a test
- `item_106_take_the_undo_snapshot_when_the_wrecking_ball_lands_not_when_the_player_clicks`: Take the undo snapshot when the wrecking ball lands, not when the player clicks
- `item_105_make_house_numbering_locale_independent_and_stop_rebuilding_every_street_per_parcel`: Make house numbering locale-independent and stop rebuilding every street per parcel
- `item_104_bound_the_cleared_tree_record`: Bound the cleared-tree record
- `item_103_make_a_building_pad_stamp_idempotent_between_neighbours`: Make a building pad stamp idempotent between neighbours
- `item_102_give_the_workforce_one_authority`: Give the workforce one authority
- `item_101_reset_the_whole_economy_on_a_load_and_stop_the_shortage_getter_mutating`: Reset the whole economy on a load, and stop the shortage getter mutating
- `item_100_derive_the_utility_mask_from_the_item_list_instead_of_owning_it`: Derive the utility mask from the item list instead of owning it
- `item_099_cut_a_segment_as_many_times_as_one_road_crosses_it`: Cut a segment as many times as one road crosses it
- Chain: `req_035_fix_the_correctness_defects_the_0_4_0_review_found`
- Goal: the city keeps its shape through a second crossing, a reload and an undo.
- Scope: nine slices. A road that crosses one segment twice, which today throws with the original
  road cut and the drawn road missing. A utility mask that is never cleared and is persisted. An
  economy that inherits the previous run's shortage latch. One authority for the workforce instead
  of two that disagree. Idempotent building pads, a bounded cleared-tree record, locale-independent
  addressing, and an undo that pairs with the demolition it undoes.
- Exit signal: every slice has a test that fails without it; the four reported-but-unreproduced
  findings are each either fixed or closed as no-change with that recorded.

## 2.0 - The gates, able to fail







- `task_038_orchestrate_the_verification_gates`: Orchestrate the verification gates
- `item_132_stop_a_city_with_no_utilities_dying_outright`: Stop a city with no utilities dying outright
- `item_112_run_the_ci_gate_once_per_push_and_from_a_clean_clone`: Run the CI gate once per push, and from a clean clone
- `item_111_fail_the_gate_when_a_shipped_document_misstates_the_version`: Fail the gate when a shipped document misstates the version
- `item_110_refuse_a_performance_measurement_from_a_dirty_tree`: Refuse a performance measurement from a dirty tree
- `item_109_bring_the_first_run_back_inside_its_declared_band`: Bring the first run back inside its declared band
- `item_108_let_the_scenario_harness_exit_non_zero`: Let the scenario harness exit non-zero
- Chain: `req_036_make_the_verification_gates_able_to_fail`
- Goal: a harness that finds a problem stops the build.
- Scope: six slices. The scenario harness gains an exit code and two assertions a band cannot see --
  a seed that never fights, and a seed that ends with nobody in it. The first run comes back inside
  its declared band, which is currently violated in both directions. The performance record refuses
  a dirty tree. A scripted check stops a shipped document misstating the version. CI runs once per
  push and works from a clean clone.
- Exit signal: `npm run ci` fails on a city that empties itself, and passes on a fresh clone with no
  global install.

## 3.0 - The cost, measured








- `task_039_orchestrate_the_per_frame_cost_work`: Orchestrate the per-frame cost work
- `item_133_make_the_performance_scenario_measure_a_city_with_buildings_in_it`: Make the performance scenario measure a city with buildings in it
- `item_118_show_the_frame_cost_came_down`: Show the frame cost came down
- `item_117_re_resolve_a_mover_s_segment_after_a_rebuild`: Re-resolve a mover's segment after a rebuild
- `item_116_build_the_yield_and_crossing_occupancy_once_per_frame`: Build the yield and crossing occupancy once per frame
- `item_115_fan_the_sun_out_once_per_visible_step`: Fan the sun out once per visible step
- `item_114_derive_the_supplied_utility_set_only_when_it_can_have_changed`: Derive the supplied-utility set only when it can have changed
- `item_113_gate_the_building_state_upload_on_a_change_signature`: Gate the building state upload on a change signature
- Chain: `req_037_stop_paying_every_frame_for_a_city_that_is_not_changing`
- Goal: per-frame work proportional to what changed, and proof of it.
- Scope: seven slices. First the harnesses have to measure a real city -- both `perf` and `ablate`
  drive `demoCity()` with the clock stopped, so they measure roads and trees over empty land. Then
  the building state upload, the supplied-utility derivation, the sun fan-out, the roundabout
  occupancy index, and a mover's stale segment. Then a recorded before and after.
- Exit signal: a clean-tree measurement on a city with buildings in it shows the change, including
  any metric that did not improve.
- Note: the priorities inside this chain are not validated. `item_113` is filed as the largest
  per-frame cost from reading the code, while the only renderer measurably costing anything in the
  scene as it is measured today is traffic. `item_133` is what makes that answerable.

## 4.0 - The release, proved








- `item_136_decide_whether_the_fifteen_commits_past_0_4_0_are_a_release`: Decide whether the fifteen commits past 0.4.0 are a release
- `item_134_configure_the_release_contract_and_record_what_shipped`: Configure the release contract and record what shipped
- `task_040_orchestrate_the_release_and_client_hardening`: Orchestrate the release and client hardening
- `item_123_derive_the_asset_version_instead_of_maintaining_two_by_hand`: Derive the asset version instead of maintaining two by hand
- `item_122_let_a_missing_asset_be_missing`: Let a missing asset be missing
- `item_121_render_a_loaded_city_as_text_and_say_so_in_the_threat_model`: Render a loaded city as text, and say so in the threat model
- `item_120_establish_whether_the_deploy_hook_honours_the_commit_then_verify_the_outcome`: Establish whether the deploy hook honours the commit, then verify the outcome
- `item_119_take_the_release_tag_out_of_the_shell_and_refuse_a_branch`: Take the release tag out of the shell and refuse a branch
- Chain: `req_038_harden_the_release_path_and_the_shared_link_surface`
- Goal: a deploy reports what it deployed, and a shared link cannot write to the page.
- Scope: five slices. The release tag out of the shell and refused if it names a branch. The deploy
  outcome polled, because the service's own history holds two `build_failed` deploys reported as
  successful releases. A loaded city rendered as text before naming makes that a vector. A CSP. A
  missing asset that 404s. One derived asset version instead of two hand-maintained constants.
- Exit signal: a deploy that starts and then fails does not report success; no city-derived value
  reaches the DOM through `innerHTML`.
- Also carries two things the review missed and the diagnostics found: the Logics release contract
  has never been configured, and production is fifteen commits behind a HEAD that fixes a reload
  un-building the city. Both are owner decisions about readiness, not measurements.

## 5.0 - The seams, reachable










- `item_135_declare_where_this_project_stands_on_translation`: Declare where this project stands on translation
- `task_041_orchestrate_the_structural_work`: Orchestrate the structural work
- `item_131_write_down_the_conventions_the_code_already_follows`: Write down the conventions the code already follows
- `item_130_make_lint_mean_lint_and_cover_the_scripts`: Make lint mean lint, and cover the scripts
- `item_129_give_the_save_format_somewhere_to_migrate`: Give the save format somewhere to migrate
- `item_128_give_every_renderer_a_dispose`: Give every renderer a dispose
- `item_127_move_road_drawing_into_the_layer_that_owns_the_city`: Move road drawing into the layer that owns the city
- `item_126_make_the_terrain_dependency_visible`: Make the terrain dependency visible
- `item_125_move_the_driving_logic_where_a_test_can_reach_it`: Move the driving logic where a test can reach it
- `item_124_take_the_isolated_pieces_out_of_startapp`: Take the isolated pieces out of startApp
- Chain: `req_039_give_the_code_its_seams_back`
- Goal: the code that changes most often is code a test can hold.
- Scope: eight slices. `startApp` split along five seams, the traffic and building files split along
  three, the terrain global made visible to a test, road drawing moved to the layer that owns the
  city, a dispose contract, a save migration hook, a real linter over `src` and `scripts` and
  `tests`, and the conventions the code already follows written down.
- Exit signal: the driving logic has headless tests; a `setTerrain` call outside `src/app/` fails the
  architecture test; behaviour changed nowhere and no existing test needed an edit.
- Decision: `adr_006` is Accepted and gates the driving logic's move to `src/sim/` on those tests
  existing, so the runner acts on it without asking. The one reserved call here is `item_135`:
  whether this project owns a source locale or is deliberately English-only.

# The order to follow
- 1.0 and 2.0 run together. They do not block each other and they hold the two most valuable items:
  the reproduced crossing throw, and a gate that cannot currently fail.
- Inside 2.0, make each harness able to fail before trusting what it says. Do not wire a gate into
  `npm run ci` while it is red -- a permanently failing gate is not a gate.
- `item_102` from 1.0 before `item_109` from 2.0: a divergent staffing count would move both the
  threat and the firepower, so the balance question may answer itself.
- 3.0 only after `item_110` and `item_133`. Without them every claim in it is an assertion.
- 4.0 is independent and can fill a gap between investigations. Its slices are mechanical.
- 5.0 last, and not before 1.0 through 4.0 have landed.

# Risks
- Reasoning from a stale record. This roadmap exists partly because a review cited a treasury bleed
  that no longer reproduced; the recorded evidence was 100 commits old. Run the harness, do not read
  its archive.
- Wiring a gate that cannot pass. 2.0 fails today by design, which is the point; merging it into the
  local gate before its cause is fixed leaves main red and trains everyone to ignore it.
- Optimising what was never measured. 3.0's own note says its priorities are unvalidated.
- Refactoring into a moving target. 5.0 touches `src/app/app.ts`, the highest-churn file in the
  repository, and every earlier chain edits it.
- Fixing a finding that was never real. Four slices in 1.0 are hypotheses; the instruction is to
  write the failing test first and close as no-change if it passes.

# Success signals
- A road drawn across another splits it however many times it crosses, and never leaves the city
  half-cut.
- `npm run ci` fails on a city that empties itself without power and water.
- A clean-tree performance measurement exists for a city that has buildings in it.
- A release that fails its build is not reported as shipped.
- The driving rules have tests that run without a browser, or the item is closed saying they were
  not written.

# References
- Related product: `prod_026_a_city_that_survives_the_roads_you_draw_on_it`
- Related request: `req_035_fix_the_correctness_defects_the_0_4_0_review_found`
- Chains: `req_035_fix_the_correctness_defects_the_0_4_0_review_found`,
  `req_036_make_the_verification_gates_able_to_fail`,
  `req_037_stop_paying_every_frame_for_a_city_that_is_not_changing`,
  `req_038_harden_the_release_path_and_the_shared_link_surface`,
  `req_039_give_the_code_its_seams_back`
- Architecture: `adr_006_move_the_driving_logic_to_sim_when_its_tests_exist_not_before`
- Supersedes: `road_002_city_jump_a_city_worth_defending`
