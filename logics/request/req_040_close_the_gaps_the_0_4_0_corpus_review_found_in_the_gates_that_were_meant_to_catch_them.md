## req_040_close_the_gaps_the_0_4_0_corpus_review_found_in_the_gates_that_were_meant_to_catch_them - Close the gaps the 0.4.0 corpus review found in the gates that were meant to catch them
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: A review of the whole 0.4.0 corpus found the code in good order and the gates around it not quite honest: a threat-model control that never matched the code it describes, a Done request whose size criterion is unmet and whose proof cites another criterion's work, and the trust boundary that imports a shared link sitting untested.
- Keywords: share cap drift, threat model control, req_039 AC1, module size budget, controls.ts coverage, checkout pinning, stale code anchor
- Use when: changing a documented security control, closing an AC whose proof is not obviously about it, or adding a structural gate to tests/architecture.mjs.
- Skip when: putting the browser suite back on the push trigger -- req_006 AC2 settled that against operator quota -- or reopening parseCity's validation and the immutable building cache headers, which req_038 declared correct as they stand.

# Needs
- A control written in a threat model is the control the code enforces, or it is not written there.
- An acceptance criterion is closed by the work that satisfies it, and a criterion asserting a budget has something that measures it.
- The code that turns an untrusted link into a saved city is covered by a test.
- Two workflows in one repo agree on how far an action is trusted.

# Context
- This request comes from a full review of the repo at 0.4.0 (053e6ca), after reqs 035 to 039. Every gate passes: tsc clean, biome clean over 128 files bar the items gathered below, 321 unit tests, 13 architecture tests, 31 of 31 waves held inside the balance band, check:versions and logics:validate green. The findings are not in the product. They are in the places where a gate asserts something it does not check, which is exactly the failure mode the architecture tests exist to prevent.
- docs/shared-link-threat-model.md:17 requires "Cap decompressed JSON at 96 KB while streaming". src/sim/share.ts:5 sets MAX_SHARE_JSON = 1_000_000. Verified in history: that constant has exactly one introducing line and was never any other value, and the 96 KB line entered in 13a1e1c during req_038 -- so this is not drift, the document was wrong the day it was written, in the same request whose "Skip when" recorded the fragment caps as correct as they stand. Decide which number is the control before changing either: 96 KB may be too small for a legitimate large city, in which case the document is what moves.
- The streaming cap itself is correctly implemented -- gunzip in src/sim/share.ts:48 counts as it reads and throws before the cap is exceeded, rather than decompressing and measuring afterwards. Only the number is wrong. Do not rewrite the mechanism.
- The other controls in that document are enforced by tests/architecture.mjs, including the SHA-256 hashes tying index.html's inline blocks to the CSP in render.yaml. The caps are the one control with no test, and they are the one control that diverged. Assert the number in the same place.
- req_039 AC1 -- "No module in src/ exceeds roughly 700 lines without a recorded reason" -- is not met at its own closeout. Six modules exceed it: src/render/roadMesh.ts (1316), src/app/app.ts (1238), src/render/buildings.ts (1087), src/render/drawTool.ts (785), src/ui/controls.ts (725), src/render/trafficMovers.ts (717). The ponytail: comments those files carry are about rendering technique, not module size, and src/app/app.ts -- the file the request was written about -- carries none.
- logics/tasks/task_041_orchestrate_the_structural_work.md:54-55 closes request-AC1 with "Implemented through task_041 slices; final disposal slice in 5ece535", duplicated on two lines. 5ece535 is "Compose app disposal", which is AC5's work. AC1's proof cites AC5's evidence. Repair the traceability line to say what actually happened to AC1, rather than deleting the criterion.
- req_039 delivered most of what it promised and this is not a reopening of the chain: the terrain assertion (AC3), the draw controller (AC4), the dispose contract (AC5), lint over src, scripts and tests (AC8) and the ponytail convention in CONTRIBUTING.md (AC9) are all real and all verifiable in the tree. AC1 is the one that was closed without being met.
- src/app/app.ts is still one function: startApp spans :59 to :1227, about 1170 lines holding 53 closures, with 51 imports and no test. It is smaller and better-seamed than it was, and it is still the single structural risk in 21k lines that are otherwise cleanly divided.
- Nothing tests src/ui/controls.ts (725), src/render/trafficMovers.ts (717), src/render/vehicleModels.ts (585) or src/ui/hud.ts (221) -- not directly and not in transit. src/render/scene.ts and src/sim/traffic.ts look untested by filename but are exercised through src/render/traffic.test.ts, so they are not part of this.
- controls.ts is the one that matters. src/ui/controls.ts:706-725 is the shared-link import path: it takes the fragment, catches decodeShare, prompts, writes the save and loads the city. That is the trust boundary the whole threat model is about, and it has no test. The layers under it are covered -- share.test.ts, save.test.ts -- so this is about the sequence, not the parsing.
- There is no injection or half-load defect on that path today, and the review looked for one. A crafted link carrying an unknown road type passes parseCity, throws in roadType (src/sim/roadTypes.ts:83), and is absorbed because restoreCity (src/sim/save.ts:125) replays into throwaway objects before the live ones and loadCity (src/app/app.ts:900) catches. That dry-run is deliberate and must survive any test written around it.
- .github/workflows/ci.yml pins actions/checkout@v4; render-release-deploy.yml pins it by SHA, and tests/architecture.mjs asserts the SHA pin on the deploy workflow only. One repo, two postures, and the test enforces the stricter one on the file that was already correct.
- Gathered under ADR 030 as one slice, because each of these is a fix whose record is the change itself: two noAccumulatingSpread reduces in src/sim/playthrough.ts:280-281 (O(n^2) over allSegments, out of the frame loop, so cost is not the argument -- they are the only lint warnings left in src/); four fixable lint items in scripts/interact.mjs:119, scripts/interact.mjs:550, scripts/shot.mjs:79 and src/sim/roadTypes.test.ts:36-37; one unused variable at scripts/interact.mjs:2068; and three stale code anchors that logics-manager audit already names in logics/runbook/run_002 and run_003.
- Out of scope and settled, recorded here so it is not found again: test:e2e, test:visual and perf are deliberately off the push trigger. req_006 AC2 put them there against a stated operator constraint on GitHub Actions quota, and scripts/interact.mjs's 2245 lines and roughly 252 checks running only on demand is the decision, not a gap.

