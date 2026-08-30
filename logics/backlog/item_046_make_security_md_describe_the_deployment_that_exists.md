## item_046_make_security_md_describe_the_deployment_that_exists - Make SECURITY.md describe the deployment that exists
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 40%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:28:52

# AI Context
- Summary: `SECURITY.md` describes "a static client application served by Vite during development" and a 0.1.x support line, while 0.2.0 is served publicly from the static site in `render.yaml`.
- Keywords: security, describe, deployment, exists
- Use when: Editing `SECURITY.md`'s security model or supported-versions sections.
- Skip when: The work is the shared-link threat-model review, or changes the reporting process.

# Problem
- The policy describes "a static client application served by Vite during development" and warns about exposing the dev server, while 0.2.0 is served publicly from a static site declared in `render.yaml`.
- The supported-versions table lists `0.1.x` and `< 0.1` only.
- A reader cannot tell from the policy where a player's cities live or what could be exposed by a flaw.

# Scope
- In:
  - Rewrite the current-security-model section around the real deployment: static files on a CDN, no backend, player data in the reader's own `localStorage`, referring to `adr_004_stay_a_static_client_with_no_server_of_its_own` rather than restating it.
  - Correct the supported-versions table.
  - Keep the local development surfaces that are still true, including the debug API, and keep the existing reporting instructions.
- Out:
  - The threat-model review for shared links, which is its own slice.
  - Changing the reporting process or adding a disclosure timeline.
  - Any code change.

# Acceptance criteria
- AC1: The policy describes the public static deployment and names the current supported line.
- AC2: A reader can tell from it where player data lives and what leaves the browser.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The policy describes the public static deployment and names the current supported line.
- request-AC3 -> This backlog slice. Proof: AC2: A reader can tell from it where player data lives and what leaves the browser.

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
