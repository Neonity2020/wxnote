import { useMemo } from 'react';
import { renderMarkdown } from '../lib/markdown.js';
import { formatTime } from '../lib/format.js';

export default function Preview({ note, hidden }) {
  const body = (note.content || '').trim();
  const html = useMemo(() => (body ? renderMarkdown(body) : ''), [body]);

  return (
    <section className={'preview-pane' + (hidden ? ' hidden' : '')}>
      <div className="preview-inner">
        <div className="mp-title">{(note.title || '').trim() || '无标题笔记'}</div>
        <div className="mp-meta">
          <span className="author">微笔记</span>
          <span>{formatTime(note.updatedAt)}</span>
        </div>
        {html ? (
          <div className="mp-content" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <div className="preview-hint">
            预览区域
            <br />
            在左侧输入 Markdown 后，这里实时显示公众号排版效果
          </div>
        )}
      </div>
    </section>
  );
}
