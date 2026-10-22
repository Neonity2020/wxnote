import { CodeIcon, GearIcon, LogoIcon, SendIcon } from './Icons.jsx';

const VIEWS = [
  { key: 'edit', label: '编辑' },
  { key: 'split', label: '分屏' },
  { key: 'preview', label: '预览' }
];

export default function TopBar({ view, onViewChange, onOpenSettings, onCopyHtml, onPublish }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo">
          <LogoIcon />
        </span>
        微笔记 <small>Notion Like · Markdown · 一键发公众号</small>
      </div>

      <div className="spacer" />

      <div className="view-switch" role="tablist" aria-label="视图切换">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            className={view === v.key ? 'active' : ''}
            onClick={() => onViewChange(v.key)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <button type="button" className="btn" title="图床设置" onClick={onOpenSettings}>
        <GearIcon />
        <span className="txt">图床</span>
      </button>

      <button type="button" className="btn" title="复制带内联样式的 HTML 源码" onClick={onCopyHtml}>
        <CodeIcon />
        <span className="txt">复制 HTML</span>
      </button>

      <button type="button" className="btn btn-primary" onClick={onPublish}>
        <SendIcon />
        <span className="txt">发布到公众号</span>
      </button>
    </header>
  );
}
