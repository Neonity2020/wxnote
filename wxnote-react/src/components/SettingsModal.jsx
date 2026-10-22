import { useEffect, useState } from 'react';

const HOST_OPTIONS = [
  {
    value: 'beeimg',
    title: '蜜蜂图床（国内·免登录可用）',
    tag: '推荐',
    desc: '国内直连、速度快、接口已开放跨域，免注册即可上传；游客图片仅存 1 小时（注册后填 Token 长期保存）'
  },
  {
    value: 'local',
    title: '本地压缩内嵌',
    desc: '零配置，国内可用，图片随笔记存在本机；复制到公众号时会尝试自动转存，未转存需手动传图'
  },
  {
    value: 'custom',
    title: '自定义图床接口',
    desc: '兼容 PicGo / 兰空 / Chevereto / 七牛中转 等：POST multipart 字段 file，返回 JSON 带链接即可'
  },
  {
    value: 'hdr',
    title: 'HD-R 国内图床（免登录）',
    desc: '国内速度快、免注册，但接口无跨域许可，需填跨域代理前缀才能直传'
  },
  {
    value: 'telegraph',
    title: 'Telegraph（海外·免登录）',
    desc: '完全免配置，但国内访问不稳定'
  }
];

export default function SettingsModal({ open, cfg, onClose, onSave }) {
  const [draft, setDraft] = useState(cfg);

  useEffect(() => {
    if (open) setDraft(cfg);
    // 仅在弹层打开时同步一次，避免编辑过程中被外部状态覆盖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (ev) => {
      if (ev.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div
      className="modal-mask"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div className="modal modal-lg">
        <h3>
          <span className="dot" />
          图床设置
        </h3>

        <div className="modal-body">
          <p>
            贴图时图片会按这里的选择上传。蜜蜂图床是国内少数「免登录 + 接口开放跨域」的图床，浏览器可直接上传；
            其余国内图床接口大多无跨域许可，需走代理或自定义接口。
          </p>

          <div className="host-options">
            {HOST_OPTIONS.map((opt) => (
              <label key={opt.value} className={'host-opt' + (draft.type === opt.value ? ' selected' : '')}>
                <input
                  type="radio"
                  name="hostType"
                  value={opt.value}
                  checked={draft.type === opt.value}
                  onChange={() => set({ type: opt.value })}
                />
                <div>
                  <b>
                    {opt.title}
                    {opt.tag ? <span className="tag">{opt.tag}</span> : null}
                  </b>
                  <small>{opt.desc}</small>
                </div>
              </label>
            ))}
          </div>

          {draft.type === 'beeimg' ? (
            <div className="field-group">
              <label className="field">
                <span>蜜蜂图床 Token（注册后可在「API令牌」生成，留空=游客模式）</span>
                <input
                  type="text"
                  placeholder="留空则按游客上传，图片仅保存 1 小时"
                  value={draft.beeimgToken || ''}
                  onChange={(ev) => set({ beeimgToken: ev.target.value })}
                />
              </label>
              <label className="field">
                <span>存储通道 storage_id（默认 4 = 游客通道）</span>
                <input
                  type="text"
                  placeholder="4"
                  value={draft.storage || ''}
                  onChange={(ev) => set({ storage: ev.target.value })}
                />
              </label>
              <small className="hint">
                游客通道：每分钟限传 1 张、图片 1 小时后失效；填入 Token 后为账号通道，可长期保存。
              </small>
            </div>
          ) : null}

          {draft.type === 'custom' ? (
            <div className="field-group">
              <label className="field">
                <span>上传接口 URL</span>
                <input
                  type="text"
                  placeholder="https://your-image-host.com/api/upload"
                  value={draft.url || ''}
                  onChange={(ev) => set({ url: ev.target.value })}
                />
              </label>
              <label className="field">
                <span>Token（可选，将以 Bearer 发送）</span>
                <input
                  type="text"
                  placeholder="留空表示免鉴权"
                  value={draft.token || ''}
                  onChange={(ev) => set({ token: ev.target.value })}
                />
              </label>
              <label className="field">
                <span>返回字段路径（可选，默认自动识别 url / link / data.url）</span>
                <input
                  type="text"
                  placeholder="如 data.url"
                  value={draft.field || ''}
                  onChange={(ev) => set({ field: ev.target.value })}
                />
              </label>
            </div>
          ) : null}

          {draft.type === 'hdr' ? (
            <div className="field-group">
              <label className="field">
                <span>跨域代理前缀（可选，用 {'{url}'} 占位）</span>
                <input
                  type="text"
                  placeholder="https://your-proxy.com/?url={url}"
                  value={draft.proxy || ''}
                  onChange={(ev) => set({ proxy: ev.target.value })}
                />
              </label>
              <small className="hint">没有代理时，HD-R 直连会被浏览器拦截，只能退回本地内嵌。</small>
            </div>
          ) : null}
        </div>

        <div className="row">
          <button type="button" className="btn" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              onSave({
                type: draft.type,
                url: (draft.url || '').trim(),
                token: (draft.token || '').trim(),
                field: (draft.field || '').trim(),
                proxy: (draft.proxy || '').trim(),
                beeimgToken: (draft.beeimgToken || '').trim(),
                storage: (draft.storage || '').trim() || '4'
              })
            }
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
