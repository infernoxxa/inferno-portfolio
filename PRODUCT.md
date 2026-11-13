# XXX Inferno 博客

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

作者自己管理文章；访客阅读技术文章、项目介绍和公开简历。

## Product Purpose

让作者可以直接发布已写好的 Markdown，或在管理页编辑文章，无须为每篇文章修改代码、提交 Git。

## Operating Context

作者使用 MarkText 和 AI 准备文章。Markdown 与图片放在同级目录，打成 ZIP 上传；也支持单独上传 Markdown。前端现有 Vue 3 / TypeScript / Vite 项目通过 Cloudflare Pages 的 Git 集成部署。

## Capabilities and Constraints

- 本次新增 Markdown / ZIP 导入、在线编辑、草稿与发布、分类和标签。
- Azure Blob Storage 保存文章和图片，Pages Functions 处理接口，不运行虚拟机。
- 管理入口不出现在公开导航；通过 Cloudflare Access 和服务端身份校验限制为作者本人。
- 管理员邮箱、Azure 存储和 Access 参数由作者在部署时配置。
- 本地使用独立开发存储；本地验证不代表 Azure 或正式鉴权已经验收。

## Brand Commitments

沿用现有白色、红粉色视觉系统和 D2 品牌图片，保留公开简历、项目页面及已有文章地址。

## Evidence on Hand

原有两篇项目文章位于 src/content/posts.ts。Azure 账号和正式管理员邮箱尚未配置。
