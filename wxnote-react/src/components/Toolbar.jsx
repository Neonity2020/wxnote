const BUTTONS = [
  { kind: 'h1', label: 'H1', title: '一级标题' },
  { kind: 'h2', label: 'H2', title: '二级标题' },
  { kind: 'h3', label: 'H3', title: '三级标题' },
  { sep: true },
  { kind: 'bold', label: <b>B</b>, title: '加粗' },
  { kind: 'italic', label: <i>I</i>, title: '斜体' },
  { kind: 'del', label: <s>S</s>, title: '删除线' },
  { kind: 'code', label: '</>', title: '行内代码' },
  { sep: true },
  { kind: 'quote', label: '❝', title: '引用' },
  { kind: 'ul', label: '• 列表', title: '无序列表' },
  { kind: 'ol', label: '1. 列表', title: '有序列表' },
  { kind: 'codeblock', label: '{ }', title: '代码块' },
  { kind: 'link', label: '🔗', title: '链接' },
  { kind: 'image', label: '🖼 图片', title: '插入图片（也可直接粘贴截图）' },
  { kind: 'hr', label: '―', title: '分割线' }
];

export default function Toolbar({ onAction }) {
  return (
    <div className="toolbar">
      {BUTTONS.map((btn, i) =>
        btn.sep ? (
          <span className="sep" key={'sep-' + i} />
        ) : (
          <button
            key={btn.kind}
            type="button"
            title={btn.title}
            onMouseDown={(ev) => ev.preventDefault()}
            onClick={() => onAction(btn.kind)}
          >
            {btn.label}
          </button>
        )
      )}
    </div>
  );
}
