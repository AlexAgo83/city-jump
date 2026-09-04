## item_137_give_src_a_module_size_budget_that_something_measures - Give src a module size budget that something measures
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 80%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 16:53:38

# AI Context
- Summary: req_039 asserted a 700-line module budget that nothing measures, and six modules exceed it -- including the 1238-line app.ts the request was written about, which carries no recorded reason at all.
- Keywords: module size budget, startApp, ponytail reason, recorded reason, architecture test
- Use when: adding a module, or deciding whether an oversized one is staying that size.
- Skip when: treating a full startApp decomposition as the deliverable; the budget and its record are the deliverable.

# Problem
- req_039 AC1 asserted that no module in src/ exceeds roughly 700 lines without a recorded reason. Nothing measures it, and six modules exceed it: render/roadMesh.ts (1316), app/app.ts (1238), render/buildings.ts (1087), render/drawTool.ts (785), ui/controls.ts (725), render/trafficMovers.ts (717).
- The ponytail: comments in those files record rendering technique, not module size. src/app/app.ts, the file req_039 was written about, carries no recorded reason at all.
- startApp still spans src/app/app.ts:59 to :1227 -- about 1170 lines, 53 closures, 51 imports, no test.

# Scope
- In:
  - A test that reports every module in src/ over the budget without a recorded reason at its declaration.
  - A recorded reason on each oversized module that is staying that size, in the ponytail: form CONTRIBUTING.md already documents.
  - Taking whatever comes out of startApp cheaply while writing its reason, without making the split the point of the slice.
- Out:
  - A full decomposition of startApp as a deliverable; the budget and its record are the deliverable.
  - Splitting render/roadMesh.ts or render/buildings.ts, whose size is geometry assembly and may simply be recorded.
  - Changing the 700-line figure without saying why.

# Acceptance criteria
- A test names every module in src/ over the budget that carries no recorded reason.
- That test passes, because each oversized module either fell under the budget or carries its reason.
- src/app/app.ts either drops under the budget or states, at its declaration, why it does not.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: A test names every module in src/ over the budget that carries no recorded reason.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_031_gates_that_check_what_they_claim`
- Architecture decision(s): (none yet)
- Request: `req_040_close_the_gaps_the_0_4_0_corpus_review_found_in_the_gates_that_were_meant_to_catch_them`
- Primary task(s): `task_042_orchestrate_the_review_findings_work`

# Priority
- Priority: Medium
- Rationale: The budget is what stops app.ts drifting back; it waits on nothing, but the record it produces is more valuable than the lines it removes.

# Validation
- 2026-09-04: Added tests/architecture.mjs module-size budget check and recorded ponytail: module-size reasons on every non-test src module over 700 lines. Validated with rtk npm run typecheck and rtk npm run test:architecture.
