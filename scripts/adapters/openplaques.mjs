#!/usr/bin/env node
// Open Plaques adapter: Nubian Jak Community Trust plaques → draft sites.
// Open Plaques data is public domain; photos keep their own licences.
//
//   node scripts/adapters/openplaques.mjs fetch    refresh the committed snapshot
//   node scripts/adapters/openplaques.mjs ingest   add new London plaques from the snapshot to sites.geojson
//   node scripts/adapters/openplaques.mjs check [--report out.md]
//                                                   compare live data with the snapshot, write a markdown report
//
// Ingest never overwrites an existing site. A plaque that matches one (same person,
// within 600 m) only gets its Open Plaques id added to that site's external_ids.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import distance from '@turf/distance';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

const ORG = 'nubian_jak';
const LIVE_URL = `https://openplaques.org/organisations/${ORG}/plaques.json`;
const SNAPSHOT = path.join(root, `data-source/openplaques/${ORG}.json`);
const SITES = path.join(root, 'public/data/sites.geojson');
const THEMES = path.join(root, 'public/data/themes.json');
const PEOPLE = path.join(root, 'public/data/people.json');
const LONDON_BBOX = [-0.51, 51.28, 0.33, 51.69];
const MATCH_METRES = 600;

// Keyword → theme slug, matched against the inscription. Loose by design: these
// are drafts and get corrected in review.
const THEME_RULES = [
  ['music', /music|singer|vocalist|jazz|reggae|afrobeat|composer|pianist|piano|drummer|saxophon|clarinet|violin|band|album|concert|recording|broadcast/i],
  ['sport', /football|cricket|boxing|heavyweight|athlet|olympic|gold medal/i],
  ['literature', /writer|author|poet|novelist|playwright|publish|journalist/i],
  ['performance', /actor|actress|theatre|perform/i],
  ['visual-art', /artist|sculpt|designer|textile/i],
  ['medicine', /doctor|physician|nurse|medic/i],
  ['education', /educat|teacher|scholar|student/i],
  ['civic-life', /mayor|council|politic|parliament|barrister|campaign|activist|civil rights|human rights|community/i],
  ['panafricanism', /pan-?african/i],
  ['abolition', /abolition|slave/i],
  ['labour-movement', /trade union/i],
  ['trade', /entrepreneur|industrialist|business|haircare|beauty industry|shop/i],
  ['windrush', /windrush/i],
  ['caribbean-diaspora', /caribbean|jamaica|trinidad|barbad|antigua|guyan|grenad|west indi|carnival/i],
  ['african-diaspora', /africa|nigeria|ghana|sierra leone/i]
];

