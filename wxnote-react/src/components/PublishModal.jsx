import { useEffect } from 'react';

export default function PublishModal({ open, hint, onClose, onCopyAgain }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (ev) => {
      if (ev.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-mask"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <h3>
          <span className="dot" />
          已复制为公众号格式
        </h3>
        <p>文章内容已按微信公众号排版（内联样式）复制到剪贴板，接下来：</p>
        <ol>
          <li>打开微信公众号后台 → 新建图文</li>
          <li>
            在正文编辑区直接 <b>⌘/Ctrl + V</b> 粘贴
          </li>
          <li>排版会完整保留，检查后即可群发</li>
        </ol>
        <div className="hint" style={{ marginBottom: 18 }}>
          {hint}
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={onCopyAgain}>
            再复制一次
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}
