/**
 * 轻量 Markdown 解析器
 * 不依赖任何第三方库，输出可直接注入 DOM 的安全 HTML（所有文本都已转义）。
 */

const BT = String.fromCharCode(96);
export const FENCE = BT + BT + BT;

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isFence(line) {
  return line.replace(/^\s+/, '').slice(0, 3) === FENCE;
}

/** 行内语法：图片 → 链接 → 加粗 → 斜体 → 删除线 → 行内代码 */
export function inlineMd(s) {
  let out = esc(s);
  out = out.replace(/!\[([^\]]*)\]\(([^\u0029\s]+)\)/g, (m, alt, src) => {
    return '<img src="' + src + '" alt="' + alt + '">';
  });
  out = out.replace(/\[([^\]]+)\]\(([^\u0029\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  return out;
}

export function renderMarkdown(src) {
  const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
  let html = '';
  let para = [];
  let list = null;
  let quote = [];
  let code = null;
  const table = [];

  function flushPara() {
    if (para.length) {
      html += '<p>' + para.map(inlineMd).join('<br>') + '</p>';
      para = [];
    }
  }
  function flushList() {
    if (list) {
      html +=
        '<' + list.type + '>' +
        list.items.map((it) => '<li>' + inlineMd(it) + '</li>').join('') +
        '</' + list.type + '>';
      list = null;
    }
  }
  function flushQuote() {
    if (quote.length) {
      html += '<blockquote>' + quote.map((q) => '<p>' + inlineMd(q) + '</p>').join('') + '</blockquote>';
      quote = [];
    }
  }
  function flushTable() {
    if (!table.length) return;
    const isDivider = (r) => /^\s*\|?[\s:|-]+\|?\s*$/.test(r);
    const head = table[0];
    const body = table.slice(1).filter((r) => !isDivider(r));
    const cells = (r) =>
      r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
    html +=
      '<table><thead><tr>' +
      cells(head).map((c) => '<th>' + inlineMd(c) + '</th>').join('') +
      '</tr></thead><tbody>';
    body.forEach((r) => {
      html += '<tr>' + cells(r).map((c) => '<td>' + inlineMd(c) + '</td>').join('') + '</tr>';
    });
    html += '</tbody></table>';
    table.length = 0;
  }
  function flushAll() {
    flushPara();
    flushList();
    flushQuote();
    flushTable();
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (code) {
      if (isFence(line)) {
        html += '<pre><code>' + esc(code.join('\n')) + '</code></pre>';
        code = null;
      } else {
        code.push(line);
      }
      continue;
    }
    if (isFence(line)) {
      flushAll();
      code = [];
      continue;
    }
    if (/^\s*$/.test(line)) {
      flushAll();
      continue;
    }

    let m;
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      flushAll();
      const lv = m[1].length;
      html += '<h' + lv + '>' + inlineMd(m[2].trim()) + '</h' + lv + '>';
      continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushAll();
      html += '<hr>';
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      flushPara();
      flushList();
      flushTable();
      quote.push(line.replace(/^\s*>\s?/, ''));
      continue;
    }
    flushQuote();

    if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) {
      flushPara();
      flushTable();
      if (!list || list.type !== 'ul') {
        flushList();
        list = { type: 'ul', items: [] };
      }
      list.items.push(m[1]);
      continue;
    }
    if ((m = line.match(/^\s*\d+[.\u0029]\s+(.*)$/))) {
      flushPara();
      flushTable();
      if (!list || list.type !== 'ol') {
        flushList();
        list = { type: 'ol', items: [] };
      }
      list.items.push(m[1]);
      continue;
    }
    flushList();

    if (/^\s*\|.*\|\s*$/.test(line)) {
      flushPara();
      flushQuote();
      table.push(line);
      continue;
    }
    flushTable();

    para.push(line.trim());
  }
  flushAll();
  if (code) html += '<pre><code>' + esc(code.join('\n')) + '</code></pre>';
  return html;
}

/** 去掉图片语法，只留文字（用于字数、侧边栏摘要） */
export function stripImages(md) {
  return String(md || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '');
}

export function countInlineImages(md) {
  return (String(md || '').match(/!\[[^\]]*\]\(data:image\//g) || []).length;
}

export function countTempImages(md) {
  return (String(md || '').match(/!\[[^\]]*\]\(https?:\/\/[^)\s]*beeimg[^)\s]*\/temp\//g) || []).length;
}

export function countWords(md) {
  return stripImages(md).replace(/\s/g, '').length;
}

/** 侧边栏摘要：跳过标题行与空行，取第一段文字 */
export function excerpt(md, len = 60) {
  const line =
    stripImages(md)
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !/^#/.test(l))[0] || '暂无内容';
  return line.slice(0, len);
}
