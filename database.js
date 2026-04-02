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
  async initTables() {
    // 房间表 - 添加 name 字段
    this.db.run(`
      CREATE TABLE IF NOT EXISTS rooms (
        room_code TEXT PRIMARY KEY,
        name TEXT DEFAULT '未命名项目',
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

    // 类别表 - 每个房间独立管理
    this.db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_code TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_code) REFERENCES rooms(room_code),
        UNIQUE(room_code, name)
      )
    `);

    // 迁移：检查并添加 name 列（如果表已存在但缺少该列）
    await this.migrateAddNameColumn();

    // 迁移：为旧房间添加默认类别
    await this.migrateDefaultCategories();
  }

  // 迁移：为已存在的 rooms 表添加 name 列
  async migrateAddNameColumn() {
    return new Promise((resolve, reject) => {
      // 检查 name 列是否存在
      this.db.all("PRAGMA table_info(rooms)", (err, columns) => {
        if (err) {
          console.error('检查表结构失败:', err);
          return resolve(); // 继续运行，不阻塞
        }

        const hasNameColumn = columns.some(col => col.name === 'name');

        if (!hasNameColumn) {
          console.log('迁移：为 rooms 表添加 name 列');
          this.db.run(
            "ALTER TABLE rooms ADD COLUMN name TEXT DEFAULT '未命名项目'",
            (err) => {
              if (err) {
                console.error('添加 name 列失败:', err);
              } else {
                console.log('成功添加 name 列');
              }
              resolve();
            }
          );
        } else {
          resolve();
        }
      });
    });
  }

  // 迁移：为没有类别的房间添加默认类别
  async migrateDefaultCategories() {
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

    return new Promise((resolve, reject) => {
      // 获取所有房间
      this.db.all('SELECT room_code FROM rooms', async (err, rooms) => {
        if (err) {
          console.error('获取房间列表失败:', err);
          return resolve();
        }

        for (const room of rooms) {
          // 检查该房间是否已有类别
          const categories = await this.getCategories(room.room_code);
          if (categories.length === 0) {
            // 添加默认类别
            for (let i = 0; i < defaultCategories.length; i++) {
              await this.addCategory(room.room_code, {
                ...defaultCategories[i],
                sortOrder: i
              });
            }
            console.log(`为房间 ${room.room_code} 添加默认类别`);
          }
        }
        resolve();
      });
    });
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
  async createRoom(name = '未命名项目') {
    const roomCode = this.generateRoomCode();
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO rooms (room_code, name) VALUES (?, ?)',
        [roomCode, name],
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

  // 更新项目名称
  async updateRoomName(roomCode, name) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE rooms SET name = ? WHERE room_code = ?',
        [name, roomCode],
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

  // ===== 类别管理 =====

  // 获取房间所有类别
  async getCategories(roomCode) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM categories WHERE room_code = ? ORDER BY sort_order, created_at',
        [roomCode],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  // 添加类别
  async addCategory(roomCode, category) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO categories (room_code, name, color, sort_order) VALUES (?, ?, ?, ?)',
        [roomCode, category.name, category.color, category.sortOrder || 0],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              room_code: roomCode,
              name: category.name,
              color: category.color,
              sort_order: category.sortOrder || 0
            });
          }
        }
      );
    });
  }

  // 删除类别
  async deleteCategory(roomCode, categoryName) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM categories WHERE room_code = ? AND name = ?',
        [roomCode, categoryName],
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

  // 更新消费记录
  async updateExpense(id, roomCode, expense) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE expenses
         SET datetime = ?, category = ?, amount = ?, payer = ?, participants = ?, note = ?
         WHERE id = ? AND room_code = ?`,
        [
          expense.datetime,
          expense.category,
          expense.amount,
          expense.payer,
          JSON.stringify(expense.participants),
          expense.note || '',
          id,
          roomCode
        ],
        (err) => {
          if (err) {
            reject(err);
          } else {
            // 返回更新后的记录
            this.db.get(
              'SELECT * FROM expenses WHERE id = ?',
              [id],
              (err, row) => {
                if (err) {
                  reject(err);
                } else {
                  resolve({
                    ...row,
                    participants: JSON.parse(row.participants)
                  });
                }
              }
            );
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
