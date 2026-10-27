# Inferno Portfolio

XXX Inferno 的个人主页与求职作品集。重点展示 PersonalAI 与 CloudSync；补充文献阅读 Demo 和科研经历。

采用白色背景、红色主色、浅粉色分区与少量亮粉色点缀。Vue 3 + TypeScript + Vite + Vue Router，系统字体、原生 CSS、内联 SVG，无后端、无跟踪 SDK、无外部字体。构建时预渲染每个公开路由，输出可直接托管的静态 HTML。浏览器加载后由 Vue Router 接管站内导航。

## 本地开发

需要 Node.js 22.12+（建议 Node 22 LTS）和 npm。

```powershell
cd D:\VueProject\myProfile
npm ci
npm run dev
```

访问终端显示的本地地址，默认 `http://127.0.0.1:3000`。

```powershell
npm run build
npm run check:routes
npm run preview
```

生产预览默认 `http://127.0.0.1:4173`。使用项目自带的轻量静态预览服务，读取 `dist/`，对目录路由重定向至末尾斜杠路径，应用 `_headers`，未知路径返回真实 HTTP 404。这个 Node 脚本仅用于本地预览，线上仍为纯静态部署。`build` 先检查 TypeScript，再构建客户端和临时 SSR 入口，最后生成各页面 HTML 与 sitemap；临时 SSR 文件自动清理。

## 路由

| 路径 | 用途 | 索引 |
| --- | --- | --- |
| `/` | 首页 | 是 |
| `/projects/personal-ai` | PersonalAI 技术详情 | 是 |
| `/projects/cloud-sync` | CloudSync 技术详情 | 是 |
| `/ai/` | PersonalAI 公开演示筹备页 | 否 |
| `/cloud/` | CloudSync 公开演示筹备页 | 否 |
| `/resume` | 脱敏的公开简历摘要 | 是 |
| `/404`、其他未知路径 | 自定义 404 | 否 |

每个已知路由都生成 `index.html`，真实未知路径使用顶层 `404.html`。不配置将所有路径重写到首页的 `_redirects`，避免隐藏真实 404。Cloudflare Pages 的尾斜杠规范化以实际部署为准，切域名前验证。Vite 开发服务器仍采用 SPA 回退；生产路由验收使用 `npm run preview`，不以开发服务器行为代替生产验证。

## 内容维护

- `src/content/profile.ts`：署名、公开简介、技术分组、联系方式及公开 PDF 路径。
- `src/content/projects.ts`：两个项目的全部介绍、状态、技术取舍、仓库地址、演示入口。
- `src/content/pages.ts`：路由的 title、description 和是否索引。
- `src/styles/main.css`：主题变量、布局、响应式和减少动效设置。
- `scripts/prerender.mjs`：预渲染与 sitemap；域名迁移时一并修改 canonical、OG URL 和 robots。

未知 GitHub / 仓库 / 邮箱 / PDF 地址默认留空，相应链接不渲染。演示入口默认使用站内预告页；公开演示可用后，在项目的 `demoUrl` 填入经验证的完整 HTTPS URL，并更新相关状态。仓库地址填入 `repository` 后显示源码链接。

原始简历和头像不进入本仓库、`public/` 或构建产物。公开资料采用 `XXX Inferno` 署名，不发布手机号、原始邮箱和学校。提供正式公开版 PDF 后再配置 `profile.resumePdf`。

### 内容真实性

当前实现描述依据用户提供的简历，尚未读取两个项目的源码做独立验证：

- PersonalAI：简历明确写明“已完成 · 本地运行”，与“公开 Demo 筹备中”分别展示。
- CloudSync：保留简历已有实现描述，不额外宣称整体完工、生产上线或性能指标。
- 文献阅读系统是独立 Demo，不将它的 RAG / Rerank 功能归入 PersonalAI。
- 公开演示的配额与数据隔离是未来规划，不标为已完成能力。

## 本地 Git 优先

当前阶段不创建 GitHub 仓库、不添加远端、不推送。先本地验收，再决定发布。

```powershell
git status --short
git add .
git commit -m "feat: build Inferno portfolio"
git log --oneline -5
```

日常改动在本地分支进行，验收后合入 `main`。如需新分支，使用 `codex/` 前缀。

最终确认后，在 GitHub 创建空仓库（不要自动生成 README），再执行下面的命令。用实际仓库地址替换占位符；这些是后续操作说明，不表示已执行。

```powershell
git remote add origin https://github.com/YOUR_ACCOUNT/inferno-portfolio.git
git push -u origin main
```

## Cloudflare Pages Git 集成（后续发布）

现有 `inferno` 是 Direct Upload 项目。保留旧站，新建 Git 集成 Pages 项目，先验证新项目的 `pages.dev`。

| 配置 | 值 |
| --- | --- |
| 生产分支 | `main` |
| 框架预设 | Vue / Vite |
| 根目录 | 仓库根目录 |
| 构建命令 | `npm run build` |
| 输出目录 | `dist` |
| 环境变量 | `NODE_VERSION=22` |

Pages 根据 lockfile 安装依赖。若所选构建环境关闭自动安装，改用 `npm ci && npm run build`。纯静态站没有应用密钥或后端环境变量。

发布检查顺序：

1. 绑定 GitHub 仓库，在新 `pages.dev` 检查全部已知路由、刷新、资源和手机布局。
2. 检查随机不存在路径返回 HTTP 404，同时显示自定义 404 页；检查缺失静态资源不会返回首页 HTML。
3. 检查响应头与 CSP，不允许因策略造成页面脚本或样式加载失败。
4. 验证通过后，从旧 Pages 移除根域名，再绑定到新项目，按提示核对 DNS / HTTPS。
5. 旧项目保留到正式域名验证完成，以便回退。

本仓库不配置 DNS、不修改现有站点、不注册或发布 Sites 项目。`/ai/` 和 `/cloud/` 为站内路径，不会自动启用同名子域名。

## 验收范围

`npm run check:routes` 检查构建输出：独立正文与元信息、单个 H1、所有内部链接和锚点、项目状态、无原始简历身份信息、sitemap 排除 noindex 页面。该检查不替代真实浏览器和部署验收。

人工与浏览器检查覆盖：360 / 390 / 768 / 1280 / 1440 / 1920px、移动端折叠菜单、首屏机制切换、所有路由与返回导航、键盘焦点、控制台与网络错误。实际检查结果记录在 `VALIDATION.md`。

Open Graph 采用本地 SVG 分享图；部分社交平台不支持 SVG 预览。如需覆盖这些平台，后续导出同尺寸 PNG 并更新 `index.html` 的 `og:image`。
