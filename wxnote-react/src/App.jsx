import { useCallback, useEffect, useRef, useState } from 'react';
import TopBar from './components/TopBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import EditorPane from './components/EditorPane.jsx';
import Preview from './components/Preview.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import PublishModal from './components/PublishModal.jsx';
import Toast from './components/Toast.jsx';
import { MenuIcon } from './components/Icons.jsx';
import { useMediaQuery, useToast } from './hooks/useUi.js';
import { countInlineImages, countTempImages, renderMarkdown } from './lib/markdown.js';
import { toMpHtml } from './lib/mpStyles.js';
import { copyPlainText, copyRichText, copyRichTextFallback } from './lib/clipboard.js';
import {
  HOST_NAMES,
  genId,
  loadActiveId,
  loadHostCfg,
  loadNotes,
  saveActiveId,
  saveHostCfg,
  saveNotes
} from './lib/storage.js';

export default function App() {
  const [notes, setNotes] = useState(loadNotes);
  const [activeId, setActiveId] = useState(() => loadActiveId(notes));
  const [view, setView] = useState('split');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hostCfg, setHostCfg] = useState(loadHostCfg);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [saveState, setSaveState] = useState('已自动保存');
  const [focusSignal, setFocusSignal] = useState(0);
  const [toast, showToast] = useToast();

  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  const activeNote = notes.find((n) => n.id === activeId) || notes[0];

  /* ---------- 响应式：列表在窄屏收起，视图默认值随断点切换 ---------- */
  useEffect(() => {
    setSidebarOpen(!isTablet);
  }, [isTablet]);

  useEffect(() => {
    setView(isMobile ? 'edit' : 'split');
  }, [isMobile]);

  /* ---------- 持久化：500ms 防抖写 localStorage ---------- */
  const saveTimer = useRef(null);
  const didMount = useRef(false);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return undefined;
    }
    setSaveState('保存中…');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const ok = saveNotes(notes);
      setSaveState(ok ? '已自动保存' : '存储已满');
      if (!ok) showToast('本地存储已满：图片多时请切换图床或删掉旧图', false);
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [notes, showToast]);

  useEffect(() => {
    saveActiveId(activeId);
  }, [activeId]);

  /* ---------- 笔记操作 ---------- */
  const updateNote = useCallback((id, patch) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n))
    );
  }, []);

  const handleTitleChange = (title) => updateNote(activeNote.id, { title });
  const handleContentChange = (content) => updateNote(activeNote.id, { content });

  const handleSelect = (id) => {
    setActiveId(id);
    if (isTablet) setSidebarOpen(false);
  };

  const handleCreate = () => {
    const note = { id: genId(), title: '', content: '', updatedAt: Date.now() };
    setNotes((prev) => [note, ...prev]);
    setActiveId(note.id);
    if (isTablet) setSidebarOpen(false);
    setView((v) => (v === 'preview' ? 'edit' : v));
    setFocusSignal((s) => s + 1);
    showToast('已新建笔记');
  };

  const handleDelete = (note) => {
    if (notes.length <= 1) {
      showToast('至少保留一篇笔记', false);
      return;
    }
    if (!window.confirm('删除「' + (note.title || '无标题笔记') + '」？此操作不可恢复。')) return;
    const next = notes.filter((n) => n.id !== note.id);
    setNotes(next);
    if (activeId === note.id) setActiveId(next[0].id);
    showToast('已删除');
  };

  /* ---------- 发布 / 复制 ---------- */
  const buildMpHtml = () =>
    toMpHtml(renderMarkdown(activeNote.content || ''), (activeNote.title || '').trim() || '无标题笔记');

  const handlePublish = () => {
    const html = buildMpHtml();
    copyRichText(html)
      .then(() => setPublishOpen(true))
      .catch(() => {
        if (copyRichTextFallback(html)) setPublishOpen(true);
        else showToast('复制失败，请改用「复制 HTML」', false);
      });
  };

  const handleCopyHtml = () => {
    copyPlainText(buildMpHtml())
      .then(() => showToast('HTML 源码已复制'))
      .catch(() => showToast('复制失败', false));
  };

  const handleSaveSettings = (next) => {
    const saved = saveHostCfg(next);
    setHostCfg(saved);
    setSettingsOpen(false);
    let msg = '图床已切换为「' + (HOST_NAMES[saved.type] || saved.type) + '」';
    if (saved.type === 'beeimg' && !saved.beeimgToken) msg += '（游客模式：图片仅存 1 小时）';
    showToast(msg);
  };

  /* ---------- 发布提示文案 ---------- */
  const inlineCount = countInlineImages(activeNote.content);
  const tempCount = countTempImages(activeNote.content);
  let publishHint;
  if (inlineCount) {
    publishHint = (
      <>
        本文有 <b>{inlineCount}</b> 张本地内嵌图片：粘贴后若显示空白，请在公众号后台重新上传这几张图，
        或在「图床」里切换到可直传的接口。
      </>
    );
  } else if (tempCount) {
    publishHint = (
      <>
        本文有 <b>{tempCount}</b> 张蜜蜂图床游客图（1 小时后失效）：请在「图床」里填写 Token 后重传，
        否则图片会过期。
      </>
    );
  } else {
    publishHint = <>文内图片均为图床外链，粘贴时公众号会自动抓取转存。</>;
  }

  const showEditor = view !== 'preview';
  const showPreview = view !== 'edit';

  return (
    <>
      <TopBar
        view={view}
        onViewChange={setView}
        onOpenSettings={() => setSettingsOpen(true)}
        onCopyHtml={handleCopyHtml}
        onPublish={handlePublish}
      />

      {isMobile ? (
        <div className="mobile-tab">
          <button
            type="button"
            className="icon-btn"
            title="笔记列表"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            <MenuIcon />
          </button>
          <div className="view-switch">
            <button type="button" className={view === 'edit' ? 'active' : ''} onClick={() => setView('edit')}>
              编辑
            </button>
            <button
              type="button"
              className={view === 'preview' ? 'active' : ''}
              onClick={() => setView('preview')}
            >
              预览
            </button>
          </div>
        </div>
      ) : null}

      <div className="layout">
        <Sidebar
          notes={notes}
          activeId={activeNote.id}
          open={sidebarOpen}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />

        <EditorPane
          key={activeNote.id}
          note={activeNote}
          hidden={!showEditor}
          onTitleChange={handleTitleChange}
          onContentChange={handleContentChange}
          hostCfg={hostCfg}
          showToast={showToast}
          saveState={saveState}
          focusSignal={focusSignal}
        />

        <Preview note={activeNote} hidden={!showPreview} />
      </div>

      <Toast toast={toast} />

      <SettingsModal
        open={settingsOpen}
        cfg={hostCfg}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      <PublishModal
        open={publishOpen}
        hint={publishHint}
        onClose={() => setPublishOpen(false)}
        onCopyAgain={() => {
          setPublishOpen(false);
          handlePublish();
        }}
      />
    </>
  );
}
