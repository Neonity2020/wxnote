/**
 * 本地持久化：笔记列表、当前笔记、图床配置
 */
import { FENCE } from './markdown.js';

const BT = String.fromCharCode(96);
export const NOTES_KEY = 'wxnote.notes.v1';
export const ACTIVE_KEY = 'wxnote.active.v1';
export const HOST_KEY = 'wxnote.host.v1';

export function genId() {
  return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const DEFAULT_CONTENT = [
  '# 欢迎使用微笔记',
  '',
  '一款 **Notion Like** 的轻量 Markdown 笔记，写完后可以 *一键复制* 到微信公众号，排版自动适配公众号风格。',
  '',
  '## 为什么好用',
  '',
  '- 左侧管理笔记，自动保存到本地',
  '- 右侧实时预览公众号排版效果',
  '- 直接粘贴截图，自动压缩并上传图床（默认蜜蜂图床，国内直连）',
  '- 点右上角「图床」可切换国内图床 / 自定义接口',
  '- 点击右上角「发布到公众号」，粘贴即用',
  '',
  '## 试试 Markdown',
  '',
  '> 简洁是智慧的灵魂。',
  '',
  '行内代码 ' + BT + 'console.log("hello")' + BT + '，代码块：',
  '',
  FENCE,
  'function hello() {',
  '  return "Hello, 1024!";',
  '}',
  FENCE,
  '',
  '| 功能 | 状态 |',
  '| --- | --- |',
  '| Markdown 写作 | ✅ |',
  '| 公众号排版 | ✅ |',
  '| 本地自动保存 | ✅ |',
  '',
  '---',
  '',
  '开始你的创作吧 🎉'
].join('\n');

export function createDefaultNote() {
  return {
    id: genId(),
    title: '我的第一篇笔记',
    content: DEFAULT_CONTENT,
    updatedAt: Date.now()
  };
}

export function loadNotes() {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return arr;
    }
  } catch (e) {
    /* 数据损坏时回落到默认笔记 */
  }
  return [createDefaultNote()];
}

/** @returns {boolean} 是否写入成功（失败通常是配额满了） */
export function saveNotes(notes) {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadActiveId(notes) {
  const saved = localStorage.getItem(ACTIVE_KEY);
  if (saved && notes.some((n) => n.id === saved)) return saved;
  return notes[0].id;
}

export function saveActiveId(id) {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch (e) {
    /* 忽略 */
  }
}

export const DEFAULT_HOST = {
  type: 'beeimg',
  url: '',
  token: '',
  field: '',
  proxy: '',
  beeimgToken: '',
  storage: '4'
};

export const HOST_NAMES = {
  beeimg: '蜜蜂图床',
  local: '本地压缩内嵌',
  custom: '自定义图床',
  hdr: 'HD-R 国内图床',
  telegraph: 'Telegraph 图床'
};

export function loadHostCfg() {
  try {
    const raw = localStorage.getItem(HOST_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      if (o && o.type) return { ...DEFAULT_HOST, ...o };
    }
  } catch (e) {
    /* 忽略 */
  }
  return { ...DEFAULT_HOST };
}

export function saveHostCfg(cfg) {
  const next = { ...DEFAULT_HOST, ...cfg };
  try {
    localStorage.setItem(HOST_KEY, JSON.stringify(next));
  } catch (e) {
    /* 忽略 */
  }
  return next;
}
