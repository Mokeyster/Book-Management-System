import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

// 数据库文件路径
const dbPath = path.join(app.getPath('userData'), 'library.db')

// 初始化数据库
export function initDatabase(): Database.Database {
  // 确保数据库目录存在
  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  // 创建或打开数据库连接
  const db = new Database(dbPath)

  // 启用外键约束
  db.pragma('foreign_keys = ON')

  // 创建表结构
  createTables(db)

  // 初始化基础数据
  initBaseData(db)

  return db
}

// 创建表结构
function createTables(db: Database.Database): void {
  // 图书分类表
  db.exec(`
    CREATE TABLE IF NOT EXISTS book_category (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_name TEXT NOT NULL,
      category_code TEXT,
      parent_id INTEGER,
      level INTEGER DEFAULT 1,
      description TEXT,
      FOREIGN KEY (parent_id) REFERENCES book_category (category_id)
    )
  `)

  // 出版社表
  db.exec(`
    CREATE TABLE IF NOT EXISTS publisher (
      publisher_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      description TEXT,
      cooperation_history TEXT
    )
  `)

  // 图书表
  db.exec(`
    CREATE TABLE IF NOT EXISTS book (
      book_id INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn TEXT UNIQUE,
      title TEXT NOT NULL,
      author TEXT,
      publisher_id INTEGER,
      publish_date TEXT,
      price REAL,
      category_id INTEGER,
      location TEXT,
      description TEXT,
      status INTEGER DEFAULT 1, -- 1:在库, 2:借出, 3:预约, 4:损坏, 5:丢失
      create_time TEXT DEFAULT (datetime('now', 'localtime')),
      update_time TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (publisher_id) REFERENCES publisher (publisher_id),
      FOREIGN KEY (category_id) REFERENCES book_category (category_id)
    )
  `)

  // 标签表
  db.exec(`
    CREATE TABLE IF NOT EXISTS tag (
      tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag_name TEXT NOT NULL UNIQUE,
      description TEXT
    )
  `)

  // 图书-标签关系表
  db.exec(`
    CREATE TABLE IF NOT EXISTS book_tag (
      book_id INTEGER,
      tag_id INTEGER,
      PRIMARY KEY (book_id, tag_id),
      FOREIGN KEY (book_id) REFERENCES book (book_id),
      FOREIGN KEY (tag_id) REFERENCES tag (tag_id)
    )
  `)

  // 入库记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_in (
      in_id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER,
      in_date TEXT DEFAULT (datetime('now', 'localtime')),
      quantity INTEGER DEFAULT 1,
      source TEXT,
      operator_id INTEGER,
      remark TEXT,
      FOREIGN KEY (book_id) REFERENCES book (book_id),
      FOREIGN KEY (operator_id) REFERENCES system_user (user_id)
    )
  `)

  // 出库记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_out (
      out_id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER,
      out_date TEXT DEFAULT (datetime('now', 'localtime')),
      quantity INTEGER DEFAULT 1,
      reason TEXT,
      operator_id INTEGER,
      remark TEXT,
      FOREIGN KEY (book_id) REFERENCES book (book_id),
      FOREIGN KEY (operator_id) REFERENCES system_user (user_id)
    )
  `)

  // 读者类型表
  db.exec(`
    CREATE TABLE IF NOT EXISTS reader_type (
      type_id INTEGER PRIMARY KEY AUTOINCREMENT,
      type_name TEXT NOT NULL,
      max_borrow_count INTEGER DEFAULT 5,
      max_borrow_days INTEGER DEFAULT 30,
      can_renew INTEGER DEFAULT 1, -- 0:不可续借, 1:可续借
      max_renew_count INTEGER DEFAULT 1
    )
  `)

  // 读者表
  db.exec(`
    CREATE TABLE IF NOT EXISTS reader (
      reader_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gender TEXT, -- '男', '女', '其他'
      id_card TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      register_date TEXT DEFAULT (datetime('now', 'localtime')),
      status INTEGER DEFAULT 1, -- 1:正常, 2:暂停, 3:注销
      borrow_quota INTEGER,
      type_id INTEGER,
      FOREIGN KEY (type_id) REFERENCES reader_type (type_id)
    )
  `)

  // 借阅记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS borrow_record (
      borrow_id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER,
      reader_id INTEGER,
      borrow_date TEXT DEFAULT (datetime('now', 'localtime')),
      due_date TEXT,
      return_date TEXT,
      renew_count INTEGER DEFAULT 0,
      fine_amount REAL DEFAULT 0.0,
      status INTEGER DEFAULT 1, -- 1:借出, 2:已归还, 3:逾期, 4:续借
      operator_id INTEGER,
      FOREIGN KEY (book_id) REFERENCES book (book_id),
      FOREIGN KEY (reader_id) REFERENCES reader (reader_id),
      FOREIGN KEY (operator_id) REFERENCES system_user (user_id)
    )
  `)

  // 预约记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservation (
      reservation_id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER,
      reader_id INTEGER,
      reserve_date TEXT DEFAULT (datetime('now', 'localtime')),
      expiry_date TEXT,
      status INTEGER DEFAULT 1, -- 1:预约中, 2:已借出, 3:已过期, 4:已取消
      FOREIGN KEY (book_id) REFERENCES book (book_id),
      FOREIGN KEY (reader_id) REFERENCES reader (reader_id)
    )
  `)

  // 系统角色表
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_role (
      role_id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_name TEXT NOT NULL,
      permissions TEXT
    )
  `)

  // 系统用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_user (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      real_name TEXT,
      role_id INTEGER,
      phone TEXT,
      email TEXT,
      status INTEGER DEFAULT 1, -- 1:正常, 2:锁定, 3:禁用
      last_login TEXT,
      FOREIGN KEY (role_id) REFERENCES system_role (role_id)
    )
  `)

  // 操作日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS operation_log (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      operation TEXT,
      operation_time TEXT DEFAULT (datetime('now', 'localtime')),
      ip TEXT,
      details TEXT,
      FOREIGN KEY (user_id) REFERENCES system_user (user_id)
    )
  `)

  // 系统配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_config (
      config_id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key TEXT NOT NULL UNIQUE,
      config_value TEXT,
      description TEXT
    )
  `)

  // 数据备份表
  db.exec(`
    CREATE TABLE IF NOT EXISTS data_backup (
      backup_id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_date TEXT DEFAULT (datetime('now', 'localtime')),
      backup_path TEXT,
      backup_size TEXT,
      operator_id INTEGER,
      remark TEXT,
      FOREIGN KEY (operator_id) REFERENCES system_user (user_id)
    )
  `)

  // 统计报表表
  db.exec(`
    CREATE TABLE IF NOT EXISTS stat_report (
      report_id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_name TEXT,
      report_type TEXT,
      generate_date TEXT DEFAULT (datetime('now', 'localtime')),
      stats_period TEXT,
      operator_id INTEGER,
      report_path TEXT,
      FOREIGN KEY (operator_id) REFERENCES system_user (user_id)
    )
  `)
}

