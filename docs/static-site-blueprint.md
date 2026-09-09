# Static site release blueprint

This project can ship as a static site. The game keeps state in browser localStorage and
loads bundled JavaScript plus static GLB assets, so it does not need a server runtime.

## Version

- Release version: `0.5.7`
- Tag: `v0.5.7`
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
