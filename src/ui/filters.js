// Populates the filter dialog and reads the selected facets.

const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

export function setupFilters({ themes, sites, onChange }) {
  const state = { boroughs: [], themes: [], eras: [], stepFreeOnly: false, query: '' };

  // Build chip rows
  const usedBoroughs = Array.from(new Set(sites.map(s => s.borough).filter(Boolean))).sort();
  renderChips(document.getElementById('boroughChips'), usedBoroughs.map(b => ({ value: b, label: b })), state.boroughs, (sel) => { state.boroughs = sel; });
  renderChips(document.getElementById('themeChips'), themes.themes.map(t => ({ value: t.slug, label: t.label })), state.themes, (sel) => { state.themes = sel; });
  renderChips(document.getElementById('periodChips'), themes.eras.map(e => ({ value: e.slug, label: e.label })), state.eras, (sel) => { state.eras = sel; });

  const stepFree = document.getElementById('stepFreeFilter');
  stepFree.addEventListener('change', () => { state.stepFreeOnly = stepFree.checked; });

  const dialog = document.getElementById('filtersDialog');
  document.getElementById('filtersBtn').addEventListener('click', () => dialog.showModal());
  document.getElementById('resetFilters').addEventListener('click', () => {
    state.boroughs = []; state.themes = []; state.eras = []; state.stepFreeOnly = false;
    document.querySelectorAll('.filters-dialog .chip.is-on').forEach(c => c.classList.remove('is-on'));
    stepFree.checked = false;
    onChange({ ...state });
  });
  document.getElementById('filtersForm').addEventListener('submit', (e) => {
    if (e.submitter && e.submitter.value === 'apply') onChange({ ...state });
  });

  return {
    setQuery(q) { state.query = q; onChange({ ...state }); },
    getState() { return { ...state }; }
  };
}

function renderChips(container, options, currentSelected, onSelect) {
  if (!container) return;
  container.innerHTML = options.map(o =>
    `<button type="button" class="chip${currentSelected.includes(o.value) ? ' is-on' : ''}" data-value="${escape(o.value)}">${escape(o.label)}</button>`
  ).join('');
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    btn.classList.toggle('is-on');
    const next = Array.from(container.querySelectorAll('.chip.is-on')).map(b => b.dataset.value);
    onSelect(next);
  });
}
