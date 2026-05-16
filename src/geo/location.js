// Wrapper over the Geolocation API. Default is one-shot getCurrentPosition for
// "what's around me"; an explicit walking-mode toggle (deferred) would switch to
// watchPosition with high accuracy.

// Demo override: while the project is in early prototype, the "Find my location"
// button should drop the user in central London (Bank junction) so the nearby /
// walking-distance experience makes sense from anywhere. Flip USE_TEST_LOCATION
// to false to restore real geolocation behaviour.
export const USE_TEST_LOCATION = true;
export const TEST_LOCATION = {
  lon: -0.08775,
  lat: 51.51284,
  label: 'St Mary Woolnoth, City of London (Bank junction)'
};

const DEFAULT_OPTS = {
  enableHighAccuracy: false,
  maximumAge: 60_000,
  timeout: 10_000
};

export function isAvailable() {
  if (USE_TEST_LOCATION) return true;
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

export function getOnce(opts = {}) {
  if (USE_TEST_LOCATION) {
    return Promise.resolve({
      lon: TEST_LOCATION.lon,
      lat: TEST_LOCATION.lat,
      accuracy: 30,
      ts: Date.now(),
      isTestLocation: true
    });
  }
  return new Promise((resolve, reject) => {
    if (!isAvailable()) return reject(new Error('geolocation_unavailable'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lon: pos.coords.longitude,
        lat: pos.coords.latitude,
        accuracy: pos.coords.accuracy,
        ts: pos.timestamp
      }),
      (err) => reject(err),
      { ...DEFAULT_OPTS, ...opts }
    );
  });
}

export function permissionState() {
  if (!('permissions' in navigator)) return Promise.resolve('unknown');
  return navigator.permissions.query({ name: 'geolocation' })
    .then(p => p.state)
    .catch(() => 'unknown');
}
