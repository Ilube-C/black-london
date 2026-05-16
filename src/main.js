import './styles/tokens.css';
import './styles/base.css';
import './styles/map.css';
import './styles/sheet.css';
import './styles/filters.css';
import './styles/walks.css';

import { createMap } from './map/map.js';
import { loadData } from './data/load.js';
import { applyFilters } from './data/filter.js';
import { relatedToSite, relatedToPoint } from './data/nearby.js';
import { getOnce, isAvailable, USE_TEST_LOCATION, TEST_LOCATION } from './geo/location.js';

import { createSheet } from './ui/sheet.js';
import {
  renderSiteCard,
  renderEventCard,
  renderRestaurantCard
} from './ui/siteCard.js';
import { renderWalksList, renderWalkOverview, renderWalkStop } from './ui/walks.js';
import { setupFilters } from './ui/filters.js';
import { setupLayerToggle, setLocateActive } from './ui/layerToggle.js';
import { parseHash, setRoute, onRoute } from './ui/routes.js';
import { showToast } from './ui/toast.js';
import { registerPwa } from './pwa/register.js';

const state = {
  data: null,
  selected: null,         // { kind, id }
  layers: { sites: true, events: false, restaurants: false },
  filters: { boroughs: [], themes: [], eras: [], stepFreeOnly: false, query: '' },
  location: null,         // { lon, lat }
  walk: { active: null, stopIdx: 0, mode: null }, // mode: null | 'overview' | 'inProgress'
  mapApi: null,
  sitesBySlug: {}
};

async function bootstrap() {
  const mapApi = createMap('map', {
    onSelectFeature: handleMapClick,
    onWalkStopClick: ({ order }) => goToWalkStop(order - 1)
  });
  state.mapApi = mapApi;

  // Load data in parallel with map style
  const data = await loadData();
  state.data = data;
  state.sitesBySlug = Object.fromEntries(data.siteList.map(s => [s.slug, s]));

  await mapApi.ready();

  const sheet = createSheet(document.getElementById('sheet'));
  state.sheet = sheet;

  // Filters
  const filtersApi = setupFilters({
    themes: data.themes,
    sites: data.siteList,
    onChange: (next) => {
      state.filters = next;
      applyFiltersToMap();
    }
  });
  state.filtersApi = filtersApi;

  document.getElementById('searchInput').addEventListener('input', (e) => {
    state.filters.query = e.target.value;
    applyFiltersToMap();
  });

  // Layer toggle
  setupLayerToggle({
    onToggle: (layer, on) => {
      state.layers[layer] = on;
      mapApi.setLayerVisible(layer, on);
    },
    onLocate: handleLocateClick
  });

  // Sheet click delegation: related items, walks list, walk stops, walk actions
  sheet.getBody().addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]');
    if (action) {
      const act = action.dataset.action;
      const slug = action.dataset.walkSlug;
      if (act === 'walk-start')  { startWalk(slug); return; }
      if (act === 'walk-back')   { openWalksList(); return; }
      if (act === 'walk-next')   { goToWalkStop(state.walk.stopIdx + 1); return; }
      if (act === 'walk-prev')   { goToWalkStop(state.walk.stopIdx - 1); return; }
      if (act === 'walk-finish' || act === 'walk-exit') { exitWalk(); return; }
    }
    const walkCard = e.target.closest('.walks-list__item');
    if (walkCard) { openWalkOverview(walkCard.dataset.walkSlug); return; }
    const stopRow = e.target.closest('.walk-stops__item');
    if (stopRow) { startWalk(stopRow.dataset.walkSlug, Number(stopRow.dataset.stopOrder) - 1); return; }
    const dot = e.target.closest('.walk-stop-card__dot');
    if (dot) { goToWalkStop(Number(dot.dataset.stopOrder) - 1); return; }
    const item = e.target.closest('.related__item');
    if (!item) return;
    const kind = item.dataset.kind;
    const id = item.dataset.id;
    selectById(kind, id, { fly: true });
  });

  // Walks button — opens the walks list
  const walksBtn = document.getElementById('walksBtn');
  if (walksBtn) walksBtn.addEventListener('click', () => openWalksList());

  // Close button on the sheet
  const sheetClose = document.getElementById('sheetClose');
  if (sheetClose) {
    sheetClose.addEventListener('click', () => {
      // If we're mid-walk or in walks list, exit cleanly so the route layer clears too
      if (state.walk.mode) exitWalk();
      else closeSelection();
    });
  }

  // Hash routing
  onRoute(({ kind, key }) => {
    if (!kind) { closeSelection(); return; }
    selectById(kind, key, { fly: true });
  });

  // Initial route
  const initial = parseHash();
  if (initial.kind) selectById(initial.kind, initial.key, { fly: true });

  // PWA
  if (import.meta.env.PROD) registerPwa();
}

