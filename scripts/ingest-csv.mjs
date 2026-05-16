#!/usr/bin/env node
// Reads a contributor CSV (matching scripts/lib/csvTemplate.csv columns) and
// writes / merges into public/data/sites.geojson. Use --merge to update
// existing rows by slug while preserving manually-edited media[] / description_md.
//
// Usage:
//   node scripts/ingest-csv.mjs --input data-source/city-of-london/sites.csv --merge

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const args = parseArgs(process.argv.slice(2));
const inputPath = args.input;
const merge = !!args.merge;
const target = args.out || 'public/data/sites.geojson';
if (!inputPath) {
  console.error('Usage: node scripts/ingest-csv.mjs --input <file.csv> [--merge] [--out <path>]');
  process.exit(2);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out[k] = v;
    }
  }
  return out;
}

const csv = await readFile(path.resolve(root, inputPath), 'utf8');
const { data, errors } = Papa.parse(csv, { header: true, skipEmptyLines: true });
if (errors.length) {
  console.error('CSV parse errors:', errors);
  process.exit(2);
}

const existing = await readFile(path.join(root, target), 'utf8').then(JSON.parse);
const bySlug = new Map(existing.features.map(f => [f.properties.slug, f]));
const today = new Date().toISOString().slice(0, 10);

let added = 0, updated = 0;

for (const row of data) {
  if (!row.slug || !row.name) continue;

  const themes = (row.themes || '').split(/[;,]/).map(s => s.trim()).filter(Boolean);
  const people = (row.people || '').split(/[;,]/).map(s => s.trim()).filter(Boolean);
  const sources = (row.sources || '').split('|').map(s => s.trim()).filter(Boolean).map(citation => {
    const m = citation.match(/^(.*?)\s*(https?:\/\/\S+)\s*$/);
    return m
      ? { type: guessSourceType(m[2]), citation: m[1].trim(), url: m[2] }
      : { type: 'book', citation };
  });

  const props = {
    id: existingId(row.slug, bySlug) || nextId(row.borough),
    slug: row.slug,
    name: row.name,
    kind: row.kind || 'plaque',
    summary: row.summary,
    description_md: row.description_md,
    borough: row.borough,
    address: row.address || null,
    period: {
      start_year: row.start_year ? Number(row.start_year) : null,
      end_year: row.end_year ? Number(row.end_year) : null,
      era: row.era || null
    },
    themes,
    people,
    media: [],
    sources,
    external_ids: {},
    accessibility: { step_free: true, viewable_from_street: true, indoor: false, notes: null },
    contributor: {
      name: row.contributor_name || 'Unknown',
      affiliation: row.contributor_affiliation || null,
      submitted_at: today
    },
    verification: {
      verified_by: row.verified_by || null,
      verified_at: row.verified_at || today,
      confidence: row.confidence || 'low'
    },
    status: 'published',
    license: row.license || 'CC-BY-4.0'
  };

  const lon = Number(row.lon), lat = Number(row.lat);
  if (!isFinite(lon) || !isFinite(lat)) {
    console.warn(`! ${row.slug}: missing/invalid lon,lat — needs geocoding (skipped).`);
    continue;
  }

  const feature = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties: props
  };

  if (bySlug.has(row.slug)) {
    if (merge) {
      const prev = bySlug.get(row.slug).properties;
      // Preserve manually-edited fields when merging
      feature.properties.media = prev.media?.length ? prev.media : feature.properties.media;
      if (prev.description_md && !row.description_md) feature.properties.description_md = prev.description_md;
      bySlug.set(row.slug, feature);
      updated++;
    } else {
      console.warn(`! ${row.slug}: already exists (use --merge to overwrite).`);
    }
  } else {
    bySlug.set(row.slug, feature);
    added++;
  }
}

const out = {
  type: 'FeatureCollection',
  name: existing.name || 'Sites',
  features: Array.from(bySlug.values())
};

await writeFile(path.join(root, target), JSON.stringify(out, null, 2) + '\n');
console.log(`✓ ${target} updated. +${added} added, ${updated} updated, ${out.features.length} total.`);

function existingId(slug, bySlug) {
  return bySlug.get(slug)?.properties?.id;
}

function nextId(borough) {
  const b = (borough || 'london').toLowerCase().replace(/[^a-z]+/g, '');
  return `site_${b}_${Date.now().toString().slice(-8)}`;
}

function guessSourceType(url) {
  if (/discovery\.nationalarchives|archives|archive\.org/i.test(url)) return 'archive';
  if (/\.pdf$|jstor|journal/i.test(url)) return 'journal';
  return 'web';
}
