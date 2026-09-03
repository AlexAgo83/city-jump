## item_122_let_a_missing_asset_be_missing - Let a missing asset be missing
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 25%
> Complexity: Low
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 15:45:34

# AI Context
- Summary: The app has no client-side routing -- only the hash city fragment -- so the rewrite buys nothing and costs diagnosability: JSON.parse on a doctype and the GLB loader both fail confusingly.
- Keywords: SPA rewrite, 404, static host routes, missing asset, diagnosability
- Use when: touching render.yaml routes or debugging a confusing asset load failure.
- Skip when: adding a 404 page design, client-side routing, or changing cache headers, which are correct.

# Problem
- render.yaml:9 rewrites /* to index.html, so a mistyped or removed GLB or JSON path returns 200 with HTML. JSON.parse on a doctype and the Babylon GLB loader both fail confusingly instead of surfacing a missing file.
- The app has no client-side routing: a shared city travels in the #city= fragment, per docs/shared-link-threat-model.md:15. The rewrite buys nothing.

# Scope
- In:
  - Scope the rewrite to the document route or remove it.
  - Confirm a deep link with a fragment still loads, and that public/default-demo.json and the GLBs 404 when absent.
- Out:
  - Adding a 404 page design.
  - Adding client-side routing.
  - Changing the cache headers, which are correct.

# Acceptance criteria
- AC1: A request for a non-existent asset path returns 404, not 200 HTML.
- AC2: The site still loads at its root and through a #city= link.
- AC3: A missing bundled asset produces a diagnosable failure.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: A request for a non-existent asset path returns 404, not 200 HTML.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_029_a_release_that_proves_it_shipped_and_a_link_that_cannot_write_to_the_page`
- Architecture decision(s): (none yet)
- Request: `req_038_harden_the_release_path_and_the_shared_link_surface`
- Primary task(s): `task_040_orchestrate_the_release_and_client_hardening`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