function applyFiltersToMap() {
  const { data } = state;
  const matched = applyFilters(data.siteList, state.filters);
  const matchedIds = new Set(matched.map(s => s.id));

  // Drive MapLibre's filter on the sites layers — keep features whose id is in the matched set
  const map = state.mapApi.map;
  const filterExpr = ['in', ['get', 'id'], ['literal', Array.from(matchedIds)]];
  for (const id of ['sites-points', 'sites-labels']) {
    if (map.getLayer(id)) {
      const base = id === 'sites-points'
        ? ['all', ['!', ['has', 'point_count']], filterExpr]
        : ['all', ['!', ['has', 'point_count']], filterExpr];
      map.setFilter(id, base);
    }
  }
}

function handleMapClick({ kind, feature }) {
  const id = feature.properties.id;
  const slug = feature.properties.slug || id;
  const key = kind === 'site' ? slug : id;
  setRoute(kind, key);
}

function selectById(kind, key, { fly = false } = {}) {
  const list = kind === 'site' ? state.data.siteList
            : kind === 'event' ? state.data.eventList
            : kind === 'restaurant' ? state.data.restaurantList
            : null;
  if (!list) return;

  const item = kind === 'site'
    ? list.find(s => s.slug === key || s.id === key)
    : list.find(x => x.id === key);
  if (!item) {
    showToast('Could not find that location.');
    closeSelection();
    return;
  }

  state.selected = { kind, id: item.id };
  state.mapApi.setSelectedSite(kind === 'site' ? item.id : null);

  if (fly && item.lon != null) {
    state.mapApi.flyToFeature(item.lon, item.lat, kind === 'site' ? 16 : 15);
  }

  if (kind === 'site') {
    const related = relatedToSite(item, {
      events: state.data.eventList,
      restaurants: state.data.restaurantList
    });
    state.sheet.setBody(renderSiteCard(item, { related, people: state.data.people }));
  } else if (kind === 'event') {
    state.sheet.setBody(renderEventCard(item));
  } else {
    state.sheet.setBody(renderRestaurantCard(item));
  }

  state.sheet.open(window.matchMedia('(min-width: 900px)').matches ? 'full' : 'half');
}

function closeSelection() {
  state.selected = null;
  state.mapApi.setSelectedSite(null);
  state.sheet.close();
}

function openWalksList() {
  state.walk = { active: null, stopIdx: 0, mode: 'list' };
  state.mapApi.setWalkRoute(null);
  setWalksBtnActive(true);
  state.sheet.setBody(renderWalksList(state.data.walkList));
  state.sheet.open(window.matchMedia('(min-width: 900px)').matches ? 'full' : 'half');
}

function openWalkOverview(walkSlug) {
  const walk = state.data.walkList.find(w => w.slug === walkSlug);
  if (!walk) { showToast('Walk not found.'); return; }
  state.walk = { active: walkSlug, stopIdx: 0, mode: 'overview' };
  state.mapApi.setWalkRoute(walk, state.sitesBySlug);
  fitMapToWalk(walk);
  setWalksBtnActive(true);
  state.sheet.setBody(renderWalkOverview(walk, state.sitesBySlug));
  state.sheet.open(window.matchMedia('(min-width: 900px)').matches ? 'full' : 'half');
}

function startWalk(walkSlug, stopIdx = 0) {
  const walk = state.data.walkList.find(w => w.slug === walkSlug);
  if (!walk) { showToast('Walk not found.'); return; }
  state.walk = { active: walkSlug, stopIdx, mode: 'inProgress' };
  state.mapApi.setWalkRoute(walk, state.sitesBySlug);
  setWalksBtnActive(true);
  renderCurrentWalkStop();
}

function goToWalkStop(idx) {
  const walk = currentWalk();
  if (!walk) return;
  const total = (walk.stops || []).length;
  if (idx < 0 || idx >= total) return;
  state.walk.stopIdx = idx;
  state.walk.mode = 'inProgress';
  renderCurrentWalkStop();
}

