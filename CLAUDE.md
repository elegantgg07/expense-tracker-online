# 项目核心要点

## 功能
多人实时同步记账网站，支持创建房间、邀请朋友、共同记账、自动 AA 计算。

## 技术栈
- **后端**: Node.js + Express + Socket.io
- **数据库**: SQLite3
- **前端**: HTML + CSS + JavaScript

## 核心特性
- **房间系统**: 6 位房间码，输入即可加入同一协作空间
- **实时同步**: 基于 Socket.io，一人操作所有人即时看到更新
- **AA 自动计算**: 自动计算每人应收/应付，生成转账建议
- **数据持久**: SQLite 存储，数据永久保存

## 部署（Railway）
1. GitHub 登录 https://railway.app
2. New Project → Deploy from GitHub repo
3. 自动创建 Volume（挂载路径 /data）
4. Settings → Networking → Generate Domain
5. 得到公网链接即可使用

**注意**: Volume 已自动配置，数据保存在 `/data/expenses.db`，重启服务不丢失。

## 本地开发
```bash
npm install
npm start
# 访问 http://localhost:3000
```

## 环境变量
- `DB_PATH`: 数据库路径，默认 `/data/expenses.db`
- `PORT`: 服务器端口，默认 `3000`
