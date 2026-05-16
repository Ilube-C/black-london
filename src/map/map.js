import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TILE_STYLE_URL, ATTRIBUTION, DEFAULT_VIEW } from './style.js';
import { addLayers, setLayerVisible, setSelectedSite, setUserLocation, setWalkRoute, setActiveWalkStop } from './layers.js';

export function createMap(containerId, { onSelectFeature, onWalkStopClick } = {}) {
  const map = new maplibregl.Map({
    container: containerId,
    style: TILE_STYLE_URL,
    center: DEFAULT_VIEW.center,
    zoom: DEFAULT_VIEW.zoom,
    minZoom: DEFAULT_VIEW.minZoom,
    maxZoom: DEFAULT_VIEW.maxZoom,
    attributionControl: false,
    cooperativeGestures: false
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');
  map.addControl(
    new maplibregl.AttributionControl({ compact: true, customAttribution: ATTRIBUTION }),
    'bottom-right'
  );

  let ready = false;
  const readyPromise = new Promise((resolve) => {
    map.on('load', () => {
      addLayers(map);
      wireInteractions(map, onSelectFeature, onWalkStopClick);
      ready = true;
      resolve(map);
    });
  });

  return {
    map,
    ready: () => readyPromise,
    isReady: () => ready,
    setLayerVisible: (layer, visible) => setLayerVisible(map, layer, visible),
    setSelectedSite: (siteId) => setSelectedSite(map, siteId),
    setUserLocation: (lon, lat) => setUserLocation(map, lon, lat),
    flyToFeature: (lon, lat, zoom = 16) => {
      map.flyTo({ center: [lon, lat], zoom, speed: 1.2, curve: 1.42 });
    },
    setWalkRoute: (walk, sitesBySlug) => setWalkRoute(map, walk, sitesBySlug),
    setActiveWalkStop: (order) => setActiveWalkStop(map, order),
    fitBounds: (bounds, opts) => map.fitBounds(bounds, { padding: 60, duration: 800, ...opts })
  };
}

function wireInteractions(map, onSelectFeature, onWalkStopClick) {
  // Cluster click: zoom in
  map.on('click', 'sites-clusters', (e) => {
    const feat = e.features?.[0];
    if (!feat) return;
    const clusterId = feat.properties.cluster_id;
    map.getSource('sites').getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err) return;
      map.easeTo({ center: feat.geometry.coordinates, zoom });
    });
  });

  // Site / event / restaurant click → selection
  for (const layer of ['sites-points', 'events-points', 'restaurants-points']) {
    map.on('click', layer, (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const kind = layer.startsWith('sites') ? 'site'
                : layer.startsWith('events') ? 'event'
                : 'restaurant';
      onSelectFeature?.({ kind, feature: feat });
    });
    map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
  }

  map.on('mouseenter', 'sites-clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'sites-clusters', () => { map.getCanvas().style.cursor = ''; });

  // Walk stop clicks → advance to that stop
  map.on('click', 'walk-stops-circles', (e) => {
    const feat = e.features?.[0];
    if (!feat) return;
    onWalkStopClick?.({ order: feat.properties.order, site_slug: feat.properties.site_slug });
  });
  map.on('mouseenter', 'walk-stops-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'walk-stops-circles', () => { map.getCanvas().style.cursor = ''; });
}
