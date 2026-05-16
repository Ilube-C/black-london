// Bottom-sheet (mobile) / drawer (desktop) state machine.
// Snap states: hidden | peek | half | full. Drag the handle to change snap.

const SNAPS = ['peek', 'half', 'full'];

export function createSheet(rootEl) {
  const handle = rootEl.querySelector('.sheet__handle');
  const body = rootEl.querySelector('.sheet__body');
  const isDesktop = () => window.matchMedia('(min-width: 900px)').matches;

  let state = 'hidden';

  function setSnap(next) {
    state = next;
    if (next === 'hidden') {
      rootEl.setAttribute('aria-hidden', 'true');
      rootEl.dataset.snap = 'hidden';
    } else {
      rootEl.setAttribute('aria-hidden', 'false');
      rootEl.dataset.snap = next;
      const idx = SNAPS.indexOf(next);
      handle.setAttribute('aria-valuenow', String(Math.max(0, idx)));
    }
  }

  function open(snap = 'half') { setSnap(snap); body.scrollTop = 0; }
  function close() { setSnap('hidden'); }
  function setBody(html) { body.innerHTML = html; }
  function getBody() { return body; }
  function isOpen() { return state !== 'hidden'; }

  // Keyboard control on handle
  handle.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); cycle(+1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); cycle(-1); }
    else if (e.key === 'Escape') close();
  });

  function cycle(delta) {
    if (isDesktop()) return; // single state on desktop
    const i = Math.max(0, SNAPS.indexOf(state));
    const next = SNAPS[Math.min(SNAPS.length - 1, Math.max(0, i + delta))];
    if (next) setSnap(next);
  }

  // Pointer-driven drag on the handle (mobile only)
  let dragStartY = null;
  let startHeight = null;
  let dragging = false;

  handle.addEventListener('pointerdown', (e) => {
    if (isDesktop()) return;
    dragStartY = e.clientY;
    startHeight = rootEl.getBoundingClientRect().height;
    dragging = true;
    rootEl.style.transition = 'none';
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = dragStartY - e.clientY; // drag up = positive
    const newHeight = Math.max(80, Math.min(window.innerHeight * 0.96, startHeight + dy));
    rootEl.style.height = `${newHeight}px`;
  });
  handle.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    rootEl.style.transition = '';
    rootEl.style.height = '';
    const finalHeight = rootEl.getBoundingClientRect().height;
    const vh = window.innerHeight;
    let snap = 'peek';
    if (finalHeight > vh * 0.7) snap = 'full';
    else if (finalHeight > vh * 0.25) snap = 'half';
    setSnap(snap);
    handle.releasePointerCapture(e.pointerId);
  });

  return { open, close, setBody, getBody, isOpen, setSnap, get state() { return state; } };
}
