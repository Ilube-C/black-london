export function setupLayerToggle({ onToggle, onLocate }) {
  const buttons = document.querySelectorAll('.layer-toggle__btn[data-layer]');
  // Restore from localStorage
  const saved = JSON.parse(localStorage.getItem('layers') || '{}');
  buttons.forEach(btn => {
    const layer = btn.dataset.layer;
    const on = saved[layer] ?? (layer === 'sites');
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.addEventListener('click', () => {
      const next = !btn.classList.contains('is-on');
      btn.classList.toggle('is-on', next);
      btn.setAttribute('aria-pressed', String(next));
      const saved = JSON.parse(localStorage.getItem('layers') || '{}');
      saved[layer] = next;
      localStorage.setItem('layers', JSON.stringify(saved));
      onToggle(layer, next);
    });
    onToggle(layer, on); // initial sync
  });

  const locateBtn = document.getElementById('locateBtn');
  if (locateBtn) {
    locateBtn.addEventListener('click', () => onLocate());
  }
}

export function setLocateActive(active) {
  const locateBtn = document.getElementById('locateBtn');
  if (!locateBtn) return;
  locateBtn.classList.toggle('is-on', !!active);
  locateBtn.setAttribute('aria-pressed', String(!!active));
}
