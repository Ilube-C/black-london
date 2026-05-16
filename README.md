# Black London — A Map of Black History

A curated, walkable Progressive Web App that surfaces Black History sites,
events and Black-history-relevant restaurants across London. Prototype anchored
on the City of London; expandable across the capital.

Stack: **Vite + vanilla JS + MapLibre GL + OpenFreeMap tiles**, data as
git-tracked GeoJSON, deployed as a static site to Cloudflare Pages.

## Quickstart

```bash
nvm use                       # Node 20
npm install
npm run prepare:icons         # one-off: generate PWA PNG icons from icon.svg
npm run dev                   # https://localhost:5173 (mkcert generates a cert on first run)
```

The first launch installs a local certificate via `vite-plugin-mkcert` so
`https://localhost:5173` works — Geolocation refuses to run on insecure origins.

To test on a phone over the LAN:

```bash
npm run dev -- --host
```

then trust the mkcert root certificate on your device (it lives at
`~/.vite-plugin-mkcert/rootCA.pem`).

## Build & preview

```bash
npm run build
npm run preview
```

## Data pipeline

```bash
# 1. Author/edit data in public/data/{sites,events,restaurants}.geojson
#    or import via:
node scripts/ingest-csv.mjs --input data-source/city-of-london/sites.csv --merge

# 2. Validate (schemas + cross-refs + London bbox + license sanity)
npm run validate

# 3. Regenerate the data manifest (counts, bbox, hash, version)
npm run build:index
```

Every contribution goes through `validate.mjs`. CI gates pull requests via
`.github/workflows/validate.yml`.

## Project layout

| Path | What |
|---|---|
| `index.html`, `src/` | App shell + modules (map, ui, data, geo, pwa) |
| `public/data/` | GeoJSON / JSON served at runtime |
| `public/icons/` | PWA icons + favicon |
| `data-source/` | Raw contributor inputs (committed for provenance) |
| `schemas/` | JSON Schemas for sites, events, restaurants, people |
| `scripts/` | Ingestion, validation, manifest, icon generation |
| `docs/` | Schema reference + editorial guidance |

## Verifying the PWA

After `npm run build && npm run preview`:

1. **DevTools → Application → Manifest** — should be valid, theme/background
   color set, install prompt appears.
2. **Service Worker** — activated, with caches `data`, `tiles`, `media`.
3. **Throttle to "Offline"** then reload — app shell + cached data still load,
   tiles fall back to whatever has been cached.
4. **Lighthouse** — PWA audit ≥ 90.

## Geolocation in DevTools

Chrome DevTools → ⋮ → More tools → **Sensors** → **Location** → choose
"London, UK" or paste:

- City of London / Bank: `51.5128, -0.0890`
- Brixton (Windrush Square): `51.4625, -0.1095`
- Notting Hill (Powis Square): `51.5145, -0.2050`

## Hosting

Build output (`dist/`) deploys cleanly to **Cloudflare Pages**, **Netlify**, or
**Vercel**. The Cloudflare Pages dashboard can build from the `main` branch
directly with `npm ci && npm run build` and `dist` as the output directory.

## Licences

- **Code** — MIT (see `LICENSE`).
- **Data** — CC-BY-4.0 by default (see `LICENSE-DATA`); per-feature
  `license` field can override for archive material with a different licence.
- **Tiles** — © OpenStreetMap contributors, © OpenFreeMap; attribution is
  rendered in the bottom-right of the map at all zoom levels.

## Roadmap

- **Phase 1** (this prototype): map, sites, sheet, geolocation, layer toggle,
  filters, search, hash routing, PWA wiring, ingestion + validation.
- **Phase 2**: real media (images, audio walkthroughs) for seed sites; first
  ingestion of City of London partner data.
- **Phase 3**: walking mode (`watchPosition` + heading puck), curated themed
  walks ("City of London Black history walk"), turn-by-turn route planning.
- **Phase 4**: clipped PMTiles offline pack for City of London; "download for
  offline" toggle per site for media; user-submitted listings (with moderation).
