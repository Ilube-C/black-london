#!/usr/bin/env node
// Black Cultural Archives events → events.geojson.
//
// BCA's own pages don't say where an event happens, so the venue comes only from
// the Eventbrite listing each event links to. An event is skipped, never guessed,
// when it has no Eventbrite link, is online, has no venue coordinates, is outside
// London, is cancelled or has ended.
//
//   EVENTBRITE_TOKEN=… node scripts/adapters/bca-events.mjs [--report out.md]
//
// Events this adapter writes have `source` starting "bca-eventbrite:" and are
// replaced wholesale on every run. Hand-made events are left alone.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import distance from '@turf/distance';
import { guessThemes } from '../lib/themes.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

const FEED = 'https://blackculturalarchives.org/events?format=rss';
const EVENTS = path.join(root, 'public/data/events.geojson');
const SITES = path.join(root, 'public/data/sites.geojson');
const SOURCE = 'bca-eventbrite:';
const LONDON_BBOX = [-0.51, 51.28, 0.33, 51.69];
const SITE_LINK_METRES = 150;
const UA = 'black-london (github.com/Ilube-C/black-london)';

const args = process.argv.slice(2);
const reportPath = args.includes('--report') ? args[args.indexOf('--report') + 1] : null;
const token = process.env.EVENTBRITE_TOKEN;
if (!token) { console.error('Missing env EVENTBRITE_TOKEN'); process.exit(2); }

const today = new Date().toISOString().slice(0, 10);
const now = new Date();
const readJSON = async p => JSON.parse(await readFile(p, 'utf8'));
const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&#8217;/g, '’').replace(/&nbsp;/g, ' ');
const plain = s => decode(String(s ?? '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const clip = (s, n) => s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s;

async function get(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { 'User-Agent': UA, ...opts.headers } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
}

// RSS items → [{ title, link, description }]. Squarespace's feed is simple enough for regex.
async function feedItems() {
  const xml = await (await get(FEED)).text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
    const tag = t => item.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`))?.[1] ?? '';
    return { title: plain(tag('title')), link: plain(tag('link')), description: plain(tag('description')) };
  });
}

// Eventbrite event ids linked from a BCA event page.
async function eventbriteIds(pageUrl) {
  const html = await (await get(pageUrl)).text();
  return [...new Set([...html.matchAll(/eventbrite\.[a-z.]+\/e\/[^"'\s?]*?-(\d{9,})/g)].map(m => m[1]))];
}

async function eventbrite(id) {
  const res = await get(`https://www.eventbriteapi.com/v3/events/${id}/?expand=venue`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

function inLondon(lon, lat) {
  return lon >= LONDON_BBOX[0] && lon <= LONDON_BBOX[2] && lat >= LONDON_BBOX[1] && lat <= LONDON_BBOX[3];
}

// Returns a feature, or a string saying why the event was skipped.
function toEvent(eb, item, sites) {
  if (!['live', 'started'].includes(eb.status)) return `status ${eb.status}`;
  if (eb.online_event) return 'online';
  const end = new Date(eb.end?.utc || eb.start?.utc);
  if (end < now) return 'ended';
  const v = eb.venue;
  const lat = Number(v?.latitude), lon = Number(v?.longitude);
  if (!v || !Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) return 'no venue coordinates';
  if (!inLondon(lon, lat)) return 'outside London';

  const name = plain(eb.name?.text) || item.title;
  const summary = clip(plain(eb.summary) || item.description || name, 280);
  const related = sites.features
    .filter(f => f.geometry?.type === 'Point' && distance(f.geometry.coordinates, [lon, lat], { units: 'meters' }) <= SITE_LINK_METRES)
    .map(f => f.properties.id);

  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties: {
      id: `event_bca_eb_${eb.id}`,
      name,
      summary,
      starts_at: eb.start.utc,
      ends_at: eb.end?.utc ?? null,
      recurrence: null,
      venue_name: plain(v.name) || plain(v.address?.address_1),
      address: plain(v.address?.localized_address_display) || null,
      url: eb.url || item.link,
      price: eb.is_free ? 'free' : 'paid',
      themes: guessThemes(`${name} ${summary}`),
      related_sites: related,
      image: null,
      source: `${SOURCE} ${item.link}`,
      contributor: { name: 'Black Cultural Archives', affiliation: 'via Eventbrite', submitted_at: today },
      verification: { verified_at: today, confidence: 'medium' },
      status: 'published'
    }
  };
}

const [items, events, sites] = await Promise.all([feedItems(), readJSON(EVENTS), readJSON(SITES)]);
const added = [], skipped = [], seen = new Set();

for (const item of items) {
  let ids;
  try { ids = await eventbriteIds(item.link); }
  catch (err) { skipped.push([item.title, `page fetch failed (${err.message})`, item.link]); continue; }
  if (!ids.length) { skipped.push([item.title, 'no Eventbrite link', item.link]); continue; }

  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    let eb;
    try { eb = await eventbrite(id); }
    catch (err) { skipped.push([item.title, `Eventbrite API failed (${err.message})`, item.link]); continue; }
    const result = toEvent(eb, item, sites);
    if (typeof result === 'string') skipped.push([plain(eb.name?.text) || item.title, result, eb.url || item.link]);
    else added.push(result);
  }
}

// A failed run must not wipe the existing events.
if (!added.length && skipped.some(([, why]) => /failed/.test(why))) {
  console.error('Nothing fetched and some requests failed; leaving events.geojson unchanged.');
  for (const s of skipped) console.error(`  ${s.join(' | ')}`);
  process.exit(1);
}

added.sort((a, b) => a.properties.starts_at.localeCompare(b.properties.starts_at));
events.features = [...events.features.filter(f => !String(f.properties.source || '').startsWith(SOURCE)), ...added];
await writeFile(EVENTS, JSON.stringify(events, null, 2) + '\n');

const lines = [
  `**BCA events: ${added.length} on the map, ${skipped.length} skipped**`, '',
  ...added.map(f => `- ${f.properties.starts_at.slice(0, 10)} · [${f.properties.name}](${f.properties.url}) · ${f.properties.venue_name}`),
  ...(skipped.length ? ['', '**Skipped**', ...skipped.map(([name, why, url]) => `- [${name}](${url}): ${why}`)] : [])
];
console.log(lines.join('\n'));
if (reportPath) await writeFile(reportPath, lines.join('\n') + '\n');
