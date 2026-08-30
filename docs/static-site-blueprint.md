# Static site release blueprint

This project can ship as a static site. The game keeps state in browser localStorage and
loads bundled JavaScript plus static GLB assets, so it does not need a server runtime.

## Version

- Release version: `0.2.0`
- Tag: `v0.2.0`
- Live demo: <https://city-jump.onrender.com/>
- Artifact directory: `dist/`

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