function renderCurrentWalkStop() {
  const walk = currentWalk();
  if (!walk) return;
  const stop = walk.stops[state.walk.stopIdx];
  const site = state.sitesBySlug[stop.site_slug];
  state.mapApi.setActiveWalkStop(stop.order);
  if (site && site.lon != null) state.mapApi.flyToFeature(site.lon, site.lat, 17);
  state.sheet.setBody(renderWalkStop({ walk, stopIdx: state.walk.stopIdx, site, sitesBySlug: state.sitesBySlug }));
  state.sheet.open(window.matchMedia('(min-width: 900px)').matches ? 'full' : 'half');
}

function exitWalk() {
  state.walk = { active: null, stopIdx: 0, mode: null };
  state.mapApi.setWalkRoute(null);
  setWalksBtnActive(false);
  state.sheet.close();
}

function currentWalk() {
  if (!state.walk.active) return null;
  return state.data.walkList.find(w => w.slug === state.walk.active) || null;
}

function setWalksBtnActive(on) {
  const btn = document.getElementById('walksBtn');
  if (!btn) return;
  btn.classList.toggle('is-on', on);
  btn.setAttribute('aria-pressed', String(on));
}

function fitMapToWalk(walk) {
  const coords = walk.geometry?.coordinates || [];
  if (!coords.length) return;
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  // Pad so the route fits inside the *visible* map area (the sheet covers
  // the bottom on mobile and the left on desktop).
  const isDesktop = window.matchMedia('(min-width: 900px)').matches;
  const padding = isDesktop
    ? { top: 60, right: 60, bottom: 60, left: 480 }
    : { top: 60, right: 40, bottom: Math.round(window.innerHeight * 0.5), left: 40 };
  state.mapApi.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding });
}

async function handleLocateClick() {
  if (!isAvailable()) {
    showToast('Geolocation is not available in this browser.');
    return;
  }
  setLocateActive(true);
  try {
    const pos = await getOnce();
    state.location = pos;
    state.mapApi.setUserLocation(pos.lon, pos.lat);
    state.mapApi.flyToFeature(pos.lon, pos.lat, 14);

    // If nothing selected, surface a "near you" sheet
    if (!state.selected) showNearbySheet(pos);
  } catch (err) {
    setLocateActive(false);
    if (err && err.code === 1) showToast('Location permission denied.');
    else showToast('Could not get your location.');
  }
}

function showNearbySheet(pos) {
  const { events, restaurants } = relatedToPoint(pos, {
    events: state.data.eventList,
    restaurants: state.data.restaurantList
  });
  const testNote = (USE_TEST_LOCATION || pos.isTestLocation)
    ? `<p class="site-card__test-banner">
         <strong>Demo location:</strong> ${escapeHtml(TEST_LOCATION.label)}.
         This is not your real location — while the prototype is small we pin it to central London so "what's near me" returns something interesting.
       </p>`
    : '';
  const html = `
    <article class="site-card">
      ${testNote}
      <div class="site-card__kicker">Near you</div>
      <h2 class="site-card__title">Within walking distance</h2>
      <p class="site-card__summary">Tap any item below to open it on the map.</p>
      ${nearbyList('Events', events.slice(0, 6), 'event')}
      ${nearbyList('Restaurants', restaurants.slice(0, 6), 'restaurant')}
    </article>
  `;
  state.sheet.setBody(html);
  state.sheet.open(window.matchMedia('(min-width: 900px)').matches ? 'full' : 'half');
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function nearbyList(label, items, kind) {
  if (!items.length) return '';
  const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const meta = (it) => kind === 'event'
    ? (it.starts_at ? new Date(it.starts_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '')
    : (it.cuisine || []).join(', ');
  return `
    <div class="related">
      <h3>${escape(label)}</h3>
      <ul class="related__list">
        ${items.map(it => `
          <li class="related__item" data-kind="${kind}" data-id="${escape(it.id)}">
            <div>
              <div class="related__item-name">${escape(it.name)}</div>
              <div class="related__item-meta">${escape(meta(it))}</div>
            </div>
            <div class="related__item-distance">${formatDistance(it._distance)}</div>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

function formatDistance(m) {
  if (m == null || !isFinite(m)) return '';
  if (m < 100) return `${Math.round(m / 10) * 10} m`;
  if (m < 1000) return `${Math.round(m / 50) * 50} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

bootstrap().catch(err => {
  console.error('Bootstrap failed:', err);
  document.getElementById('map').innerHTML =
    `<div style="padding:24px;color:#f4f1ec;text-align:center;">Failed to load: ${err.message}</div>`;
});
