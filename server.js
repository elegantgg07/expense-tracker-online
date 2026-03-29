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
    const roomCode = await db.createRoom();
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
      return res.status(404).json({ success: false, error: '房间不存在' });
    }

    await db.addMember(roomCode, nickname);
    const members = await db.getRoomMembers(roomCode);
    const expenses = await db.getExpenses(roomCode);

    res.json({
      success: true,
      roomCode,
      members,
      expenses
    });
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
