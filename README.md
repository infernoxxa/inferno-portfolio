# XXX Inferno 个人博客与简历

面向读者、HR 与技术面试官的个人静态网站，记录技术笔记，展示 PersonalAI / CloudSync 项目实践，并提供公开简历。

使用 Vue 3、TypeScript、Vite 和 Vue Router。项目、简历等页面继续生成静态 HTML；文章由 Cloudflare Pages Functions 读取 Azure Blob Storage，返回带正文和元信息的 HTML，站内跳转由 Vue Router 接管。管理员通过 GitHub OAuth 登录，服务端只允许指定用户 ID，无需虚拟机。

文章上传、在线编辑、本地存储和上线配置见 [文章管理与部署](docs/BLOG-DEPLOYMENT.md)。管理地址为 `/manage`，不出现在公开导航中。

## 本地运行

需要 Node.js 22.12+ 和 npm。

```powershell
cd D:\myCode\myProfile\inferno-portfolio
npm ci
npm run dev
```

开发地址默认为 `http://127.0.0.1:3000`。本机 Windows 保留范围包含 Vite 默认的 5173，因此在 `vite.config.ts` 中选择 3000。

```powershell
npm run build
npm run check:routes
npm run preview
```

生产构建预览默认 `http://127.0.0.1:4173`，可追加 `-- --port 4174` 更换端口。预览脚本读取 `dist/`，应用响应头并运行本地文章接口；文章数据仍写入被 Git 忽略的本地目录。正式部署由 Pages Functions 处理文章接口。

## 页面职责

| 路径 | 内容 |
| --- | --- |
| `/` | 个人介绍、技术笔记、项目摘要和简历入口 |
| `/blog` | 文章列表，可按 Agent / 后端工程分类 |
| `/blog/agent-file-evidence` | Agent 文件修改与读取证据笔记 |
| `/blog/upload-retry-and-versions` | 文件上传重试、冲突和版本笔记 |
| `/projects` | 核心项目集合 |
| `/projects/personal-ai` | PersonalAI 详情 |
| `/projects/cloud-sync` | CloudSync 详情 |
| `/about` | 个人背景和技术能力 |
| `/resume` | 公开简历和打印入口 |
| `/ai/`、`/cloud/` | 未开放的演示说明 |
| `/404` 与未知路径 | 自定义 404 |

顶部导航使用独立路径，并标记当前位置；文章、项目、简历里的目录才使用段落锚点。文章分类保存在 `topic` 查询参数里，支持刷新和浏览器返回。旧首页的 `#projects`、`#about`、`#skills`、`#contact` 入口兼容跳转到新的对应页面。

演示说明与 404 使用 `noindex` 并排除在 sitemap 之外。未知路径不会重写为首页。Cloudflare Pages 上的目录规范化、响应头与 HTTP 404 仍应在正式发布前验证。

## 更新内容

- `src/content/profile.ts`：公开署名、简介、技术能力、站点源码和可选公开联系方式。
- `src/content/projects.ts`：项目介绍、设计取舍、真实状态、仓库和演示地址。
- `src/content/posts.ts`：文章标题、分类、摘要、关联项目和正文分节。
- `src/content/pages.ts`：页面 SEO；文章元信息由文章数据派生。
- `src/router.ts`：路由和旧入口兼容；文章详情路由从文章数据派生。
- `src/styles/main.css`：主题、字体层级、响应式和打印样式。
- `DESIGN.md`：本版设计方向、结构与导航约定。

现有 `posts.ts` 保留为首次初始化内容。以后新增或修改文章使用 `/manage` 的 Markdown / ZIP 导入或在线编辑，无需为每篇文章修改代码或重新构建。正式存储中的修改、撤回与删除优先于种子文章。

初始两篇文章根据已提供的项目资料整理为工程笔记，不编造历史发布日期、项目指标或额外功能，正式公开前由作者校对。PersonalAI 保留“已完成 · 本地运行”，公开 Demo 单独标为筹备中；CloudSync 不额外宣称整体完工或生产上线。文献阅读系统保持为独立 Demo。

未知邮箱、个人主页、仓库和 PDF 地址留空，相应链接不渲染。站点源码链接使用用户明确提供的公开仓库地址。原始私人简历、头像和未经授权的个人资料不进入 `public/` 或 Git。

`/resume` 的“打印简历”仅打印公开页面；正式公开版 PDF 经确认后，可放入静态资源并配置 `profile.resumePdf`。联系方式未配置时明确显示尚未公开，不提供虚假联系按钮。

## 站点形象

站点使用用户选定的 D2 原创卡通形象。原图保留在 `src/assets/brand/d2-source.png`，网页加载 `public/brand/` 中缩小的 PNG；导航和页脚使用 128px 资源，浏览器和 Apple 触屏图标有独立尺寸，分享图为 1200×630 PNG。原图不经重绘或裁切，只有用于网页的尺寸导出。旧 `/favicon.svg` 地址保留为包含 D2 的兼容入口。

## 本地 Git 与 GitHub

源码仓库：[infernoxxa/inferno-portfolio](https://github.com/infernoxxa/inferno-portfolio)。先本地开发、验收与提交，再按用户指示推送。

```powershell
git status --short
git add .
git commit -m "Describe the change"
git push origin main
```

仓库已有 `origin`，不重复添加远端。GitHub 源码同步与 Cloudflare 发布分别管理。本版设计调整优先在本地审阅。

## Cloudflare Pages（后续发布）

现有 `inferno` 为 Direct Upload 项目，保留它，另建 Git 集成 Pages 项目。先测试新项目的 `pages.dev`，再迁移 `xxxinferno.me`。

| 配置 | 值 |
| --- | --- |
| 生产分支 | `main` |
| 框架 | Vue / Vite |
| 根目录 | 仓库根目录 |
| 构建命令 | `npm run build` |
| 输出目录 | `dist` |
| 环境变量 | `NODE_VERSION=22` |

构建平台根据 lockfile 安装依赖；若关闭自动安装，改用 `npm ci && npm run build`。文章服务的 Azure 与 GitHub OAuth 参数见 [部署说明](docs/BLOG-DEPLOYMENT.md)，真实密钥只能保存为服务端 Secret。

发布前检查所有内容页、深链刷新、随机未知路径 404、缺失静态资源、响应头和手机布局。验证通过后，再从旧项目移除根域名并在新项目绑定，检查 DNS 与 HTTPS；旧项目保留至正式域名验收完成。

`/ai/` 和 `/cloud/` 是站内路径，不会自动启用同名子域名。源码推送不会由本工具修改 DNS 或旧站点。

## 验收

`npm run check:routes` 检查静态 HTML、元信息、H1、内部链接与锚点、真实状态、隐私边界及 sitemap。

`scripts/browser-check.mjs` 使用已有 Playwright 和本机 Chrome，覆盖 360 / 390 / 768 / 1280 / 1440 / 1920px、文章分类及刷新、目录定位、项目与演示往返、浏览器返回、旧入口、键盘与打印样式。设置 `PLAYWRIGHT_MODULE` 指向既有的 Playwright `index.mjs`，必要时设置 `QA_URL`。

截图与运行报告位于被 Git 忽略的 `artifacts/browser/`。实际验收记录和限制见 `VALIDATION.md`。本地检查不替代真实 Pages、Lighthouse、跨浏览器和真实设备验收。分享图使用本地 PNG。
