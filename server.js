const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./database');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// 存储 socket 和房间的映射
const roomSockets = new Map(); // roomCode -> Set of sockets

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== API 路由 =====

// 创建房间
app.post('/api/room/create', async (req, res) => {
  try {
    const { name } = req.body;
    const roomCode = await db.createRoom(name);

    // 添加默认类别
    const defaultCategories = [
      { name: '餐饮', color: '#FF9AA2' },
      { name: '交通', color: '#FFB7B2' },
      { name: '购物', color: '#FFDAC1' },
      { name: '娱乐', color: '#E2F0CB' },
      { name: '居住', color: '#B5EAD7' },
      { name: '医疗', color: '#C7CEEA' },
      { name: '学习', color: '#F8B195' },
      { name: '其他', color: '#D4A373' }
    ];

    for (let i = 0; i < defaultCategories.length; i++) {
      await db.addCategory(roomCode, { ...defaultCategories[i], sortOrder: i });
    }

    res.json({ success: true, roomCode });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 加入房间
app.post('/api/room/join', async (req, res) => {
  try {
    const { roomCode, nickname } = req.body;
    const room = await db.getRoom(roomCode);

    if (!room) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }

    await db.addMember(roomCode, nickname);
    const members = await db.getRoomMembers(roomCode);
    const expenses = await db.getExpenses(roomCode);
    const categories = await db.getCategories(roomCode);

    res.json({
      success: true,
      roomCode,
      roomName: room.name,
      members,
      expenses,
      categories
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 更新项目名称
app.put('/api/room/:roomCode/name', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { name } = req.body;

    await db.updateRoomName(roomCode, name);

    // 广播更新事件给房间内所有人
    broadcastToRoom(roomCode, 'room:nameUpdated', { roomCode, name });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取房间成员
app.get('/api/room/:roomCode/members', async (req, res) => {
  try {
    const members = await db.getRoomMembers(req.params.roomCode);
    res.json({ success: true, members });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取房间类别
app.get('/api/room/:roomCode/categories', async (req, res) => {
  try {
    const categories = await db.getCategories(req.params.roomCode);
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 添加房间类别
app.post('/api/room/:roomCode/categories', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { name, color, sortOrder } = req.body;

    // 检查类别名是否已存在
    const existingCategories = await db.getCategories(roomCode);
    if (existingCategories.some(c => c.name === name)) {
      return res.status(400).json({ success: false, error: '类别已存在' });
    }

    const category = await db.addCategory(roomCode, { name, color, sortOrder });

    // 广播给房间内所有人
    broadcastToRoom(roomCode, 'category:added', category);

    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 删除房间类别
app.delete('/api/room/:roomCode/categories/:name', async (req, res) => {
  try {
    const { roomCode, name } = req.params;

    await db.deleteCategory(roomCode, name);

    // 广播给房间内所有人
    broadcastToRoom(roomCode, 'category:deleted', { roomCode, name });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取消费记录
app.get('/api/expenses/:roomCode', async (req, res) => {
  try {
    const expenses = await db.getExpenses(req.params.roomCode);
    res.json({ success: true, expenses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 添加消费记录
app.post('/api/expenses/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const expense = req.body;

    const id = await db.addExpense(roomCode, expense);
    const newExpense = { id, room_code: roomCode, ...expense };

    // 广播给房间内所有人
    broadcastToRoom(roomCode, 'expense:added', newExpense);

    res.json({ success: true, expense: newExpense });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 删除消费记录
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { roomCode } = req.body;

    await db.deleteExpense(id, roomCode);

    // 广播删除事件
    broadcastToRoom(roomCode, 'expense:deleted', { id });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 更新消费记录
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { roomCode, ...expenseData } = req.body;

    const updatedExpense = await db.updateExpense(id, roomCode, expenseData);

    // 广播更新事件给房间内所有人
    broadcastToRoom(roomCode, 'expense:updated', updatedExpense);

    res.json({ success: true, expense: updatedExpense });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// AA 计算
app.get('/api/aa/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const expenses = await db.getExpenses(roomCode);
    const members = await db.getRoomMembers(roomCode);

    const result = calculateAA(expenses, members);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== Socket.io =====

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  // 加入房间
  socket.on('room:join', (roomCode) => {
    socket.join(roomCode);
    if (!roomSockets.has(roomCode)) {
      roomSockets.set(roomCode, new Set());
    }
    roomSockets.get(roomCode).add(socket);
    console.log(`Socket ${socket.id} 加入房间 ${roomCode}`);
  });

  // 离开房间
  socket.on('room:leave', (roomCode) => {
    socket.leave(roomCode);
    if (roomSockets.has(roomCode)) {
      roomSockets.get(roomCode).delete(socket);
    }
    console.log(`Socket ${socket.id} 离开房间 ${roomCode}`);
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log('用户断开:', socket.id);
    roomSockets.forEach((sockets, roomCode) => {
      sockets.delete(socket);
    });
  });
});

// 广播消息到房间（除了发送者）
function broadcastToRoom(roomCode, event, data) {
  io.to(roomCode).emit(event, data);
}

// ===== AA 计算逻辑 =====
function calculateAA(expenses, members) {
  if (!members.length) {
    return { balance: {}, transactions: [] };
  }

  // 初始化余额
  const balance = {};
  members.forEach(m => balance[m] = 0);

  // 计算每笔消费
  expenses.forEach(exp => {
    const payer = exp.payer;
    const participants = exp.participants || [];
    const amount = exp.amount;

    if (!balance[payer]) balance[payer] = 0;

    // 付款人先记上这笔支出
    balance[payer] += amount;

    // 如果有多人参与，计算 AA
    if (participants.length > 1) {
      const perPerson = amount / participants.length;
      participants.forEach(p => {
        if (!balance[p]) balance[p] = 0;
        balance[p] -= perPerson;
      });
    }
  });

  // 计算转账建议
  const receivers = [];
  const payersList = [];

  Object.entries(balance).forEach(([name, amt]) => {
    if (amt > 0.01) receivers.push({ name, amt });
    else if (amt < -0.01) payersList.push({ name, amt: -amt });
  });

  const transactions = [];
  payersList.forEach(payer => {
    let remaining = payer.amt;
    receivers.forEach(receiver => {
      if (remaining <= 0) return;
      const transfer = Math.min(remaining, receiver.amt);
      if (transfer > 0.01) {
        transactions.push({
          from: payer.name,
          to: receiver.name,
          amount: transfer
        });
        remaining -= transfer;
        receiver.amt -= transfer;
      }
    });
  });

  return { balance, transactions };
}

// 启动服务器
httpServer.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
