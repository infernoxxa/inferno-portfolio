# 文章管理与部署

本项目继续通过 Cloudflare Pages 的 Git 集成构建。文章数据放在 Azure Blob Storage，Pages Functions 处理读取、管理员校验、导入和发布，无需虚拟机。

## 本地开发

```powershell
npm ci
npm run dev
```

默认地址为 `http://127.0.0.1:3000`，管理地址为 `/manage`，公开文章地址为 `/blog`。公开导航不放管理链接。开发服务只监听本机，管理页免登录，文章数据放在 Git 忽略的 `.local-data/article-storage`。

测试时可通过环境变量使用另外一个目录和端口：

```powershell
$env:ARTICLE_LOCAL_DATA_DIR='.local-data/my-test'
npm run dev -- --port 4318 --strictPort
```

构建后运行 `npm run preview` 可同时预览静态资源与本地文章接口。它使用相同的本地存储约定；不要同时启动两个服务写同一目录。

## 导入文章

上传单个 `.md` / `.markdown`，或只包含一篇文章的 ZIP。正文和图片允许放在同级或子目录，也兼容整个文件夹一起压缩：

```text
文章包.zip
└─ 我的文章/
   ├─ article.md
   └─ illustration.png
```

正文引用 `![说明](./illustration.png)`。中文文件名和空格可用 `![说明](<./示意 图片.png>)`。找不到图片时会提示错误，不会把缺图文章当作导入成功。

上传文件最大 25 MB，ZIP 解压后最大 30 MB，正文最大 2 MB。单独添加图片最大 8 MB，支持 PNG、JPG、WebP、GIF、AVIF。第一版不导入 SVG，不执行正文 HTML。支持 Markdown 表格、代码高亮、引用和自动目录；数学公式和 Mermaid 渲染不在本版范围。

可选的开头元数据：

```markdown
---
title: 我的文章
slug: my-article
description: 一两句话的摘要
category: 开发记录
tags: [Python, 工程实践]
---

# 我的文章

这里是正文。
```

没有元数据时，从 Markdown 一级标题提取标题，并生成地址和摘要。重复地址自动添加数字后缀。导入后先保存为草稿，预览检查后手动发布。在线编辑支持草稿保存、发布、更新、取消发布、单独添加图片与删除。离开未保存的编辑内容时会提示。

## Azure

创建独立的 Storage Account 和私有 Blob 容器，例如 `blog`。保持匿名访问关闭；浏览器只访问本项目的同源接口，不直连 Azure，也不需要给存储账户开启浏览器 CORS。

建议先核算 Standard / Hot / LRS 的地区价格，并开启适当的 Blob 版本或软删除，便于误删后恢复。文章正文与目录统一保存在 `content/library.json`，图片保存在 `content/media/{文章 ID}/{文件名}`。定期下载整个容器做备份。

该文档存储面向数据量较小的个人博客，每次读取会读取文章文档，每次更新使用 Azure ETag 条件写入，冲突返回 409，不自动覆盖。文章量或访问量明显增大时再调整索引与缓存。本地存储和正式容器相互独立，本地文章不会自动上传到正式环境。

## Cloudflare Access

在 Zero Trust 中启用邮件一次性验证码，创建一个 Self-hosted Access 应用。在同一个应用中保护：

- `xxxinferno.me/manage`
- `xxxinferno.me/manage/*`
- `xxxinferno.me/api/admin/*`

Allow 规则只填写你的完整邮箱，不设置 Everyone 或绕过规则。从应用页面复制 Audience（AUD）和团队域名，例如 `your-team.cloudflareaccess.com`。

管理页采用当前域名下的 `/manage`，因此管理页与 API 保持同源。不需要额外设置 `manage` 子域名。地址可以自行收藏，隐藏链接不代替鉴权。

页面与管理接口都会验证 Access JWT 的签名、签发者、受众、有效期与管理员邮箱。原始 `pages.dev` 或预览域名没有合法 Access 令牌时，访问管理页和管理接口都会失败；仅知道地址或伪造邮箱请求头无法写入。预览域名如果也需要管理功能，须配置对应 Access 保护和同一组环境变量。

## Pages 环境变量

在 Pages 项目的 Settings → Variables and Secrets 中配置。生产和预览按需要分别设置；所有参数均为服务端配置，禁止使用 `VITE_` 前缀。

| 名称 | 内容 |
| --- | --- |
| `AZURE_STORAGE_ACCOUNT` | 存储账户名 |
| `AZURE_STORAGE_CONTAINER` | 私有容器名 |
| `AZURE_STORAGE_ACCOUNT_KEY` | 存储账户密钥，保存为 Secret |
| `ACCESS_TEAM_DOMAIN` | Access 团队域名 |
| `ACCESS_AUD` | 上述 Access 应用的 Audience |
| `ADMIN_EMAIL` | 唯一允许管理的完整邮箱 |

`.dev.vars.example` 是参数模板，不能在模板里填写真实凭据。`LOCAL_DEV` 在生产入口被忽略，不能通过环境变量打开生产免登录。

现有构建命令继续是 `npm run build`，产物目录继续是 `dist`；仓库根目录的 `functions/` 由 Pages 一起编译，`public/_routes.json` 只让文章、管理和 API 路由进入 Functions。

没有配置 Azure 时，公开页面继续展示现有两篇文章，管理写入会明确报错。没有配置 Access 或管理员邮箱时，正式管理页和写入接口拒绝访问。

## 上线前验收

先部署预览并配置预览环境，再核对：

1. 未登录无法访问管理页、草稿正文、草稿图片或管理 API。
2. 只有你的邮箱能够完成邮件验证码登录。
3. 导入文章和图片，草稿不出现在公开列表。
4. 发布后列表、独立链接、刷新、目录、图片和 sitemap 正常。
5. 更新后正文变化；取消发布后公开正文和图片返回 404。
6. 退出登录后，管理接口重新拒绝访问。

已下载的公开内容无法通过取消发布从访问者设备中收回；取消发布限制的是后续服务器读取。

本地验证命令：

```powershell
npm run build
npm run check:routes
npm run check:articles
npm run check:functions
```

需要检查 Workers 运行环境时执行 `npx wrangler pages dev dist --port 4319`。该模式使用正式鉴权规则，未配置身份时拒绝管理操作；不提供本地免登录。Azure 真实读写和邮件登录须在配置后另行验收。
