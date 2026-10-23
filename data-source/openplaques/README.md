# Open Plaques — Nubian Jak plaques

`nubian_jak.json` is a snapshot of
<https://openplaques.org/organisations/nubian_jak/plaques.json>: plaques put up by
the Nubian Jak Community Trust, as recorded by Open Plaques volunteers.

- **Licence:** Open Plaques data is public domain. Photos keep their own licences;
  only Wikimedia Commons photos under CC BY, CC BY-SA or CC0 are used.
- **Contact:** <https://openplaques.org>. Nubian Jak's own list is at <https://nubianjak.org>.
- **Imported:** 2026-10-23, as `draft` sites. They need editorial review before publishing.

```bash
node scripts/adapters/openplaques.mjs fetch    # refresh this snapshot
node scripts/adapters/openplaques.mjs ingest   # add new London plaques to sites.geojson
node scripts/adapters/openplaques.mjs check    # what changed since the snapshot
```

`.github/workflows/openplaques-check.yml` runs `check` every Monday and opens an
issue labelled `openplaques` when something changed.
