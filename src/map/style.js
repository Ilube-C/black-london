// Returns a MapLibre style URL or inline style object for OpenFreeMap's "liberty"
// vector tiles. Free, OSM-derived, no API key. We override attribution to comply
// with both OSM and OpenFreeMap requirements (must be visible at all zooms).
export const TILE_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export const ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · ' +
  '© <a href="https://openfreemap.org">OpenFreeMap</a>';

export const DEFAULT_VIEW = {
  center: [-0.10, 51.5074], // London
  zoom: 11,
  minZoom: 9,
  maxZoom: 18
};

// Bounding box of features (computed at runtime from manifest-data.json on first load).
export const LONDON_BBOX = [-0.51, 51.28, 0.33, 51.69];
