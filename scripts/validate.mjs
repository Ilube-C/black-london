#!/usr/bin/env node
// Validates GeoJSON / JSON data files against the schemas in /schemas/.
// Also checks cross-refs (people exist, themes exist) and that all features
// fall within the London bbox. Exit code 1 on any error.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const LONDON_BBOX = [-0.51, 51.28, 0.33, 51.69];

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

async function loadJSON(p) {
  return JSON.parse(await readFile(path.join(root, p), 'utf8'));
}

const errors = [];
const log = (msg, ...rest) => process.stdout.write(msg + (rest.length ? ' ' + rest.join(' ') : '') + '\n');
const fail = (where, msg) => errors.push({ where, msg });

async function main() {
  const [siteSchema, eventSchema, restaurantSchema, personSchema, walkSchema] = await Promise.all([
    loadJSON('schemas/site.schema.json'),
    loadJSON('schemas/event.schema.json'),
    loadJSON('schemas/restaurant.schema.json'),
    loadJSON('schemas/person.schema.json'),
    loadJSON('schemas/walk.schema.json')
  ]);

  // Register the cross-referenced schema(s) so $ref resolves.
  ajv.addSchema(siteSchema, 'site.schema.json');

  const validateSite = ajv.compile(siteSchema);
  const validateEvent = ajv.compile(eventSchema);
  const validateRestaurant = ajv.compile(restaurantSchema);
  const validatePerson = ajv.compile(personSchema);
  const validateWalk = ajv.compile(walkSchema);

  const [sites, events, restaurants, people, themes, walks] = await Promise.all([
    loadJSON('public/data/sites.geojson'),
    loadJSON('public/data/events.geojson'),
    loadJSON('public/data/restaurants.geojson'),
    loadJSON('public/data/people.json'),
    loadJSON('public/data/themes.json'),
    loadJSON('public/data/walks.geojson').catch(() => ({ features: [] }))
  ]);

  const themeSlugs   = new Set(themes.themes.map(t => t.slug));
  const eraSlugs     = new Set(themes.eras.map(e => e.slug));
  const cuisineSlugs = new Set(themes.cuisines.map(c => c.slug));
  const personSlugs  = new Set(Object.keys(people));
  const validBoroughs = new Set(themes.boroughs);
  const siteIds      = new Set();
  const slugs        = new Set();

  log(`\n· Validating ${sites.features.length} sites…`);
  for (const f of sites.features) {
    const where = `sites:${f.properties?.slug || f.properties?.id}`;
    if (!validateSite(f.properties)) {
      for (const e of validateSite.errors) fail(where, `${e.instancePath} ${e.message}`);
    }
    const p = f.properties;
    if (p) {
      if (siteIds.has(p.id)) fail(where, `duplicate id ${p.id}`);
      siteIds.add(p.id);
      if (slugs.has(p.slug)) fail(where, `duplicate slug ${p.slug}`);
      slugs.add(p.slug);
      for (const slug of p.people || []) if (!personSlugs.has(slug)) fail(where, `unknown person slug "${slug}"`);
      for (const t of p.themes || [])     if (!themeSlugs.has(t))   fail(where, `unknown theme "${t}"`);
      if (p.period?.era && !eraSlugs.has(p.period.era)) fail(where, `unknown era "${p.period.era}"`);
      if (p.borough && !validBoroughs.has(p.borough)) fail(where, `unknown borough "${p.borough}"`);
      // bbox check (use first coordinate of geometry)
      const c = firstCoord(f.geometry);
      if (c) {
        const [lon, lat] = c;
        if (lon < LONDON_BBOX[0] || lon > LONDON_BBOX[2] || lat < LONDON_BBOX[1] || lat > LONDON_BBOX[3]) {
          fail(where, `coordinate ${lon},${lat} outside London bbox`);
        }
      }
    }
  }

  log(`· Validating ${events.features.length} events…`);
  for (const f of events.features) {
    const where = `events:${f.properties?.id}`;
    if (!validateEvent(f.properties)) for (const e of validateEvent.errors) fail(where, `${e.instancePath} ${e.message}`);
    for (const t of f.properties?.themes || []) if (!themeSlugs.has(t)) fail(where, `unknown theme "${t}"`);
    for (const sid of f.properties?.related_sites || []) if (!siteIds.has(sid)) fail(where, `related_sites references missing site "${sid}"`);
  }

  log(`· Validating ${restaurants.features.length} restaurants…`);
  for (const f of restaurants.features) {
    const where = `restaurants:${f.properties?.id}`;
    if (!validateRestaurant(f.properties)) for (const e of validateRestaurant.errors) fail(where, `${e.instancePath} ${e.message}`);
    for (const c of f.properties?.cuisine || []) if (!cuisineSlugs.has(c)) fail(where, `unknown cuisine "${c}"`);
  }

  log(`· Validating ${Object.keys(people).length} people…`);
  for (const [slug, p] of Object.entries(people)) {
    const where = `people:${slug}`;
    if (!validatePerson(p)) for (const e of validatePerson.errors) fail(where, `${e.instancePath} ${e.message}`);
    if (!/^[a-z0-9-]+$/.test(slug)) fail(where, `slug must be kebab-case`);
  }

  log(`· Validating ${walks.features.length} walks…`);
  const walkIds = new Set();
  const walkSlugs = new Set();
  for (const f of walks.features) {
    const where = `walks:${f.properties?.slug || f.properties?.id}`;
    if (!validateWalk(f.properties)) for (const e of validateWalk.errors) fail(where, `${e.instancePath} ${e.message}`);
    const p = f.properties;
    if (!p) continue;
    if (walkIds.has(p.id)) fail(where, `duplicate id ${p.id}`);
    walkIds.add(p.id);
    if (walkSlugs.has(p.slug)) fail(where, `duplicate slug ${p.slug}`);
    walkSlugs.add(p.slug);
    for (const t of p.themes || []) if (!themeSlugs.has(t)) fail(where, `unknown theme "${t}"`);
    // Every stop must point to a real site.
    for (const stop of p.stops || []) {
      if (!slugs.has(stop.site_slug)) fail(where, `stop ${stop.order} references missing site "${stop.site_slug}"`);
    }
    // LineString geometry: bbox check each coordinate.
    if (f.geometry?.type === 'LineString') {
      for (const [lon, lat] of f.geometry.coordinates) {
        if (lon < LONDON_BBOX[0] || lon > LONDON_BBOX[2] || lat < LONDON_BBOX[1] || lat > LONDON_BBOX[3]) {
          fail(where, `coordinate ${lon},${lat} outside London bbox`);
        }
      }
    }
  }

  if (errors.length) {
    log('\n✗ Validation FAILED:');
    for (const e of errors) log(`  [${e.where}] ${e.msg}`);
    log(`\n${errors.length} error(s).\n`);
    process.exit(1);
  }
  log('\n✓ Data valid.\n');
}

function firstCoord(geom) {
  if (!geom) return null;
  if (geom.type === 'Point') return geom.coordinates;
  if (geom.type === 'Polygon') return geom.coordinates?.[0]?.[0];
  if (geom.type === 'MultiPolygon') return geom.coordinates?.[0]?.[0]?.[0];
  return null;
}

main().catch(err => { console.error(err); process.exit(2); });
