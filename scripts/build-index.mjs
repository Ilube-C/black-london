#!/usr/bin/env node
// Generates public/data/manifest-data.json: counts, bbox, version, hash.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

async function loadJSON(p) { return JSON.parse(await readFile(path.join(root, p), 'utf8')); }

const sites = await loadJSON('public/data/sites.geojson');
const events = await loadJSON('public/data/events.geojson');
const restaurants = await loadJSON('public/data/restaurants.geojson');
const people = await loadJSON('public/data/people.json');
const walks = await loadJSON('public/data/walks.geojson').catch(() => ({ features: [] }));

const allCoords = [
  ...sites.features.map(f => f.geometry?.coordinates).filter(Boolean),
  ...events.features.map(f => f.geometry?.coordinates).filter(Boolean),
  ...restaurants.features.map(f => f.geometry?.coordinates).filter(Boolean)
];
const lons = allCoords.map(c => c[0]);
const lats = allCoords.map(c => c[1]);
const bbox = lons.length
  ? [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)]
  : [-0.51, 51.28, 0.33, 51.69];

const hashSrc = JSON.stringify({ sites, events, restaurants, people, walks });
const hash = 'sha256:' + createHash('sha256').update(hashSrc).digest('hex');
const today = new Date();
const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '.');

const manifest = {
  version: `${yyyymmdd}-1`,
  counts: {
    sites: sites.features.length,
    events: events.features.length,
    restaurants: restaurants.features.length,
    people: Object.keys(people).length,
    walks: walks.features.length
  },
  bbox,
  default_view: { center: [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2], zoom: 11 },
  generated_at: today.toISOString(),
  hash
};

await writeFile(path.join(root, 'public/data/manifest-data.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`✓ manifest-data.json updated. version=${manifest.version} count=${manifest.counts.sites} sites.`);
