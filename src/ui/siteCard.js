// Renders a Site / Event / Restaurant feature into the sheet body as HTML.
// Vanilla template strings; HTML is escaped via a small markdown renderer or
// direct text-content insertion for free-form fields.

import { renderMarkdown } from './markdown.js';
import { formatDistance } from '../data/nearby.js';

const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

export function renderSiteCard(site, { related, people = {} }) {
  const hero = (site.media || []).find(m => m.type === 'image');
  const period = site.period
    ? (site.period.start_year && site.period.end_year
        ? `${site.period.start_year}–${site.period.end_year}`
        : (site.period.start_year ? `${site.period.start_year}–` : ''))
    : '';

  const peopleNames = (site.people || []).map(slug => people[slug]?.name || slug).filter(Boolean);
  const isDraft = site.status === 'draft' || site.verification?.confidence === 'low';

  return `
    <article class="site-card">
      <div class="site-card__hero">
        ${hero
          ? `<img src="${escape(hero.thumb || hero.src)}" alt="${escape(hero.alt || site.name)}" loading="lazy" />${renderHeroCredit(hero)}`
          : `<div class="site-card__hero-empty">${escape(site.name)}</div>`}
      </div>
      <div class="site-card__kicker">
        ${escape(kindLabel(site.kind))} · ${escape(site.borough || '')}
        ${isDraft ? `<span class="site-card__draft-pill" title="This entry is a working draft awaiting editorial verification.">Draft · unverified</span>` : ''}
      </div>
      <h2 class="site-card__title">${escape(site.name)}</h2>
      ${isDraft ? `<p class="site-card__draft-note">Sources cited; awaiting C. Ilube verification.</p>` : ''}
      <p class="site-card__summary">${escape(site.summary || '')}</p>
      <dl class="site-card__facts">
        ${period ? `<dt>Period</dt><dd>${escape(period)}</dd>` : ''}
        ${peopleNames.length ? `<dt>People</dt><dd>${peopleNames.map(escape).join(', ')}</dd>` : ''}
        ${site.address ? `<dt>Address</dt><dd>${escape(site.address)}</dd>` : ''}
        ${site.accessibility?.notes ? `<dt>Access</dt><dd>${escape(site.accessibility.notes)}</dd>` : ''}
      </dl>
      <div class="site-card__body">${renderMarkdown(site.description_md || '')}</div>
      ${renderMediaGrid(site.media)}
      ${renderSources(site.sources)}
      ${renderRelated(related)}
      <p class="site-card__credit">
        Contributed by ${escape(site.contributor?.name || 'Unknown')}${site.contributor?.affiliation ? ' (' + escape(site.contributor.affiliation) + ')' : ''}
        ${site.verification?.verified_at ? ' · last verified ' + escape(site.verification.verified_at) : ''}
        ${site.license ? ' · ' + escape(site.license) : ''}
      </p>
    </article>
  `;
}

export function renderEventCard(ev) {
  const start = ev.starts_at ? new Date(ev.starts_at) : null;
  const dateStr = start ? start.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
  return `
    <article class="site-card">
      <div class="site-card__kicker">Event · ${escape(ev.borough || ev.venue_name || '')}</div>
      <h2 class="site-card__title">${escape(ev.name)}</h2>
      <p class="site-card__summary">${escape(ev.summary || '')}</p>
      <dl class="site-card__facts">
        ${dateStr ? `<dt>When</dt><dd>${escape(dateStr)}</dd>` : ''}
        ${ev.venue_name ? `<dt>Venue</dt><dd>${escape(ev.venue_name)}</dd>` : ''}
        ${ev.address ? `<dt>Address</dt><dd>${escape(ev.address)}</dd>` : ''}
        ${ev.price ? `<dt>Price</dt><dd>${escape(ev.price)}</dd>` : ''}
        ${ev.url ? `<dt>Link</dt><dd><a href="${escape(ev.url)}" target="_blank" rel="noopener noreferrer">${escape(ev.url)}</a></dd>` : ''}
      </dl>
    </article>
  `;
}