const today = new Date().toISOString().slice(0, 10);
const readJSON = async p => JSON.parse(await readFile(p, 'utf8'));
const writeJSON = (p, v) => writeFile(p, JSON.stringify(v, null, 2) + '\n');
const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const chunk = (xs, n) => xs.length ? [xs.slice(0, n), ...chunk(xs.slice(n), n)] : [];
const kebab = s => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function fetchLive() {
  const res = await fetch(LIVE_URL, { headers: { 'User-Agent': 'black-london (github.com/Ilube-C/black-london)' } });
  if (!res.ok) throw new Error(`Open Plaques ${res.status}`);
  // The endpoint ignores pagination and has been seen returning rows twice.
  const byId = new Map((await res.json()).map(p => [p.id, p]));
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

// ---- fetch ----------------------------------------------------------------

async function cmdFetch() {
  const plaques = await fetchLive();
  await mkdir(path.dirname(SNAPSHOT), { recursive: true });
  await writeJSON(SNAPSHOT, plaques);
  console.log(`Saved ${plaques.length} plaques to ${path.relative(root, SNAPSHOT)}`);
}

// ---- check ----------------------------------------------------------------

async function cmdCheck(reportPath) {
  const [live, saved] = await Promise.all([fetchLive(), readJSON(SNAPSHOT)]);
  const old = new Map(saved.map(p => [p.id, p]));
  const now = new Map(live.map(p => [p.id, p]));
  const added = live.filter(p => !old.has(p.id));
  const removed = saved.filter(p => !now.has(p.id));
  const changed = live.filter(p => old.has(p.id) && old.get(p.id).updated_at !== p.updated_at);

  const row = p => `- [${clean(p.title || p.inscription).slice(0, 90)}](${p.uri})`;
  const section = (label, list) => list.length ? `**${label} (${list.length})**\n${list.map(row).join('\n')}\n` : '';
  const body = [section('New', added), section('Changed', changed), section('Removed', removed)].filter(Boolean).join('\n');

  if (!body) { console.log('No changes.'); return; }
  const report = `Nubian Jak plaques changed on Open Plaques.\n\n${body}\nTo update: run \`node scripts/adapters/openplaques.mjs fetch\` then \`ingest\`, review, and open a PR.\n`;
  console.log(report);
  if (reportPath) await writeFile(reportPath, report);
}

// ---- ingest ---------------------------------------------------------------

function inLondon(p) {
  const { latitude: lat, longitude: lon } = p;
  return lat && lon && lon >= LONDON_BBOX[0] && lon <= LONDON_BBOX[2] && lat >= LONDON_BBOX[1] && lat <= LONDON_BBOX[3];
}

async function boroughAt(lon, lat) {
  const q = new URLSearchParams({ lon, lat, radius: 2000, limit: 1, widesearch: 'true' });
  const res = await fetch(`https://api.postcodes.io/postcodes?${q}`);
  if (!res.ok) return null;
  const { result } = await res.json();
  const r = result?.[0];
  return r?.region === 'London' ? r.admin_district : null;
}

// "Kensington and Chelsea" → "kensington", "City of London" → "cityoflondon", matching existing ids.
const idPrefix = borough => borough.toLowerCase().replace(/ and .*/, '').replace(/[^a-z]/g, '');

function nextId(prefix, taken) {
  for (let n = 1; ; n++) {
    const id = `site_${prefix}_${String(n).padStart(4, '0')}`;
    if (!taken.has(id)) { taken.add(id); return id; }
  }
}

function personSlugs(plaque, people) {
  const byName = new Map(Object.entries(people).map(([slug, p]) => [p.name.toLowerCase(), slug]));
  return (plaque.people || []).map(p => {
    const name = clean(p.full_name).toLowerCase();
    return byName.get(name) || Object.entries(people).find(([slug]) => slug === kebab(name))?.[0];
  }).filter(Boolean);
}

// Commons photos under licences that allow reuse without NC/ND restrictions.
function media(plaque) {
  for (const ph of plaque.photos || []) {
    const attr = clean(ph.attribution).replace(/&copy;/g, '©');
    const m = attr.match(/^©\s*(.+?) on Wikimedia Commons (CC BY(?:-SA)? [\d.]+|CC0|Public domain)$/i);
    const file = ph.thumbnail_url?.match(/Special:FilePath\/([^?]+)/)?.[1];
    if (!m || !file) continue;
    return [{
      type: 'image',
      src: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURI(decodeURI(file))}?width=800`,
      thumb: ph.thumbnail_url,
      alt: `Photograph of the ${clean(plaque.title)}`,
      credit: `${m[1]} / Wikimedia Commons`,
      license: m[2],
      rights_holder: m[1],
      source_url: `https://commons.wikimedia.org/wiki/File:${encodeURI(decodeURI(file))}`
    }];
  }
  return [];
}

// "Ignatius Sancho", "Eric Huntley and others"; first words of the inscription if no one is named.
function subjectOf(plaque) {
  const names = (plaque.people || []).map(p => clean(p.full_name));
  if (names.length > 2) return `${names[0]} and others`;
  if (names.length) return names.join(' and ');
  return clean(plaque.inscription).split(' ').slice(0, 8).join(' ');
}

function toSite(plaque, { id, slug, borough, people }) {
  const inscription = clean(plaque.inscription);
  const subject = subjectOf(plaque);
  const address = clean(plaque.address) || null;
  // "1729-1780", "c1778 - 1823", "1945-81".
  const years = inscription.match(/(?:\bc\.?\s?|\b)(1[5-9]\d\d|20[0-2]\d)\s*[-–]\s*(\d{4}|\d{2})\b/);
  const start = years && +years[1];
  const end = years && (years[2].length === 2 ? Math.floor(start / 100) * 100 + +years[2] + (+years[2] < start % 100 ? 100 : 0) : +years[2]);
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [plaque.longitude, plaque.latitude] },
    properties: {
      id, slug,
      name: (address ? `${subject} — ${address.split(',')[0]}` : subject).slice(0, 200),
      kind: 'plaque',
      summary: inscription.length > 280 ? inscription.slice(0, 277).replace(/\s+\S*$/, '') + '…' : inscription.padEnd(10, '.'),
      borough,
      address,
      period: years ? { start_year: start, end_year: end } : null,
      themes: THEME_RULES.filter(([, re]) => re.test(inscription)).map(([t]) => t),
      people,
      media: media(plaque),
      sources: [{ type: 'web', citation: `Open Plaques — ${clean(plaque.title)}`, url: plaque.uri }],
      external_ids: { openplaques: String(plaque.id) },
      contributor: { name: 'Open Plaques', affiliation: 'Nubian Jak Community Trust plaque', submitted_at: today },
      verification: { verified_at: today, confidence: 'low' },
      status: 'draft',
      license: 'Public domain (Open Plaques)'
    }
  };
}

