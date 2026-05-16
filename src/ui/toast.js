const el = () => document.getElementById('toast');

let timer = null;

export function showToast(message, { duration = 3000, action } = {}) {
  const node = el();
  if (!node) return;
  node.innerHTML = '';
  const span = document.createElement('span');
  span.textContent = message;
  node.appendChild(span);
  if (action) {
    const btn = document.createElement('button');
    btn.textContent = action.label;
    btn.addEventListener('click', () => { action.onClick?.(); hide(); });
    node.appendChild(btn);
  }
  node.classList.add('is-visible');
  clearTimeout(timer);
  if (duration > 0) timer = setTimeout(hide, duration);
}

export function hide() {
  el()?.classList.remove('is-visible');
}
