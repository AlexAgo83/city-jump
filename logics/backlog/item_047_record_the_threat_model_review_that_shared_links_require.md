## item_047_record_the_threat_model_review_that_shared_links_require - Record the threat-model review that shared links require
> From version: 0.2.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:04:32

# AI Context
- Summary: The policy commits the project to a threat-model review before user-generated asset work ships, and cities arriving from a stranger's link are exactly that; no review exists.
- Keywords: record, threat, model, review, shared, links, require
- Use when: Writing or linking the threat-model review for shared city links, before the share feature is released.
- Skip when: The work designs the share encoding or its caps — that belongs to the share-by-link request.

# Problem
- `SECURITY.md` requires a new threat-model review before user-generated asset work ships, and cities arriving from a stranger's link are user-generated content.
- No such review exists, so the share work would ship against a commitment the project made to itself.

# Scope
- In:
  - Write the review: what a share link can carry, what the client validates before acting on it, what resource limits stop a hostile payload, and what is deliberately accepted.
  - State plainly what a malicious link can and cannot do -- it is parsed data, not code, and it cannot reach any other player's stored cities.
  - Write it **before** the share encoder, not after. Its output -- the cap list, what is refused, what is knowingly accepted -- is then the specification the encoder is built against, rather than a stamp applied to code that already exists. A review done afterwards that finds something means rewriting.
- Out:
  - Designing the share encoding or its caps, which the share-by-link request owns.
  - A general threat model for features that do not exist yet.

# Acceptance criteria
- AC1: The review exists, is linked from both the security policy and the share request, and names the specific defences rather than asserting the feature is safe.
- AC2: It is recorded before the share feature is released.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: The review exists, is linked from both the security policy and the share request, and names the specific defences rather than asserting the feature is safe.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_010_a_published_game_whose_documents_tell_the_truth`
- Architecture decision(s): `adr_004_stay_a_static_client_with_no_server_of_its_own`
- Request: `req_013_the_game_is_deployed_in_public_while_its_documents_and_its_input_model_still_describe_a_local_dev_toy`
- Primary task(s): `task_015_make_the_project_s_documents_and_input_model_match_the_public_deployment`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
