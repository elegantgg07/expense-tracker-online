# Railway 部署指南

## 一键部署

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/YOUR_TEMPLATE_ID)

## 手动部署

1. 访问 https://railway.app
2. GitHub 登录
3. 点击 **New Project**
4. 选择 **Deploy from GitHub repo**
5. 选择 `expense-tracker-online` 仓库
6. 点击 **Deploy**
7. 部署完成后，点击 **Settings** → **Networking** → **Generate Domain**
8. 得到公网链接，如 `https://expense-tracker-production.up.railway.app`

## 添加持久化存储

1. 在项目页面点击 **Add** → **Database** → **Add PostgreSQL**（或 **Add Volume**）
2. 如果使用 Volume：
   - 点击 **New** → **Volume**
   - Mount Path: `/data`
   - Size: 1GB
3. 重新部署即可

## 环境变量（可选）

- `DB_PATH`: 数据库路径，默认 `/data/expenses.db`
- `PORT`: 服务器端口，默认 `3000`
