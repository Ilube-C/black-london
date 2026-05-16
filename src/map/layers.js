// MapLibre source + layer specs for sites, events, restaurants.
// Sites support clustering; events/restaurants are unclustered (smaller volume,
// users will toggle them on contextually).

const SOURCES = {
  sites:       { id: 'sites',       url: '/data/sites.geojson',       cluster: true,  pinColor: 'var(--pin-site)' },
  events:      { id: 'events',      url: '/data/events.geojson',      cluster: false, pinColor: '#8aa87a' },
  restaurants: { id: 'restaurants', url: '/data/restaurants.geojson', cluster: false, pinColor: '#c97e6f' }
};

export function addLayers(map) {
  // SITES — clustered points
  map.addSource('sites', {
    type: 'geojson',
    data: '/data/sites.geojson',
    cluster: true,
    clusterRadius: 40,
    clusterMaxZoom: 14,
    promoteId: 'id'
  });

  map.addLayer({
    id: 'sites-clusters',
    type: 'circle',
    source: 'sites',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#f4f1ec',
      'circle-stroke-color': '#d4a548',
      'circle-stroke-width': 2,
      'circle-radius': [
        'step', ['get', 'point_count'],
        16, 5,
        20, 15,
        24
      ],
      'circle-opacity': 0.95
    }
  });

  map.addLayer({
    id: 'sites-cluster-count',
    type: 'symbol',
    source: 'sites',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 12
    },
    paint: { 'text-color': '#1a1a1c' }
  });

  map.addLayer({
    id: 'sites-points',
    type: 'circle',
    source: 'sites',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': '#d4a548',
      'circle-stroke-color': '#1a1a1c',
      'circle-stroke-width': 1.5,
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        9, 4,
        14, 8,
        18, 12
      ]
    }
  });

  map.addLayer({
    id: 'sites-labels',
    type: 'symbol',
    source: 'sites',
    filter: ['!', ['has', 'point_count']],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 11,
      'text-offset': [0, 1.2],
      'text-anchor': 'top',
      'text-optional': true,
      'text-allow-overlap': false
    },
    paint: {
      'text-color': '#f4f1ec',
      'text-halo-color': '#1a1a1c',
      'text-halo-width': 1.2,
      'text-halo-blur': 0.5
    },
    minzoom: 13
  });

  // EVENTS — initially hidden
  map.addSource('events', { type: 'geojson', data: '/data/events.geojson', promoteId: 'id' });
  map.addLayer({
    id: 'events-points',
    type: 'circle',
    source: 'events',
    layout: { visibility: 'none' },
    paint: {
      'circle-color': '#8aa87a',
      'circle-stroke-color': '#1a1a1c',
      'circle-stroke-width': 1.5,
      'circle-radius': 7
    }
  });

  // RESTAURANTS — initially hidden
  map.addSource('restaurants', { type: 'geojson', data: '/data/restaurants.geojson', promoteId: 'id' });
  map.addLayer({
    id: 'restaurants-points',
    type: 'circle',
    source: 'restaurants',
    layout: { visibility: 'none' },
    paint: {
      'circle-color': '#c97e6f',
      'circle-stroke-color': '#1a1a1c',
      'circle-stroke-width': 1.5,
      'circle-radius': 6
    }
  });

  // USER LOCATION (added when granted)
  map.addSource('user-location', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });
  map.addLayer({
    id: 'user-location-halo',
    type: 'circle',
    source: 'user-location',
    paint: {
      'circle-color': '#6aa9ff',
      'circle-opacity': 0.18,
      'circle-radius': 28
    }
  });
  map.addLayer({
    id: 'user-location-dot',
    type: 'circle',
    source: 'user-location',
    paint: {
      'circle-color': '#6aa9ff',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
      'circle-radius': 7
    }
  });

  // SELECTED SITE highlight
  map.addLayer({
    id: 'sites-selected',
    type: 'circle',
    source: 'sites',
    filter: ['==', ['get', 'id'], '__none__'],
    paint: {
      'circle-color': 'rgba(0,0,0,0)',
      'circle-stroke-color': '#d4a548',
      'circle-stroke-width': 3,
      'circle-radius': 14
    }
  });

  // WALK route and numbered stop markers (empty until a walk is selected)
  map.addSource('walk-route', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });
  map.addSource('walk-stops', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  // Casing under the route line for legibility on light/dark tile mixes
  map.addLayer({
    id: 'walk-route-casing',
    type: 'line',
    source: 'walk-route',
    layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
    paint: {
      'line-color': '#1a1a1c',
      'line-width': [
        'interpolate', ['linear'], ['zoom'],
        12, 8,
        16, 13,
        19, 18
      ],
      'line-opacity': 0.95
    }
  });
  map.addLayer({
    id: 'walk-route-line',
    type: 'line',
    source: 'walk-route',
    layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
    paint: {
      'line-color': '#d4a548',
      'line-width': [
        'interpolate', ['linear'], ['zoom'],
        12, 5,
        16, 8,
        19, 11
      ],
      'line-opacity': 1,
      'line-dasharray': [1.2, 1.5]
    }
  });

  // Numbered stop markers: filled gold circle with number label
  map.addLayer({
    id: 'walk-stops-circles',
    type: 'circle',
    source: 'walk-stops',
    layout: { visibility: 'none' },
    paint: {
      'circle-color': [
        'case',
        ['==', ['get', 'active'], true], '#f4f1ec',
        '#d4a548'
      ],
      'circle-stroke-color': '#1a1a1c',
      'circle-stroke-width': 2,
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        12, 10,
        16, 14,
        19, 18
      ]
    }
  });
  map.addLayer({
    id: 'walk-stops-labels',
    type: 'symbol',
    source: 'walk-stops',
    layout: {
      'text-field': ['to-string', ['get', 'order']],
      'text-font': ['Noto Sans Regular'],
      'text-size': [
        'interpolate', ['linear'], ['zoom'],
        12, 11,
        16, 13,
        19, 15
      ],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
      visibility: 'none'
    },
    paint: { 'text-color': '#1a1a1c' }
  });
}

