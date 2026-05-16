#!/usr/bin/env node
// Generates an Obsidian vault under docs/obsidian-vault/ from the project's
// JSON / GeoJSON data, so the relationships between sites, people, themes,
// walks, events and restaurants can be browsed as a graph.
//
// The vault is regenerated from scratch on every run — do not hand-edit
// inside it; treat it as a derived artifact. Run: npm run build:obsidian

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const vault = path.join(root, 'docs/obsidian-vault');

const json = (p) => readFile(path.join(root, p), 'utf8').then(JSON.parse);

// ----- helpers ---------------------------------------------------------------

const sanitize = (s) => String(s || '')
  .replace(/[\\/:*?"<>|]/g, '—')
  .replace(/\s+/g, ' ')
  .trim();

const yaml = (obj) => {
  const lines = ['---'];
  for (const [k, v] of Object.entries(obj)) {
    if (v == null || v === '') continue;
    if (Array.isArray(v)) {
      if (!v.length) continue;
      lines.push(`${k}:`);
      for (const item of v) lines.push(`  - ${yamlValue(item)}`);
    } else {
      lines.push(`${k}: ${yamlValue(v)}`);
    }
  }
  lines.push('---');
  return lines.join('\n') + '\n';
};

const yamlValue = (v) => {
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  const s = String(v);
  return /[:#&*?{}[\],|>!%@`"'\n]/.test(s) ? JSON.stringify(s) : s;
};

const link = (name) => `[[${sanitize(name)}]]`;

async function writeMd(rel, body) {
  const fp = path.join(vault, rel);
  await mkdir(path.dirname(fp), { recursive: true });
  await writeFile(fp, body);
}

// ----- main ------------------------------------------------------------------

async function main() {
  // Wipe content folders but preserve .obsidian/ — that's where the user's
  // graph colours, filters and pane layout live.
  await mkdir(vault, { recursive: true });
  for (const sub of ['People', 'Sites', 'Themes', 'Eras', 'Boroughs', 'Cuisines', 'Walks', 'Events', 'Restaurants']) {
    await rm(path.join(vault, sub), { recursive: true, force: true });
  }
  await rm(path.join(vault, 'README.md'), { force: true });
  await rm(path.join(vault, 'index.md'), { force: true });

  const [sites, events, restaurants, people, themesCfg, walks] = await Promise.all([
    json('public/data/sites.geojson'),
    json('public/data/events.geojson'),
    json('public/data/restaurants.geojson'),
    json('public/data/people.json'),
    json('public/data/themes.json'),
    json('public/data/walks.geojson').catch(() => ({ features: [] }))
  ]);

  // Lookup tables
  const personNameBySlug = Object.fromEntries(Object.entries(people).map(([slug, p]) => [slug, p.name]));
  const themeLabelBySlug = Object.fromEntries(themesCfg.themes.map(t => [t.slug, t.label]));
  const eraLabelBySlug   = Object.fromEntries(themesCfg.eras.map(e => [e.slug, e.label]));
  const cuisineLabelBySlug = Object.fromEntries(themesCfg.cuisines.map(c => [c.slug, c.label]));
  const siteNameBySlug = Object.fromEntries(sites.features.map(f => [f.properties.slug, f.properties.name]));
  const siteNameById   = Object.fromEntries(sites.features.map(f => [f.properties.id, f.properties.name]));

  let counts = { people: 0, sites: 0, themes: 0, eras: 0, boroughs: 0, walks: 0, events: 0, restaurants: 0, cuisines: 0 };

  // --- People ---
  for (const [slug, p] of Object.entries(people)) {
    const linkedSites = sites.features.filter(f => (f.properties.people || []).includes(slug));
    const linkedThemes = new Set();
    const linkedEras = new Set();
    for (const f of linkedSites) {
      for (const t of f.properties.themes || []) linkedThemes.add(t);
      if (f.properties.period?.era) linkedEras.add(f.properties.period.era);
    }

    const fm = yaml({
      kind: 'person',
      slug,
      birth_year: p.birth_year,
      death_year: p.death_year,
      wikidata: p.wikidata
    });

    const body = [
      fm,
      `# ${p.name}`,
      '',
      p.summary || '',
      '',
      `## Sites`,
      ...(linkedSites.length
        ? linkedSites.map(f => `- ${link(f.properties.name)}`)
        : ['- _(no sites yet)_']),
      '',
      `## Themes`,
      ...[...linkedThemes].map(t => `- ${link(themeLabelBySlug[t] || t)}`),
      '',
      `## Eras`,
      ...[...linkedEras].map(e => `- ${link(eraLabelBySlug[e] || e)}`),
      ''
    ].join('\n');

    await writeMd(`People/${sanitize(p.name)}.md`, body);
    counts.people++;
  }

  // --- Sites ---
  for (const f of sites.features) {
    const p = f.properties;
    const [lon, lat] = f.geometry?.coordinates || [];
    const hero = (p.media || []).find(m => m.type === 'image');

    const fm = yaml({
      kind: 'site',
      slug: p.slug,
      id: p.id,
      kind_of: p.kind,
      borough: p.borough,
      era: p.period?.era,
      period_start: p.period?.start_year,
      period_end: p.period?.end_year,
      status: p.status,
      license: p.license,
      verified_confidence: p.verification?.confidence,
      lat,
      lon,
      address: p.address
    });

    const body = [
      fm,
      `# ${p.name}`,
      '',
      p.summary ? `> ${p.summary}` : '',
      '',
      p.description_md || '',
      '',
      `## People`,
      ...(p.people || []).map(s => `- ${link(personNameBySlug[s] || s)}`),
      '',
      `## Themes`,
      ...(p.themes || []).map(t => `- ${link(themeLabelBySlug[t] || t)}`),
      '',
      `## Place`,
      p.borough ? `- ${link(p.borough)}` : '',
      p.period?.era ? `- ${link(eraLabelBySlug[p.period.era] || p.period.era)}` : '',
      '',
      hero ? `## Hero image\n\n- File: \`${hero.src}\`\n- Credit: ${hero.credit || '—'}\n- License: ${hero.license || '—'}\n- Source: ${hero.source_url || '—'}\n` : '',
      (p.sources || []).length
        ? '## Sources\n\n' + p.sources.map(s => `- ${s.citation}${s.url ? ` — <${s.url}>` : ''}`).join('\n') + '\n'
        : ''
    ].filter(Boolean).join('\n');

    await writeMd(`Sites/${sanitize(p.name)}.md`, body);
    counts.sites++;
  }

  // --- Themes ---
  for (const t of themesCfg.themes) {
    const fm = yaml({ kind: 'theme', slug: t.slug });
    const body = [
      fm,
      `# ${t.label}`,
      '',
      '_Backlinks below show every site, person and walk tagged with this theme._',
      ''
    ].join('\n');
    await writeMd(`Themes/${sanitize(t.label)}.md`, body);
    counts.themes++;
  }

  // --- Eras ---
  for (const e of themesCfg.eras) {
    const fm = yaml({ kind: 'era', slug: e.slug, start_year: e.start, end_year: e.end });
    const body = [
      fm,
      `# ${e.label}`,
      '',
      `Roughly ${e.start}–${e.end}.`,
      ''
    ].join('\n');
    await writeMd(`Eras/${sanitize(e.label)}.md`, body);
    counts.eras++;
  }

  // --- Boroughs ---
  for (const b of themesCfg.boroughs) {
    const fm = yaml({ kind: 'borough', name: b });
    const body = [fm, `# ${b}`, '', '_Backlinks show every site, event and restaurant in this borough._', ''].join('\n');
    await writeMd(`Boroughs/${sanitize(b)}.md`, body);
    counts.boroughs++;
  }

  // --- Cuisines ---
  for (const c of themesCfg.cuisines) {
    const fm = yaml({ kind: 'cuisine', slug: c.slug });
    const body = [fm, `# ${c.label}`, '', '_Backlinks show every restaurant in this cuisine._', ''].join('\n');
    await writeMd(`Cuisines/${sanitize(c.label)}.md`, body);
    counts.cuisines++;
  }

  // --- Walks ---
  for (const f of walks.features) {
    const w = f.properties;
    const fm = yaml({
      kind: 'walk',
      slug: w.slug,
      id: w.id,
      distance_m: w.distance_m,
      duration_min: w.duration_min,
      status: w.status,
      stops: (w.stops || []).length
    });
    const body = [
      fm,
      `# ${w.title}`,
      '',
      w.subtitle ? `> ${w.subtitle}` : '',
      '',
      w.summary || '',
      '',
      w.description_md || '',
      '',
      '## Stops (in order)',
      ...(w.stops || []).map(s => `${s.order}. ${link(siteNameBySlug[s.site_slug] || s.site_slug)}`),
      '',
      '## Themes',
      ...(w.themes || []).map(t => `- ${link(themeLabelBySlug[t] || t)}`),
      ''
    ].join('\n');
    await writeMd(`Walks/${sanitize(w.title)}.md`, body);
    counts.walks++;
  }

  // --- Events ---
  for (const f of events.features) {
    const e = f.properties;
    const fm = yaml({
      kind: 'event',
      id: e.id,
      borough: e.borough,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      price: e.price,
      url: e.url
    });
    const related = (e.related_sites || []).map(sid => siteNameById[sid]).filter(Boolean);
    const body = [
      fm,
      `# ${e.name}`,
      '',
      e.summary ? `> ${e.summary}` : '',
      '',
      e.description_md || '',
      '',
      e.venue_name ? `## Venue\n\n- ${e.venue_name}${e.address ? `, ${e.address}` : ''}\n` : '',
      e.borough ? `## Borough\n\n- ${link(e.borough)}\n` : '',
      related.length ? `## Related sites\n\n${related.map(n => `- ${link(n)}`).join('\n')}\n` : '',
      (e.themes || []).length ? `## Themes\n\n${(e.themes || []).map(t => `- ${link(themeLabelBySlug[t] || t)}`).join('\n')}\n` : ''
    ].filter(Boolean).join('\n');
    await writeMd(`Events/${sanitize(e.name)}.md`, body);
    counts.events++;
  }

  // --- Restaurants ---
  for (const f of restaurants.features) {
    const r = f.properties;
    const fm = yaml({
      kind: 'restaurant',
      id: r.id,
      borough: r.borough,
      price_band: r.price_band,
      website: r.website
    });
    const body = [
      fm,
      `# ${r.name}`,
      '',
      r.blurb ? `> ${r.blurb}` : '',
      '',
      r.address ? `**Address:** ${r.address}\n` : '',
      r.borough ? `## Borough\n\n- ${link(r.borough)}\n` : '',
      (r.cuisine || []).length ? `## Cuisine\n\n${(r.cuisine || []).map(c => `- ${link(cuisineLabelBySlug[c] || c)}`).join('\n')}\n` : ''
    ].filter(Boolean).join('\n');
    await writeMd(`Restaurants/${sanitize(r.name)}.md`, body);
    counts.restaurants++;
  }

  // --- Maps of Content (MOCs) ---
  await writeMd('People/_All People.md', mocBody('All People', Object.values(people).map(p => p.name)));
  await writeMd('Sites/_All Sites.md', mocBody('All Sites', sites.features.map(f => f.properties.name)));
  await writeMd('Walks/_All Walks.md', mocBody('All Walks', walks.features.map(f => f.properties.title)));
  await writeMd('Events/_All Events.md', mocBody('All Events', events.features.map(f => f.properties.name)));
  await writeMd('Restaurants/_All Restaurants.md', mocBody('All Restaurants', restaurants.features.map(f => f.properties.name)));

  // --- Vault README ---
  const today = new Date().toISOString().slice(0, 10);
  const readme = [
    '# Black London — knowledge graph',
    '',
    `Generated **${today}** from \`public/data/\`. Treat this folder as a derived artifact — do not hand-edit; re-run \`npm run build:obsidian\` after the underlying data changes.`,
    '',
    '## How to open',
    '',
    '1. Install [Obsidian](https://obsidian.md).',
    '2. *Open folder as vault* → select this folder (`docs/obsidian-vault`).',
    '3. Open the *Graph view* (sidebar icon) to see the lattice of people, sites, themes, eras, walks, events and restaurants.',
    '',
    '## What\'s in here',
    '',
    `- **${counts.people} People** — each linked to the sites, themes and eras they appear in.`,
    `- **${counts.sites} Sites** — with frontmatter facts (coords, borough, era, status, license) and body wikilinks.`,
    `- **${counts.themes} Themes** — backlink hubs.`,
    `- **${counts.eras} Eras** — backlink hubs.`,
    `- **${counts.boroughs} Boroughs** — backlink hubs for sites, events and restaurants.`,
    `- **${counts.walks} Walks** — ordered list of stops as wikilinks to their sites.`,
    `- **${counts.events} Events**, **${counts.restaurants} Restaurants**, **${counts.cuisines} Cuisines**.`,
    '',
    '## Tips for the graph view',
    '',
    '- Filter by tag `#kind/site` etc. to declutter (use Obsidian\'s tag/property filters).',
    '- Use *Local graph* on a single node (e.g. a person) to see only the immediate neighbourhood.',
    '- Switch on *Existing files only* to hide dangling links.',
    '',
    '## Notes',
    '',
    '- Image files are not yet copied into the vault; sites with hero portraits list the source path and full attribution under "Hero image" rather than embedding.',
    '- 6 of the City of London sites are still `status: draft` pending C. Ilube verification.',
    '- The single walk (`City of London — Black History`) is also `status: draft`.'
  ].join('\n');
  await writeMd('README.md', readme);

  // --- index.md — landing page for Quartz (and any markdown viewer that
  //     expects an index file). The graph appears at the top of every page
  //     (via Quartz layout), so this body is the *information beneath* the
  //     graph: a short orientation, then deep-links into the dataset.
  const index = [
    yaml({ title: 'Black London — knowledge graph' }),
    '',
    'The graph above is **every site, person, theme, era and walk** in the Black London dataset, with a line drawn between anything that connects. Hover over a node to see its name and neighbours; click to read its full note here — the graph stays in place.',
    '',
    '> *A different view of the [main map at black-london.vercel.app](https://black-london.vercel.app/) — useful for seeing the shape, who connects to whom, and where coverage is thin.*',
    '',
    '## Start exploring',
    '',
    `- [[_All Sites|${counts.sites} sites]] across London — coordinates, sources, hero image, draft status.`,
    `- [[_All People|${counts.people} people]] — central figures; each links to every site that touches their life.`,
    `- [[_All Walks|${counts.walks} curated walk]] — an ordered route of stops, with directions per stop.`,
    `- [[_All Events|${counts.events} events]] · [[_All Restaurants|${counts.restaurants} restaurants]] · ${counts.themes} themes · ${counts.eras} eras · ${counts.boroughs} boroughs.`,
    '',
    '## About',
    '',
    `Generated **${today}** from [Ilube-C/black-london](https://github.com/Ilube-C/black-london) (private). The vault is a derived artifact, regenerated by \`npm run build:obsidian\`. Six City of London sites are flagged *Draft · unverified* in the main app — sources are cited but not yet ground-truthed.`,
    '',
    `→ [Back to the main app](https://black-london.vercel.app/)`
  ].join('\n');
  await writeMd('index.md', index);

  console.log('Vault written to', path.relative(root, vault));
  console.log('Counts:', counts);
}

function mocBody(title, names) {
  return [
    yaml({ kind: 'index', title }),
    `# ${title}`,
    '',
    ...names.map(n => `- ${link(n)}`),
    ''
  ].join('\n');
}

main().catch(e => { console.error(e); process.exit(1); });
