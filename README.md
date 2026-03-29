# 多人实时同步记账本

一个支持多人实时协作的在线记账工具，适合朋友聚会、旅行等场景共同记账。

## 功能特点

- 🏠 **房间系统**：创建房间，生成唯一 6 位房间码，邀请朋友加入
- ⚡ **实时同步**：基于 Socket.io，一人操作，所有人即时看到更新
- 💰 **AA 自动计算**：自动计算每人应收/应付，生成转账建议
- 📊 **消费统计**：按类型分类统计，总支出一目了然
- 💾 **数据持久**：SQLite 数据库存储，房间数据永久保存

## 技术栈

- **后端**：Node.js + Express + Socket.io
- **数据库**：SQLite3
- **前端**：原生 HTML + CSS + JavaScript

## 本地运行

```bash
# 安装依赖
npm install

# 启动服务器
npm start

# 浏览器访问 http://localhost:3000
```

## 使用方法

1. 输入昵称 → 点击「创建新房间」
2. 复制 6 位房间码发给朋友
3. 朋友输入房间码 → 加入同一房间
4. 开始一起记账，实时同步！

## 部署

支持部署到 Render、Railway、Heroku 等平台。

### Render 部署

1. Fork 本仓库到 GitHub
2. 在 Render 创建 Web Service
3. 选择 GitHub 仓库
4. 设置启动命令：`node server.js`
5. 自动部署完成！

## License

MIT
