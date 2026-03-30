# 个性化旅游系统

一个面向数据结构课程设计的前后端一体化旅游系统，包含景区查询、个性化推荐、路径规划、室内导航、旅行日记、社交互动与成就系统等功能。

## 技术栈

- Frontend: React + TypeScript + Vite + Ant Design
- Backend: Node.js + Express + TypeScript + TypeORM
- Database: SQLite

## 目录结构

- `frontend/`：前端项目
- `backend/`：后端项目
- `shared/`：共享数据结构与算法模块

## 本地启动

```bash
npm install
npm run dev:backend
npm run dev:frontend
```

## 注意事项

- 不要提交 `.env`、数据库文件、日志文件、`node_modules` 和构建产物。
- 如需共享测试数据，建议使用初始化脚本或单独的示例数据文件。