export function renderRestaurantCard(r) {
  return `
    <article class="site-card">
      <div class="site-card__kicker">Restaurant · ${escape(r.borough || '')}</div>
      <h2 class="site-card__title">${escape(r.name)}</h2>
      <p class="site-card__summary">${escape(r.blurb || '')}</p>
      <dl class="site-card__facts">
        ${r.cuisine?.length ? `<dt>Cuisine</dt><dd>${r.cuisine.map(escape).join(', ')}</dd>` : ''}
        ${r.address ? `<dt>Address</dt><dd>${escape(r.address)}</dd>` : ''}
        ${r.opening_hours ? `<dt>Hours</dt><dd>${escape(r.opening_hours)}</dd>` : ''}
        ${r.price_band ? `<dt>Price</dt><dd>${escape(r.price_band)}</dd>` : ''}
        ${r.website ? `<dt>Web</dt><dd><a href="${escape(r.website)}" target="_blank" rel="noopener noreferrer">${escape(r.website)}</a></dd>` : ''}
      </dl>
    </article>
  `;
}

function kindLabel(kind) {
  return ({
    plaque: 'Plaque',
    building: 'Building',
    area: 'Area',
    memorial: 'Memorial',
    burial: 'Burial',
    institution: 'Institution',
    event_site: 'Event site'
  }[kind]) || 'Site';
}

function renderHeroCredit(hero) {
  if (!hero || !hero.credit) return '';
  const credit = hero.source_url
    ? `<a href="${escape(hero.source_url)}" target="_blank" rel="noopener noreferrer">${escape(hero.credit)}</a>`
    : escape(hero.credit);
  const license = hero.license ? ` · ${escape(hero.license)}` : '';
  return `<div class="site-card__hero-credit">${credit}${license}</div>`;
}

function renderMediaGrid(media) {
  if (!media || !media.length) return '';
  const items = media.slice(1).map(m => {
    if (m.type === 'image') {
      return `<figure><img src="${escape(m.thumb || m.src)}" alt="${escape(m.alt || '')}" loading="lazy" /><figcaption>${escape(m.credit || '')}</figcaption></figure>`;
    }
    if (m.type === 'audio') {
      return `<figure><audio controls preload="none" src="${escape(m.src)}"></audio><figcaption>${escape(m.credit || '')}</figcaption></figure>`;
    }
    return '';
  }).filter(Boolean);
  return items.length ? `<div class="site-card__media-grid">${items.join('')}</div>` : '';
}

function renderSources(sources) {
  if (!sources || !sources.length) return '';
  return `<aside class="site-card__sources" aria-label="Sources">
    <h3>Sources</h3>
    <ul>${sources.map(s => `<li>${escape(s.citation)}${s.url ? ' — <a href="' + escape(s.url) + '" target="_blank" rel="noopener noreferrer">link</a>' : ''}</li>`).join('')}</ul>
  </aside>`;
}

function renderRelated({ events = [], restaurants = [] } = {}) {
  if (!events.length && !restaurants.length) return '';
  const evHtml = events.length ? `
    <div class="related">
      <h3>Upcoming nearby events</h3>
      <ul class="related__list">
        ${events.slice(0, 5).map(ev => relatedItem(ev, 'event', evMeta(ev))).join('')}
      </ul>
    </div>` : '';
  const rHtml = restaurants.length ? `
    <div class="related">
      <h3>Black-history-relevant nearby</h3>
      <ul class="related__list">
        ${restaurants.slice(0, 5).map(r => relatedItem(r, 'restaurant', (r.cuisine || []).join(', '))).join('')}
      </ul>
    </div>` : '';
  return evHtml + rHtml;
}

function relatedItem(item, kind, meta) {
  return `
    <li class="related__item" data-kind="${escape(kind)}" data-id="${escape(item.id)}">
      <div>
        <div class="related__item-name">${escape(item.name)}</div>
        <div class="related__item-meta">${escape(meta || '')}</div>
      </div>
      <div class="related__item-distance">${formatDistance(item._distance)}</div>
    </li>
  `;
}

function evMeta(ev) {
  if (!ev.starts_at) return ev.venue_name || '';
  const d = new Date(ev.starts_at);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' · ' + (ev.venue_name || '');
}
