/**
 * 剪贴板：富文本（公众号用）与纯文本（HTML 源码用）
 */

const HTML_TO_TEXT = /<[^>]+>/g;

function plainTextOf(html) {
  return html.replace(HTML_TO_TEXT, '');
}

/** 优先 Clipboard API 写 text/html，失败抛错由调用方走兜底 */
export function copyRichText(html) {
  if (navigator.clipboard && window.ClipboardItem) {
    const item = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([plainTextOf(html)], { type: 'text/plain' })
    });
    return navigator.clipboard.write([item]);
  }
  return Promise.reject(new Error('clipboard-api-unavailable'));
}

/** 老浏览器兜底：临时 contenteditable + execCommand */
export function copyRichTextFallback(html) {
  const div = document.createElement('div');
  div.contentEditable = 'true';
  div.style.position = 'fixed';
  div.style.left = '-9999px';
  div.style.top = '0';
  div.innerHTML = html;
  document.body.appendChild(div);

  const range = document.createRange();
  range.selectNodeContents(div);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (e) {
    ok = false;
  }
  sel.removeAllRanges();
  document.body.removeChild(div);
  return ok;
}

export function copyPlainText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      resolve(true);
    } catch (e) {
      reject(e);
    } finally {
      document.body.removeChild(ta);
    }
  });
}
