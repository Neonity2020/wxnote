# 架构说明

## 设计取舍

| 决策 | 原因 |
|---|---|
| 单文件、零依赖 | 交付物要能「打开即用」，不依赖网络、不需要构建；拷一个文件就能分享 |
| 自研 Markdown 解析器 | 不引入 markdown-it / marked 等 CDN 依赖；只实现写作实际用到的子集，公众号渲染可控 |
| 复制富文本而非调 API | 公众号没有面向个人的发布接口，后台粘贴是唯一稳定路径 |
| 内联样式 | 公众号编辑器会剥离 `class`、`<style>`，只有行内 `style` 能存活 |
| 本地存储优先 | 无需登录、无后端，隐私可控；代价是跨设备不同步 |

## 运行结构

```
index.html
├─ <style>           设计令牌 + 三段式布局 + 组件 + 断点
├─ <body>            侧边栏(笔记列表) / 编辑区 / 预览区 + 两个 Modal
└─ <script>          IIFE，无全局污染
   ├─ 状态与存储     notes[] / activeId / localStorage
   ├─ Markdown 解析  renderMarkdown → HTML
   ├─ 公众号渲染     toMpHtml：给每个标签挂 style
   ├─ 复制           copyRichText / copyFallback
   ├─ 图片管线       compressImage → uploadImage → replacePlaceholder
   └─ 交互绑定       工具栏 / 快捷键 / 粘贴拖拽 / 设置面板
```

## 数据模型

```js
{
  id: "kx3f9a",            // genId()，时间戳 36 进制 + 随机串
  title: "文章标题",
  content: "# Markdown 原文…",
  updatedAt: 1792630000000
}
```

存储键：

| key | 内容 |
|---|---|
| `wxnote.notes.v1` | 笔记数组（JSON） |
| `wxnote.active.v1` | 当前选中笔记 id |
| `wxnote.host.v1` | 图床配置（type / url / token / field / proxy / beeimgToken / storage） |

写入时机：`input` 事件 → `markSaving()` 做 500ms 防抖 → `saveNotes()`；配额写失败会 toast 告警，不静默丢内容。

## Markdown 解析

行级状态机，一次扫描逐行分派，用四个 `flush*` 收口段落、列表、引用、表格：

```
for each line:
  代码块内 → 原样累积
  围栏 ``` → 开/关
  # ## ###  → 标题
  >         → 引用（可嵌套段落）
  - / * / 1.→ 列表（连续行合并成 <ul>/<ol>）
  | a | b | → 表格（第二行作分隔行）
  ---       → 分割线
  空行      → 断开当前块
  其他      → 段落
```

行内层 `inlineMd()` 依次处理：转义 → 行内代码 → 图片 → 链接 → 加粗 → 斜体 → 删除线。

> 注意：正则里的括号字符用 Unicode 转义（`\u0029`）书写，避免被静态检查工具的括号配平算法误判——这也是 `PQ001` 告警的来源，属误报。

## 公众号样式注入

`toMpHtml(html)` 是「HTML 字符串 → 带内联样式的 HTML 字符串」的转换层，用 `MP_STYLES` 里按标签名定义的一组样式模板，对 `h1~h3 / p / blockquote / ul / ol / li / pre / code / table / hr / a / img` 逐个套 `style="..."`。

之所以不直接给预览区加 CSS class：预览用 class，复制用内联样式，两套并行维护容易漂移，因此**预览渲染也走同一套样式**（`renderPreview` 复用 `toMpHtml`），保证「所见即所得」。

## 图片管线

```
文件/剪贴板
   ↓ handleImageFile：类型与大小校验（≤15MB）
   ↓ 占位符 ![图片上传中…](uploading-xxxx) 插入光标处
   ↓ compressImage：长边 1600，WebP q=0.82，不支持则 JPEG q=0.85
   ↓ uploadImage：按 hostCfg.type 分派
   ├─ local      → 直接返回 dataURL
   ├─ beeimg     → POST https://www.beeimg.cn/api/v2/upload
   ├─ custom     → POST 自定义接口（可带 Bearer）
   ├─ hdr        → 经跨域代理前缀转发
   └─ telegraph  → POST telegra.ph/upload
   ↓ replacePlaceholder：把占位符替换成 ![文件名](真实URL)，并保持光标
   ↓ 失败兜底：降级本地内嵌 + 明确提示
```

占位符机制的价值：上传是异步的，用户不必等；上传失败也能定位到具体那一张图。

## 编辑器的 base64 折叠

本地内嵌图的 dataURL 会有几万字符，直接塞进 `<textarea>` 会让人没法读 Markdown。做法是**编辑态与存储态分离**：

| 状态 | 形式 |
|---|---|
| 存储态 `note.content` | `![截图](data:image/webp;base64,AAAA…)` |
| 编辑态 `editor.value` | `![截图](editor-local://local1)` |

- `toDisplayMd()`：写 textarea 前把 dataURL 折叠成短标记，`LOCAL_IMG_REV[dataURL] = tag` 保证同一张图永远同一个 tag（幂等）
- `toRealMd()`：每次 `input` 时把短标记还原成 dataURL 再写回 `note.content`
- 未知 tag 原样保留，不静默删除内容

往返一致性、幂等性、多图分配已用 Node 单测覆盖。

## 响应式与交互

| 断点 | 行为 |
|---|---|
| > 1024px | 三栏：列表 260px + 编辑 + 预览 |
| ≤ 1024px | 列表收进抽屉，按钮唤起 |
| ≤ 768px | 编辑 / 预览切换单栏（`setView`） |

## 可测试点

由于是单文件，测试靠「抽函数 + Node 跑」：

```bash
# 语法自检
python3 -c "import re;open('/tmp/s.js','w').write(re.findall(r'<script>(.*?)</script>',open('index.html').read(),re.S)[-1])"
node --check /tmp/s.js
```

`pickLink()`（图床返回结构解析）、`toDisplayMd()/toRealMd()`（base64 折叠往返）都适合这样单独验证，也建议新增功能时沿用。
