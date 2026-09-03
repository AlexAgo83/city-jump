## req_038_harden_the_release_path_and_the_shared_link_surface - Harden the release path and the shared-link surface
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: A well-built deploy workflow with three gaps around it, and a HUD that interpolates city values into innerHTML just as naming becomes a product direction.
- Keywords: shell interpolation, tag not branch, deploy verification, CSP, innerHTML, SPA rewrite, asset version constant
- Use when: touching the deploy workflow, render.yaml, or how a value from a loaded city reaches the DOM.
- Skip when: changing parseCity, the fragment caps, or the immutable building cache headers, which are correct as they stand.

# Needs
- A release tag cannot inject shell, and cannot be a branch.
- A deploy that did not happen does not report success.
- A city loaded from a link cannot put markup on the page.
- A missing asset says it is missing.

# Context
- The deploy workflow is already well built and this request does not rewrite it. It resolves the tag to a SHA, checks package.json matches the tag, requires a green CI run on that exact SHA, has a concurrency group and minimal permissions. Three gaps sit around that good work.
- render-release-deploy.yml:36 assigns release_tag from a raw ${{ }} interpolation, which the Actions template engine expands into the script body before bash sees it, in a job holding secrets.RENDER_DEPLOY_HOOK_URL. The later steps in the same file at :50, :64 and :79 all do it correctly through env:, so this is an inconsistency rather than a house style.
- render-release-deploy.yml:43 resolves the tag with git rev-list, which accepts branches. Dispatching with main resolves to the branch tip and deploys unreleased HEAD, and the version check at :56 still passes because it reads package.json from that same SHA.
- The workflow POSTs the deploy hook at :94 and exits on the HTTP 200. Nothing polls the resulting deploy or checks which commit Render built. Whether that matters depends on whether Render honours the ref query parameter for a static site deploy hook, which is NOT verified -- confirm it before building anything. If it does not, all three verification steps upstream are advisory and this is the most important item in the chain.
- There is no XSS today: streetName (src/sim/streets.ts:59) composes from a fixed word list, and city names go through textContent (src/ui/controls.ts:542). But src/ui/hud.ts builds eight fragments with interpolated innerHTML, including row("Street", info.street) at :187, and prod_007_a_city_you_can_point_at_and_name points at naming as a product direction. The day a street becomes nameable, that line is a vector fed by a shared link. Fix it while it is free.
- docs/shared-link-threat-model.md covers the fragment cap, the decompression cap and parseCity, but says nothing about rendering what comes out. render.yaml sets HSTS, nosniff, Referrer-Policy, X-Frame-Options and Permissions-Policy but no CSP, and the app loads nothing cross-origin, so a CSP is near-zero friction.
- render.yaml:9 rewrites /* to index.html. The app has no client-side routing -- only the #city= fragment -- so the rewrite buys nothing and turns every missing asset into a 200 of HTML, where JSON.parse and the GLB loader fail confusingly instead of saying the file is absent.
- The immutable one-year cache on /buildings/* is NOT a defect and must not be 'fixed' by dropping it. Both the manifest and the GLBs carry ?v= (src/render/buildings.ts:1196 and :1207), kaiju.glb carries its own (src/render/kaiju.ts:18), and default-demo.json is fetched with cache: no-cache. Verified in history: the last commit touching public/buildings (ec2c24c) is the one that bumped the constant, and deb87c3 did the same for the kaiju. The residual risk is only that the two constants are hand-maintained, in two files, at diverging dates.

# Acceptance criteria
- AC1: No shell in the deploy job takes a tag or dispatch input through raw template interpolation.
- AC2: A dispatch with a branch name is refused before anything is deployed.
- AC3: Whether Render honours the ref parameter is established and recorded, and the workflow reports failure when the intended commit was not deployed.
- AC4: No value from a loaded city reaches the page through innerHTML.
- AC5: A Content-Security-Policy is served, and the threat model records the rendering rule.
- AC6: A request for a missing asset is not answered with 200 HTML.
- AC7: One asset version constant exists and is derived rather than hand-maintained.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_029_a_release_that_proves_it_shipped_and_a_link_that_cannot_write_to_the_page`
- Architecture decision(s): (none yet)

# References
- .github/workflows/render-release-deploy.yml
- render.yaml
- src/ui/hud.ts
- src/sim/streets.ts
- src/render/buildings.ts
- src/render/kaiju.ts
- docs/shared-link-threat-model.md
- src/ui/controls.ts

# Backlog
- `item_119_take_the_release_tag_out_of_the_shell_and_refuse_a_branch`
- `item_120_establish_whether_the_deploy_hook_honours_the_commit_then_verify_the_outcome`
- `item_121_render_a_loaded_city_as_text_and_say_so_in_the_threat_model`
- `item_122_let_a_missing_asset_be_missing`
- `item_123_derive_the_asset_version_instead_of_maintaining_two_by_hand`
