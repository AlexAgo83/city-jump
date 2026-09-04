## item_138_repair_the_traceability_line_that_closed_req_039_ac1_with_another_criterion_s_proof - Repair the traceability line that closed req_039 AC1 with another criterion's proof
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 15%
> Complexity: Low
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 16:53:38

# AI Context
- Summary: The task that orchestrated req_039 closes its AC1 -- the module size budget -- by citing 5ece535, which is AC5's disposal work, on two duplicated lines. The corpus records a budget as met that was never measured.
- Keywords: AC traceability, mis-cited proof, task_041, req_039 AC1, closeout repair
- Use when: closing an AC, or auditing whether a closed criterion's proof is about that criterion.
- Skip when: reverting req_039, whose other criteria are genuinely met, or deleting AC1 to make the record consistent.

# Problem
- logics/tasks/task_041_orchestrate_the_structural_work.md:54-55 closes request-AC1 with "Implemented through task_041 slices; final disposal slice in 5ece535", on two duplicated lines.
- 5ece535 is "Compose app disposal", the evidence for req_039 AC5. AC1 -- the module size budget -- is cited against work that did not address it.
- req_039 is Status: Done on that basis, so the corpus records a budget as met that was never measured.

# Scope
- In:
  - Correct req_039 AC1's traceability entry through the CLI to state what actually happened to it, naming this chain as where it is carried.
  - Remove the duplicated line.
  - Check the other criteria in task_041 for the same mis-citation and correct any found.
- Out:
  - Reverting req_039 to In progress; the rest of its criteria are genuinely met.
  - Deleting AC1 to make the record consistent.
  - Hand-editing indicator lines or workflow links instead of using logics-manager.

# Acceptance criteria
- req_039 AC1's traceability cites the work that addressed it and names where the budget is carried.
- No criterion in task_041 cites another criterion's commit as its proof.
- logics-manager lint and audit stay clean after the repair.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: req_039 AC1's traceability cites the work that addressed it and names where the budget is carried.

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
- Rationale: A Done request asserting an unmeasured budget corrupts the corpus for every future reader, and the repair is one CLI call.

# Notes
- The audit warning `lineage_mentioned_but_not_declared` for `task_041_orchestrate_the_structural_work` on this item is expected and must not be silenced by declaring it under `# Tasks`. That task is the document this slice repairs, not this slice's parent; the task that implements this slice is `task_042_orchestrate_the_review_findings_work`. Declaring false lineage to clear a heuristic warning is the same class of mistake as the mis-cited proof this slice exists to fix.
