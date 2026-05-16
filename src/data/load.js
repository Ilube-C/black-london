// Fetches the data resources, returns them keyed for easy access.
const FILES = [
  ['sites',       '/data/sites.geojson'],
  ['events',      '/data/events.geojson'],
  ['restaurants', '/data/restaurants.geojson'],
  ['walks',       '/data/walks.geojson'],
  ['people',      '/data/people.json'],
  ['themes',      '/data/themes.json'],
  ['manifest',    '/data/manifest-data.json']
];

export async function loadData() {
  const out = {};
  await Promise.all(FILES.map(async ([key, url]) => {
    const res = await fetch(url);
    if (!res.ok) {
      // Walks is optional — fall back to empty if missing.
      if (key === 'walks') { out[key] = { features: [] }; return; }
      throw new Error(`Failed to load ${url}: ${res.status}`);
    }
    out[key] = await res.json();
  }));

  // Convenience: array of feature objects with properties pulled up
  out.siteList       = (out.sites?.features ?? []).map(featureToRow);
  out.eventList      = (out.events?.features ?? []).map(featureToRow);
  out.restaurantList = (out.restaurants?.features ?? []).map(featureToRow);
  out.walkList       = (out.walks?.features ?? []).map(walkFeatureToRow);
  return out;
}

function walkFeatureToRow(feat) {
  const p = feat.properties || {};
  return { ...p, geometry: feat.geometry };
}

function featureToRow(feat) {
  const p = feat.properties || {};
  const [lon, lat] = (feat.geometry?.coordinates ?? [null, null]);
  return { ...p, lon, lat, geometry: feat.geometry };
}
