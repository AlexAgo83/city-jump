## item_136_make_the_shared_link_decompression_cap_the_number_the_threat_model_states - Make the shared-link decompression cap the number the threat model states
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 30%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 16:53:38

# AI Context
- Summary: The threat model requires a 96 KB decompression cap; the code has always allowed 1 MB. The document never described the code, and it is the only control in it with no test.
- Keywords: MAX_SHARE_JSON, 96 KB, decompression cap, threat model, architecture assertion
- Use when: changing either the shared-link caps or what enforces them.
- Skip when: the 12,000-character fragment cap, which already matches its document, or the streaming gunzip itself, which is correct.

# Problem
- docs/shared-link-threat-model.md:17 requires a 96 KB cap on decompressed JSON. src/sim/share.ts:5 sets MAX_SHARE_JSON = 1_000_000.
- The constant has one introducing line in the whole history and was never another value; the 96 KB line entered in 13a1e1c during req_038. The document has never described the code.
- It is the only control in that document with no test in tests/architecture.mjs, and it is the only one that diverged.

# Scope
- In:
  - Decide which number is the real control, with the size of a legitimate large city as the evidence, and record the decision.
  - Align src/sim/share.ts and docs/shared-link-threat-model.md on that number.
  - Assert the agreed cap in tests/architecture.mjs, next to the CSP hash assertions.
- Out:
  - Rewriting the streaming gunzip in src/sim/share.ts:48, which counts as it reads and is correct.
  - The 12,000-character fragment cap, which matches its document already.
  - parseCity's field validation, which req_038 recorded as correct.

# Acceptance criteria
- One number is the decompression cap, and src/sim/share.ts and docs/shared-link-threat-model.md both state it.
- A test fails if the constant and the document disagree again.
- The chosen cap is justified against the size of a real large city, not picked to make the two files match.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: One number is the decompression cap, and src/sim/share.ts and docs/shared-link-threat-model.md both state it.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_031_gates_that_check_what_they_claim`
- Architecture decision(s): (none yet)
- Request: `req_040_close_the_gaps_the_0_4_0_corpus_review_found_in_the_gates_that_were_meant_to_catch_them`
- Primary task(s): `task_042_orchestrate_the_review_findings_work`

# Priority
- Priority: High
- Rationale: A documented security control that has never matched the code is the cheapest fix here and the one whose absence misleads a reader most.

# Validation
- 2026-09-04: Chose 1 MB because perf/cities/ma-ville.json is 141,355 bytes decompressed and would fail a 96 KB cap while fitting under the existing 1,000,000-byte streaming cap. Validated with rtk npm run test:architecture.
