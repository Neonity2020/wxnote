import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Toolbar from './Toolbar.jsx';
import { localImages } from '../lib/localImages.js';
import { FENCE, countInlineImages, countWords } from '../lib/markdown.js';
import { MAX_FILE_SIZE, compressImage, uploadImage } from '../lib/imageHost.js';

export default function EditorPane({
  note,
  hidden,
  onTitleChange,
  onContentChange,
  hostCfg,
  showToast,
  saveState,
  focusSignal
}) {
  const [text, setText] = useState(() => localImages.toDisplay(note.content));
  const taRef = useRef(null);
  const titleRef = useRef(null);
  const fileRef = useRef(null);
  const textRef = useRef(text);
  const pendingSel = useRef(null);

  /* 新建笔记后自动聚焦标题 */
  useEffect(() => {
    if (focusSignal > 0 && titleRef.current) titleRef.current.focus();
  }, [focusSignal]);

  /* 光标恢复：state 更新会重置 selection，渲染后补回来 */
  useLayoutEffect(() => {
    if (!pendingSel.current || !taRef.current) return;
    const [start, end] = pendingSel.current;
    pendingSel.current = null;
    taRef.current.focus();
    taRef.current.setSelectionRange(start, end);
  }, [text]);

  function commit(nextText, selStart, selEnd) {
    textRef.current = nextText;
    setText(nextText);
    if (selStart != null) {
      pendingSel.current = [selStart, selEnd == null ? selStart : selEnd];
    }
    onContentChange(localImages.toReal(nextText));
  }

  function handleChange(ev) {
    const raw = ev.target.value;
    /* 兜底：万一有完整 base64 被粘进编辑器（如粘贴纯文本 Markdown），也折叠成短标记 */
    if (raw.indexOf('data:image') >= 0) {
      const folded = localImages.toDisplay(raw);
      if (folded !== raw) {
        const caret = Math.max(0, ev.target.selectionStart + (folded.length - raw.length));
        commit(folded, caret, caret);
        return;
      }
    }
    textRef.current = raw;
    setText(raw);
    onContentChange(localImages.toReal(raw));
  }

  function insertSnippet(snippet) {
    const ta = taRef.current;
    const start = ta ? ta.selectionStart : textRef.current.length;
    const end = ta ? ta.selectionEnd : start;
    const next = textRef.current.slice(0, start) + snippet + textRef.current.slice(end);
    commit(next, start + snippet.length, start + snippet.length);
  }

  function wrapSelection(before, after, placeholder) {
    const ta = taRef.current;
    const start = ta ? ta.selectionStart : textRef.current.length;
    const end = ta ? ta.selectionEnd : start;
    const selected = textRef.current.slice(start, end) || placeholder;
    const next = textRef.current.slice(0, start) + before + selected + after + textRef.current.slice(end);
    commit(next, start + before.length, start + before.length + selected.length);
  }

  function linePrefix(prefix) {
    const ta = taRef.current;
    const caret = ta ? ta.selectionStart : textRef.current.length;
    const lineStart = textRef.current.lastIndexOf('\n', caret - 1) + 1;
    const next = textRef.current.slice(0, lineStart) + prefix + textRef.current.slice(lineStart);
    commit(next, caret + prefix.length, caret + prefix.length);
  }

  function handleToolbar(kind) {
    switch (kind) {
      case 'h1':
        return linePrefix('# ');
      case 'h2':
        return linePrefix('## ');
      case 'h3':
        return linePrefix('### ');
      case 'quote':
        return linePrefix('> ');
      case 'ul':
        return linePrefix('- ');
      case 'ol':
        return linePrefix('1. ');
      case 'bold':
        return wrapSelection('**', '**', '加粗文字');
      case 'italic':
        return wrapSelection('*', '*', '斜体文字');
      case 'del':
        return wrapSelection('~~', '~~', '删除线');
      case 'code':
        return wrapSelection('`', '`', '代码');
      case 'codeblock':
        return wrapSelection(FENCE + '\n', '\n' + FENCE, '// 代码');
      case 'link':
        return wrapSelection('[', '](https://)', '链接文字');
      case 'hr':
        return wrapSelection('\n---\n', '', '');
      case 'image':
        return fileRef.current && fileRef.current.click();
      default:
        return undefined;
    }
  }

  /* 上传完成：把占位符替换成真实图片（编辑态仍显示折叠后的短标记） */
  function finishPlaceholder(tag, md) {
    const re = new RegExp('\\n?!\\[图片上传中…\\]\\(' + tag + '\\)\\n?');
    const current = textRef.current;
    const nextRaw = current.replace(re, md ? '\n' + md + '\n' : '');
    const displayText = localImages.toDisplay(nextRaw);
    let caret = displayText.length;
    if (md) {
      const dispMd = localImages.toDisplay(md);
      const idx = displayText.indexOf(dispMd);
      if (idx >= 0) caret = idx + dispMd.length;
    }
    commit(displayText, caret, caret);
  }

  function handleFile(file) {
    if (!file) return;
    if (!file.type || file.type.indexOf('image/') !== 0) {
      showToast('仅支持图片文件', false);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showToast('图片不能超过 15MB', false);
      return;
    }

    const tag = 'uploading-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    insertSnippet('\n![图片上传中…](' + tag + ')\n');
    showToast(hostCfg.type === 'local' ? '图片处理中…' : '图片上传中…');

    uploadImage(file, hostCfg)
      .then((url) => {
        finishPlaceholder(tag, '![' + (file.name || '图片') + '](' + url + ')');
        if (hostCfg.type === 'local') showToast('图片已压缩内嵌');
        else if (hostCfg.type === 'beeimg' && !hostCfg.beeimgToken) {
          showToast('已上传蜜蜂图床（游客图 1 小时后失效）', false);
        } else showToast('图片已上传图床');
      })
      .catch((err) => {
        /* 图床不可用时降级本地内嵌，绝不静默丢图 */
        compressImage(file)
          .then((r) => {
            finishPlaceholder(tag, '![' + (file.name || '图片') + '](' + r.dataUrl + ')');
            showToast('图床不可用（' + ((err && err.message) || '未知错误') + '），已本地内嵌', false);
          })
          .catch(() => {
            finishPlaceholder(tag, '');
            showToast('图片插入失败，请重试', false);
          });
      });
  }

  function handlePaste(ev) {
    const cb = ev.clipboardData;
    if (!cb || !cb.items) return;
    for (let i = 0; i < cb.items.length; i++) {
      const item = cb.items[i];
      if (item.type && item.type.indexOf('image/') === 0) {
        ev.preventDefault();
        handleFile(item.getAsFile());
        return;
      }
    }
  }

  function handleDrop(ev) {
    const files = ev.dataTransfer && ev.dataTransfer.files;
    if (files && files.length && files[0].type.indexOf('image/') === 0) {
      ev.preventDefault();
      handleFile(files[0]);
    }
  }

  const localCount = countInlineImages(note.content);

  return (
    <section className={'editor-pane' + (hidden ? ' hidden' : '')}>
      <input
        ref={titleRef}
        className="title-input"
        placeholder="无标题笔记"
        maxLength={100}
        value={note.title || ''}
        onChange={(ev) => onTitleChange(ev.target.value)}
      />

      <Toolbar onAction={handleToolbar} />

      <textarea
        ref={taRef}
        className="editor"
        spellCheck={false}
        placeholder={'开始用 Markdown 写作…\n\n# 标题\n**加粗**、*斜体*、`代码`\n> 引用、- 列表、```代码块'}
        value={text}
        onChange={handleChange}
        onPaste={handlePaste}
        onDragOver={(ev) => ev.preventDefault()}
        onDrop={handleDrop}
        onKeyDown={(ev) => {
          if (ev.key === 'Tab') {
            ev.preventDefault();
            wrapSelection('  ', '', '');
          }
        }}
      />

      <div className="statusbar">
        <span>{countWords(note.content)} 字</span>
        <span className="local-hint">
          {localCount ? '含 ' + localCount + ' 张本地图（编辑器内以 editor-local:// 占位）' : ''}
        </span>
        <span>{saveState}</span>
        <span style={{ marginLeft: 'auto' }}>Markdown</span>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(ev) => {
          const f = ev.target.files && ev.target.files[0];
          if (f) handleFile(f);
          ev.target.value = '';
        }}
      />
    </section>
  );
}
