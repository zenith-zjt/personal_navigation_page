项目概述

开发一个基于 Next.js 的个人导航页应用，支持从浏览器书签（HTML 文件）或当前浏览器页面快速导入链接。用户可以整理常用链接，并扩展“正在看”和“稍后看”两个动态列表。同时支持添加第组件（如 Trello 电子看板嵌入），数据全部存储在后端本地 JSON 文件中，可部署到任意云服务器（VPS）。

技术栈要求

· 前端框架：Next.js 14+ (App Router) + React 18 + TypeScript
· 样式：Tailwind CSS + 可选 UI 组件库（shadcn/ui 或 NextUI）
· 后端：Next.js API Routes (Node.js 环境)
· 数据存储：本地 JSON 文件（位于项目根目录 /data/db.json），通过 fs 模块读写
· 认证（可选）：NextAuth.js 支持 GitHub 登录（为多用户预留，初期可单用户）
· 部署：支持部署到云服务器（如 AWS、Vercel 自托管、Docker + Nginx）

核心功能需求

1. 书签导入

· 从浏览器书签导入：提供一个文件上传区域，用户上传从 Chrome/Firefox/Edge 导出的 bookmarks.html（Netscape 格式）。后端解析该文件，提取所有书签的标题、URL、文件夹层级。解析后按文件夹结构展示在导航页中。
· 从当前浏览器页面导入：提供一个浏览器书签栏小工具（JavaScript 书签代码），点击后将当前页面的标题和 URL 发送到导航页的 API，实现一键收藏到“常用链接”或指定分组。

2. 链接管理三大模块

· 常用链接：展示用户收藏的核心链接（支持拖拽排序、编辑、删除、文件夹分组）。
· 正在看：展示用户当前正在追更或关注的内容（可手动添加，或从常用链接中标记为“正在看”）。支持标记阅读进度（简单笔记）。
· 稍后看：类似暂存区，保存想稍后阅读的链接，支持一键移回常用链接。

3. 组件化支持（可扩展面板）

· 用户可自由添加/删除组件卡片，卡片可拖拽调整位置。
· 内置组件示例：
· 搜索引擎模块（使用百度，谷歌搜索引擎搜索栏，点击搜索跳转搜索结果页）
· Trello 看板嵌入：实现一个Trello 看板嵌入页面。
· 便签组件：Markdown 笔记。
· 时钟/日历。
· 组件配置保存在后端 JSON 中。

4. 数据持久化（服务器本地文件）

· 所有数据（链接、分组、组件配置、用户设置）存储在服务器上的 /data/navigation_db.json 中。
· API 提供 CRUD 接口，读取和写入该文件。注意并发写时加锁（使用 fs.writeFileSync 或 async-mutex）。

5. 页面美观要求

· 响应式设计（桌面端 + 移动端适配）。
· 暗色/亮色主题切换（基于 Tailwind 或 next-themes）。
· 卡片风格，毛玻璃效果或圆润现代化设计。
· 支持自定义背景（纯色、渐变或 Unsplash 随机图）。
· 友好的加载状态和错误提示（Toast 通知）。

扩展功能

· 搜索框：全文搜索已保存的所有链接（标题、URL、标签）。
· 标签系统：为链接添加自定义标签，支持按标签筛选。
· 数据备份/恢复：前端一键导出 db.json 或导入备份文件。

部署要求

· 项目可运行在 Node.js 环境（≥18.x）。
· 提供 Dockerfile 和 docker-compose.yml，方便部署到云服务器（如 2核2G 实例）。
· 数据卷映射：将 /data 目录持久化到宿主机，保证容器重建不丢失数据。
· 环境变量配置：通过 .env.local 管理敏感信息（API 密钥、NextAuth secret）。

交付期望

· 完整的代码仓库结构，包含 app/、components/、lib/、api/、public/ 等目录。
· 清晰的 README 文档，说明如何本地运行、如何构建、如何部署到云服务器。
· 核心功能（书签导入、列表管理、组件添加）必须可正常工作，且数据存于本地 JSON 文件。

请生成上述项目的完整代码，确保：

· 使用playwright对页面进行调试，确保各模块可以使用，ui美观不出现错位
· 使用 Next.js App Router，API 路由放在 app/api/ 下。
· 文件系统读写使用 fs/promises，路径基于 process.cwd()。
· 书签解析可使用 netscape-bookmark-parser 或自己实现简单 HTML 解析。
· 组件配置存储为 JSON 数组，每个组件包含 type、props、order。
· 前端使用 React Hook Form + Zod 进行表单验证。
· 拖拽功能可使用 @dnd-kit/sortable 或 react-beautiful-dnd。
· 确保安全：上传的 HTML 文件大小限制 5MB，防止路径遍历攻击。

