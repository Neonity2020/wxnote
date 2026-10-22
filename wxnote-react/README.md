# 微笔记 · React 版

用 **Vite 5 + React 18** 重写的「微笔记」——一款为微信公众号写作而生的 Notion Like Markdown 笔记应用。

和仓库根目录那份单文件版（`index.html`，零构建、双击即用）功能完全对等，区别只在工程形态：这里拆成了组件、hooks 与纯函数模块，可以独立构建、复用、写测试。

## 快速开始

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # 产物在 dist/
npm run preview  # 本地预览构建产物
npm test         # 纯逻辑单元测试（node --test）
```

运行时依赖只有 `react` / `react-dom`：Markdown 解析、图床上传、富文本复制全部自己实现，没有引入任何 UI 库、图标库或编辑器框架。

## 功能

| 能力 | 说明 |
|---|---|
| 笔记管理 | 左侧列表按更新时间排序，新建 / 切换 / 删除，500ms 防抖自动落盘 localStorage |
| Markdown 写作 | 标题、加粗、斜体、删除线、行内代码、引用、有序/无序列表、代码块、表格、分割线、链接、图片；工具栏 + Tab 缩进 |
| 公众号排版预览 | 677px 正文宽、绿色标题竖条、引用块、深色代码块，与最终粘贴效果一致 |
| 一键发布 | 把正文转成**逐元素内联样式**的富文本写入剪贴板，公众号后台 ⌘/Ctrl+V 直接粘；另有「复制 HTML」 |
| 图床贴图 | 粘贴截图 / 拖拽 / 选文件；上传前统一压到长边 1600px、WebP；失败自动降级本地内嵌 |
| 多图床可切换 | 蜜蜂图床（默认，国内免登录）、本地压缩内嵌、自定义接口、HD-R（需代理）、Telegraph |
| 编辑器不炸 | 本地内嵌图片显示成 `editor-local://localN` 短占位，不把一屏糊成 base64 |
| 响应式 | 桌面三栏、平板抽屉式列表、手机「编辑 / 预览」单栏页签 |

## 目录结构

```
wxnote-react/
├── index.html                     # 入口 HTML（favicon、meta）
├── vite.config.js                 # base:'./'，便于静态托管到任意子路径
├── public/favicon.svg
├── src/
│   ├── main.jsx                   # React 挂载点
│   ├── App.jsx                    # 状态中枢：笔记、视图、图床、弹层、Toast
│   ├── components/
│   │   ├── TopBar.jsx             # 品牌 + 视图切换 + 图床/复制/发布
│   │   ├── Sidebar.jsx            # 笔记列表（摘要、时间、删除）
│   │   ├── EditorPane.jsx         # 标题 + 工具栏 + textarea + 状态栏 + 贴图管线
│   │   ├── Toolbar.jsx            # 纯展示的 Markdown 工具栏
│   │   ├── Preview.jsx            # 公众号样式预览
│   │   ├── SettingsModal.jsx      # 图床设置（头/滚动体/固定操作栏）
│   │   ├── PublishModal.jsx       # 发布引导与图片提示
│   │   ├── Toast.jsx
│   │   └── Icons.jsx              # 内联 SVG 图标集
│   ├── hooks/useUi.js             # useMediaQuery / useToast
│   ├── lib/
│   │   ├── markdown.js            # 行内语法 + 块级状态机 + 统计/摘要
│   │   ├── mpStyles.js            # 公众号 inline style 表与 toMpHtml
│   │   ├── localImages.js         # base64 ↔ editor-local:// 折叠（工厂 + 单例）
│   │   ├── imageHost.js           # 压缩、多图床适配、pickLink
│   │   ├── clipboard.js           # 富文本 / 纯文本复制与兜底
│   │   ├── storage.js             # localStorage 读写、默认笔记、默认图床配置
│   │   └── format.js              # 时间格式化
│   └── styles/app.css             # 设计令牌 + 全部组件样式
└── test/lib.test.mjs              # 10 组纯逻辑单测
```

## 从单文件版迁移时的几个设计决定

**1. 状态分层：内容在 App，编辑态在 EditorPane**

`notes` 是唯一数据源，`note.content` 永远存「可发布态」（含完整 base64）。编辑器里的文本是派生的显示态，所以折叠必须发生在渲染前后两个位置：进入编辑器时 `toDisplay`，用户敲键时 `toReal` 回写。`EditorPane` 用 `key={note.id}` 挂载，切笔记即重建，避免两篇笔记的编辑态互相污染。

**2. 光标不能丢**

受控 textarea 每次 `setState` 都会把光标推到末尾。所有「由程序改文本」的入口（工具栏、贴图替换、Tab 缩进）统一走 `commit(next, selStart, selEnd)`：先记下目标区间，再用 `useLayoutEffect` 在渲染后 `setSelectionRange` 补回。

**3. 折叠表放模块单例**

`dataURL -> tag` 的映射若放在组件里，切笔记或重渲染就会丢，导致 `editor-local://` 还原不回来。这里用 `createLocalImageStore()` 工厂 + 模块单例，既是纯函数便于测试，又保证生命周期覆盖整个会话。

**4. 图床只有一条管线**

`uploadImage(file, cfg)` 统一「压缩 → 分流上传 → 返回链接」，失败由调用方降级内嵌。新增图床只需在 `imageHost.js` 加一个分支和 `pickLink` 的候选字段，不改 UI。

**5. 样式用普通 CSS，不引框架**

设计令牌（`--wx-green: #07C160`、`--text-2: #576B95`、677px 正文宽）与单文件版逐值一致，方便两边对照；也省掉了 CSS-in-JS 的运行时开销。

## 测试

`npm test` 覆盖纯逻辑（无需浏览器）：HTML 转义与注入防护、行内/块级语法、未闭合代码块、base64 折叠的往返一致性与幂等性、多图独立标记、字数/摘要统计、`pickLink` 对 6 种图床返回结构的兼容。

交互层用真实浏览器回归过 28 项（编辑器实时预览、工具栏插入、新建/切换笔记、图床设置开关与持久化、发布弹层、三档视图、390px 窄屏抽屉与单栏切换），不随包提供脚本，需要时可自行用任意 E2E 工具复跑。

## 已知限制

- **公众号没有个人发布接口**：所谓「一键发布」是把内联样式富文本放进剪贴板，再到后台粘贴。有开发者凭证的话可以在这条链路上接草稿箱 API。
- **剪贴板权限**：`ClipboardItem` 需要 HTTPS 或 localhost；不满足时自动回退到 `execCommand('copy')`。
- **蜜蜂图床游客模式**：图片仅存 1 小时、每 IP 每分钟 1 张。正式发文请在设置里填 Token。
- **本地内嵌图**：编辑器里是短占位，若从编辑器全选复制到别处，粘出来的是 `editor-local://localN`。要带图跨应用，请走「发布到公众号」或「复制 HTML」。

## 与单文件版的关系

| | 单文件版 `../index.html` | 本工程 |
|---|---|---|
| 依赖 | 无 | react / react-dom |
| 构建 | 不需要 | Vite |
| 部署 | 直接打开或用 GitHub Pages | `npm run build` 后托管 `dist/` |
| 功能 | 基准 | 完全对等 + 弹层可访问性（Esc 关闭、固定操作栏） |

两份代码都在同一仓库内，改功能时注意同步。
