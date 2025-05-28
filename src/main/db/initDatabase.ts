import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

// 数据库文件路径
// 使用Electron的app.getPath获取用户数据目录，确保数据库文件存储在适当位置
const dbPath = path.join(app.getPath('userData'), 'library.db')

// 初始化数据库函数
// 该函数负责创建数据库连接、创建表结构并初始化基础数据
export function initDatabase(): Database.Database {
  // 确保数据库目录存在
  // 使用recursive:true确保即使父目录不存在也能创建完整路径
  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  // 创建或打开数据库连接
  // better-sqlite3提供了同步API，简化了数据库操作
  const db = new Database(dbPath)

  // 启用外键约束
  // 这确保了引用完整性，防止删除被引用的记录
  db.pragma('foreign_keys = ON')

  // 创建表结构
  // 调用下方定义的函数创建所有必要的表
  createTables(db)

  // 初始化基础数据
  // 调用下方定义的函数填充基础数据
  initBaseData(db)

  // 返回初始化后的数据库连接
  return db
}

// 创建表结构函数
// 该函数定义了系统所需的所有表结构
function createTables(db: Database.Database): void {
  // 图书分类表
  // 支持多级分类结构，通过parent_id实现层级关系
  db.exec(`
    CREATE TABLE IF NOT EXISTS book_category (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT, -- 分类ID，自增主键
      category_name TEXT NOT NULL,                   -- 分类名称，必填
      category_code TEXT,                            -- 分类代码，可选
      parent_id INTEGER,                             -- 父分类ID，实现层级结构
      level INTEGER DEFAULT 1,                       -- 层级深度，默认为1级
      description TEXT,                              -- 分类描述
      FOREIGN KEY (parent_id) REFERENCES book_category (category_id) -- 外键约束确保父分类存在
    )
  `)

  // 出版社表
  // 存储图书出版社相关信息
  db.exec(`
    CREATE TABLE IF NOT EXISTS publisher (
      publisher_id INTEGER PRIMARY KEY AUTOINCREMENT, -- 出版社ID，自增主键
      name TEXT NOT NULL,                             -- 出版社名称，必填
      address TEXT,                                   -- 地址
      contact_person TEXT,                            -- 联系人
      phone TEXT,                                     -- 电话
      email TEXT,                                     -- 电子邮件
      website TEXT,                                   -- 网站
      description TEXT,                               -- 描述
      cooperation_history TEXT                        -- 合作历史记录
    )
  `)

  // 图书表
  // 系统核心表，存储图书基本信息
  db.exec(`
    CREATE TABLE IF NOT EXISTS book (
      book_id INTEGER PRIMARY KEY AUTOINCREMENT,      -- 图书ID，自增主键
      isbn TEXT UNIQUE,                               -- ISBN编号，唯一
      title TEXT NOT NULL,                            -- 图书标题，必填
      author TEXT,                                    -- 作者
      publisher_id INTEGER,                           -- 出版社ID，外键
      publish_date TEXT,                              -- 出版日期
      price REAL,                                     -- 价格
      category_id INTEGER,                            -- 分类ID，外键
      location TEXT,                                  -- 馆藏位置
      description TEXT,                               -- 图书描述
      status INTEGER DEFAULT 1,                       -- 状态：1:在库, 2:借出, 3:预约, 4:损坏, 5:丢失
      create_time TEXT DEFAULT (datetime('now', 'localtime')), -- 创建时间，自动设置为当前本地时间
      update_time TEXT DEFAULT (datetime('now', 'localtime')), -- 更新时间，自动设置为当前本地时间
      FOREIGN KEY (publisher_id) REFERENCES publisher (publisher_id), -- 出版社外键约束
      FOREIGN KEY (category_id) REFERENCES book_category (category_id) -- 分类外键约束
    )
  `)

  // 标签表
  // 用于图书分类的补充，提供更灵活的图书标记
  db.exec(`
    CREATE TABLE IF NOT EXISTS tag (
      tag_id INTEGER PRIMARY KEY AUTOINCREMENT, -- 标签ID，自增主键
      tag_name TEXT NOT NULL UNIQUE,            -- 标签名称，唯一
      description TEXT                          -- 标签描述
    )
  `)

  // 图书-标签关系表
  // 多对多关系表，一本书可有多个标签，一个标签可关联多本书
  db.exec(`
    CREATE TABLE IF NOT EXISTS book_tag (
      book_id INTEGER,                          -- 图书ID
      tag_id INTEGER,                           -- 标签ID
      PRIMARY KEY (book_id, tag_id),            -- 复合主键，确保关系唯一
      FOREIGN KEY (book_id) REFERENCES book (book_id), -- 图书外键约束
      FOREIGN KEY (tag_id) REFERENCES tag (tag_id)     -- 标签外键约束
    )
  `)

  // 入库记录表
  // 跟踪图书入库情况
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_in (
      in_id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 入库记录ID，自增主键
      book_id INTEGER,                          -- 图书ID，外键
      in_date TEXT DEFAULT (datetime('now', 'localtime')), -- 入库日期，默认为当前时间
      quantity INTEGER DEFAULT 1,               -- 入库数量，默认为1
      source TEXT,                              -- 来源
      operator_id INTEGER,                      -- 操作员ID，外键
      remark TEXT,                              -- 备注
      FOREIGN KEY (book_id) REFERENCES book (book_id), -- 图书外键约束
      FOREIGN KEY (operator_id) REFERENCES system_user (user_id) -- 操作员外键约束
    )
  `)

  // 出库记录表
  // 跟踪图书出库情况
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_out (
      out_id INTEGER PRIMARY KEY AUTOINCREMENT, -- 出库记录ID，自增主键
      book_id INTEGER,                          -- 图书ID，外键
      out_date TEXT DEFAULT (datetime('now', 'localtime')), -- 出库日期，默认为当前时间
      quantity INTEGER DEFAULT 1,               -- 出库数量，默认为1
      reason TEXT,                              -- 原因
      operator_id INTEGER,                      -- 操作员ID，外键
      remark TEXT,                              -- 备注
      FOREIGN KEY (book_id) REFERENCES book (book_id), -- 图书外键约束
      FOREIGN KEY (operator_id) REFERENCES system_user (user_id) -- 操作员外键约束
    )
  `)

  // 读者类型表
  // 定义不同类型读者的借阅权限
  db.exec(`
    CREATE TABLE IF NOT EXISTS reader_type (
      type_id INTEGER PRIMARY KEY AUTOINCREMENT, -- 类型ID，自增主键
      type_name TEXT NOT NULL,                   -- 类型名称，必填
      max_borrow_count INTEGER DEFAULT 5,        -- 最大借阅数量，默认5本
      max_borrow_days INTEGER DEFAULT 30,        -- 最大借阅天数，默认30天
      can_renew INTEGER DEFAULT 1,               -- 是否可续借：0不可，1可
      max_renew_count INTEGER DEFAULT 1          -- 最大续借次数，默认1次
    )
  `)

  // 读者表
  // 存储借阅者信息
  db.exec(`
    CREATE TABLE IF NOT EXISTS reader (
      reader_id INTEGER PRIMARY KEY AUTOINCREMENT, -- 读者ID，自增主键
      name TEXT NOT NULL,                          -- 姓名，必填
      gender TEXT,                                 -- 性别：'男', '女', '其他'
      id_card TEXT,                                -- 身份证号
      phone TEXT,                                  -- 电话
      email TEXT,                                  -- 电子邮件
      address TEXT,                                -- 地址
      register_date TEXT DEFAULT (datetime('now', 'localtime')), -- 注册日期，默认当前时间
      status INTEGER DEFAULT 1,                    -- 状态：1正常，2暂停，3注销
      borrow_quota INTEGER,                        -- 借阅配额
      type_id INTEGER,                             -- 读者类型ID，外键
      FOREIGN KEY (type_id) REFERENCES reader_type (type_id) -- 读者类型外键约束
    )
  `)

  // 借阅记录表
  // 跟踪图书借阅情况
  db.exec(`
    CREATE TABLE IF NOT EXISTS borrow_record (
      borrow_id INTEGER PRIMARY KEY AUTOINCREMENT, -- 借阅记录ID，自增主键
      book_id INTEGER,                             -- 图书ID，外键
      reader_id INTEGER,                           -- 读者ID，外键
      borrow_date TEXT DEFAULT (datetime('now', 'localtime')), -- 借阅日期，默认当前时间
      due_date TEXT,                               -- 应还日期
      return_date TEXT,                            -- 实际归还日期
      renew_count INTEGER DEFAULT 0,               -- 续借次数，默认0
      fine_amount REAL DEFAULT 0.0,                -- 罚款金额，默认0
      status INTEGER DEFAULT 1,                    -- 状态：1借出，2已归还，3逾期，4续借
      operator_id INTEGER,                         -- 操作员ID，外键
      FOREIGN KEY (book_id) REFERENCES book (book_id), -- 图书外键约束
      FOREIGN KEY (reader_id) REFERENCES reader (reader_id), -- 读者外键约束
      FOREIGN KEY (operator_id) REFERENCES system_user (user_id) -- 操作员外键约束
    )
  `)

  // 预约记录表
  // 跟踪图书预约情况
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservation (
      reservation_id INTEGER PRIMARY KEY AUTOINCREMENT, -- 预约ID，自增主键
      book_id INTEGER,                                  -- 图书ID，外键
      reader_id INTEGER,                                -- 读者ID，外键
      reserve_date TEXT DEFAULT (datetime('now', 'localtime')), -- 预约日期，默认当前时间
      expiry_date TEXT,                                 -- 预约过期日期
      status INTEGER DEFAULT 1,                         -- 状态：1预约中，2已借出，3已过期，4已取消
      FOREIGN KEY (book_id) REFERENCES book (book_id), -- 图书外键约束
      FOREIGN KEY (reader_id) REFERENCES reader (reader_id) -- 读者外键约束
    )
  `)

  // 系统角色表
  // 定义系统用户角色及权限
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_role (
      role_id INTEGER PRIMARY KEY AUTOINCREMENT, -- 角色ID，自增主键
      role_name TEXT NOT NULL,                   -- 角色名称，必填
      permissions TEXT                           -- 权限列表
    )
  `)

  // 系统用户表
  // 存储系统操作人员信息
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_user (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT, -- 用户ID，自增主键
      username TEXT NOT NULL UNIQUE,             -- 用户名，唯一
      password_hash TEXT NOT NULL,               -- 密码哈希值，必填
      real_name TEXT,                            -- 真实姓名
      role_id INTEGER,                           -- 角色ID，外键
      phone TEXT,                                -- 电话
      email TEXT,                                -- 电子邮件
      status INTEGER DEFAULT 1,                  -- 状态：1正常，2锁定，3禁用
      last_login TEXT,                           -- 最后登录时间
      FOREIGN KEY (role_id) REFERENCES system_role (role_id) -- 角色外键约束
    )
  `)

  // 操作日志表
  // 记录系统操作日志，便于审计和追踪
  db.exec(`
    CREATE TABLE IF NOT EXISTS operation_log (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT, -- 日志ID，自增主键
      user_id INTEGER,                          -- 用户ID，外键
      operation TEXT,                           -- 操作描述
      operation_time TEXT DEFAULT (datetime('now', 'localtime')), -- 操作时间，默认当前时间
      ip TEXT,                                  -- 操作IP
      details TEXT,                             -- 详细信息
      FOREIGN KEY (user_id) REFERENCES system_user (user_id) -- 用户外键约束
    )
  `)

  // 系统配置表
  // 存储系统配置参数
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_config (
      config_id INTEGER PRIMARY KEY AUTOINCREMENT, -- 配置ID，自增主键
      config_key TEXT NOT NULL UNIQUE,             -- 配置键，唯一
      config_value TEXT,                           -- 配置值
      description TEXT                             -- 配置描述
    )
  `)

  // 数据备份表
  // 记录数据库备份历史
  db.exec(`
    CREATE TABLE IF NOT EXISTS data_backup (
      backup_id INTEGER PRIMARY KEY AUTOINCREMENT, -- 备份ID，自增主键
      backup_date TEXT DEFAULT (datetime('now', 'localtime')), -- 备份日期，默认当前时间
      backup_path TEXT,                           -- 备份文件路径
      backup_size TEXT,                           -- 备份大小
      operator_id INTEGER,                        -- 操作员ID，外键
      remark TEXT,                                -- 备注
      FOREIGN KEY (operator_id) REFERENCES system_user (user_id) -- 操作员外键约束
    )
  `)

  // 统计报表表
  // 记录生成的统计报表
  db.exec(`
    CREATE TABLE IF NOT EXISTS stat_report (
      report_id INTEGER PRIMARY KEY AUTOINCREMENT, -- 报表ID，自增主键
      report_name TEXT,                           -- 报表名称
      report_type TEXT,                           -- 报表类型
      generate_date TEXT DEFAULT (datetime('now', 'localtime')), -- 生成日期，默认当前时间
      stats_period TEXT,                          -- 统计周期
      operator_id INTEGER,                        -- 操作员ID，外键
      report_path TEXT,                           -- 报表文件路径
      FOREIGN KEY (operator_id) REFERENCES system_user (user_id) -- 操作员外键约束
    )
  `)
}

