## req_046_bound_autosave_latency_so_accelerated_play_cannot_starve_persistence - Bound autosave latency so accelerated play cannot starve persistence
> From version: 0.5.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Complexity: Low
> Theme: Persistence
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Autosave uses a purely trailing debounce, so continuous x2/x4 play defers every write and progress is lost on an abrupt exit.
- Keywords: autosave, persistence, debounce, time rate, data loss
- Use when: changing autosave scheduling, the persistence debounce, or the simulated clock rate.
- Skip when: measuring or optimizing rendering and frame cost.

# Needs
- Bound the maximum time a requested save may be deferred, so continuous requests cannot postpone a write indefinitely.
- Preserve the existing batching behaviour: bursts of requests must still collapse into one write.
- Cover continuous request streams with fake time, plus a check that an actually advancing city reaches storage.

# Priority
- High: this is silent player-progress loss during normal accelerated play, not a performance concern.

# Context
- Split out of req_045, which found this while reviewing performance. It is a correctness defect and does not belong in a performance measurement chain: suppressed persistence must never be counted as a performance improvement.
- Reviewed commit: `5a5cbd2`, version 0.5.0, on 2026-09-05. Application sources were unchanged by the review.

## Finding

**P1 - Accelerated play can starve autosaving.** `src/app/app.ts:382` requests persistence every 15 displayed minutes; line 418 advances the clock at 0.08 hours per simulated second. At x4, requests therefore arrive about every 0.78 real seconds. `src/app/persistence.ts:33` resets a two-second trailing `setTimeout` on each request, so the timer never fires while requests keep arriving. A twelve-second storage-write trace observed four autosaves at x1 and none at x4. A subsequent three-minute x4 session confirmed zero writes and unchanged saved elapsed time, followed by one write after pausing for 2.5 seconds.

- x4 was runtime-tested. x2 follows from the timer intervals (about 1.56 s between requests, still under the 2 s debounce) and was not separately observed.
- The fix is a maximum-wait bound on the existing debounce, not removal of batching: writes are synchronous storage work and must not run per request.

# Acceptance criteria
- AC1: A continuous stream of save requests spaced below the debounce interval still produces writes at a bounded maximum interval, verified with fake time.
- AC2: A burst of requests within the debounce window still collapses into a single write.
- AC3: An advancing city played continuously at an accelerated rate reaches storage with updated elapsed time, verified against actual saved state rather than call counts alone.
- AC4: The refusal path (`onRefused`) still fires at most once when storage rejects a write.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- src/app/persistence.ts
- src/app/app.ts
- src/sim/save.ts
- logics/request/req_045_review_findings_gameplay_performance_and_benchmark_validity.md

# Backlog
- `item_172_bound_autosave_latency_so_accelerated_play_cannot_starve_persistence`
