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
// 初始化基础数据
function initBaseData(db: Database.Database): void {
  // 检查是否已经有系统角色数据，如果没有则插入
  const roleCount = db.prepare('SELECT COUNT(*) as count FROM system_role').get() as {
    count: number
  }

  if (roleCount.count === 0) {
    // 开始事务
    db.exec('BEGIN TRANSACTION')

    try {
      // 插入默认角色
      db.prepare(
        `
        INSERT INTO system_role (role_name, permissions)
        VALUES ('系统管理员', '全部权限'), ('图书管理员', '图书管理,借阅管理,读者管理'), ('普通操作员', '借阅管理,读者管理')
      `
      ).run()

      // 插入默认管理员账号以及操作员账号
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

      // 插入示例读者
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
      db.prepare(
        `
        INSERT INTO book_category (category_name, category_code, parent_id, level, description)
        VALUES
          ('计算机科学', 'CS', NULL, 1, '计算机相关书籍'),
          ('文学艺术', 'LIT', NULL, 1, '文学与艺术类书籍'),
          ('自然科学', 'SCI', NULL, 1, '自然科学类书籍'),
          ('社会科学', 'SOC', NULL, 1, '社会科学类书籍'),
          ('编程语言', 'PRG', 1, 2, '编程语言相关书籍'),
          ('数据库', 'DB', 1, 2, '数据库相关书籍'),
          ('软件工程', 'SE', 1, 2, '软件工程相关书籍'),
          ('人工智能', 'AI', 1, 2, '人工智能相关书籍'),
          ('网络安全', 'SEC', 1, 2, '网络安全相关书籍'),
          ('现代文学', 'ML', 2, 2, '现代文学作品'),
          ('古典文学', 'CL', 2, 2, '古典文学作品'),
          ('艺术理论', 'AT', 2, 2, '艺术理论书籍'),
          ('物理学', 'PHY', 3, 2, '物理学相关书籍'),
          ('化学', 'CHE', 3, 2, '化学相关书籍'),
          ('生物学', 'BIO', 3, 2, '生物学相关书籍'),
          ('经济学', 'ECO', 4, 2, '经济学相关书籍'),
          ('社会学', 'SOL', 4, 2, '社会学相关书籍'),
          ('心理学', 'PSY', 4, 2, '心理学相关书籍')
        `
      ).run()

      // 插入出版社数据
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

      // 插入图书-标签关联数据（为新增的图书添加标签）
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

      // 插入入库记录数据（包括新增图书）
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
          -- 新增入库记录
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

      // 插入出库记录（示例）
      db.prepare(
        `
        INSERT INTO inventory_out (book_id, out_date, quantity, reason, operator_id, remark)
        VALUES
          (9, datetime('now', '-10 days'), 1, '损坏', 1, '书籍损坏无法修复'),
          (12, datetime('now', '-15 days'), 1, '丢失', 1, '盘点发现书籍丢失')
        `
      ).run()

      // 插入多样化借阅记录
      // 状态说明: 1:借出, 2:已归还, 3:逾期, 4:续借
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
      db.exec('COMMIT')
      console.log('成功初始化数据库')
    } catch (error) {
      // 发生错误，回滚事务
      db.exec('ROLLBACK')
      console.error('初始化数据库失败:', error)
      throw error
    }
  }
}
