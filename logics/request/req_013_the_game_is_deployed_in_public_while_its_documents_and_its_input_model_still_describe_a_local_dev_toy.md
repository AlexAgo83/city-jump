## req_013_the_game_is_deployed_in_public_while_its_documents_and_its_input_model_still_describe_a_local_dev_toy - The game is deployed in public while its documents and its input model still describe a local dev toy
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:32:32

# AI Context
- Summary: 0.2.0 went public on a static site and the surrounding documents did not follow: `SECURITY.md` still describes a Vite dev server and a 0.1.x support line, the threat-model review it demands for user-generated content is missing while the share feature is being scoped, and the build flow needs hover and a right-click that no touchscreen has.
- Keywords: game, deployed, public, while, documents, input, model, still, describe, local, dev, toy
- Use when: Editing `SECURITY.md`, recording a threat-model review, or deciding what happens for visitors arriving on a touch device.
- Skip when: The work adds a backend, telemetry or accounts (ruled out by adr_004_stay_a_static_client_with_no_server_of_its_own), or is a responsive redesign, a mobile build, or a WCAG conformance effort.

# Needs
- `SECURITY.md` describes an application that no longer exists. It states that city-jump is "a static client application served by Vite during development", lists the local Vite dev server among its main surfaces, and advises not exposing that server to an untrusted network -- while version 0.2.0 is published at a public URL through `render.yaml`'s static site and linked from the README as a live demo. Anyone reading the policy to decide whether a finding matters is reading about a different deployment.
- The supported-versions table is stale: it covers `0.1.x` and `< 0.1` and does not mention 0.2.0, which is the released line.
- The policy already commits the project to work it has not done. It states that "any backend, cloud save, mod support, multiplayer, or user-generated asset work requires a new threat-model review before release", and `req_011_share_a_city_as_a_link_that_needs_no_server` introduces cities travelling between strangers -- user-generated content by any reading -- with no such review recorded anywhere.
- The game cannot be played on a touch device, and it is published on a URL people will open on a phone. Drawing depends on a hover preview that a finger cannot produce, cancelling depends on a right-click that a touchscreen does not have, and the pointer handling tests `event.button === 0`. Nothing in the code or the corpus acknowledges this, so a visitor on a phone gets a scene they can look at and no way to build anything.

# Context
- This was found by reviewing the corpus against the repository rather than by a failure: the deployment moved from local development to a public static site during the 0.2.0 release work, and the surrounding documents were not revisited.
- The accessibility basics that do exist are decent and should not be undone: the toolbar carries `role="group"`, `role="toolbar"` and `aria-label` on its controls, and the sun slider and save picker are labelled. The gap is the pointer model, not the markup.
- `adr_004_stay_a_static_client_with_no_server_of_its_own` now records the deployment as a decision, which gives the security policy something stable to describe rather than restating it.
- Whether touch input is worth building is a product call, not a defect to be fixed silently. This request captures it with evidence; deciding to build it, defer it, or say plainly that the game is desktop-only is the point of capturing it.
- Nothing here blocks the tasks already open. It is documentation and one product decision, and it can be picked up between other work.

# Acceptance criteria
- AC1: `SECURITY.md` describes the deployment as it is -- a public static site with no backend -- rather than a local development server, and its supported-versions table names the current line.
- AC2: The threat-model review the policy demands for user-generated content is recorded before the share feature ships, covering what arrives from a link, what the client validates, and what it refuses.
- AC3: The policy states where a player's data actually lives and what leaves the browser, so a reader can tell what a vulnerability in this project could expose.
- AC4: The project takes an explicit, written position on touch devices: either the input model is made usable without hover and without a right-click, or the game states that it is desktop-only and says so where a visitor will see it before they try.
- AC5: The existing accessibility markup is not weakened by any of this work.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_010_a_published_game_whose_documents_tell_the_truth`
- Architecture decision(s): (none yet)

# References
- SECURITY.md
- render.yaml
- README.md
- index.html
- src/render/drawTool.ts
- package.json
- logics/architecture/adr_004_stay_a_static_client_with_no_server_of_its_own.md
- logics/request/req_011_share_a_city_as_a_link_that_needs_no_server.md

# Backlog
- `item_046_make_security_md_describe_the_deployment_that_exists`
- `item_047_record_the_threat_model_review_that_shared_links_require`
- `item_048_take_a_position_on_the_visitors_arriving_with_a_touchscreen`
