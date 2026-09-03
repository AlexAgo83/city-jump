## item_119_take_the_release_tag_out_of_the_shell_and_refuse_a_branch - Take the release tag out of the shell and refuse a branch
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
- Summary: The three later steps in the same file already pass values through env correctly, so this is an inconsistency rather than a house style -- in a job holding the deploy hook secret.
- Keywords: template interpolation, env, shell injection, rev-parse refs/tags, SHA pinning
- Use when: touching .github/workflows/render-release-deploy.yml.
- Skip when: restructuring the release process or the tag convention, or touching ci.yml, which req_036 owns.

# Problem
- .github/workflows/render-release-deploy.yml:36 expands a raw ${{ }} into a bash assignment in a job holding the deploy secret, while :50, :64 and :79 in the same file correctly use env:.
- git rev-list at :43 resolves branches as well as tags, so a workflow_dispatch with main deploys unreleased HEAD and the package.json check at :56 cannot catch it.

# Scope
- In:
  - Pass the tag through env: and read it as a shell variable, matching the three steps that already do.
  - Verify the ref is a tag with git rev-parse --verify refs/tags/<tag>^{commit} before resolving it.
  - Pin the actions in this workflow to SHAs, since it handles a deploy secret.
- Out:
  - Restructuring the release process or the tag convention.
  - Changing the CI workflow, which req_036 owns.

# Acceptance criteria
- AC1: No raw template interpolation appears inside a run block in this workflow.
- AC2: A dispatch naming a branch fails before the deploy hook is called.
- AC3: A dispatch naming a real tag still deploys.
- AC4: Actions in this workflow are SHA-pinned.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: No raw template interpolation appears inside a run block in this workflow.
- request-AC2 -> This backlog slice. Proof: AC2: A dispatch naming a branch fails before the deploy hook is called.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_029_a_release_that_proves_it_shipped_and_a_link_that_cannot_write_to_the_page`
- Architecture decision(s): (none yet)
- Request: `req_038_harden_the_release_path_and_the_shared_link_surface`
- Primary task(s): `task_040_orchestrate_the_release_and_client_hardening`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- 2026-09-03 wave: `.github/workflows/render-release-deploy.yml` now reads the release tag from `RELEASE_TAG_INPUT` in `env:` instead of interpolating `${{ ... }}` into the shell body.
- The release SHA now comes from `git rev-parse --verify "refs/tags/${release_tag}^{commit}"`, so `v0.4.0` resolves to `b7f551cf25c63b13c2a624812496b5d02e2d9ad9` and `main` fails before the deploy hook.
- `actions/checkout` is pinned to `11d5960a326750d5838078e36cf38b85af677262`; `tests/architecture.mjs` guards the no-template-run-block, tag-only resolution, and SHA-pinned action rules.
- Validation proof: `rtk npm run test:architecture` passed.
