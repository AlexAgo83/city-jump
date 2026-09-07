## task_049_bound_autosave_latency_so_accelerated_play_cannot_starve_persistence - Bound autosave latency so accelerated play cannot starve persistence
> From version: 0.5.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Persistence
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: claude
> Indicators reviewed: 2026-09-07 09:19:37

# AI Context
- Summary: Bound the autosave debounce so continuous accelerated play cannot defer every write, while keeping burst batching.
- Keywords: bound, autosave, latency, accelerated, play, cannot, starve, persistence
- Use when: changing autosave scheduling or the persistence debounce.
- Skip when: changing what a save contains.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_172_bound_autosave_latency_so_accelerated_play_cannot_starve_persistence`

# Acceptance criteria
- AC1: A continuous stream of save requests spaced below the debounce interval still produces writes at a bounded maximum interval, verified with fake time.
- AC2: A burst of requests within the debounce window still collapses into a single write.
- AC3: An advancing city played continuously at an accelerated rate reaches storage with updated elapsed time, verified against actual saved state rather than call counts alone.
- AC4: The refusal path (`onRefused`) still fires at most once when storage rejects a write.

# Plan
- [x] 1. Add a maximum-wait bound to createAutosave in src/app/persistence.ts, so a stream of requests spaced under the debounce still produces writes at a bounded interval.
- [x] 2. Keep the trailing behaviour for bursts: several requests inside the window still collapse into one write.
- [x] 3. Cover the continuous stream and the burst case with fake time, and assert the bounded maximum interval rather than only the call count.
- [x] 4. Add an advancing-city check that saved elapsed time actually reaches storage during accelerated play.
- [x] 5. Confirm the onRefused path still fires at most once when storage rejects a write.
- [x] 6. Apply ADR 009 checkpoints: update affected Logics docs during each meaningful wave and leave the repo commit-ready.

# Validation
- (no validation recorded yet)
- command: `npm run ci` | result: passed | date: 2026-09-07
- Finish workflow executed on 2026-09-07.
- Linked backlog/request close verification passed.

# Report
- The starvation was real and reachable in normal play: `maybeAutosaveClock` schedules a save every
  fifteen simulated minutes, which at quadruple speed is under a second -- inside the two-second
  debounce, so the timer was reset forever and nothing reached storage.
- `createAutosave` now carries a `MAX_WAIT_MS` deadline (10 s) alongside the 2 s debounce: the
  timer is `min(debounce, deadline - now)`, so a burst still collapses into one write (AC2) while a
  continuous stream still lands one within ten seconds (AC1).
- AC3 is checked against the written city, not the call count: a test plays 240 accelerated ticks
  and asserts the last value handed to storage carries the advanced elapsed time.
- AC4 unchanged and covered: `onRefused` fires once across five refused writes.
- Finished on 2026-09-07.
- Linked backlog item(s): `item_172_bound_autosave_latency_so_accelerated_play_cannot_starve_persistence`
- Related request(s): `req_046_bound_autosave_latency_so_accelerated_play_cannot_starve_persistence`

# Links
- Request: `req_046_bound_autosave_latency_so_accelerated_play_cannot_starve_persistence`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in 476cba2; validated with npm run ci and the four fake-time cases in src/app/persistence.test.ts. Source: `476cba2`
- request-AC2 -> This task. Proof: Implemented in 476cba2; validated with npm run ci and the four fake-time cases in src/app/persistence.test.ts. Source: `476cba2`
- request-AC3 -> This task. Proof: Implemented in 476cba2; validated with npm run ci and the four fake-time cases in src/app/persistence.test.ts. Source: `476cba2`
- request-AC4 -> This task. Proof: Implemented in 476cba2; validated with npm run ci and the four fake-time cases in src/app/persistence.test.ts. Source: `476cba2`
