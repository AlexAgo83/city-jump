## task_040_orchestrate_the_release_and_client_hardening - Orchestrate the release and client hardening
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 90%
> Progress: 90%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-03 15:45:34
> Owner: Codex

# AI Context
- Summary: Answer the Render ref question first -- it decides whether deploy verification is a small addition or the most important item -- then harden the tag and the rendering path.
- Keywords: render ref, env interpolation, deploy poll, CSP, textContent, rewrite scoping
- Use when: implementing req_038.
- Skip when: the proposal is to drop the immutable cache on /buildings/*, which the ?v= parameter already makes correct.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Wave 1: answer the Render ref question first -- it decides whether the deploy verification is a small addition or the most important item here.
- [ ] 2. Wave 2: the tag through env:, the tag-not-branch check and the SHA pins; these are mechanical and independent.
- [ ] 3. Wave 3: the deploy outcome verification, shaped by what wave 1 established.
- [ ] 4. Wave 4: node construction in the HUD, then the CSP, then the threat model control -- in that order, so the policy lands on code that already complies.
- [ ] 5. Wave 5: the rewrite scoping and the derived asset version.
- [ ] 6. Do not drop the immutable cache on /buildings/*: the ?v= parameter is what makes it correct.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_119_take_the_release_tag_out_of_the_shell_and_refuse_a_branch`
- `item_120_establish_whether_the_deploy_hook_honours_the_commit_then_verify_the_outcome`
- `item_121_render_a_loaded_city_as_text_and_say_so_in_the_threat_model`
- `item_122_let_a_missing_asset_be_missing`
- `item_123_derive_the_asset_version_instead_of_maintaining_two_by_hand`
- `item_134_configure_the_release_contract_and_record_what_shipped`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_119_take_the_release_tag_out_of_the_shell_and_refuse_a_branch`. Proof deferred to slice closeout.
- request-AC2 -> `item_119_take_the_release_tag_out_of_the_shell_and_refuse_a_branch`. Proof deferred to slice closeout.
- request-AC3 -> `item_120_establish_whether_the_deploy_hook_honours_the_commit_then_verify_the_outcome`. Proof deferred to slice closeout.
- request-AC4 -> `item_121_render_a_loaded_city_as_text_and_say_so_in_the_threat_model`. Proof deferred to slice closeout.
- request-AC5 -> `item_121_render_a_loaded_city_as_text_and_say_so_in_the_threat_model`. Proof deferred to slice closeout.
- request-AC6 -> `item_122_let_a_missing_asset_be_missing`. Proof deferred to slice closeout.
- request-AC7 -> `item_123_derive_the_asset_version_instead_of_maintaining_two_by_hand`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_038_harden_the_release_path_and_the_shared_link_surface`
- Product brief(s): `prod_029_a_release_that_proves_it_shipped_and_a_link_that_cannot_write_to_the_page`
- Architecture decision(s): (none yet)

# Notes
- Arbitration for the runner. May decide alone: everything in this chain. item_120's question is answered and proven against the live service, so the work is polling for live and treating deactivated as an already superseded success. The CSP's exact shape, including whether to extract the inline stylesheet or hash the four-line inline script, is a technical choice. Reserved for the owner: nothing. Two standing prohibitions instead: do not drop the immutable cache on /buildings/* -- the version query parameter is what makes it correct -- and do not weaken the CSP to style-src unsafe-inline to avoid extracting the stylesheet.
- 2026-09-03 wave item_119: release deploy tag selection now uses `env:` plus `git rev-parse --verify refs/tags/<tag>^{commit}`, and checkout is SHA-pinned.
- 2026-09-03 wave item_119: `v0.4.0` resolves to `b7f551cf25c63b13c2a624812496b5d02e2d9ad9`; `main` fails before deploy with `Needed a single revision`.
- 2026-09-03 wave item_119: `rtk npm run test:architecture` passed.
- 2026-09-03 wave item_120: release deploys now verify the Render deploy outcome by polling the service deploy list for `RELEASE_SHA`; `live` and already superseded `deactivated` pass, `build_failed` and `canceled` fail, and slow/missing deploys time out after 900 seconds.
- 2026-09-03 wave item_120: `rtk npm run test:architecture` passed and locks the Render API secrets, deploy lookup, timeout/interval, and status handling into the architecture check.
- 2026-09-03 wave item_121: HUD, ledger, and selection rows now use node construction plus `textContent`/element properties instead of `innerHTML`; the shared-link threat model records the same rule.
- 2026-09-03 wave item_121: `render.yaml` now serves CSP with default/object/base protections and hashes for the current inline style/script, without `style-src 'unsafe-inline'`.
- 2026-09-03 wave item_121: `rtk npm run ci` and `rtk npm run test:visual` passed; `rtk npm run test:e2e` passed through HUD/ledger/save checks before the pre-existing zone-clear timeout at `scripts/interact.mjs:1021`.
- 2026-09-03 wave items_122/123: removed the Render catch-all rewrite so missing assets 404, and replaced separate hand-maintained model cache keys with one package-derived `ASSET_VERSION` injected by Vite.
- 2026-09-03 wave item_134: configured `logics/release/contract.json`, recorded 0.4.0 release evidence for metadata/changelog/local validation/push/CI/Render, and documented the release status/plan/validate workflow in `CONTRIBUTING.md`.
