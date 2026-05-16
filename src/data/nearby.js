import distance from '@turf/distance';

// All distances in metres.

function distM(a, b) {
  return distance(
    { type: 'Point', coordinates: [a.lon, a.lat] },
    { type: 'Point', coordinates: [b.lon, b.lat] },
    { units: 'kilometers' }
  ) * 1000;
}

export function relatedToSite(site, { events = [], restaurants = [] }, opts = {}) {
  const eventRadius = opts.eventRadius ?? 800;
  const restaurantRadius = opts.restaurantRadius ?? 600;
  const eventDays = opts.eventDays ?? 90;
  const now = opts.now ?? new Date();
  const horizon = new Date(now.getTime() + eventDays * 86400000);

  const relatedEvents = events
    .map(ev => ({ ...ev, _distance: site.lon != null && ev.lon != null ? distM(site, ev) : Infinity }))
    .filter(ev => {
      const start = ev.starts_at ? new Date(ev.starts_at) : null;
      if (!start || start > horizon) return false;
      // already-finished events: exclude
      const end = ev.ends_at ? new Date(ev.ends_at) : start;
      if (end < now) return false;
      const explicitlyLinked = (ev.related_sites || []).includes(site.id);
      return explicitlyLinked || ev._distance <= eventRadius;
    })
    .sort((a, b) => {
      const da = new Date(a.starts_at).getTime();
      const db = new Date(b.starts_at).getTime();
      return da - db || a._distance - b._distance;
    });

  const siteThemes = new Set(site.themes || []);
  const relatedRestaurants = restaurants
    .map(r => ({
      ...r,
      _distance: site.lon != null && r.lon != null ? distM(site, r) : Infinity,
      _themeOverlap: (r.related_themes || []).filter(t => siteThemes.has(t)).length
    }))
    .filter(r => r._distance <= restaurantRadius)
    .sort((a, b) => (b._themeOverlap - a._themeOverlap) || (a._distance - b._distance))
    .slice(0, 5);

  return { events: relatedEvents, restaurants: relatedRestaurants };
}

export function relatedToPoint(point, { events = [], restaurants = [] }, opts = {}) {
  const eventRadius = opts.eventRadius ?? 1500;
  const restaurantRadius = opts.restaurantRadius ?? 1500;

  const eventList = events
    .map(ev => ({ ...ev, _distance: ev.lon != null ? distM(point, ev) : Infinity }))
    .filter(ev => ev._distance <= eventRadius)
    .sort((a, b) => a._distance - b._distance);

  const restaurantList = restaurants
    .map(r => ({ ...r, _distance: r.lon != null ? distM(point, r) : Infinity }))
    .filter(r => r._distance <= restaurantRadius)
    .sort((a, b) => a._distance - b._distance);

  return { events: eventList, restaurants: restaurantList };
}

export function formatDistance(metres) {
  if (metres == null || !isFinite(metres)) return '';
  if (metres < 100) return `${Math.round(metres / 10) * 10} m`;
  if (metres < 1000) return `${Math.round(metres / 50) * 50} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}
