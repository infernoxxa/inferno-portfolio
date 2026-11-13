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

## GitHub 管理员登录

后台使用 GitHub OAuth，不需要开通 Cloudflare Zero Trust 或绑定该服务的支付方式。公开导航不放管理链接；`/manage` 可以展示登录页，但文章列表、草稿、图片与所有写入均由服务端管理 API 验证登录态。

1. GitHub 头像 → Settings → Developer settings → OAuth Apps → New OAuth App，创建在自己的账号下。
2. Application name 填 `Inferno 博客管理`；Homepage URL 填 `https://xxxinferno.me`。
3. Authorization callback URL 必须填写 `https://xxxinferno.me/api/auth/github/callback`。
4. 创建后复制 Client ID，并使用 Generate a new client secret 生成 Client Secret。Secret 只填入 Cloudflare，不提交 Git、不放到前端，也不发送到聊天中。
5. 管理员固定用户 ID 为 `189717213`（GitHub 账号 `infernoxxa`），填入 `ADMIN_GITHUB_ID`。用户名和邮箱均不作为授权依据。
6. 在本机运行下面的命令生成 SESSION_SECRET，结果只保存在 Cloudflare Secret 中：

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

登录不申请仓库或邮箱权限，只从 GitHub `/user` 获取用户 ID。OAuth 使用随机 state、10 分钟临时凭据及 PKCE；只有匹配管理员 ID 的账号才会获得 8 小时签名会话。Cookie 使用 HttpOnly、Secure、SameSite=Lax 和 __Host 前缀，访问令牌不返回浏览器，也不存入 Azure。退出登录会清除当前浏览器 Cookie；轮换 SESSION_SECRET 会让全部已有会话失效。

默认只允许正式源 `https://xxxinferno.me` 登录，会话不能用于 `pages.dev` 或其他域名。独立预览如需验收 OAuth，应创建另一个 GitHub OAuth App，将回调地址指向固定预览域名，并单独设置 `GITHUB_OAUTH_ORIGIN`、Client ID、Client Secret、SESSION_SECRET 和测试 Azure 容器，避免与生产混用。源地址只含协议和域名，不带结尾斜杠或路径。

如先前已经创建 Cloudflare Access 管理路径规则，上线前移除这些旧规则，避免仍被 Zero Trust 登录拦截。

## Pages 环境变量

在 Pages 项目的 Settings → Variables and Secrets 中配置。生产和预览按需要分别设置；所有参数均为服务端配置，禁止使用 `VITE_` 前缀。

| 名称 | 内容 |
| --- | --- |
| `AZURE_STORAGE_ACCOUNT` | 存储账户名 |
| `AZURE_STORAGE_CONTAINER` | 私有容器名 |
| `AZURE_STORAGE_ACCOUNT_KEY` | 存储账户密钥，保存为 Secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth App 的 Client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App 的 Client Secret，保存为 Secret |
| `ADMIN_GITHUB_ID` | `189717213`，唯一允许管理的固定用户 ID |
| `SESSION_SECRET` | 上述命令生成的随机签名密钥，保存为 Secret |
| `GITHUB_OAUTH_ORIGIN` | 可选，默认 `https://xxxinferno.me`；预览测试按上述说明单独配置 |

`.dev.vars.example` 是参数模板，不能在模板里填写真实凭据。`LOCAL_DEV` 在生产入口被忽略，不能通过环境变量打开生产免登录。

现有构建命令继续是 `npm run build`，产物目录继续是 `dist`；仓库根目录的 `functions/` 由 Pages 一起编译，`public/_routes.json` 只让文章、管理和 API 路由进入 Functions。

没有配置 Azure 时，公开页面继续展示现有两篇文章，管理写入会明确报错。没有配置 GitHub 登录参数时，管理页会提示尚未配置，管理 API 拒绝访问。此前的 ACCESS_TEAM_DOMAIN、ACCESS_AUD、ADMIN_EMAIL 已不再使用，可以删除。

## 上线前验收

先部署预览并配置预览环境，再核对：

1. 未登录只能看到管理登录页，不能访问草稿正文、草稿图片或管理 API。
2. 你的 GitHub 账号能进入后台，其他 GitHub 账号即使授权也没有管理权限。
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
npm run check:auth
npm run check:functions
```

需要检查 Workers 运行环境时执行 `npx wrangler pages dev dist --port 4319`。该模式使用正式鉴权规则，未配置身份时仅显示登录说明且拒绝管理 API；不提供本地免登录。Azure 真实读写和 GitHub OAuth 授权登录须在配置后另行验收。
