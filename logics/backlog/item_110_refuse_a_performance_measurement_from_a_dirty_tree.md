## item_110_refuse_a_performance_measurement_from_a_dirty_tree - Refuse a performance measurement from a dirty tree
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: A non-reproducible measurement in the historical record is worse than an absent one, and docs/performance.md treats that file as the record. Also provides the baseline req_037 cannot start without.
- Keywords: dirty tree, allow-dirty, perf baseline, union merge driver, append-only record
- Use when: recording a measurement, or before starting any per-frame cost work.
- Skip when: changing what perf measures, or running it in CI, which has no GPU.

# Problem
- The last three perf/history.jsonl entries carry dirty: true, so they cannot be reproduced from any commit. A non-reproducible measurement in the historical record is worse than an absent one, because docs/performance.md:6 treats that file as the record.
- The record stops at 906f143, 77 commits behind HEAD, while CONTRIBUTING.md:38 requires rendering work meant to be faster to show it.

# Scope
- In:
  - Refuse to append to perf/history.jsonl when the tree is dirty, unless --allow-dirty is passed.
  - Take a fresh baseline on a clean HEAD so req_037 has something to compare against.
  - A .gitattributes union merge driver for perf/history.jsonl and balance/history.jsonl, which are append-only records that conflict on every branch.
- Out:
  - Changing what perf measures or its thresholds.
  - Running perf in CI, which has no GPU.

# Acceptance criteria
- AC1: A perf run on a dirty tree does not append without --allow-dirty.
- AC2: A clean baseline for current HEAD exists in the record.
- AC3: Two branches appending to either history file merge without conflict.

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