# Acceptance criteria
- The decompression cap in src/sim/share.ts and the cap written in docs/shared-link-threat-model.md are the same number, and a test fails if they diverge again.
- Every module in src/ over the size budget either falls under it or carries a recorded reason at its declaration, and a test reports the ones that do neither.
- req_039 AC1's traceability line cites the work that addressed it, and no acceptance criterion in that task cites another criterion's proof.
- The shared-link import sequence in src/ui/controls.ts is tested end to end -- a good link imports, a malformed one refuses without writing a save, and a link that throws downstream leaves the previous city intact.
- src/ui/hud.ts, src/render/trafficMovers.ts and src/render/vehicleModels.ts each carry a test, or a recorded reason why they cannot.
- Both workflows pin third-party actions the same way, and the architecture test asserts it for every workflow rather than one.
- biome lint over src, scripts and tests reports no warnings, and logics-manager audit reports no stale code anchors.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_031_gates_that_check_what_they_claim`
- Architecture decision(s): (none yet)

# References
- docs/shared-link-threat-model.md
- src/sim/share.ts
- src/ui/controls.ts
- src/app/app.ts
- src/ui/hud.ts
- src/render/trafficMovers.ts
- src/render/vehicleModels.ts
- src/sim/playthrough.ts
- tests/architecture.mjs
- .github/workflows/ci.yml
- logics/tasks/task_041_orchestrate_the_structural_work.md
- logics/request/req_039_give_the_code_its_seams_back.md

# Backlog
- `item_136_make_the_shared_link_decompression_cap_the_number_the_threat_model_states`
- `item_137_give_src_a_module_size_budget_that_something_measures`
- `item_138_repair_the_traceability_line_that_closed_req_039_ac1_with_another_criterion_s_proof`
- `item_139_test_the_sequence_that_turns_a_shared_link_into_a_saved_city`
- `item_140_cover_the_three_modules_nothing_reaches_or_record_why_not`
- `item_141_pin_third_party_actions_the_same_way_in_every_workflow`
- `item_142_the_fixes_whose_record_is_the_change_itself`
