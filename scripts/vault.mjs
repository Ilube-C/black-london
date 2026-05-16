#!/usr/bin/env node
// CLI explorer for the Obsidian vault under docs/obsidian-vault/.
// No deps. Renders an entity's frontmatter, outgoing wikilinks, and backlinks
// in plain coloured terminal output — the textual equivalent of Obsidian's
// local-graph + backlinks pane.
//
//   npm run vault -- "Olaudah Equiano"
//   npm run vault -- abolition
//   npm run vault -- --list people
//   npm run vault -- --list           (lists all kinds)
//
// Match strategy: case-insensitive exact, then prefix, then substring.

import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const vault = path.join(root, 'docs/obsidian-vault');

const COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const c = {
  reset: COLOR ? '\x1b[0m' : '',
  dim:   COLOR ? '\x1b[2m' : '',
  bold:  COLOR ? '\x1b[1m' : '',
  gold:  COLOR ? '\x1b[38;5;179m' : '',
  blue:  COLOR ? '\x1b[38;5;110m' : '',
  green: COLOR ? '\x1b[38;5;108m' : '',
  red:   COLOR ? '\x1b[38;5;174m' : '',
  ul:    COLOR ? '\x1b[4m' : ''
};

async function walkVault() {
  const out = [];
  async function rec(dir) {
    let entries;
    try { entries = await readdir(dir); } catch { return; }
    for (const name of entries) {
      const p = path.join(dir, name);
      const s = await stat(p);
      if (s.isDirectory()) await rec(p);
      else if (name.endsWith('.md')) out.push(p);
    }
  }
  await rec(vault);
  return out;
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { fm: {}, body: text };
  const fm = {};
  let key = null;
  for (const line of m[1].split('\n')) {
    if (/^\s*-\s/.test(line) && key) {
      fm[key].push(line.replace(/^\s*-\s*/, '').replace(/^["']|["']$/g, ''));
    } else {
      const km = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (!km) continue;
      key = km[1];
      const v = km[2];
      if (v === '') { fm[key] = []; }
      else fm[key] = stripQuotes(v);
    }
  }
  return { fm, body: m[2] };
}

function stripQuotes(s) {
  if (s.startsWith('"') && s.endsWith('"')) {
    try { return JSON.parse(s); } catch { return s.slice(1, -1); }
  }
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  return s;
}

function extractWikilinks(body) {
  const out = [];
  const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let m;
  while ((m = re.exec(body)) !== null) out.push(m[1].trim());
  return out;
}

function nameOf(filePath) {
  return path.basename(filePath, '.md');
}

const KIND_ORDER = ['person', 'site', 'walk', 'event', 'restaurant', 'theme', 'era', 'borough', 'cuisine', 'index'];

const KIND_COLORS = {
  person: c.gold,
  site: c.blue,
  walk: c.green,
  event: c.green,
  restaurant: c.red,
  theme: c.dim,
  era: c.dim,
  borough: c.dim,
  cuisine: c.dim,
  index: c.dim
};

function kindLabel(k) { return (KIND_COLORS[k] || '') + (k || '?') + c.reset; }

async function loadIndex() {
  const files = await walkVault();
  if (!files.length) {
    console.error(`${c.red}No vault found at ${path.relative(root, vault)}${c.reset}`);
    console.error(`Run ${c.bold}npm run build:obsidian${c.reset} to generate it.`);
    process.exit(1);
  }
  const entries = [];
  for (const fp of files) {
    const text = await readFile(fp, 'utf8');
    const { fm, body } = parseFrontmatter(text);
    entries.push({
      name: nameOf(fp),
      path: fp,
      relPath: path.relative(root, fp),
      kind: fm.kind || 'unknown',
      fm,
      body,
      outLinks: extractWikilinks(body)
    });
  }
  // backlinks map: name -> list of {name, kind}
  const byName = new Map(entries.map(e => [e.name.toLowerCase(), e]));
  const backlinks = new Map();
  for (const e of entries) backlinks.set(e.name, []);
  for (const e of entries) {
    const seen = new Set();
    for (const link of e.outLinks) {
      if (seen.has(link)) continue;
      seen.add(link);
      if (!backlinks.has(link)) backlinks.set(link, []);
      backlinks.get(link).push(e);
    }
  }
  return { entries, byName, backlinks };
}

function findMatches(query, entries) {
  const q = query.toLowerCase().trim();
  const exact = entries.filter(e => e.name.toLowerCase() === q);
  if (exact.length) return exact;
  // strip leading underscore for MOC notes
  const prefix = entries.filter(e => e.name.toLowerCase().startsWith(q));
  if (prefix.length) return prefix;
  return entries.filter(e =>
    e.name.toLowerCase().includes(q) ||
    (e.fm.slug && String(e.fm.slug).toLowerCase().includes(q))
  );
}

function printEntity(e, idx) {
  const { name, kind, fm } = e;
  const sep = '─'.repeat(Math.min(80, name.length + 8));
  console.log(`\n${c.bold}─── ${name} ${c.dim}(${kindLabel(kind)})${c.reset}${c.bold} ${sep.slice(name.length + kind.length + 8)}${c.reset}`);

  // Frontmatter facts
  const facts = formatFacts(fm);
  if (facts.length) {
    console.log('');
    for (const [k, v] of facts) {
      console.log(`  ${c.dim}${k.padEnd(12)}${c.reset} ${v}`);
    }
  }

  // First paragraph of body (after title heading)
  const firstPara = pickFirstParagraph(e.body);
  if (firstPara) {
    console.log('');
    console.log('  ' + wrap(firstPara, 76).split('\n').join('\n  '));
  }

  // Outgoing links (grouped by linked entity's kind)
  if (e.outLinks.length && idx) {
    const seen = new Set();
    const grouped = {};
    for (const link of e.outLinks) {
      if (seen.has(link)) continue;
      seen.add(link);
      const target = idx.byName.get(link.toLowerCase());
      const tk = target ? target.kind : 'unresolved';
      (grouped[tk] = grouped[tk] || []).push({ name: link, resolved: !!target });
    }
    const total = Object.values(grouped).reduce((n, a) => n + a.length, 0);
    console.log(`\n  ${c.bold}Links out (${total})${c.reset}`);
    for (const k of [...KIND_ORDER, 'unresolved']) {
      const arr = grouped[k];
      if (!arr || !arr.length) continue;
      console.log(`    ${c.dim}→${c.reset} ${kindLabel(k)}`);
      for (const item of arr) {
        const mark = item.resolved ? `${c.ul}${item.name}${c.reset}` : `${c.dim}${item.name} (no note)${c.reset}`;
        console.log(`        ${mark}`);
      }
    }
  }

  // Backlinks
  if (idx) {
    const back = idx.backlinks.get(name) || [];
    if (back.length) {
      const grouped = {};
      for (const b of back) (grouped[b.kind] = grouped[b.kind] || []).push(b);
      console.log(`\n  ${c.bold}Backlinks (${back.length})${c.reset}`);
      for (const k of KIND_ORDER) {
        const arr = grouped[k];
        if (!arr || !arr.length) continue;
        console.log(`    ${c.dim}←${c.reset} ${kindLabel(k)}`);
        for (const b of arr) console.log(`        ${b.name}`);
      }
    } else {
      console.log(`\n  ${c.dim}(no backlinks)${c.reset}`);
    }
  }

  console.log('');
}

function formatFacts(fm) {
  const skip = new Set(['kind']);
  const out = [];
  for (const [k, v] of Object.entries(fm)) {
    if (skip.has(k)) continue;
    if (Array.isArray(v)) {
      if (!v.length) continue;
      out.push([k, v.join(', ')]);
    } else if (v !== '' && v != null) {
      out.push([k, String(v)]);
    }
  }
  return out;
}

function pickFirstParagraph(body) {
  // Skip a leading H1 then take the first non-empty paragraph.
  const lines = body.split('\n');
  let i = 0;
  while (i < lines.length && /^\s*(#|$)/.test(lines[i])) i++;
  const para = [];
  while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('##')) {
    para.push(lines[i]);
    i++;
  }
  return para.join(' ').replace(/^>\s*/, '').replace(/\s+/g, ' ').trim().slice(0, 600);
}

function wrap(s, width) {
  const words = s.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > width) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.join('\n');
}

async function cmdList(kindArg, idx) {
  const all = idx.entries.filter(e => !e.name.startsWith('_'));
  if (kindArg) {
    const k = kindArg.replace(/s$/, '').toLowerCase();
    const filtered = all.filter(e => e.kind === k).map(e => e.name).sort();
    if (!filtered.length) {
      console.log(`${c.dim}No entities with kind=${k}${c.reset}`);
      return;
    }
    console.log(`${c.bold}${filtered.length} ${k}${filtered.length === 1 ? '' : 's'}:${c.reset}`);
    for (const n of filtered) console.log(`  ${n}`);
  } else {
    const counts = {};
    for (const e of all) counts[e.kind] = (counts[e.kind] || 0) + 1;
    console.log(`${c.bold}Vault contents:${c.reset}`);
    for (const k of KIND_ORDER) {
      if (counts[k]) console.log(`  ${kindLabel(k).padEnd(30)} ${counts[k]}`);
    }
    console.log(`\nUse: ${c.bold}npm run vault -- --list <kind>${c.reset} to list a single kind.`);
    console.log(`Use: ${c.bold}npm run vault -- "Name"${c.reset} to inspect a single entity.`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.log(`Usage:
  npm run vault -- "Name"           inspect an entity
  npm run vault -- --list           summarise vault by kind
  npm run vault -- --list people    list all of one kind
  npm run vault -- abolition        partial / case-insensitive match works`);
    return;
  }

  const idx = await loadIndex();

  if (args[0] === '--list') {
    return cmdList(args[1], idx);
  }

  const query = args.join(' ');
  const matches = findMatches(query, idx.entries.filter(e => !e.name.startsWith('_')));

  if (!matches.length) {
    console.error(`${c.red}No match for "${query}".${c.reset}  Try: npm run vault -- --list`);
    process.exit(1);
  }
  if (matches.length === 1) {
    printEntity(matches[0], idx);
    return;
  }
  if (matches.length > 8) {
    console.log(`${c.dim}${matches.length} matches — showing first 8. Refine the query.${c.reset}`);
  }
  console.log(`${c.bold}Multiple matches:${c.reset}`);
  for (const e of matches.slice(0, 8)) console.log(`  ${e.name.padEnd(48)} ${c.dim}${kindLabel(e.kind)}${c.reset}`);
  console.log(`\nRun ${c.bold}npm run vault -- "<full name>"${c.reset} to inspect one.`);
}

main().catch(e => { console.error(e); process.exit(1); });
