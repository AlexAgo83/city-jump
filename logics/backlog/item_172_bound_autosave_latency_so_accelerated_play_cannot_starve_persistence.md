## item_172_bound_autosave_latency_so_accelerated_play_cannot_starve_persistence - Bound autosave latency so accelerated play cannot starve persistence
> From version: 0.5.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Persistence
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Bound how long the autosave debounce may defer a write, so continuous x2/x4 play cannot postpone persistence indefinitely.
- Keywords: bound, autosave, latency, accelerated, play, cannot, starve, persistence
- Use when: changing autosave scheduling, the persistence debounce, or the simulated clock rate.
- Skip when: changing what a save contains.

# Problem
- src/app/app.ts:382 requests persistence every 15 displayed minutes and line 418 advances the clock at 0.08 hours per simulated second, so x4 produces a request about every 0.78 real seconds.
- src/app/persistence.ts:33 resets a two-second trailing setTimeout on each request, so the timer never fires while requests keep arriving.
- A twelve-second trace observed four autosaves at x1 and none at x4; a three-minute x4 session wrote nothing and left saved elapsed time unchanged, then wrote once after a 2.5-second pause.

# Scope
- In:
  - a maximum-wait bound on the existing debounce in src/app/persistence.ts
  - fake-time coverage of a continuous request stream and of burst collapsing
  - an advancing-city check that saved state actually reaches storage
- Out:
  - removing batching: writes are synchronous storage work and must not run per request
  - the save format or its contents
  - the performance findings in req_045 and req_047

# Acceptance criteria
- AC1: A continuous stream of save requests spaced below the debounce interval still produces writes at a bounded maximum interval, verified with fake time.
- AC2: A burst of requests within the debounce window still collapses into a single write.
- AC3: An advancing city played continuously at an accelerated rate reaches storage with updated elapsed time, verified against actual saved state rather than call counts alone.
- AC4: The refusal path (`onRefused`) still fires at most once when storage rejects a write.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A continuous stream of save requests spaced below the debounce interval still produces writes at a bounded maximum interval, verified with fake time.
- request-AC2 -> This backlog slice. Proof: AC2: A burst of requests within the debounce window still collapses into a single write.
- request-AC3 -> This backlog slice. Proof: AC3: An advancing city played continuously at an accelerated rate reaches storage with updated elapsed time, verified against actual saved state rather than call counts alone.
- request-AC4 -> This backlog slice. Proof: AC4: The refusal path (`onRefused`) still fires at most once when storage rejects a write.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_046_bound_autosave_latency_so_accelerated_play_cannot_starve_persistence.md`
- Primary task(s): (none yet)

# Priority
- Priority: High
- Rationale: Silent loss of player progress during ordinary accelerated play; not a performance concern.

# Notes
- Hybrid rationale: Derived from request `req_046_bound_autosave_latency_so_accelerated_play_cannot_starve_persistence` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_046_bound_autosave_latency_so_accelerated_play_cannot_starve_persistence.md`.
- Generated locally by logics-manager.

# Tasks
- `task_049_bound_autosave_latency_so_accelerated_play_cannot_starve_persistence`
