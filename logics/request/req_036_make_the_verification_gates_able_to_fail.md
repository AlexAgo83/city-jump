## req_036_make_the_verification_gates_able_to_fail - Make the verification gates able to fail
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 15:42:22

# AI Context
- Summary: Three harnesses that already produce the right signal and gate nothing, plus a version drift across three documents that would fail a real deploy.
- Keywords: scenario exit code, balance band, dirty perf record, version check, CI double run, logics-manager devDependency
- Use when: wiring a gate, reading balance or perf evidence, or asking why CI runs twice per push.
- Skip when: fixing a simulation defect (req_035) or the deploy workflow itself (req_038).

# Needs
- A harness that finds the balance out of band stops the build instead of printing it.
- The recorded evidence describes the commit that is shipping, not one 77 commits behind.
- A document that states a version states the version that is shipping.
- One push runs the gate once.

# Context
- This is the highest-value chain of the five. The other four fix defects; this one is what stops the next ones shipping unnoticed. Three harnesses already exist, already produce the right signal, and already gate nothing.
- run-scenarios.mjs computes offTarget at :48 and prints it at :51, but scenario() returns {runs, fought, offTarget} and all three call sites at the bottom of the file discard the return value. There is no process.exit anywhere in the file. Verified: it cannot fail a build even if wired.
- The signal it would give is already bad. The last balance/history.jsonl entry records 3 of 6 seeds holding, averageTreasury -120868, and one seed at -778058. That outlier is an order of magnitude past the others, which points at an unbounded spend loop rather than a mis-tuned cost. Suspects in order: the marginal-lot rebuild loop, the homeless drain at src/sim/economy.ts:159 that the comments blame for emptying the island, and the double workforce allocation that req_035 owns as item_102.
- Sequencing matters. Wiring the gate into npm run ci while the band is violated makes CI permanently red, and a permanently red gate is not a gate. Make it able to fail on a branch, read what it says, fix the balance, then merge the wiring.
- perf/history.jsonl stops at commit 906f143, 77 commits behind HEAD, and its last three entries carry dirty: true, so they are not reproducible. CONTRIBUTING.md:38 requires rendering work meant to be faster to show it; the record cannot support that claim now.
- The e2e and visual suites are deliberately local and must stay that way. CONTRIBUTING.md:48 gives the reason -- no GPU on the runners, every wait polls per frame, so the suite would test the runner rather than the app. That argument does not apply to scenarios or balance, which are pure Node.
- Three documents state 0.2.0 while package.json is 0.4.0: README.md:7, SECURITY.md:9 which declares the shipping line unsupported, and docs/static-site-blueprint.md:8. This is not cosmetic: .github/workflows/render-release-deploy.yml:55 hard-fails unless the tag matches package.json, so following the blueprint produces a failed deploy. Two releases have passed without these being updated, so the fix is a scripted check rather than a third manual correction.

# Acceptance criteria
- AC1: A scenario run outside the target band exits non-zero.
- AC2: The balance scenario holds within its declared band, or the band is changed deliberately with its rationale recorded.
- AC3: The performance record refuses a measurement taken on a dirty tree unless explicitly allowed.
- AC4: A recorded performance measurement exists for a commit at or after the frame-cost work.
- AC5: A version stated in a shipped document that disagrees with package.json fails the local gate.
- AC6: One push to a pull request branch runs the CI gate once.
- AC7: npm run ci passes on a clean clone after npm ci alone.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_027_evidence_that_stops_the_build`
- Architecture decision(s): (none yet)

# References
- scripts/run-scenarios.mjs
- scripts/balance.mjs
- scripts/perf.mjs
- balance/history.jsonl
- perf/history.jsonl
- package.json
- .github/workflows/ci.yml
- README.md
- SECURITY.md
- docs/static-site-blueprint.md

# Backlog
- `item_108_let_the_scenario_harness_exit_non_zero`
- `item_109_bring_the_first_run_back_inside_its_declared_band`
- `item_110_refuse_a_performance_measurement_from_a_dirty_tree`
- `item_111_fail_the_gate_when_a_shipped_document_misstates_the_version`
- `item_112_run_the_ci_gate_once_per_push_and_from_a_clean_clone`
- `item_132_stop_a_city_with_no_utilities_dying_outright`