export function setLayerVisible(map, layer, visible) {
  const ids = {
    sites: ['sites-clusters', 'sites-cluster-count', 'sites-points', 'sites-labels'],
    events: ['events-points'],
    restaurants: ['restaurants-points'],
    walk: ['walk-route-casing', 'walk-route-line', 'walk-stops-circles', 'walk-stops-labels']
  }[layer] || [];
  for (const id of ids) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  }
}

let activeWalkStops = [];

export function setWalkRoute(map, walk, sitesBySlug) {
  const routeSrc = map.getSource('walk-route');
  const stopsSrc = map.getSource('walk-stops');
  if (!routeSrc || !stopsSrc) return;

  if (!walk) {
    activeWalkStops = [];
    routeSrc.setData({ type: 'FeatureCollection', features: [] });
    stopsSrc.setData({ type: 'FeatureCollection', features: [] });
    setLayerVisible(map, 'walk', false);
    return;
  }

  routeSrc.setData({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: walk.geometry, properties: {} }]
  });

  activeWalkStops = (walk.stops || []).map(s => {
    const site = sitesBySlug[s.site_slug];
    if (!site || site.lon == null) return null;
    return { order: s.order, site_slug: s.site_slug, lon: site.lon, lat: site.lat };
  }).filter(Boolean);

  rerenderWalkStops(map, null);
  setLayerVisible(map, 'walk', true);
}

export function setActiveWalkStop(map, order) {
  rerenderWalkStops(map, order);
}

function rerenderWalkStops(map, activeOrder) {
  const stopsSrc = map.getSource('walk-stops');
  if (!stopsSrc) return;
  stopsSrc.setData({
    type: 'FeatureCollection',
    features: activeWalkStops.map(s => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      properties: { order: s.order, site_slug: s.site_slug, active: s.order === activeOrder }
    }))
  });
}

export function setSelectedSite(map, siteId) {
  if (!map.getLayer('sites-selected')) return;
  map.setFilter('sites-selected', ['==', ['get', 'id'], siteId || '__none__']);
}

export function setUserLocation(map, lon, lat) {
  const src = map.getSource('user-location');
  if (!src) return;
  src.setData({
    type: 'FeatureCollection',
    features: lon == null ? [] : [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: {}
    }]
  });
}

export const SOURCE_DEFS = SOURCES;
