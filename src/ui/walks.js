// Renders the Walks list, a single Walk overview, and the current-stop card
// shown while a walk is in progress. Pure HTML strings; events are wired in
// main.js via delegated listeners on the sheet body.

import { renderMarkdown } from './markdown.js';

const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

export function renderWalksList(walks) {
  if (!walks || !walks.length) {
    return `
      <article class="site-card">
        <div class="site-card__kicker">Walks</div>
        <h2 class="site-card__title">No walks yet</h2>
        <p class="site-card__summary">Curated walks are coming soon.</p>
      </article>
    `;
  }
  return `
    <article class="site-card">
      <div class="site-card__kicker">Curated walks</div>
      <h2 class="site-card__title">Walk Black London</h2>
      <p class="site-card__summary">Themed, walkable routes through London's Black history.</p>
      <ul class="walks-list">
        ${walks.map(w => `
          <li class="walks-list__item" data-walk-slug="${escape(w.slug)}">
            <div class="walks-list__head">
              <h3 class="walks-list__title">${escape(w.title)}</h3>
              ${w.subtitle ? `<p class="walks-list__subtitle">${escape(w.subtitle)}</p>` : ''}
            </div>
            <div class="walks-list__meta">
              <span>${(w.stops || []).length} stops</span>
              ${w.duration_min ? `<span>${escape(w.duration_min)} min</span>` : ''}
              ${w.distance_m ? `<span>${escape(formatDistance(w.distance_m))}</span>` : ''}
            </div>
          </li>
        `).join('')}
      </ul>
    </article>
  `;
}

export function renderWalkOverview(walk, sitesBySlug) {
  const stops = walk.stops || [];
  return `
    <article class="site-card walk-overview">
      <div class="site-card__kicker">Walk · ${(stops.length)} stops · ${escape(formatDistance(walk.distance_m))} · ${escape(walk.duration_min)} min</div>
      <h2 class="site-card__title">${escape(walk.title)}</h2>
      ${walk.subtitle ? `<p class="site-card__summary">${escape(walk.subtitle)}</p>` : ''}
      <div class="site-card__body">${renderMarkdown(walk.summary || '')}</div>
      ${walk.description_md ? `<div class="site-card__body">${renderMarkdown(walk.description_md)}</div>` : ''}
      <div class="walk-overview__actions">
        <button type="button" class="btn" data-action="walk-start" data-walk-slug="${escape(walk.slug)}">Start walk →</button>
        <button type="button" class="btn btn--ghost" data-action="walk-back">Back to walks</button>
      </div>
      ${walk.start?.name ? `<dl class="site-card__facts">
        <dt>Start</dt><dd>${escape(walk.start.name)}${walk.start.address ? ` — ${escape(walk.start.address)}` : ''}</dd>
        ${walk.end?.name ? `<dt>End</dt><dd>${escape(walk.end.name)}${walk.end.address ? ` — ${escape(walk.end.address)}` : ''}</dd>` : ''}
      </dl>` : ''}
      <h3 class="walk-overview__stops-heading">Stops</h3>
      <ol class="walk-stops">
        ${stops.map(s => {
          const site = sitesBySlug[s.site_slug];
          const name = site?.name || s.site_slug;
          const borough = site?.borough || '';
          return `
            <li class="walk-stops__item" data-walk-slug="${escape(walk.slug)}" data-stop-order="${escape(s.order)}">
              <span class="walk-stops__num">${escape(s.order)}</span>
              <div>
                <div class="walk-stops__name">${escape(name)}</div>
                ${borough ? `<div class="walk-stops__meta">${escape(borough)}</div>` : ''}
              </div>
            </li>
          `;
        }).join('')}
      </ol>
    </article>
  `;
}

export function renderWalkStop({ walk, stopIdx, site, sitesBySlug }) {
  const stops = walk.stops || [];
  const stop = stops[stopIdx];
  const total = stops.length;
  const isFirst = stopIdx === 0;
  const isLast  = stopIdx === total - 1;
  const next = !isLast ? stops[stopIdx + 1] : null;
  const nextSite = next ? sitesBySlug[next.site_slug] : null;
  return `
    <article class="site-card walk-stop-card">
      <div class="walk-stop-card__progress" aria-label="Walk progress">
        ${stops.map((s, i) => `
          <span class="walk-stop-card__dot${i === stopIdx ? ' is-active' : ''}${i < stopIdx ? ' is-done' : ''}" data-walk-slug="${escape(walk.slug)}" data-stop-order="${escape(s.order)}" title="Stop ${escape(s.order)}"></span>
        `).join('')}
      </div>
      <div class="site-card__kicker">${escape(walk.title)} · Stop ${stopIdx + 1} of ${total}</div>
      <h2 class="site-card__title">${escape(site?.name || stop.site_slug)}</h2>
      ${site?.summary ? `<p class="site-card__summary">${escape(site.summary)}</p>` : ''}
      ${stop.stop_note_md ? `<div class="walk-stop-card__note">${renderMarkdown(stop.stop_note_md)}</div>` : ''}
      <div class="walk-stop-card__actions">
        <button type="button" class="btn btn--ghost" data-action="walk-prev" ${isFirst ? 'disabled' : ''}>← Previous</button>
        ${isLast
          ? `<button type="button" class="btn" data-action="walk-finish">Finish walk ✓</button>`
          : `<button type="button" class="btn" data-action="walk-next">Next → ${nextSite ? escape(nextSite.name) : ''}</button>`}
      </div>
      <button type="button" class="btn btn--ghost walk-stop-card__exit" data-action="walk-exit">Exit walk</button>
      ${site?.description_md ? `<details class="walk-stop-card__more">
        <summary>More about this stop</summary>
        <div class="site-card__body">${renderMarkdown(site.description_md)}</div>
      </details>` : ''}
    </article>
  `;
}

function formatDistance(m) {
  if (m == null || !isFinite(m)) return '';
  if (m < 1000) return `${Math.round(m / 50) * 50} m`;
  return `${(m / 1000).toFixed(1)} km`;
}
