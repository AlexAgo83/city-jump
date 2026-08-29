# Static site release blueprint

This project can ship as a static site. The game keeps state in browser localStorage and
loads bundled JavaScript plus static GLB assets, so it does not need a server runtime.

## Version

- Release version: `0.2.0`
- Tag: `v0.2.0`
- Artifact directory: `dist/`

## Build

```bash
npm ci
npm run release:static
```

`release:static` runs the normal project gate through `npm run ci`, and `ci` runs the Vite
production build. The deployable output is `dist/`.

## Static host contract

- Serve `dist/index.html` for `/`.
- Serve every file under `dist/assets/`, `dist/buildings/`, and the root icon/manifest
  files as immutable static assets.
- Keep client-side storage enabled; named saves and autosave live in localStorage.
- No server API, database, secret, or environment variable is required.

## Hook contract

A release hook can stay small:

```bash
npm ci
npm run release:static
tar -C dist -czf city-jump-v0.2.0-static.tar.gz .
```

Then publish the archive or upload `dist/` directly to the static host.

## Manual smoke check

```bash
npm run preview
```

Open the preview URL and check that the scene loads, building assets appear, the favicon
shows, and a named save can be created and reloaded.
