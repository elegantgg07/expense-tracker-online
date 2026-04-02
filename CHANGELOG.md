# 更新日志 & 项目文档

## 项目概述

多人实时同步记账网站，支持创建房间、邀请朋友、共同记账、自动 AA 计算。

### 核心功能
- 房间系统：生成6位房间码，邀请朋友加入
- 实时同步：基于 Socket.io，多人同时编辑即时更新
- AA自动计算：自动计算每人应收/应付，生成转账建议
- 数据持久化：SQLite存储，永久保存

### 技术栈
- **后端**: Node.js + Express + Socket.io
- **数据库**: SQLite3
- **前端**: 原生 HTML + CSS + JavaScript
- **部署**: Railway（免费，含持久化存储）

---

## 2026-04-02

### 新增
- **类别支出条形图可视化** - 统计概览中以水平条形图展示各类别支出占比，按金额降序排列，带平滑动画效果
- **自定义类别管理** - 每个房间可独立管理支出类别
  - 添加新类别（自动分配颜色）
  - 删除已有类别
  - 12色预设配色循环使用
  - 实时同步给房间内所有成员

### 修复
- **移动端时间输入显示** - 修复 iOS Safari 上 datetime-local 输入框中文日期显示不全的问题
- **重复类别问题** - 修复添加类别时会生成两个相同类别的问题

### 技术变更
- 新增 `categories` 数据表存储房间自定义类别
- 新增 API 端点：`GET/POST /api/room/:roomCode/categories`, `DELETE /api/room/:roomCode/categories/:name`
- 新增 Socket.io 事件：`category:added`, `category:deleted`
- 新房间自动创建 8 个默认类别（餐饮、交通、购物、娱乐、居住、医疗、学习、其他）

---

## 2026-03-29 - 项目初始化

### 完成的初始化工作
- 创建 Express + Socket.io 后端服务器
- 实现 SQLite 数据持久化
- 搭建房间系统（6位随机码）
- 配置 Railway 部署（含 Volume 持久化存储）
- 完成首次部署并验证在线访问

### 文件结构
```
expense-tracker-online/
├── server.js              # Express + Socket.io 服务器
├── database.js            # SQLite 数据库操作
├── package.json           # 依赖配置
├── railway.json           # Railway部署配置
├── render.yaml            # Render部署配置（备用）
├── README.md              # 项目说明
├── RAILWAY_DEPLOY.md      # Railway部署指南
├── CLAUDE.md              # 项目核心要点
├── CHANGELOG.md           # 本文件
├── .gitignore             # Git忽略配置
├── public/
│   └── index.html         # 前端界面
└── data/                  # 本地数据库目录
```

### 遇到的问题及解决方案

| 问题 | 解决方案 |
|------|----------|
| npm 缓存权限错误 | 使用临时缓存目录 `npm install --cache /tmp/npm-cache` |
| SSH 推送失败（Host key 变更） | 更新 known_hosts：`ssh-keyscan github.com >> ~/.ssh/known_hosts` |
| Render Free 无持久化存储 | 改用 Railway，Free 计划支持 Volume |

### 部署状态

- **GitHub 仓库**: https://github.com/elegantgg07/expense-tracker-online
- **部署平台**: Railway
- **状态**: ✅ 已部署成功，可正常访问
- **Volume**: 已配置（expense-tracker-online-data），数据持久化

### 关键配置

```javascript
// 数据库路径
cconst DB_PATH = process.env.DB_PATH || '/data/expenses.db';
```

---

## 历史提交记录

```
e66e53f docs: add CHANGELOG with today's updates
325f441 fix: prevent duplicate categories when adding
5268845 feat: support custom category management per room
5531dec feat: add category expense bar chart visualization
9bb1707 Fix: datetime-local input display on mobile
ae2430f Fix: Add migration for rooms.name column
2cecad1 Add editable project name feature
19a2474 UI redesign: change room to project and apply beige hand-drawn style
5c8f37e Fix delete sync and add participants editing in edit mode
6d2591a Add edit expense feature with real-time sync
c36c566 Update CLAUDE.md with deployment workflow
d580763 Add CLAUDE.md with project essentials
a6877f5 Add Railway deployment config
1b83985 Initial commit: expense tracker with real-time sync
```

---

## 参考链接

- Railway: https://railway.app
- GitHub: https://github.com/elegantgg07/expense-tracker-online
