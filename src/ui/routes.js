// Tiny hash-based router. Supported routes:
//   #/                       — none selected
//   #/site/:slug             — open the site's sheet
//   #/event/:id              — open the event's sheet
//   #/restaurant/:id         — open the restaurant's sheet

export function parseHash(hash = location.hash) {
  const m = hash.match(/^#\/(site|event|restaurant)\/([^/?#]+)/);
  if (!m) return { kind: null, key: null };
  return { kind: m[1], key: decodeURIComponent(m[2]) };
}

export function setRoute(kind, key) {
  const next = kind && key ? `#/${kind}/${encodeURIComponent(key)}` : '#/';
  if (location.hash !== next) location.hash = next;
}

export function onRoute(handler) {
  window.addEventListener('hashchange', () => handler(parseHash()));
}
