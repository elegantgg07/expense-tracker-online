const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || '/data/expenses.db';

class Database {
  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('数据库连接失败:', err);
      } else {
        console.log('SQLite 数据库已连接');
        this.initTables();
      }
    });
  }

  // 初始化表结构
  initTables() {
    // 房间表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS rooms (
        room_code TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        members TEXT DEFAULT '[]'
      )
    `);

    // 消费记录表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_code TEXT NOT NULL,
        datetime DATETIME NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        payer TEXT NOT NULL,
        participants TEXT NOT NULL,
        note TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_code) REFERENCES rooms(room_code)
      )
    `);
  }

  // 生成 6 位房间码
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // 创建房间
  async createRoom() {
    const roomCode = this.generateRoomCode();
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO rooms (room_code) VALUES (?)',
        [roomCode],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(roomCode);
          }
        }
      );
    });
  }

  // 获取房间信息
  async getRoom(roomCode) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM rooms WHERE room_code = ?',
        [roomCode],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  // 添加成员到房间
  async addMember(roomCode, nickname) {
    const room = await this.getRoom(roomCode);
    if (!room) return false;

    const members = JSON.parse(room.members || '[]');
    if (!members.includes(nickname)) {
      members.push(nickname);
    }

    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE rooms SET members = ? WHERE room_code = ?',
        [JSON.stringify(members), roomCode],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        }
      );
    });
  }

  // 获取房间所有成员
  async getRoomMembers(roomCode) {
    const room = await this.getRoom(roomCode);
    if (!room) return [];
    return JSON.parse(room.members || '[]');
  }

  // 添加消费记录
  async addExpense(roomCode, expense) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO expenses (room_code, datetime, category, amount, payer, participants, note, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          roomCode,
          expense.datetime,
          expense.category,
          expense.amount,
          expense.payer,
          JSON.stringify(expense.participants),
          expense.note || '',
          expense.createdBy
        ],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  // 获取房间所有消费记录
  async getExpenses(roomCode) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM expenses WHERE room_code = ? ORDER BY datetime DESC',
        [roomCode],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            const expenses = rows.map(row => ({
              ...row,
              participants: JSON.parse(row.participants)
            }));
            resolve(expenses);
          }
        }
      );
    });
  }

  // 删除消费记录
  async deleteExpense(id, roomCode) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM expenses WHERE id = ? AND room_code = ?',
        [id, roomCode],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        }
      );
    });
  }

  // 获取 AA 计算数据
  async getAAData(roomCode) {
    const expenses = await this.getExpenses(roomCode);
    const members = await this.getRoomMembers(roomCode);
    return { expenses, members };
  }
}

module.exports = new Database();
