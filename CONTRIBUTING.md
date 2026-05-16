# Contributing — Black London

Two contribution paths, depending on your comfort with git.

## Path A — spreadsheet (recommended for historians)

1. Download the CSV template at
   [`scripts/lib/csvTemplate.csv`](scripts/lib/csvTemplate.csv).
2. Fill in one row per site. Every site needs at minimum: `slug`, `name`,
   `kind`, `summary`, `borough`, `themes`, `lon`, `lat`, `contributor_name`,
   `verified_at`, `confidence`. The richer `description_md`, `sources`,
   `people` columns are strongly encouraged.
3. Send the file to the maintainer (or open a PR placing it in
   `data-source/<your-set>/sites.csv`).
4. The maintainer runs `npm run ingest:csv -- --input <path>` and opens a PR
   with the resulting GeoJSON change.

The validator will flag any unknown theme, era, borough, or person slug, so use
the controlled vocabularies in `public/data/themes.json` and `people.json`.

## Path B — direct PR (archive maintainers)

1. Fork the repo, branch off `main`.
2. Edit `public/data/sites.geojson` (or `events.geojson` /
   `restaurants.geojson`) directly. Each feature must satisfy the schemas in
   `schemas/`.
3. Run `npm run validate` and `npm run build:index` locally.
4. Open a PR. CI runs the validator and refuses any change that fails.

## Editorial guidance

See [`docs/editorial.md`](docs/editorial.md) for guidance on tone, depth,
citation style, and image rights. **Default rule:** if you can't supply
`credit` + `license` + `rights_holder` for a media item, link out to the
canonical source rather than embedding the asset.

## What we're looking for

- **Sites** with a clear, citable historical claim — a person, an event, a
  building, a memorial. We are conservative about claims we can't source.
- **Plurality of voices.** The seed leans on figures who have already cleared
  the bar of mainstream historiography (Sancho, Equiano, Seacole, etc.). The
  whole point of the project is to broaden that — we especially welcome
  contributions on women, working-class life, post-Windrush institutions,
  African and Afro-Caribbean trade, and any of the boroughs currently
  under-represented (most of them).
- **Borough representation.** Tower Hamlets, Hackney, Newham, Lewisham,
  Greenwich, Brent and Haringey are wide open. Patches welcome.

## Code of conduct

Treat contributors and subjects with care. The project is a small civic act of
remembering; we will edit lightly for clarity, hold the line on sourcing, and
credit every contributor by name in `contributor`.