async function cmdIngest() {
  const [plaques, sites, themes, people] = await Promise.all([readJSON(SNAPSHOT), readJSON(SITES), readJSON(THEMES), readJSON(PEOPLE)]);
  const props = sites.features.map(f => f.properties);
  const linked = new Set(props.map(p => p.external_ids?.openplaques).filter(Boolean));
  const ids = new Set(props.map(p => p.id));
  const slugs = new Set(props.map(p => p.slug));
  const boroughs = new Set(themes.boroughs);
  const report = { added: [], linked: [], noCoords: [], outside: [] };

  for (const plaque of plaques) {
    const id = String(plaque.id);
    if (linked.has(id) || !plaque.is_current) continue;
    if (!plaque.latitude) { report.noCoords.push(plaque); continue; }
    if (!inLondon(plaque)) { report.outside.push(plaque); continue; }

    const who = personSlugs(plaque, people);
    const here = [plaque.longitude, plaque.latitude];
    const match = sites.features.find(f => f.geometry?.type === 'Point'
      && (f.properties.people || []).some(s => who.includes(s))
      && distance(f.geometry.coordinates, here, { units: 'meters' }) <= MATCH_METRES);
    if (match) {
      match.properties.external_ids = { ...match.properties.external_ids, openplaques: id };
      linked.add(id);
      report.linked.push(`${match.properties.slug} ← ${plaque.uri}`);
      continue;
    }

    const borough = await boroughAt(...here);
    if (!borough) { report.outside.push(plaque); continue; }
    boroughs.add(borough);

    let slug = kebab(`${subjectOf(plaque)} ${clean(plaque.address).split(',')[0]}`).slice(0, 70).replace(/-$/, '');
    if (slugs.has(slug)) slug = `${slug}-op${id}`;
    slugs.add(slug);

    sites.features.push(toSite(plaque, { id: nextId(idPrefix(borough), ids), slug, borough, people: who }));
    linked.add(id);
    report.added.push(`${slug} (${borough})`);
  }

  await writeJSON(SITES, sites);
  // themes.json is hand-formatted, so only rewrite its boroughs block.
  const newBoroughs = [...boroughs].filter(b => !themes.boroughs.includes(b));
  if (newBoroughs.length) {
    const text = await readFile(THEMES, 'utf8');
    const lines = chunk([...boroughs].map(b => JSON.stringify(b)), 5).map(l => `    ${l.join(', ')}`).join(',\n');
    await writeFile(THEMES, text.replace(/"boroughs": \[[^\]]*\]/, `"boroughs": [\n${lines}\n  ]`));
  }

  const list = (label, xs, fmt = x => x) => console.log(`\n${label}: ${xs.length}${xs.length ? '\n  ' + xs.map(fmt).join('\n  ') : ''}`);
  const plaqueLine = p => `${clean(p.title || p.inscription).slice(0, 70)}  ${p.uri}`;
  list('Added as drafts', report.added);
  list('Linked to existing sites', report.linked);
  list('Skipped, no coordinates (look up by hand)', report.noCoords, plaqueLine);
  list('Skipped, outside London', report.outside, plaqueLine);
  console.log('\nNext: npm run validate && npm run build:index');
}

// ---- main -----------------------------------------------------------------

const [cmd, ...rest] = process.argv.slice(2);
const reportPath = rest.includes('--report') ? rest[rest.indexOf('--report') + 1] : null;
const commands = { fetch: cmdFetch, ingest: cmdIngest, check: () => cmdCheck(reportPath) };
if (!commands[cmd]) {
  console.error('Usage: node scripts/adapters/openplaques.mjs fetch | ingest | check [--report out.md]');
  process.exit(2);
}
await commands[cmd]();