// 初始化基础数据
function initBaseData(db: Database.Database): void {
  // 检查是否已经有系统角色数据，如果没有则插入
  const roleCount = db.prepare('SELECT COUNT(*) as count FROM system_role').get() as {
    count: number
  }

  if (roleCount.count === 0) {
    // 插入默认角色
    db.prepare(
      `
      INSERT INTO system_role (role_name, permissions)
      VALUES ('系统管理员', '全部权限'), ('图书管理员', '图书管理,借阅管理,读者管理'), ('普通操作员', '借阅管理,读者管理')
    `
    ).run()

    // 插入默认管理员账号 (用户名: admin, 密码: admin123)
    // 注意：实际应用中应该使用更安全的密码哈希方法
    db.prepare(
      `
      INSERT INTO system_user (username, password_hash, real_name, role_id, status)
      VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '系统管理员', 1, 1)
    `
    ).run()

    // 插入默认读者类型
    db.prepare(
      `
      INSERT INTO reader_type (type_name, max_borrow_count, max_borrow_days, can_renew, max_renew_count)
      VALUES
        ('普通读者', 5, 30, 1, 1),
        ('VIP读者', 10, 60, 1, 2),
        ('教师', 15, 90, 1, 3),
        ('学生', 3, 15, 1, 1)
    `
    ).run()

    // 插入默认系统配置
    db.prepare(
      `
      INSERT INTO system_config (config_key, config_value, description)
      VALUES
        ('library_name', '图书管理系统', '图书馆名称'),
        ('fine_rate', '0.5', '每天逾期罚款金额(元)'),
        ('backup_interval', '7', '自动备份间隔(天)'),
        ('auto_backup', '1', '是否启用自动备份(0:否, 1:是)')
    `
    ).run()
  }
}
