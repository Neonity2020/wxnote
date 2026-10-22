/**
 * 公众号排版样式表 + HTML 内联化
 *
 * 公众号后台编辑器会剥离 <style> 与 class，只保留元素上的 style 属性，
 * 所以发布前必须把样式逐个元素写成 inline style。
 */
import { esc } from './markdown.js';

export const MP_STYLES = {
  h1: 'font-size:22px;font-weight:700;margin:28px 0 14px;color:#111111;line-height:1.4;',
  h2: 'font-size:19px;font-weight:700;margin:26px 0 12px;color:#111111;line-height:1.4;padding-left:10px;border-left:4px solid #07C160;',
  h3: 'font-size:17px;font-weight:700;margin:22px 0 10px;color:#111111;line-height:1.4;',
  h4: 'font-size:16px;font-weight:600;margin:18px 0 8px;color:#111111;line-height:1.4;',
  h5: 'font-size:16px;font-weight:600;margin:16px 0 8px;color:#111111;line-height:1.4;',
  h6: 'font-size:15px;font-weight:600;margin:16px 0 8px;color:#111111;line-height:1.4;',
  p: 'font-size:16px;line-height:1.75;color:#3F3F3F;margin:14px 0;letter-spacing:0.5px;',
  strong: 'font-weight:700;color:#111111;',
  em: 'color:#3F3F3F;',
  del: 'color:#888888;',
  a: 'color:#576B95;text-decoration:none;border-bottom:1px solid #B9C4D6;',
  blockquote: 'margin:16px 0;padding:12px 16px;background:#F7F7F7;border-left:3px solid #07C160;color:#7F7F7F;',
  code: 'font-family:Menlo,Consolas,monospace;font-size:14px;background:#F2F2F2;padding:2px 6px;border-radius:4px;color:#C7254E;',
  pre: 'margin:16px 0;padding:16px;background:#2D2D2D;border-radius:8px;overflow-x:auto;',
  precode: 'font-family:Menlo,Consolas,monospace;font-size:13px;line-height:1.6;color:#F8F8F2;background:none;padding:0;display:block;',
  ul: 'margin:14px 0;padding-left:24px;',
  ol: 'margin:14px 0;padding-left:24px;',
  li: 'font-size:16px;line-height:1.75;color:#3F3F3F;margin:6px 0;',
  img: 'max-width:100%;height:auto;border-radius:8px;display:block;margin:16px auto;',
  hr: 'border:none;height:1px;background:#E5E5E5;margin:28px 0;',
  table: 'width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;',
  th: 'border:1px solid #E5E5E5;padding:8px 12px;text-align:left;background:#F7F7F7;font-weight:600;color:#3F3F3F;',
  td: 'border:1px solid #E5E5E5;padding:8px 12px;text-align:left;color:#3F3F3F;'
};

const WRAPPER =
  '<section style="font-family:-apple-system,BlinkMacSystemFont,\'PingFang SC\',\'Helvetica Neue\',\'Microsoft YaHei\',sans-serif;font-size:16px;line-height:1.75;color:#3F3F3F;">';

/**
 * 给渲染后的 body HTML 逐元素写入 inline style，并在最前面补一个标题。
 * 浏览器环境依赖 DOMParser；非浏览器环境直接返回带 wrapper 的字符串。
 */
export function toMpHtml(bodyHtml, title) {
  const titleHtml = '<h1 style="' + MP_STYLES.h1 + '">' + esc(title || '无标题笔记') + '</h1>';

  if (typeof DOMParser === 'undefined') {
    return titleHtml + WRAPPER + bodyHtml + '</section>';
  }

  const doc = new DOMParser().parseFromString(WRAPPER + bodyHtml + '</section>', 'text/html');
  const root = doc.body.firstElementChild;

  (function walk(node) {
    if (!node || node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    let style = MP_STYLES[tag];
    if (tag === 'code' && node.parentElement && node.parentElement.tagName.toLowerCase() === 'pre') {
      style = MP_STYLES.precode;
    }
    if (style) node.setAttribute('style', style);
    Array.prototype.slice.call(node.childNodes).forEach(walk);
  })(root);

  return titleHtml + root.outerHTML;
}
