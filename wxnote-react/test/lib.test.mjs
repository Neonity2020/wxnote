import test from 'node:test';
import assert from 'node:assert/strict';

import {
  countInlineImages,
  countTempImages,
  countWords,
  esc,
  excerpt,
  inlineMd,
  renderMarkdown,
  stripImages
} from '../src/lib/markdown.js';
import { createLocalImageStore } from '../src/lib/localImages.js';
import { pickLink } from '../src/lib/imageHost.js';

const B64 = 'data:image/webp;base64,' + 'A'.repeat(120);

test('esc 转义所有 HTML 敏感字符', () => {
  assert.equal(esc('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
});

test('inlineMd 支持图片、链接、加粗、斜体、删除线、行内代码', () => {
  const html = inlineMd('**粗** *斜* ~~删~~ `code` [链接](https://a.com) ![图](https://b.com/x.png)');
  assert.match(html, /<strong>粗<\/strong>/);
  assert.match(html, /<em>斜<\/em>/);
  assert.match(html, /<del>删<\/del>/);
  assert.match(html, /<code>code<\/code>/);
  assert.match(html, /<a href="https:\/\/a.com"/);
  assert.match(html, /<img src="https:\/\/b.com\/x.png" alt="图">/);
});

test('inlineMd 不会执行注入的标签', () => {
  const html = inlineMd('<img src=x onerror=alert(1)>');
  assert.ok(!html.includes('<img src=x'));
  assert.match(html, /&lt;img/);
});

test('renderMarkdown 渲染标题、列表、引用、代码块、表格、分割线', () => {
  const md = [
    '# 一级',
    '## 二级',
    '',
    '- 项目一',
    '- 项目二',
    '',
    '1. 有序',
    '',
    '> 引用文字',
    '',
    '```',
    'const a = 1;',
    '```',
    '',
    '| 列1 | 列2 |',
    '| --- | --- |',
    '| a | b |',
    '',
    '---',
    '',
    '段落文字'
  ].join('\n');

  const html = renderMarkdown(md);
  assert.match(html, /<h1>一级<\/h1>/);
  assert.match(html, /<h2>二级<\/h2>/);
  assert.match(html, /<ul><li>项目一<\/li><li>项目二<\/li><\/ul>/);
  assert.match(html, /<ol><li>有序<\/li><\/ol>/);
  assert.match(html, /<blockquote><p>引用文字<\/p><\/blockquote>/);
  assert.match(html, /<pre><code>const a = 1;<\/code><\/pre>/);
  assert.match(html, /<thead><tr><th>列1<\/th><th>列2<\/th><\/tr><\/thead>/);
  assert.match(html, /<td>a<\/td><td>b<\/td>/);
  assert.match(html, /<hr>/);
  assert.match(html, /<p>段落文字<\/p>/);
});

test('renderMarkdown 未闭合代码块也能输出', () => {
  const html = renderMarkdown('```\nlet x = 1;');
  assert.match(html, /<pre><code>let x = 1;<\/code><\/pre>/);
});

test('本地图片折叠：无 base64 残留、往返一致、幂等', () => {
  const store = createLocalImageStore();
  const md = '# 标题\n\n![截图](' + B64 + ')\n\n> 引用\n';
  const display = store.toDisplay(md);

  assert.ok(!display.includes('data:image'));
  assert.match(display, /!\[截图\]\(editor-local:\/\/local1\)/);
  assert.equal(store.toReal(display), md);
  assert.equal(store.toDisplay(md), display);
});

test('本地图片折叠：多图各自独立标记，未知标记原样保留', () => {
  const store = createLocalImageStore();
  const two = '![](data:image/png;base64,AAAA)\n![b](data:image/png;base64,BBBB)';
  const display = store.toDisplay(two);

  const tags = display.match(/editor-local:\/\/[A-Za-z0-9_-]+/g) || [];
  assert.equal(tags.length, 2);
  assert.notEqual(tags[0], tags[1]);
  assert.equal(store.toReal(display), two);

  const untouched = '![](editor-local://not-registered)';
  assert.equal(store.toReal(untouched), untouched);
});

test('字数与摘要不计入图片语法', () => {
  const md = '## 标题\n\n正文八个字\n\n![图](' + B64 + ')';
  // 与原版一致：只剔除图片语法，标题符号仍计入字数
  assert.equal(countWords(md), '##标题正文八个字'.length);
  assert.equal(countWords('![图](' + B64 + ')'), 0);
  assert.equal(excerpt(md), '正文八个字');
  assert.equal(stripImages('a![x](y)b'), 'ab');
});

test('统计内嵌图与蜜蜂临时图数量', () => {
  const md =
    '![a](data:image/png;base64,AAA)\n' +
    '![b](https://beeimg.us.ci/temp/abc.webp)\n' +
    '![c](https://cdn.example.com/x.png)';
  assert.equal(countInlineImages(md), 1);
  assert.equal(countTempImages(md), 1);
});

test('pickLink 兼容各家图床返回结构', () => {
  assert.equal(pickLink({ link: 'https://a/1.png' }), 'https://a/1.png');
  assert.equal(pickLink({ data: { url: 'https://a/2.png' } }), 'https://a/2.png');
  assert.equal(pickLink({ data: [{ url: 'https://a/3.png' }] }), 'https://a/3.png');
  assert.equal(pickLink([{ src: 'https://a/4.png' }]), 'https://a/4.png');
  assert.equal(pickLink({ data: { public_url: 'https://a/5.png' } }), 'https://a/5.png');
  assert.equal(pickLink({ result: { image_url: 'https://a/6.png' } }, 'result.image_url'), 'https://a/6.png');
  assert.equal(pickLink('https://a/7.png'), 'https://a/7.png');
  assert.equal(pickLink({ nothing: true }), '');
});
