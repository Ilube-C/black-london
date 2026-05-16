// A tiny, deliberately-limited Markdown → HTML renderer for site descriptions.
// Supports: paragraphs, **bold**, *italic*, `code`, [text](url), > blockquotes,
// and nothing else. Escapes HTML by default.

const ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = s => String(s).replace(/[&<>"']/g, ch => ESCAPE[ch]);

export function renderMarkdown(src) {
  if (!src) return '';
  const lines = src.split(/\n/);
  const out = [];
  let para = [];
  let inBlock = false;

  const flushPara = () => {
    if (!para.length) return;
    const html = inline(escape(para.join(' ').trim()));
    out.push(`<p>${html}</p>`);
    para = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      continue;
    }
    if (line.startsWith('> ')) {
      flushPara();
      out.push(`<blockquote>${inline(escape(line.slice(2)))}</blockquote>`);
      continue;
    }
    if (line.startsWith('### ')) { flushPara(); out.push(`<h3>${inline(escape(line.slice(4)))}</h3>`); continue; }
    if (line.startsWith('## '))  { flushPara(); out.push(`<h3>${inline(escape(line.slice(3)))}</h3>`); continue; }
    para.push(line);
  }
  flushPara();
  return out.join('\n');
}

function inline(s) {
  // Order matters: links first, then bold, italic, code.
  return s
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, t, u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}
