# 个人导航页

基于 Next.js App Router 的个人导航应用，支持浏览器书签导入、链接分区管理、动态组件面板和服务端本地 JSON 持久化。

## 功能

- 常用链接、正在看、稍后看三类链接管理
- 添加、编辑、删除、移动链接，并支持拖拽排序
- 上传 Chrome/Firefox/Edge 导出的 `bookmarks.html`
- 提供 Chrome 插件下载，插件可配置导航页地址、分组、标签和目标 Tab
- 全文搜索和标签筛选
- 组件面板：搜索、Trello 嵌入、Markdown 便签、时钟日历
- 明暗主题切换
- 数据保存到 `data/navigation_db.json`

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## 构建

```bash
npm run build
npm run start
```

## 数据文件

应用首次启动时会自动创建：

```text
data/navigation_db.json
```

该文件包含链接、组件配置和用户设置。部署时请持久化 `data` 目录。

## Docker 部署

```bash
docker compose up -d --build
```

`docker-compose.yml` 会把宿主机 `./data` 映射到容器 `/app/data`，容器重建后数据不会丢失。

## API

- `GET /api/navigation`：读取完整 JSON 数据，也可用于备份导出
- `PUT /api/navigation`：提交链接、组件和设置变更
- `POST /api/navigation/import-bookmarks`：上传并解析 `bookmarks.html`，文件大小限制 5MB
- `POST /api/navigation/bookmarklet`：供 Chrome 插件收藏当前页面

## Chrome 插件

插件源码位于 `plugs/navigation-collector`，页面标题栏中的“下载插件”按钮会下载 `public/navigation-chrome-extension.zip`。

本地安装方式：

1. 解压 `navigation-chrome-extension.zip`
2. 打开 Chrome 扩展程序页面
3. 开启开发者模式
4. 选择“加载已解压的扩展程序”
5. 选择解压后的插件目录

插件默认分组为“导入”，标签为“导入”，目标 Tab 为“正在看”。