// 初始化基础数据函数
// 该函数负责在表创建后填充初始数据
function initBaseData(db: Database.Database): void {
  // 检查是否已有系统角色数据，避免重复插入
  const roleCount = db.prepare('SELECT COUNT(*) as count FROM system_role').get() as {
    count: number
  }

  // 只有当系统角色表为空时才进行初始化
  if (roleCount.count === 0) {
    // 开始事务
    // 使用事务确保数据完整性，若有任何错误会进行回滚
    db.exec('BEGIN TRANSACTION')

    try {
      // 插入默认角色
      // 创建三种默认角色：系统管理员、图书管理员和普通操作员
      db.prepare(
        `
        INSERT INTO system_role (role_name, permissions)
        VALUES ('系统管理员', '全部权限'), ('图书管理员', '图书管理,借阅管理,读者管理'), ('普通操作员', '借阅管理,读者管理')
      `
      ).run()

      // 插入默认管理员账号和操作员账号
      // 初始密码使用SHA-256哈希值('admin123'的哈希)
      db.prepare(
        `
        INSERT INTO system_user (username, password_hash, real_name, role_id, status)
        VALUES
          ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '系统管理员', 1, 1),
          ('szm', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '沙子莫', 3, 1),
          ('lzk', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '刘子康', 3, 1),
          ('py', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '彭羽', 3, 1)
      `
      ).run()

      // 插入默认读者类型
      // 创建四种读者类型，有不同的借阅权限
      db.prepare(
        `
        INSERT INTO reader_type (type_name, max_borrow_count, max_borrow_days, can_renew, max_renew_count)
        VALUES
          ('普通读者', 5, 30, 1, 1),  -- 普通读者：最多借5本，30天，可续借1次
          ('VIP读者', 10, 60, 1, 2),  -- VIP读者：最多借10本，60天，可续借2次
          ('教师', 15, 90, 1, 3),     -- 教师：最多借15本，90天，可续借3次
          ('学生', 3, 15, 1, 1)       -- 学生：最多借3本，15天，可续借1次
      `
      ).run()

      // 插入示例读者
      // 创建15个不同类型的读者样本数据
      db.prepare(
        `
        INSERT INTO reader (name, gender, id_card, phone, email, address, status, borrow_quota, type_id)
        VALUES
          ('王小明', '男', '110101200001015275', '13800138001', 'xiaoming@example.com', '北京市海淀区学院路1号', 1, 5, 4),
          ('李小华', '女', '110101200002025286', '13800138002', 'xiaohua@example.com', '北京市朝阳区建国路2号', 1, 5, 4),
          ('张伟', '男', '110101197001017895', '13800138003', 'prof.zhang@example.com', '北京市海淀区清华园1号', 1, 15, 3),
          ('赵一', '女', '110101198005054321', '13800138004', 'zhao.r@example.com', '北京市海淀区中关村南大街5号', 1, 15, 3),
          ('陈红', '男', '110101198506075432', '13800138005', 'chen@example.com', '北京市西城区西长安街6号', 1, 5, 1),
          ('林蓝', '女', '110101199007086543', '13800138006', 'lin@example.com', '北京市东城区东长安街7号', 1, 10, 2),
          ('刘强', '男', '110101199503057896', '13800138007', 'liuqiang@example.com', '北京市海淀区中关村东路18号', 1, 5, 4),
          ('张小敏', '女', '110101199604068765', '13800138008', 'xiaomin@example.com', '北京市朝阳区三里屯路12号', 1, 5, 4),
          ('王山', '男', '110101196505124567', '13800138009', 'wangshan@example.com', '北京市海淀区五道口35号', 1, 15, 3),
          ('周学', '女', '110101197012093214', '13800138010', 'zhouxue@example.com', '北京市海淀区学院路5号', 1, 15, 3),
          ('吴芳', '女', '110101198810125678', '13800138011', 'wufang@example.com', '北京市朝阳区望京西路8号', 1, 5, 1),
          ('徐明', '男', '110101199205128765', '13800138012', 'xuming@example.com', '北京市海淀区中关村大街15号', 1, 5, 4),
          ('杨华', '女', '110101198709126789', '13800138013', 'yanghua@example.com', '北京市东城区王府井大街20号', 1, 10, 2),
          ('黄志', '男', '110101197808125432', '13800138014', 'huangzhi@example.com', '北京市西城区金融街7号', 1, 15, 3),
          ('孙立', '男', '110101199307124321', '13800138015', 'sunli@example.com', '北京市朝阳区国贸中心2号', 1, 5, 4)
      `
      ).run()

      // 插入默认系统配置
      // 设置系统基本参数
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

      // 插入图书分类数据
      // 创建两级图书分类结构
      db.prepare(
        `
        INSERT INTO book_category (category_name, category_code, parent_id, level, description)
        VALUES
          -- 一级分类
          ('计算机科学', 'CS', NULL, 1, '计算机相关书籍'),
          ('文学艺术', 'LIT', NULL, 1, '文学与艺术类书籍'),
          ('自然科学', 'SCI', NULL, 1, '自然科学类书籍'),
          ('社会科学', 'SOC', NULL, 1, '社会科学类书籍'),

          -- 计算机科学的二级分类
          ('编程语言', 'PRG', 1, 2, '编程语言相关书籍'),
          ('数据库', 'DB', 1, 2, '数据库相关书籍'),
          ('软件工程', 'SE', 1, 2, '软件工程相关书籍'),
          ('人工智能', 'AI', 1, 2, '人工智能相关书籍'),
          ('网络安全', 'SEC', 1, 2, '网络安全相关书籍'),

          -- 文学艺术的二级分类
          ('现代文学', 'ML', 2, 2, '现代文学作品'),
          ('古典文学', 'CL', 2, 2, '古典文学作品'),
          ('艺术理论', 'AT', 2, 2, '艺术理论书籍'),

          -- 自然科学的二级分类
          ('物理学', 'PHY', 3, 2, '物理学相关书籍'),
          ('化学', 'CHE', 3, 2, '化学相关书籍'),
          ('生物学', 'BIO', 3, 2, '生物学相关书籍'),

          -- 社会科学的二级分类
          ('经济学', 'ECO', 4, 2, '经济学相关书籍'),
          ('社会学', 'SOL', 4, 2, '社会学相关书籍'),
          ('心理学', 'PSY', 4, 2, '心理学相关书籍')
        `
      ).run()

      // 插入出版社数据
      // 创建8个常见出版社样本
      db.prepare(
        `
        INSERT INTO publisher (name, address, contact_person, phone, email, website, description)
        VALUES
          ('人民邮电出版社', '北京市崇文区珠市口东大街9号', '张编辑', '010-12345678', 'contact@ptpress.com.cn', 'www.ptpress.com.cn', '专注于计算机科学类图书出版'),
          ('机械工业出版社', '北京市西城区百万庄大街22号', '王编辑', '010-87654321', 'contact@cmpedu.com', 'www.cmpedu.com', '专注于工程技术类图书出版'),
          ('清华大学出版社', '北京市海淀区清华大学校内', '李编辑', '010-23456789', 'contact@tup.com.cn', 'www.tup.com.cn', '高等教育类图书出版'),
          ('商务印书馆', '北京市东城区王府井大街36号', '赵编辑', '010-34567890', 'contact@cp.com.cn', 'www.cp.com.cn', '人文社科类图书出版'),
          ('科学出版社', '北京市海淀区建国路93号万达广场8号楼', '刘编辑', '010-45678901', 'contact@sciencep.com', 'www.sciencep.com', '科学技术类图书出版'),
          ('作家出版社', '北京市朝阳区东四环中路39号华业国际中心A座', '陈编辑', '010-56789012', 'contact@wxph.com', 'www.wxph.com', '文学艺术类图书出版'),
          ('电子工业出版社', '北京市海淀区万寿路27号', '郑编辑', '010-67890123', 'contact@phei.com.cn', 'www.phei.com.cn', '电子信息类图书出版'),
          ('高等教育出版社', '北京市西城区德外大街4号', '杨编辑', '010-78901234', 'contact@hep.com.cn', 'www.hep.com.cn', '高等教育类图书出版')
        `
      ).run()

      // 插入图书数据
      // 创建46本不同类型、不同状态的图书样本
      db.prepare(
        `
        INSERT INTO book (isbn, title, author, publisher_id, publish_date, price, category_id, location, description, status)
        VALUES
          ('9787115428028', 'Python编程：从入门到实践', '[美]埃里克·马瑟斯', 1, '2016-07-01', 89.00, 5, 'A1-01-01', 'Python入门经典教程，讲解Python 3.x', 1),
          ('9787115546081', '深度学习入门：基于Python的理论与实现', '[日]斋藤康毅', 1, '2018-08-01', 69.00, 8, 'A1-01-02', '使用Python从零开始实现深度学习算法', 2), -- 借出状态
          ('9787115483379', 'JavaScript高级程序设计（第4版）', '[美]马特·弗里斯比', 1, '2020-12-01', 129.00, 5, 'A1-01-03', 'JavaScript经典教程，涵盖最新ECMAScript特性', 2), -- 借出状态
          ('9787115533395', '数据结构与算法JavaScript描述', '[美]Michael McMillan', 1, '2019-04-01', 49.00, 5, 'A1-01-04', 'JavaScript实现数据结构与算法', 1),
          ('9787111690597', 'Spring Boot实战', '[美]克雷格·沃斯', 2, '2020-01-01', 79.00, 5, 'A1-02-01', 'Spring Boot框架实战指南', 2), -- 借出状态
          ('9787111641247', 'Java核心技术·卷1基础知识（第11版）', '[美]凯·S.霍斯特曼', 2, '2019-09-01', 149.00, 5, 'A1-02-02', 'Java经典教程，涵盖Java基础知识', 1),
          ('9787302581420', '计算机网络：自顶向下方法（原书第7版）', '[美]詹姆斯·F.库罗斯', 3, '2018-06-01', 89.00, 1, 'A2-01-01', '计算机网络原理经典教材', 1),
          ('9787111495482', 'SQL必知必会（第5版）', '[美]Ben Forta', 2, '2019-01-01', 45.00, 6, 'A2-01-02', 'SQL入门经典教程', 2), -- 借出状态
          ('9787115511485', '深入理解计算机系统（原书第3版）', '[美]Randal E.Bryant', 1, '2016-12-01', 139.00, 1, 'A2-01-03', '计算机系统原理经典教材', 4), -- 损坏状态
          ('9787111641988', '算法导论（原书第3版）', '[美]Thomas H.Cormen', 2, '2013-01-01', 128.00, 1, 'A2-02-01', '计算机算法经典教材', 1),
          ('9787115394095', '白帽子讲Web安全（纪念版）', '吴翰清', 1, '2014-03-01', 69.00, 9, 'A2-02-02', 'Web安全经典著作', 1),
          ('9787302502494', '软件测试原理与实践', '万书元', 3, '2018-09-01', 59.00, 7, 'A2-02-03', '软件测试入门与实践指南', 5), -- 丢失状态
          ('9787506365437', '活着', '余华', 6, '2017-08-01', 28.00, 10, 'B1-01-01', '余华代表作，讲述了农村人福贵的人生故事', 2), -- 借出状态
          ('9787506394864', '长安十二时辰', '马伯庸', 6, '2019-06-01', 59.80, 10, 'B1-01-02', '唐代背景下的悬疑小说', 1),
          ('9787020130764', '红楼梦', '曹雪芹', 4, '2016-01-01', 59.70, 11, 'B1-02-01', '中国古典四大名著之一', 1),
          ('9787570808533', '细胞生物学', '翟中和', 5, '2020-12-01', 88.00, 15, 'C1-01-01', '高等院校生物学专业教材', 1),
          ('9787030543943', '量子力学原理', '曾谨言', 5, '2018-05-01', 58.00, 13, 'C1-01-02', '量子力学教程', 1),
          ('9787115351814', '西方经济学（微观部分）', '高鸿业', 1, '2018-08-01', 69.00, 16, 'D1-01-01', '经济学原理教材', 2), -- 借出状态
          ('9787115353665', '社会心理学', '[美]戴维·迈尔斯', 1, '2016-06-01', 89.00, 18, 'D1-01-02', '心理学经典教材', 3), -- 预约状态
          ('9787115479907', '人类简史：从动物到上帝', '[以]尤瓦尔·赫拉利', 1, '2017-01-01', 68.00, 17, 'D1-02-01', '人类发展历史科普读物', 1),
          ('9787115576286', 'React从入门到精通', '李明', 1, '2021-02-01', 78.00, 5, 'A1-03-01', 'React框架入门与实战开发', 1),
          ('9787115598547', 'Vue.js实战指南', '张航', 1, '2021-06-15', 85.00, 5, 'A1-03-02', 'Vue.js前端框架全方位讲解', 1),
          ('9787111634386', '数据科学导论', '[美]John Smith', 2, '2021-09-10', 98.00, 8, 'A1-03-03', '数据科学基础理论与实践', 2), -- 借出状态
          ('9787115623478', 'TypeScript权威指南', '[美]Mike Johnson', 1, '2022-01-15', 89.00, 5, 'A1-03-04', 'TypeScript语言详解与最佳实践', 1),
          ('9787302563822', '微服务架构设计模式', '[美]Chris Richardson', 3, '2022-03-20', 108.00, 7, 'A1-04-01', '微服务架构详解与实践', 2), -- 借出状态
          ('9787115642387', '机器学习实战', '刘伟', 1, '2022-05-15', 86.00, 8, 'A1-04-02', '机器学习算法与应用案例', 1),
          ('9787111657894', 'Flutter移动应用开发', '陈明', 2, '2022-07-01', 92.00, 5, 'A1-04-03', 'Flutter跨平台开发指南', 2), -- 借出状态
          ('9787302598761', 'DevOps实践指南', '[美]Lisa Wells', 3, '2022-09-20', 98.00, 7, 'A1-04-04', 'DevOps理念、工具与最佳实践', 1),
          ('9787115678935', 'Node.js企业应用开发', '杨晓', 1, '2022-11-10', 88.00, 5, 'A1-05-01', 'Node.js服务端开发实战', 1),
          ('9787111687452', '云原生应用开发', '[美]Sam Wilson', 2, '2023-01-15', 105.00, 7, 'A1-05-02', '云原生架构与开发指南', 2), -- 借出状态
          ('9787115697845', '前端工程化实践', '张伟', 1, '2023-03-10', 86.00, 5, 'A1-05-03', '前端工程化体系与最佳实践', 1),
          ('9787111706328', '网络爬虫技术与实战', '李明', 2, '2023-05-01', 79.00, 9, 'A1-05-04', '网络爬虫开发与反爬技术', 1),
          ('9787115716942', '数据可视化实战', '王强', 1, '2023-07-15', 88.00, 5, 'A1-06-01', '数据可视化原理与工具应用', 2), -- 借出状态
          ('9787302612457', '区块链技术详解', '[美]David Brown', 3, '2023-09-05', 96.00, 1, 'A1-06-02', '区块链技术原理与应用开发', 1),
          ('9787115738521', '大数据处理技术', '刘伟', 1, '2023-11-10', 92.00, 8, 'A1-06-03', '大数据收集、存储与分析技术', 1),
          ('9787111754328', '人工智能应用实践', '[美]Sarah Johnson', 2, '2024-01-10', 108.00, 8, 'A1-06-04', '人工智能技术与商业应用', 2), -- 借出状态
          ('9787115776584', 'iOS应用开发指南', '张华', 1, '2024-03-15', 95.00, 5, 'A1-07-01', 'iOS移动应用开发实战', 1),
          ('9787302632574', 'Android高级开发', '李强', 3, '2024-05-01', 98.00, 5, 'A1-07-02', 'Android应用高级功能开发', 1),
          ('9787506412568', '苏东坡传', '林语堂', 6, '2017-06-15', 48.00, 10, 'B1-01-03', '林语堂经典人物传记', 1),
          ('9787506425643', '平凡的世界', '路遥', 6, '2017-09-20', 68.00, 10, 'B1-01-04', '中国当代文学经典作品', 2), -- 借出状态
          ('9787020024759', '百年孤独', '[哥]加西亚·马尔克斯', 4, '2018-03-10', 55.00, 10, 'B1-02-02', '世界文学经典名著', 1),
          ('9787020125265', '围城', '钱钟书', 4, '2018-07-15', 42.00, 10, 'B1-02-03', '中国现代文学经典', 1),
          ('9787020152421', '三国演义', '罗贯中', 4, '2019-01-10', 59.80, 11, 'B1-02-04', '中国古典四大名著之一', 2), -- 借出状态
          ('9787020157365', '西游记', '吴承恩', 4, '2019-04-15', 59.80, 11, 'B1-03-01', '中国古典四大名著之一', 1),
          ('9787020162789', '水浒传', '施耐庵', 4, '2019-07-10', 59.80, 11, 'B1-03-02', '中国古典四大名著之一', 1),
          ('9787559436481', '艺术的故事', '[英]贡布里希', 4, '2020-02-15', 88.00, 12, 'B1-03-03', '世界艺术史经典著作', 2) -- 借出状态
        `
      ).run()

      // 插入标签数据
      // 创建32个分类标签，用于多维度标记图书
      db.prepare(
        `
        INSERT INTO tag (tag_name, description)
        VALUES
          ('编程入门', '适合编程初学者的书籍'),
          ('经典教材', '经典的学习教材'),
          ('计算机科学', '计算机科学领域书籍'),
          ('算法', '算法相关书籍'),
          ('人工智能', '人工智能领域书籍'),
          ('深度学习', '深度学习相关书籍'),
          ('网络安全', '网络安全相关书籍'),
          ('软件开发', '软件开发相关书籍'),
          ('数据库', '数据库相关书籍'),
          ('文学', '文学作品'),
          ('小说', '小说类书籍'),
          ('古典文学', '中国古典文学'),
          ('科学', '自然科学类书籍'),
          ('经济学', '经济学相关书籍'),
          ('社会学', '社会学相关书籍'),
          ('心理学', '心理学相关书籍'),
          ('畅销书', '畅销图书'),
          ('Python', 'Python编程语言'),
          ('JavaScript', 'JavaScript编程语言'),
          ('Java', 'Java编程语言'),
          ('React', 'React前端框架'),
          ('Vue', 'Vue前端框架'),
          ('数据科学', '数据科学相关书籍'),
          ('微服务', '微服务架构相关书籍'),
          ('移动开发', '移动应用开发书籍'),
          ('云计算', '云计算相关书籍'),
          ('大数据', '大数据处理相关书籍'),
          ('传记', '人物传记类书籍'),
          ('现当代文学', '现当代文学作品'),
          ('中国文学', '中国文学作品'),
          ('外国文学', '外国文学作品'),
          ('艺术', '艺术类书籍')
        `
      ).run()

      // 插入图书-标签关联数据
      // 为图书添加多个标签，建立多对多关系
      db.prepare(
        `
        INSERT INTO book_tag (book_id, tag_id)
        VALUES
          (1, 1), (1, 3), (1, 18), -- Python编程：从入门到实践
          (2, 1), (2, 5), (2, 6), (2, 18), -- 深度学习入门
          (3, 3), (3, 8), (3, 19), -- JavaScript高级程序设计
          (4, 3), (4, 4), (4, 19), -- 数据结构与算法JavaScript描述
          (5, 3), (5, 8), (5, 20), -- Spring Boot实战
          (6, 1), (6, 3), (6, 20), -- Java核心技术
          (7, 2), (7, 3), -- 计算机网络
          (8, 1), (8, 9), -- SQL必知必会
          (9, 2), (9, 3), -- 深入理解计算机系统
          (10, 2), (10, 3), (10, 4), -- 算法导论
          (11, 3), (11, 7), -- 白帽子讲Web安全
          (12, 3), (12, 8), -- 软件测试原理与实践
          (13, 10), (13, 11), (13, 17), -- 活着
          (14, 10), (14, 11), -- 长安十二时辰
          (15, 10), (15, 11), (15, 12), -- 红楼梦
          (16, 13), -- 细胞生物学
          (17, 13), -- 量子力学原理
          (18, 14), -- 西方经济学
          (19, 16), -- 社会心理学
          (20, 15), (20, 17), -- 人类简史
          -- 新增图书标签
          (21, 3), (21, 8), (21, 21), -- React从入门到精通
          (22, 3), (22, 8), (22, 22), -- Vue.js实战指南
          (23, 3), (23, 5), (23, 23), -- 数据科学导论
          (24, 3), (24, 8), (24, 19), -- TypeScript权威指南
          (25, 3), (25, 8), (25, 24), -- 微服务架构设计模式
          (26, 3), (26, 5), (26, 6), -- 机器学习实战
          (27, 3), (27, 8), (27, 25), -- Flutter移动应用开发
          (28, 3), (28, 8), (28, 26), -- DevOps实践指南
          (29, 3), (29, 8), (29, 19), -- Node.js企业应用开发
          (30, 3), (30, 8), (30, 26), -- 云原生应用开发
          (31, 3), (31, 8), (31, 19), -- 前端工程化实践
          (32, 3), (32, 7), (32, 18), -- 网络爬虫技术与实战
          (33, 3), (33, 8), (33, 23), -- 数据可视化实战
          (34, 3), (34, 8), (34, 26), -- 区块链技术详解
          (35, 3), (35, 23), (35, 27), -- 大数据处理技术
          (36, 3), (36, 5), (36, 6), -- 人工智能应用实践
          (37, 3), (37, 8), (37, 25), -- iOS应用开发指南
          (38, 3), (38, 8), (38, 25), -- Android高级开发
          (39, 10), (39, 28), (39, 30), -- 苏东坡传
          (40, 10), (40, 11), (40, 29), -- 平凡的世界
          (41, 10), (10, 11), (41, 31), -- 百年孤独
          (42, 10), (42, 11), (42, 30), -- 围城
          (43, 10), (43, 11), (43, 12), -- 三国演义
          (44, 10), (44, 11), (44, 12), -- 西游记
          (45, 10), (45, 11), (45, 12), -- 水浒传
          (46, 10), (46, 32), -- 艺术的故事
          -- 为现有图书添加更多标签
          (1, 17), -- Python编程：从入门到实践(畅销书)
          (3, 17), -- JavaScript高级程序设计(畅销书)
          (6, 17), -- Java核心技术(畅销书)
          (13, 30), -- 活着(中国文学)
          (15, 30), -- 红楼梦(中国文学)
          (20, 31) -- 人类简史(外国文学)
        `
      ).run()

      // 插入入库记录数据
      // 记录图书入库历史，分批次入库
      db.prepare(
        `
        INSERT INTO inventory_in (book_id, in_date, quantity, source, operator_id, remark)
        VALUES
          (1, datetime('now', '-60 days'), 5, '采购', 1, '首批采购'),
          (2, datetime('now', '-60 days'), 3, '采购', 1, '首批采购'),
          (3, datetime('now', '-59 days'), 5, '采购', 1, '首批采购'),
          (4, datetime('now', '-59 days'), 3, '采购', 1, '首批采购'),
          (5, datetime('now', '-58 days'), 4, '采购', 1, '首批采购'),
          (6, datetime('now', '-58 days'), 4, '采购', 1, '首批采购'),
          (7, datetime('now', '-57 days'), 3, '采购', 1, '首批采购'),
          (8, datetime('now', '-57 days'), 3, '采购', 1, '首批采购'),
          (9, datetime('now', '-56 days'), 3, '采购', 1, '首批采购'),
          (10, datetime('now', '-56 days'), 3, '采购', 1, '首批采购'),
          (11, datetime('now', '-55 days'), 3, '采购', 1, '首批采购'),
          (12, datetime('now', '-55 days'), 3, '采购', 1, '首批采购'),
          (13, datetime('now', '-54 days'), 5, '采购', 1, '首批采购'),
          (14, datetime('now', '-54 days'), 4, '采购', 1, '首批采购'),
          (15, datetime('now', '-53 days'), 3, '采购', 1, '首批采购'),
          (16, datetime('now', '-53 days'), 3, '采购', 1, '首批采购'),
          (17, datetime('now', '-52 days'), 3, '采购', 1, '首批采购'),
          (18, datetime('now', '-52 days'), 4, '采购', 1, '首批采购'),
          (19, datetime('now', '-51 days'), 4, '采购', 1, '首批采购'),
          (20, datetime('now', '-51 days'), 5, '采购', 1, '首批采购'),
          (21, datetime('now', '-50 days'), 3, '采购', 1, '第二批采购'),
          (22, datetime('now', '-50 days'), 3, '采购', 1, '第二批采购'),
          (23, datetime('now', '-49 days'), 2, '采购', 1, '第二批采购'),
          (24, datetime('now', '-49 days'), 3, '采购', 1, '第二批采购'),
          (25, datetime('now', '-48 days'), 2, '采购', 1, '第二批采购'),
          (26, datetime('now', '-48 days'), 3, '采购', 1, '第二批采购'),
          (27, datetime('now', '-47 days'), 3, '采购', 1, '第二批采购'),
          (28, datetime('now', '-47 days'), 3, '采购', 1, '第二批采购'),
          (29, datetime('now', '-46 days'), 3, '采购', 1, '第二批采购'),
          (30, datetime('now', '-46 days'), 2, '采购', 1, '第二批采购'),
          (31, datetime('now', '-30 days'), 3, '采购', 1, '第三批采购'),
          (32, datetime('now', '-30 days'), 3, '采购', 1, '第三批采购'),
          (33, datetime('now', '-29 days'), 2, '采购', 1, '第三批采购'),
          (34, datetime('now', '-29 days'), 3, '采购', 1, '第三批采购'),
          (35, datetime('now', '-28 days'), 3, '采购', 1, '第三批采购'),
          (36, datetime('now', '-28 days'), 2, '采购', 1, '第三批采购'),
          (37, datetime('now', '-27 days'), 3, '采购', 1, '第三批采购'),
          (38, datetime('now', '-27 days'), 3, '采购', 1, '第三批采购'),
          (39, datetime('now', '-26 days'), 4, '采购', 1, '第三批采购'),
          (40, datetime('now', '-26 days'), 4, '采购', 1, '第三批采购'),
          (41, datetime('now', '-25 days'), 3, '采购', 1, '第三批采购'),
          (42, datetime('now', '-25 days'), 3, '采购', 1, '第三批采购'),
          (43, datetime('now', '-24 days'), 3, '采购', 1, '第三批采购'),
          (44, datetime('now', '-24 days'), 3, '采购', 1, '第三批采购'),
          (45, datetime('now', '-23 days'), 3, '采购', 1, '第三批采购'),
          (46, datetime('now', '-23 days'), 3, '采购', 1, '第三批采购')
        `
      ).run()

      // 插入出库记录
      // 记录因损坏、丢失等原因的图书出库
      db.prepare(
        `
        INSERT INTO inventory_out (book_id, out_date, quantity, reason, operator_id, remark)
        VALUES
          (9, datetime('now', '-10 days'), 1, '损坏', 1, '书籍损坏无法修复'),
          (12, datetime('now', '-15 days'), 1, '丢失', 1, '盘点发现书籍丢失')
        `
      ).run()

      // 插入借阅记录数据
      // 创建多样化的借阅记录，包括当前借出、已归还、逾期等不同状态
      db.prepare(
        `
        INSERT INTO borrow_record (book_id, reader_id, borrow_date, due_date, return_date, renew_count, fine_amount, status, operator_id)
        VALUES
          -- 当前借出的记录
          (2, 1, datetime('now', '-3 days'), datetime('now', '+27 days'), NULL, 0, 0.0, 1, 2),
          (3, 2, datetime('now', '-15 days'), datetime('now', '+0 days'), NULL, 0, 0.0, 1, 3),
          (5, 3, datetime('now', '-6 hours'), datetime('now', '+90 days'), NULL, 0, 0.0, 1, 2),
          (8, 4, datetime('now', '-5 days'), datetime('now', '+10 days'), NULL, 0, 0.0, 1, 4),
          (13, 5, datetime('now', '-3 days'), datetime('now', '+27 days'), NULL, 0, 0.0, 1, 3),
          (18, 6, datetime('now', '-1 days'), datetime('now', '+29 days'), NULL, 0, 0.0, 1, 2),

          -- 已归还记录
          (1, 7, datetime('now', '-50 days'), datetime('now', '-20 days'), datetime('now', '-22 days'), 0, 1.0, 2, 2), -- 逾期2天，已缴纳罚款
          (4, 8, datetime('now', '-45 days'), datetime('now', '-15 days'), datetime('now', '-18 days'), 0, 1.5, 2, 3), -- 逾期3天，已缴纳罚款
          (6, 9, datetime('now', '-40 days'), datetime('now', '-10 days'), datetime('now', '-12 days'), 0, 0.0, 2, 2), -- 正常归还
          (7, 10, datetime('now', '-35 days'), datetime('now', '-5 days'), datetime('now', '-7 days'), 0, 0.0, 2, 4), -- 正常归还
          (10, 1, datetime('now', '-30 days'), datetime('now', '-10 days'), datetime('now', '-8 days'), 0, 0.0, 2, 3), -- 提前归还
          (11, 2, datetime('now', '-28 days'), datetime('now', '-8 days'), datetime('now', '-5 days'), 0, 0.0, 2, 2), -- 提前归还

          -- 逾期未归还记录
          (14, 3, datetime('now', '-40 days'), datetime('now', '-10 days'), NULL, 0, 15.0, 3, 4), -- 逾期30天未归还
          (15, 4, datetime('now', '-35 days'), datetime('now', '-5 days'), NULL, 0, 12.5, 3, 3), -- 逾期25天未归还

          -- 续借记录
          (16, 5, datetime('now', '-60 days'), datetime('now', '+20 days'), NULL, 1, 0.0, 4, 2), -- 续借一次
          (17, 6, datetime('now', '-55 days'), datetime('now', '+35 days'), NULL, 2, 0.0, 4, 3), -- 续借两次

          -- 历史逾期后归还记录
          (1, 7, datetime('now', '-150 days'), datetime('now', '-120 days'), datetime('now', '-110 days'), 0, 5.0, 2, 2), -- 逾期10天后归还
          (4, 8, datetime('now', '-140 days'), datetime('now', '-110 days'), datetime('now', '-105 days'), 0, 2.5, 2, 3), -- 逾期5天后归还

          -- 长期借阅记录（教师类型）
          (7, 9, datetime('now', '-120 days'), datetime('now', '-30 days'), datetime('now', '-35 days'), 0, 0.0, 2, 2), -- 教师长期借阅
          (10, 10, datetime('now', '-100 days'), datetime('now', '-10 days'), datetime('now', '-15 days'), 0, 0.0, 2, 4), -- 教师长期借阅

          -- 续借后归还记录
          (11, 1, datetime('now', '-90 days'), datetime('now', '-30 days'), datetime('now', '-25 days'), 1, 0.0, 2, 3), -- 续借一次后提前归还
          (14, 2, datetime('now', '-85 days'), datetime('now', '-25 days'), datetime('now', '-20 days'), 2, 0.0, 2, 2), -- 续借两次后提前归还

          -- 续借后逾期归还记录
          (15, 3, datetime('now', '-80 days'), datetime('now', '-20 days'), datetime('now', '-15 days'), 1, 2.5, 2, 4), -- 续借后逾期5天归还
          (16, 4, datetime('now', '-75 days'), datetime('now', '-15 days'), datetime('now', '-5 days'), 2, 5.0, 2, 3), -- 续借两次后逾期10天归还

          -- 同一本书多次借阅记录
          (20, 5, datetime('now', '-200 days'), datetime('now', '-170 days'), datetime('now', '-175 days'), 0, 0.0, 2, 2), -- 第一次借阅
          (20, 5, datetime('now', '-160 days'), datetime('now', '-130 days'), datetime('now', '-135 days'), 0, 0.0, 2, 3), -- 第二次借阅
          (20, 5, datetime('now', '-120 days'), datetime('now', '-90 days'), datetime('now', '-95 days'), 0, 0.0, 2, 2), -- 第三次借阅

          -- 借阅后书籍损坏记录
          (9, 6, datetime('now', '-20 days'), datetime('now', '-10 days'), datetime('now', '-10 days'), 0, 0.0, 2, 4), -- 借阅后图书损坏并归还

          -- 新增7天内的借阅记录（包括当天、昨天、前天等）
          (23, 11, datetime('now', '-7 days'), datetime('now', '+8 days'), NULL, 0, 0.0, 1, 2), -- 7天前借阅
          (25, 12, datetime('now', '-6 days'), datetime('now', '+9 days'), NULL, 0, 0.0, 1, 3), -- 6天前借阅
          (27, 13, datetime('now', '-5 days'), datetime('now', '+55 days'), NULL, 0, 0.0, 1, 2), -- 5天前借阅(VIP读者)
          (30, 14, datetime('now', '-4 days'), datetime('now', '+86 days'), NULL, 0, 0.0, 1, 4), -- 4天前借阅(教师)
          (33, 15, datetime('now', '-3 days'), datetime('now', '+12 days'), NULL, 0, 0.0, 1, 3), -- 3天前借阅
          (36, 1, datetime('now', '-2 days'), datetime('now', '+13 days'), NULL, 0, 0.0, 1, 2), -- 2天前借阅
          (40, 2, datetime('now', '-1 days'), datetime('now', '+14 days'), NULL, 0, 0.0, 1, 3), -- 1天前借阅
          (43, 3, datetime('now', '0 days'), datetime('now', '+90 days'), NULL, 0, 0.0, 1, 2), -- 当天借阅(教师)
          (46, 4, datetime('now', '0 days'), datetime('now', '+15 days'), NULL, 0, 0.0, 1, 4), -- 当天借阅

          -- 新增7天内已归还的借阅记录
          (21, 5, datetime('now', '-7 days'), datetime('now', '+23 days'), datetime('now', '-5 days'), 0, 0.0, 2, 3), -- 7天前借阅，提前归还
          (22, 6, datetime('now', '-6 days'), datetime('now', '+24 days'), datetime('now', '-3 days'), 0, 0.0, 2, 2), -- 6天前借阅，提前归还
          (24, 7, datetime('now', '-5 days'), datetime('now', '+10 days'), datetime('now', '-2 days'), 0, 0.0, 2, 4), -- 5天前借阅，提前归还
          (26, 8, datetime('now', '-4 days'), datetime('now', '+11 days'), datetime('now', '-1 days'), 0, 0.0, 2, 3), -- 4天前借阅，提前归还
          (28, 9, datetime('now', '-3 days'), datetime('now', '+87 days'), datetime('now', '0 days'), 0, 0.0, 2, 2), -- 3天前借阅，当天归还(教师)

          -- 新增7天内续借记录
          (29, 10, datetime('now', '-7 days'), datetime('now', '+23 days'), NULL, 1, 0.0, 4, 3), -- 7天前借阅，已续借
          (31, 11, datetime('now', '-5 days'), datetime('now', '+40 days'), NULL, 1, 0.0, 4, 2), -- 5天前借阅，已续借(VIP读者)
          (32, 12, datetime('now', '-3 days'), datetime('now', '+27 days'), NULL, 1, 0.0, 4, 4), -- 3天前借阅，已续借

          -- 新增7天内逾期记录（借阅日期更早，但在7天内到期并逾期）
          (34, 13, datetime('now', '-20 days'), datetime('now', '-5 days'), NULL, 0, 2.5, 3, 2), -- 到期日5天前，已逾期5天
          (35, 14, datetime('now', '-18 days'), datetime('now', '-3 days'), NULL, 0, 1.5, 3, 3), -- 到期日3天前，已逾期3天
          (37, 15, datetime('now', '-16 days'), datetime('now', '-1 days'), NULL, 0, 0.5, 3, 4), -- 到期日1天前，已逾期1天

          -- 新增前几天的借阅并当天归还的记录
          (38, 7, datetime('now', '-3 days'), datetime('now', '+12 days'), datetime('now', '0 days'), 0, 0.0, 2, 3), -- 3天前借阅，当天归还
          (39, 8, datetime('now', '-2 days'), datetime('now', '+28 days'), datetime('now', '0 days'), 0, 0.0, 2, 2), -- 2天前借阅，当天归还
          (41, 9, datetime('now', '-1 days'), datetime('now', '+89 days'), datetime('now', '0 days'), 0, 0.0, 2, 4), -- 1天前借阅，当天归还(教师)
          (42, 10, datetime('now', '0 days'), datetime('now', '+30 days'), datetime('now', '0 days'), 0, 0.0, 2, 3), -- 当天借阅，当天归还
          (44, 11, datetime('now', '0 days'), datetime('now', '+15 days'), datetime('now', '0 days'), 0, 0.0, 2, 2), -- 当天借阅，当天归还
          (45, 12, datetime('now', '0 days'), datetime('now', '+15 days'), datetime('now', '0 days'), 0, 0.0, 2, 4)  -- 当天借阅，当天归还
        `
      ).run()

      // 插入预约记录
      // 创建不同状态的预约记录
      db.prepare(
        `
        INSERT INTO reservation (book_id, reader_id, reserve_date, expiry_date, status)
        VALUES
          (19, 7, datetime('now', '-5 days'), datetime('now', '+10 days'), 1), -- 当前预约中
          (1, 8, datetime('now', '-60 days'), datetime('now', '-30 days'), 2),  -- 已借出
          (4, 9, datetime('now', '-55 days'), datetime('now', '-25 days'), 3),  -- 已过期
          (6, 10, datetime('now', '-50 days'), datetime('now', '-20 days'), 4),  -- 已取消
          -- 新增预约记录
          (21, 11, datetime('now', '-4 days'), datetime('now', '+11 days'), 1), -- 当前预约中
          (24, 12, datetime('now', '-3 days'), datetime('now', '+12 days'), 1), -- 当前预约中
          (26, 13, datetime('now', '-2 days'), datetime('now', '+13 days'), 1), -- 当前预约中
          (29, 14, datetime('now', '-1 days'), datetime('now', '+14 days'), 1), -- 当前预约中
          (31, 15, datetime('now', '0 days'), datetime('now', '+15 days'), 1), -- 当前预约中
          (22, 1, datetime('now', '-45 days'), datetime('now', '-15 days'), 2), -- 已借出
          (28, 2, datetime('now', '-40 days'), datetime('now', '-10 days'), 3), -- 已过期
          (32, 3, datetime('now', '-35 days'), datetime('now', '-5 days'), 4)  -- 已取消
        `
      ).run()

      // 提交事务
      // 所有数据插入成功后提交事务
      db.exec('COMMIT')
      console.log('成功初始化数据库')
    } catch (error) {
      // 发生错误，回滚事务
      // 确保数据库一致性，避免部分数据插入
      db.exec('ROLLBACK')
      console.error('初始化数据库失败:', error)
      throw error
    }
  }
}
