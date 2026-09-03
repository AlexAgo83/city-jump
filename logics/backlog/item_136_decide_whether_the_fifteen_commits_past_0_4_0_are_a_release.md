## item_136_decide_whether_the_fifteen_commits_past_0_4_0_are_a_release - Decide whether the fifteen commits past 0.4.0 are a release
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Production runs v0.4.0 exactly (b7f551cf, verified against the live Render service). HEAD is fifteen commits ahead and those commits carry real fixes, including a saved simulation clock without which a reload un-built the city.
- Keywords: undeployed commits, v0.4.0, 0.4.1, release decision, production drift
- Use when: deciding whether to cut a version, or asking what players are actually running.
- Skip when: hardening the deploy mechanism, which item_119, item_120 and item_134 own.

# Problem
- The live Render service reports its current deploy as commit b7f551cf, which is exactly what the v0.4.0 tag points at. The release pipeline worked; production is not drifting by accident.
- HEAD is fifteen commits past that tag, and they are not cosmetic. Among them: the simulation clock saved with the city, without which a reload restarted it at zero and un-built every standing building; a materials shortage given hysteresis so it stops flickering every frame; the kaiju saved with the city; and a fix for one road placement emptying the island.
- So players are running a build that lacks fixes for defects the changelog describes as serious, and nobody has decided whether that is intentional.
- This is an operational judgement, not a task: cutting 0.4.1 means asserting those fifteen commits are ready, which req_035 and req_036 may yet change.

# Scope
- In:
  - Decide whether to cut 0.4.1 now, wait for req_035 to land, or hold until req_036's gates can vouch for a release.
  - Record the decision and its reason, so the next person asking why production is behind finds an answer rather than a gap.
  - If 0.4.1 is cut, follow the existing workflow -- it is proven to work -- and note that item_111's version check must pass first.
- Out:
  - Changing the release mechanism.
  - Deploying anything without a tag, which item_119 exists to prevent.

# Acceptance criteria
- AC1: A decision exists and is recorded: ship now, ship after a named chain, or deliberately hold.
- AC2: If a release is cut, production reports the commit that tag names.
- AC3: If the decision is to hold, the reason is written where someone comparing production to HEAD will find it.

# Decision framing
- Product framing: Needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_029_a_release_that_proves_it_shipped_and_a_link_that_cannot_write_to_the_page`
- Architecture decision(s): (none yet)
- Request: `req_038_harden_the_release_path_and_the_shared_link_surface`
- Primary task(s): `task_040_orchestrate_the_release_and_client_hardening`

# Priority
- Priority: Medium
- Rationale: Players are missing fixes the project considers important, but shipping mid-review may be the wrong call and that is the owner's to make.

# Tasks
- `task_040_orchestrate_the_release_and_client_hardening`

# Notes
- Reserved for the owner: whether to ship is a judgement about readiness, not a measurement.
- Production commit verified against the live service, not inferred from git.
