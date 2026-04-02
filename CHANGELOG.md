# 更新日志

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

## 历史提交

- `ae2430f` Fix: Add migration for rooms.name column
- `2cecad1` Add editable project name feature
- `19a2474` UI redesign: change room to project and apply beige hand-drawn style
- `5c8f37e` Fix delete sync and add participants editing in edit mode
- `6d2591a` Add edit expense feature with real-time sync
