## run_009_rerun_the_large_city_performance_review - Rerun the large city performance review
> Status: Draft
> Category: other
> Verified: (not yet verified)
> Related request: `logics/request/req_045_review_findings_gameplay_performance_and_benchmark_validity.md`
> Related backlog: (none yet)
> Related task: (none yet)
> Reminder: Update status, category, verification, and linked refs when you edit this doc.

# Trigger
- Resume req_045 in another session, reproduce a measured hotspot, or compare a proposed optimization against the same city.

# Prerequisites
- Node 22+, installed project dependencies and Playwright Chromium; a visible desktop for comparable GPU measurements.
- Keep `perf/cities/ma-ville.json` as the large-demo-v14 reference. Probes use its saved camera and explicit building/model preconditions.
- Read the reusable-probe section of `docs/performance.md` and the previous run's `run.json`. Do not run other benchmarks concurrently.

# Procedure
1. Run `npm run perf:review -- --probe interactions` for pointer/edit/frame evidence, or choose `profile`, `focus`, `rubble`, `wave`, `extra`, `soak` or `all` as documented in `docs/performance.md`.
2. For a separately managed dev server, pass its URL to `node scripts/review/run.mjs`. For startup measurements, build the same checkout, start Vite preview separately and provide `--preview-url` to `extra` or `all`.
3. Note the new output directory printed by the runner. Default output is `.tmp/perf-review/<timestamp>/`; `--out` must name a directory that does not already exist.
4. Inspect `run.json` and the selected probe outputs before interpreting FPS. Record a dated conclusion and retain relevant JSON/CPU profiles under `perf/reviews/`; never overwrite earlier review evidence.

# Verification
- `run.json` must report `complete`, with each requested probe complete and exit code zero. A missing preview URL intentionally skips startup, even when the other extra workloads complete.
- Check fixture hash, source/script hashes, browser, actual renderer, settings and runtime building counts before comparing two runs. Headless, toolbar state, daylight and viewport changes are not optimization gains.
- The CLI safety check is `node --test tests/perf-review.mjs`. It runs as part of `npm run test:architecture`.
- Runtime instrumentation adds overhead. The rubble guard is an in-browser experiment, not a shipped fix; combat fast-forward is not measured as a live gameplay stall.

# Rollback
- Stop the runner with Ctrl-C and stop any servers started manually. Browser contexts are isolated and do not change the user's saved cities or repository fixture.
- An interrupted run retains partial evidence and is not a completed benchmark. Rerun into a new output directory.

# References
- docs/performance.md
- scripts/review/run.mjs
- tests/perf-review.mjs
- Related request: `logics/request/req_045_review_findings_gameplay_performance_and_benchmark_validity.md`
- Related backlog: (none yet)
- Related task: (none yet)
