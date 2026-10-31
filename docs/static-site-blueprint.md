# Static site release blueprint

This project can ship as a static site. The game keeps state in browser localStorage and
loads bundled JavaScript plus static GLB assets, so it does not need a server runtime.

## Version

- Release version: `0.5.10`
- Tag: `v0.5.10`
- Live demo: <https://city-jump.onrender.com/>
- Artifact directory: `dist/`

## Release procedure

The order matters, and not for ceremony. Gate evidence in `logics/release/evidence.jsonl` is
anchored to the release commit, and the release commit resolves to the tag once one exists. Record
evidence before tagging and it anchors to a moving `HEAD`, so the commit that records the evidence
invalidates the evidence it records -- which is how 0.5.1 ended up re-recording three gates.

1. Bump `package.json` and `package-lock.json`, stamp the README badge, `SECURITY.md` and the
   version and tag above, then `npm run check:versions`.
2. Write `changelogs/CHANGELOGS_x_y_z.md` and link it from `changelogs/README.md`.
3. Run `npm run ci` and `npm run test:e2e`. GitHub Actions runs the first and not the second, so
   the browser suite only ever passes here.
4. Commit. **This commit is the release commit.**
5. Push it, and wait for the CI run on that exact commit.
6. Tag it `vx.y.z` once CI is green.
7. Record `version_metadata`, `changelog`, `local_validation`, `git_push` and `ci` in one pass,
   every entry carrying the tagged commit. Commit and push that evidence.
8. Publish the GitHub release. That is what triggers the Render deployment -- there is no separate
   deploy step, and no deployment without a release.
9. Verify the public site serves the new version, then record `github_release` and
   `production_deployment`. Sample the site more than once: it sits behind a cache and can serve
   the previous `index.html` for a while after the deploy reports success.

`logics-manager release validate <version>` is the check at every step, and
`logics-manager release status` is the only thing that may be quoted as "the release is ready".

## Build

```bash
npm ci
npm run release:static
```

`release:static` runs the normal local project gate through `npm run ci`, and `ci` runs
the Vite production build. The deployable output is `dist/`.

## Static host contract

- Serve `dist/index.html` for `/`.
- Serve every file under `dist/assets/`, `dist/buildings/`, and the root icon/manifest/demo
  files as immutable static assets.
- Keep client-side storage enabled; named saves and autosave live in localStorage.
- No server API, database, secret, or environment variable is required.

## Render Blueprint

`render.yaml` at the repository root defines the Render Static Site Blueprint:

```yaml
services:
  - type: web
    name: city-jump
    runtime: static
    autoDeploy: false
    buildCommand: npm ci && npm run build
    staticPublishPath: dist
    pullRequestPreviewsEnabled: false
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    headers:
      - path: /index.html
        name: Cache-Control
        value: no-cache
      - path: /site.webmanifest
        name: Cache-Control
        value: no-cache
      - path: /assets/*
        name: Cache-Control
        value: public, max-age=31536000, immutable
      - path: /buildings/*
        name: Cache-Control
        value: public, max-age=31536000, immutable
      - path: /*
        name: Strict-Transport-Security
        value: max-age=31536000; includeSubDomains
      - path: /*
        name: X-Content-Type-Options
        value: nosniff
      - path: /*
        name: Referrer-Policy
        value: strict-origin-when-cross-origin
      - path: /*
        name: X-Frame-Options
        value: DENY
      - path: /*
        name: Permissions-Policy
        value: geolocation=(), microphone=(), camera=(), interest-cohort=()
```

The CSP header value must stay double-quoted: the space after `data:` in
`img-src 'self' data: blob:` makes an unquoted YAML scalar invalid. The architecture
gate checks this quoting and the CSP digest updater. After a header change, verify
the actual response header as well as the bundle version; a successful application
deployment does not prove that the Blueprint synchronized.

## CSP stylesheet deployment note

The CSP is declared in `render.yaml` as a Render Static Site response header, not in
application code or middleware. On 2026-10-31, Chromium reproduced the production
failure: the response allowed style hash `sha256-dXfMueqj2NrmKNtGO2iXqKbkSUjpBYNVJliTPSKhJgk=`
but the inline stylesheet required `sha256-455pl8DJMdw5wUt8YDhx3h0mmXmNtDg379xkITGOJHI=`.
The received CSP matched the Blueprint. Response headers included `server: cloudflare`,
`cf-cache-status: HIT` and `rndr-id`; these show the delivery path, but do not establish
whether an operator has configured additional Cloudflare or Render dashboard overrides.
No such account settings were available for this investigation.

HUD CSS now lives in `src/ui/hud.css`. Vite emits a fingerprinted `/assets/*.css` file
and links it from the built HTML, removing the changing style hash from the policy.
Keep `style-src 'self'`; the remaining inline script still uses `npm run csp:sync`.

For deployment, the operator must:

1. Review and merge the change, then follow the normal release procedure above.
   `autoDeploy: false` means merging alone does not deploy it.
2. Deploy the new HTML and fingerprinted assets first: the existing policy already
   permits same-origin CSS. Then synchronize the Render Blueprint header configuration
   to remove the obsolete style hash, allowing for cached old HTML before tightening it.
   A release deploy hook does not prove the Blueprint headers were synchronized.
3. Check the actual response CSP on both `/` and `/index.html`: it must include
   `style-src 'self'`, with no stale style hash or second conflicting CSP. If it differs,
   inspect Render custom headers and any Cloudflare header transform rules.
4. Confirm the HTML links the new `/assets/*.css`, that the stylesheet returns HTTP 200
   with a CSS content type, and that a fresh Chromium session reports no CSP violations.
   Check the canvas and HUD at mobile and desktop widths. Repeat after the CDN cache
   expires or is purged: `/` was served with `s-maxage=300` during reproduction.
5. Keep the HTML, fingerprinted assets, and header configuration together when rolling
   back. Old HTML containing inline CSS cannot use the new `style-src 'self'` policy.

Local preview does not apply Render headers automatically. Browser validation of this
fix must serve the built `dist/` with the exact CSP from `render.yaml`.

## Hook contract

A release hook can stay small:

```bash
npm ci
npm run release:static
tar -C dist -czf city-jump-v0.2.0-static.tar.gz .
```

Render deploys are triggered by `.github/workflows/render-release-deploy.yml` when a
GitHub release is published. Store the Render hook in the GitHub secret
`RENDER_DEPLOY_HOOK_URL`; keep the hook URL out of the repository because it contains
the deploy key.

## Manual smoke check

```bash
npm run preview
```

Open the preview URL and check that the scene loads, building assets appear, the favicon
shows, and a named save can be created and reloaded.
