## item_110_refuse_a_performance_measurement_from_a_dirty_tree - Refuse a performance measurement from a dirty tree
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 15:42:23

# AI Context
- Summary: The record did not go stale through neglect: the harness was broken. b5af5ca closed the settings menu, #frame-cap went display:none, and perf.mjs timed out on it for 47 commits. Fixed in 418c133. The dirty-tree guard is the remaining half.
- Keywords: dirty tree, allow-dirty, perf baseline, union merge driver, append-only record
- Use when: recording a measurement, or before starting any per-frame cost work.
- Skip when: changing what perf measures, or running it in CI, which has no GPU.

# Problem
- The last three perf/history.jsonl entries carry dirty: true, so they cannot be reproduced from any commit. A non-reproducible measurement in the historical record is worse than an absent one, because docs/performance.md:6 treats that file as the record.
- The record stopping at 906f143 was misread in the 0.4.0 review as a discipline failure. It was a broken tool: b5af5ca "Paint the settings menu closed" ships the toolbar with class collapsed (index.html:296) and #toolbar-content at display:none (index.html:46), so #frame-cap is invisible to a click. scripts/perf.mjs selected it without opening the toolbar and timed out after 30 s. interact.mjs has had the toggle helper at scripts/interact.mjs:63 all along, which is why e2e kept passing.
- The break landed 2026-09-02 00:24, eight hours after the last recorded measurement at 2026-09-01 16:05, and stayed broken for 47 commits. Nothing noticed, because perf runs nowhere but a developer's own machine -- which is this chain's whole thesis, arriving as evidence for itself.
- Already fixed and committed as 418c133; a clean-tree entry now exists for that commit. What remains is the dirty-tree guard, and item_133 for the scenario the harness measures.

# Scope
- In:
  - Refuse to append to perf/history.jsonl when the tree is dirty, unless --allow-dirty is passed.
  - Give balance/history.jsonl the commit and dirty fields it has never had. scripts/balance.mjs records neither, so all 72 existing entries are unattributable to any commit -- which is how the 0.4.0 review came to reason about a treasury bleed that had already been fixed. perf at least says which commit it measured and whether the tree was clean.
  - Note that the clean entry now recorded for 418c133 measures an empty city, so item_133 must land before it can serve as req_037's baseline.
  - A .gitattributes union merge driver for perf/history.jsonl and balance/history.jsonl, which are append-only records that conflict on every branch.
- Out:
  - Changing what perf measures or its thresholds.
  - Running perf in CI, which has no GPU.

# Acceptance criteria
- AC1: A perf run on a dirty tree does not append without --allow-dirty, and the same guard applies to balance.
- AC5: Every new balance entry records the commit it measured and whether the tree was clean.
- AC2: A clean baseline exists for a commit at or after item_133, measuring a city with buildings in it.
- AC3: Two branches appending to either history file merge without conflict.

# Notes
- Wave evidence, 2026-09-03: `node scripts/perf.mjs` and `node scripts/build-sim.mjs && node scripts/balance.mjs` both refused to append from a dirty tree without `--allow-dirty`.
- New balance entries now include `commit` and `dirty`, matching the perf record shape. Clean proof recorded in `balance/history.jsonl` for `363a79c` with `dirty:false`.
- `.gitattributes` marks `perf/history.jsonl` and `balance/history.jsonl` as `merge=union` append-only records.
- Task `task_038_orchestrate_the_verification_gates` was finished via `logics-manager flow finish task` on 2026-09-03.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: A perf run on a dirty tree does not append without --allow-dirty.
- request-AC4 -> This backlog slice. Proof: AC2: A clean baseline for current HEAD exists in the record.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_027_evidence_that_stops_the_build`
- Architecture decision(s): (none yet)
- Request: `req_036_make_the_verification_gates_able_to_fail`
- Primary task(s): `task_038_orchestrate_the_verification_gates`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_038_orchestrate_the_verification_gates`
