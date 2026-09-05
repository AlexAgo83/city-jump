## task_049_bound_autosave_latency_so_accelerated_play_cannot_starve_persistence - Bound autosave latency so accelerated play cannot starve persistence
> From version: 0.5.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Persistence
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Bound the autosave debounce so continuous accelerated play cannot defer every write, while keeping burst batching.
- Keywords: bound, autosave, latency, accelerated, play, cannot, starve, persistence
- Use when: changing autosave scheduling or the persistence debounce.
- Skip when: changing what a save contains.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_172_bound_autosave_latency_so_accelerated_play_cannot_starve_persistence`

# Acceptance criteria
- AC1: A continuous stream of save requests spaced below the debounce interval still produces writes at a bounded maximum interval, verified with fake time.
- AC2: A burst of requests within the debounce window still collapses into a single write.
- AC3: An advancing city played continuously at an accelerated rate reaches storage with updated elapsed time, verified against actual saved state rather than call counts alone.
- AC4: The refusal path (`onRefused`) still fires at most once when storage rejects a write.

# Plan
- [ ] 1. Add a maximum-wait bound to createAutosave in src/app/persistence.ts, so a stream of requests spaced under the debounce still produces writes at a bounded interval.
- [ ] 2. Keep the trailing behaviour for bursts: several requests inside the window still collapse into one write.
- [ ] 3. Cover the continuous stream and the burst case with fake time, and assert the bounded maximum interval rather than only the call count.
- [ ] 4. Add an advancing-city check that saved elapsed time actually reaches storage during accelerated play.
- [ ] 5. Confirm the onRefused path still fires at most once when storage rejects a write.
- [ ] 6. Apply ADR 009 checkpoints: update affected Logics docs during each meaningful wave and leave the repo commit-ready.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_046_bound_autosave_latency_so_accelerated_play_cannot_starve_persistence`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
