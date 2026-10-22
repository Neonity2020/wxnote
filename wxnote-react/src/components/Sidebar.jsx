import { PlusIcon, TrashIcon } from './Icons.jsx';
import { excerpt } from '../lib/markdown.js';
import { formatTime } from '../lib/format.js';

export default function Sidebar({ notes, activeId, open, onSelect, onCreate, onDelete }) {
  const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside className={'sidebar' + (open ? '' : ' closed')}>
      <div className="sidebar-head">
        <span>我的笔记</span>
        <button type="button" className="icon-btn" title="新建笔记" onClick={onCreate}>
          <PlusIcon />
        </button>
      </div>

      <div className="note-list">
        {sorted.length === 0 ? (
          <div className="empty-notes">
            还没有笔记
            <br />
            点击右上角 + 新建一篇
          </div>
        ) : (
          sorted.map((note) => (
            <div
              key={note.id}
              className={'note-item' + (note.id === activeId ? ' active' : '')}
              onClick={() => onSelect(note.id)}
            >
              <div className="t">{note.title || '无标题笔记'}</div>
              <div className="s">{excerpt(note.content)}</div>
              <div className="d">{formatTime(note.updatedAt)}</div>
              <button
                type="button"
                className="del"
                title="删除"
                onClick={(ev) => {
                  ev.stopPropagation();
                  onDelete(note);
                }}
              >
                <TrashIcon />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
