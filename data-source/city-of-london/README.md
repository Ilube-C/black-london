# City of London — source data

Drop CSV exports from contributors here. Use `scripts/lib/csvTemplate.csv` as the column template.

To ingest:

```bash
node scripts/ingest-csv.mjs --input data-source/city-of-london/sites.csv --merge
```

The `--merge` flag preserves any `media[]` and `description_md` fields you've already hand-curated in `public/data/sites.geojson` for the same slug.

After ingestion, run:

```bash
npm run validate
npm run build:index
```

## Provenance

Each subfolder (or file) added here should include a one-paragraph note about
where the data came from, the licence under which it was supplied, and a contact
for follow-up questions. Without that, the validator may still accept the data
but the editorial review will not.
