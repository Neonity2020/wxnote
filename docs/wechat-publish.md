# 发布到公众号

## 为什么不是"真·一键发布"

微信公众号开放平台没有面向个人订阅号的「发布图文」接口。官方 `draft/add` 接口要求认证服务号、配置 IP 白名单，且需要 `AppID/AppSecret` 换 `access_token`——对个人作者来说链路太重，还必须部署服务端保管密钥（密钥放前端等于公开泄露）。

所以本项目的「发布」做的是业内通行方案：**把文章转成带内联样式的富文本，复制到剪贴板，你到公众号后台正文区粘贴**。排版完整保留，剩下只是点一下群发。

## 技术路径

```
Markdown 原文
  → renderMarkdown()      解析成 HTML（class 无关）
  → toMpHtml()            给每个标签写 style="..."（内联）
  → copyRichText()        Clipboard API 写 text/html
  → 公众号后台 ⌘/Ctrl+V
```

### 为什么必须内联样式

公众号后端的富文本编辑器会做一次白名单清洗：

- `<style>` 标签被移除
- `class` 属性被剥离
- 只保留标签、`style` 行内属性、以及少数字段（`data-*` 部分保留）

所以复制过去的 HTML 里**每一个视觉属性都必须写在 `style` 上**。`MP_STYLES` 就是这个映射表：

```js
p:          "margin:0 0 16px;font-size:16px;line-height:1.75;color:#111;letter-spacing:.5px"
blockquote: "margin:16px 0;padding:12px 16px;border-left:3px solid #07C160;background:#F7F7F7;color:#666"
pre:        "margin:16px 0;padding:14px 16px;background:#2B2B2B;border-radius:6px;overflow-x:auto"
a:          "color:#576B95;text-decoration:none"
```

预览区复用同一套样式函数，所以「右边看到什么，粘过去就是什么」。

### 复制实现

```js
navigator.clipboard.write([new ClipboardItem({
  'text/html': new Blob([html], { type: 'text/html' }),
  'text/plain': new Blob([text], { type: 'text/plain' })
})])
```

三处兜底：

1. 非安全上下文（`file://` 或无 HTTPS）→ 降级 `document.execCommand('copy')` + 隐藏容器选中复制
2. 仍失败 → 提示改用「复制 HTML」，手动贴进支持源码的编辑器
3. 全部失败 → 明确 toast，不假装成功

## 发布前自检

点击「发布到公众号」后，弹窗会按内容给出提示：

| 情况 | 提示 |
|---|---|
| 文内有 N 张本地内嵌图 | 粘贴后若空白，需在后台重传这 N 张 |
| 文内有 N 张蜜蜂游客图 | 图片 1 小时后失效，建议填 Token 重传 |
| 全是图床外链 | 公众号会自动抓取转存 |

## 粘贴后还要检查什么

1. **图片是否都过来了**——转存有失败率，图多时逐张看
2. **代码块横向滚动**——公众号不一定会保留 `overflow-x`，长代码行可能被截断
3. **表格**——窄屏下可能挤压，必要时截图替代
4. **首行缩进**——公众号默认不缩进，本项目也刻意不做首行缩进（更接近现代排版）

## 想升级成真·一键发布？

需要满足：

- 公众号类型为**认证服务号**
- 一个能访问外网的服务端（存 `AppSecret`、换 `access_token`、做 IP 白名单）
- 图片先传公众号素材库拿 `media_id`（外链图需下载后重传）

流程大致是：`access_token` → `media/uploadimg`（正文图）→ `draft/add`（草稿）→ 人工确认后群发。这部分是服务端活儿，前端单文件做不了，本项目刻意没有假装支持。
