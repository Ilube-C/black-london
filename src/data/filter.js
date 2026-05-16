// Pure filter pipeline over the in-memory site list.
// Applies search, borough, theme, period, accessibility — returns matched ids.

export function applyFilters(sites, { query = '', boroughs = [], themes = [], eras = [], stepFreeOnly = false } = {}) {
  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);

  return sites.filter(site => {
    if (boroughs.length && !boroughs.includes(site.borough)) return false;
    if (themes.length && !site.themes?.some(t => themes.includes(t))) return false;
    if (eras.length && site.period?.era && !eras.includes(site.period.era)) return false;
    if (stepFreeOnly && !site.accessibility?.step_free) return false;

    if (tokens.length) {
      const haystack = [
        site.name,
        ...(site.name_alt || []),
        site.summary,
        site.borough,
        site.address,
        ...(site.themes || []),
        ...(site.people || [])
      ].join(' ').toLowerCase();
      if (!tokens.every(t => haystack.includes(t))) return false;
    }
    return true;
  });
}
