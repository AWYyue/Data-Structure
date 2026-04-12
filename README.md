# 个性化旅游系统

这是一个面向数据结构课程设计的前后端一体化项目，包含：

- 景区与校园查询
- 个性化推荐
- 户外路径规划
- 室内导航
- 旅行日记
- 社交互动
- 美食与摄影打卡

## 技术栈

- 前端：React + TypeScript + Vite + Ant Design
- 后端：Node.js + Express + TypeScript + TypeORM
- 数据库：SQLite / PostgreSQL
- 地图数据：OpenStreetMap + Overpass 模板导入

## 目录结构

- `frontend/`：前端项目
- `backend/`：后端项目
- `shared/`：共享数据结构与算法模块

## 关键约定

### 1. 默认数据库路径

项目默认只使用这一份 SQLite 数据库：

```text
backend/travel_system.db
```

后端默认配置已经统一到这个路径。除非显式设置 `SQLITE_DB_PATH` 或 `DB_PATH`，否则不会再去连接根目录数据库。

### 2. 根目录数据库说明

仓库根目录不应再保留 `travel_system.db`。

如果你本地还有历史遗留的根目录数据库，请删除它，不要把它当作运行库使用。真正运行和演示使用的始终是：

```text
backend/travel_system.db
```

### 3. 室内导航范围

室内导航当前采用“单校园代表性场景”方案，用北京邮电大学相关场景作为演示地图，重点展示：

- 入口到房间
- 同层路径规划
- 跨楼层路径规划

这是一项范围控制下的设计取舍，不追求为全部景区/校园分别制作独立室内图。

## 首次拉取后的初始化

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化演示数据

在仓库根目录执行：

```bash
npm run setup:data
```

这条命令会：

- 在 `backend/travel_system.db` 中初始化演示数据库
- 导入 200 个景区/校园相关数据
- 导入建筑、设施、路网节点、路网边等地图数据
- 导入旅行日记、评论、用户行为、摄影打卡、社交打卡等演示数据

如果还需要补充景区封面图，可执行：

```bash
npm run setup:data:with-covers
```

### 3. 检查数据是否就绪

```bash
npm run check:data
```

## 本地启动

### 启动后端

```bash
npm run dev:backend
```

### 启动前端

```bash
npm run dev:frontend
```

默认地址：

- 前端：`http://localhost:3000`
- 后端：`http://localhost:8000`

## 数据库配置

默认使用 SQLite，对应文件：

```text
backend/travel_system.db
```

如需切换 PostgreSQL，可通过环境变量配置：

- `DB_TYPE=postgres`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

或者直接使用：

- `DATABASE_URL`

如需自定义 SQLite 路径，可显式设置：

- `SQLITE_DB_PATH`
- `DB_PATH`

## 常用命令

### 根目录

```bash
npm run setup:data
npm run setup:data:with-covers
npm run check:data
npm run dev:backend
npm run dev:frontend
```

### backend

```bash
npm run import-data
npm run import-data:grid
npm run import-data:real-template
npm run import-covers
npm run import-covers:v2
npm run check-data
```

## 常见问题

### 1. 为什么 clone 后看不到地图数据？

因为 `.db` 文件被 `.gitignore` 忽略，仓库不会直接提交数据库文件。拉取项目后需要先执行：

```bash
npm run setup:data
```

### 2. 为什么前端页面里数据不多？

先确认后端实际连接的是：

```text
backend/travel_system.db
```

然后重新执行：

```bash
npm run setup:data
```

如果是旅行日记页，还要注意默认标签可能是“我的日记”，而演示数据大多集中在“社区日记”“热度榜”“好评榜”。

### 3. 为什么不直接把数据库上传到 GitHub？

因为数据库文件体积大、更新频繁，而且 `.db` 文件不适合直接纳入版本控制。当前项目采用“仓库内置初始化脚本”的方式，保证队友 clone 后可以本地重建演示数据。

## 建议协作方式

如果队友只是要跑通演示环境，建议统一执行：

```bash
npm install
npm run setup:data
npm run check:data
npm run dev:backend
npm run dev:frontend
```
