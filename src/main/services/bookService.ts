import Database from 'better-sqlite3'
import { IBook } from '../../types/bookTypes'
import { SystemService } from './systemService'

/**
 * 图书服务类
 * 负责处理与图书相关的所有数据库操作，包括查询、添加、更新、删除等功能
 */
export class BookService {
  /** SQLite 数据库实例 */
  private db: Database.Database
  /** 系统服务实例，用于记录操作日志等系统功能 */
  private systemService: SystemService

  /**
   * 构造函数
   * @param db SQLite 数据库实例
   */
  constructor(db: Database.Database) {
    this.db = db
    this.systemService = new SystemService(db)
  }

  /**
   * 获取所有未删除的图书
   * 通过连接查询获取图书分类和出版社信息
   * @returns 图书对象数组
   */
  getAllBooks(): IBook[] {
    return this.db
      .prepare(
        `
      SELECT b.*, c.category_name, p.name as publisher_name
      FROM book b
      LEFT JOIN book_category c ON b.category_id = c.category_id
      LEFT JOIN publisher p ON b.publisher_id = p.publisher_id
      WHERE b.status != 6 -- 6表示已删除
    `
      )
      .all() as IBook[]
  }

  /**
   * 根据ID获取特定图书
   * @param bookId 图书ID
   * @returns 图书对象，如未找到则返回undefined
   */
  getBookById(bookId: number): IBook | undefined {
    return this.db
      .prepare(
        `
      SELECT b.*, c.category_name, p.name as publisher_name
      FROM book b
      LEFT JOIN book_category c ON b.category_id = c.category_id
      LEFT JOIN publisher p ON b.publisher_id = p.publisher_id
      WHERE b.book_id = ?
    `
      )
      .get(bookId) as IBook | undefined
  }

  /**
   * 搜索图书
   * 根据书名、作者或ISBN进行模糊查询
   * @param query 搜索关键词
   * @returns 匹配的图书对象数组
   */
  searchBooks(query: string): IBook[] {
    return this.db
      .prepare(
        `
      SELECT b.*, c.category_name, p.name as publisher_name
      FROM book b
      LEFT JOIN book_category c ON b.category_id = c.category_id
      LEFT JOIN publisher p ON b.publisher_id = p.publisher_id
      WHERE (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?) AND b.status != 6
    `
      )
      .all(`%${query}%`, `%${query}%`, `%${query}%`) as IBook[]
  }

  /**
   * 添加新图书
   * @param book 图书对象（不含book_id）
   * @param userId 操作用户ID，用于记录日志
   * @returns 新增图书的ID
   */
  addBook(book: Omit<IBook, 'book_id'>, userId?: number): number {
    const stmt = this.db.prepare(`
      INSERT INTO book (
        isbn, title, author, publisher_id, publish_date,
        price, category_id, location, description, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    // 执行插入操作
    const result = stmt.run(
      book.isbn,
      book.title,
      book.author,
      book.publisher_id,
      book.publish_date,
      book.price,
      book.category_id,
      book.location,
      book.description,
      book.status || 1 // 默认状态为1（在架）
    )

    // 获取新插入图书的ID
    const bookId = result.lastInsertRowid as number

    // 记录操作日志
    if (userId) {
      this.systemService.logOperation(
        userId,
        'add book',
        '127.0.0.1',
        `添加图书: ${book.title} (ISBN: ${book.isbn})`
      )
    }

    return bookId
  }

  /**
   * 更新图书信息
   * @param book 图书完整对象（含book_id）
   * @param userId 操作用户ID，用于记录日志
   * @returns 更新是否成功
   */
  updateBook(book: IBook, userId?: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE book SET
        isbn = ?, title = ?, author = ?, publisher_id = ?,
        publish_date = ?, price = ?, category_id = ?,
        location = ?, description = ?, status = ?,
        update_time = datetime('now', 'localtime')
      WHERE book_id = ?
    `)

    // 执行更新操作
    const result = stmt.run(
      book.isbn,
      book.title,
      book.author,
      book.publisher_id,
      book.publish_date,
      book.price,
      book.category_id,
      book.location,
      book.description,
      book.status,
      book.book_id
    )

    // 检查是否有记录被更新
    const success = result.changes > 0

    // 记录操作日志
    if (success && userId) {
      this.systemService.logOperation(
        userId,
        'update book',
        '127.0.0.1',
        `更新图书: ${book.title} (ID: ${book.book_id})`
      )
    }

    return success
  }

  /**
   * 软删除图书（将状态设置为"已删除"）
   * 检查是否有未归还的借阅记录，如有则不允许删除
   * @param bookId 图书ID
   * @param userId 操作用户ID，用于记录日志
   * @returns 操作结果对象，包含success和message字段
   */
  deleteBook(bookId: number, userId?: number): { success: boolean; message: string } {
    try {
      // 检查是否有未归还的借阅记录
      const activeBorrows = this.db
        .prepare(
          'SELECT COUNT(*) as count FROM borrow_record WHERE book_id = ? AND (status = 1 OR status = 3 OR status = 4)'
        )
        .get(bookId) as { count: number }

      // 如果有未归还的借阅记录，拒绝删除
      if (activeBorrows && activeBorrows.count > 0) {
        return { success: false, message: '该图书有未归还的借阅记录，不能删除' }
      }

      // 获取图书信息用于日志
      const book = this.getBookById(bookId)

      // 将图书状态更新为"已删除"(状态码6表示已删除)
      const stmt = this.db.prepare(`
        UPDATE book SET
          status = 6,
          update_time = datetime('now', 'localtime')
        WHERE book_id = ?
      `)

      const result = stmt.run(bookId)
      const success = result.changes > 0

      // 记录操作日志
      if (success && userId && book) {
        this.systemService.logOperation(
          userId,
          'delete book',
          '127.0.0.1',
          `删除图书: ${book.title} (ID: ${bookId})`
        )
      }

      return {
        success,
        message: success ? '删除成功' : '图书不存在'
      }
    } catch (error) {
      console.error('删除图书失败:', error)
      return { success: false, message: `删除失败: ${(error as Error).message}` }
    }
  }

  /**
   * 物理删除图书（管理员功能）
   * 从数据库中永久删除图书及其相关记录
   * @param bookId 图书ID
   * @returns 操作结果对象，包含success和message字段
   */
  hardDeleteBook(bookId: number): { success: boolean; message: string } {
    return this.safeDeleteBook(bookId)
  }

  /**
   * 安全删除图书（处理所有外键关系）
   * 通过事务处理删除图书和所有相关记录
   * @param bookId 图书ID
   * @returns 操作结果对象，包含success和message字段
   * @private 私有方法，只在类内部使用
   */
  private safeDeleteBook(bookId: number): { success: boolean; message: string } {
    try {
      // 开始事务
      this.db.exec('BEGIN TRANSACTION')

      // 1. 删除图书标签关联
      this.db.prepare('DELETE FROM book_tag WHERE book_id = ?').run(bookId)

      // 2. 删除预约记录
      this.db.prepare('DELETE FROM reservation WHERE book_id = ?').run(bookId)

      // 3. 删除借阅记录
      this.db.prepare('DELETE FROM borrow_record WHERE book_id = ?').run(bookId)

      // 4. 删除入库记录
      this.db.prepare('DELETE FROM inventory_in WHERE book_id = ?').run(bookId)

      // 5. 删除出库记录
      this.db.prepare('DELETE FROM inventory_out WHERE book_id = ?').run(bookId)

      // 6. 最后删除图书本身
      const stmt = this.db.prepare('DELETE FROM book WHERE book_id = ?')
      const result = stmt.run(bookId)

      // 提交事务
      this.db.exec('COMMIT')

      return {
        success: result.changes > 0,
        message: result.changes > 0 ? '删除成功' : '图书不存在'
      }
    } catch (error) {
      // 发生错误，回滚事务
      this.db.exec('ROLLBACK')
      console.error('删除图书失败:', error)
      return { success: false, message: `删除失败: ${(error as Error).message}` }
    }
  }

  /**
   * 更新图书状态
   * @param bookId 图书ID
   * @param status 新状态码
   * @param userId 操作用户ID，用于记录日志
   * @returns 更新是否成功
   */
  updateBookStatus(bookId: number, status: number, userId?: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE book SET
        status = ?,
        update_time = datetime('now', 'localtime')
      WHERE book_id = ?
    `)

    const result = stmt.run(status, bookId)
    const success = result.changes > 0

    // 记录操作日志
    if (success && userId) {
      const book = this.getBookById(bookId)
      const statusText = this.getStatusText(status)
      this.systemService.logOperation(
        userId,
        'update book status',
        '127.0.0.1',
        `更新图书状态: ${book?.title || `ID:${bookId}`} -> ${statusText}`
      )
    }

    return success
  }

  /**
   * 获取状态文本描述
   * 将状态码转换为可读的文本描述
   * @param status 状态码
   * @returns 状态文本
   * @private 私有方法，只在类内部使用
   */
  private getStatusText(status: number): string {
    const statusMap = {
      1: '在架',
      2: '借出',
      3: '预约',
      4: '维修',
      5: '丢失',
      6: '已删除'
    }
    return statusMap[status] || '未知状态'
  }

  /**
   * 获取图书的标签
   * @param bookId 图书ID
   * @returns 标签对象数组，包含tag_id和tag_name
   */
  getBookTags(bookId: number): { tag_id: number; tag_name: string }[] {
    return this.db
      .prepare(
        `
      SELECT t.tag_id, t.tag_name
      FROM tag t
      JOIN book_tag bt ON t.tag_id = bt.tag_id
      WHERE bt.book_id = ?
    `
      )
      .all(bookId) as { tag_id: number; tag_name: string }[]
  }

  /**
   * 为图书添加标签
   * @param bookId 图书ID
   * @param tagId 标签ID
   * @returns 添加是否成功
   */
  addBookTag(bookId: number, tagId: number): boolean {
    try {
      this.db
        .prepare(
          `
        INSERT INTO book_tag (book_id, tag_id)
        VALUES (?, ?)
      `
        )
        .run(bookId, tagId)
      return true
    } catch (_error) {
      // 如果标签已存在，将抛出唯一约束错误，此时返回false
      return false
    }
  }

  /**
   * 删除图书标签
   * @param bookId 图书ID
   * @param tagId 标签ID
   * @returns 删除是否成功
   */
  removeBookTag(bookId: number, tagId: number): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM book_tag
      WHERE book_id = ? AND tag_id = ?
    `)

    const result = stmt.run(bookId, tagId)
    return result.changes > 0
  }

  /**
   * 获取所有图书分类
   * 按层级和分类ID排序
   * @returns 分类对象数组
   */
  getAllCategories(): any[] {
    return this.db
      .prepare(
        `
      SELECT * FROM book_category
      ORDER BY level, category_id
    `
      )
      .all()
  }

  /**
   * 根据ID获取特定分类
   * @param categoryId 分类ID
   * @returns 分类对象
   */
  getCategoryById(categoryId: number): any {
    return this.db
      .prepare(
        `
      SELECT * FROM book_category
      WHERE category_id = ?
    `
      )
      .get(categoryId)
  }

  /**
   * 添加新分类
   * @param category 分类对象
   * @param userId 操作用户ID，用于记录日志
   * @returns 新增分类的ID，如失败则返回0
   */
  addCategory(category: any, userId?: number): number {
    const stmt = this.db.prepare(`
      INSERT INTO book_category (category_name, category_code, parent_id, level, description)
      VALUES (?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      category.category_name,
      category.category_code || null,
      category.parent_id || null,
      category.level || 1,
      category.description || null
    )

    if (result.lastInsertRowid) {
      const categoryId = Number(result.lastInsertRowid)

      // 记录操作日志
      if (userId) {
        this.systemService.logOperation(
          userId,
          'add category',
          '127.0.0.1',
          `添加分类: ${category.category_name}`
        )
      }

      return categoryId
    }
    return 0
  }

  /**
   * 更新分类信息
   * @param category 分类对象
   * @param userId 操作用户ID，用于记录日志
   * @returns 更新是否成功
   */
  updateCategory(category: any, userId?: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE book_category
      SET category_name = ?, category_code = ?, parent_id = ?,
          level = ?, description = ?
      WHERE category_id = ?
    `)

    const result = stmt.run(
      category.category_name,
      category.category_code || null,
      category.parent_id || null,
      category.level || 1,
      category.description || null,
      category.category_id
    )

    const success = result.changes > 0

    // 记录操作日志
    if (success && userId) {
      this.systemService.logOperation(
        userId,
        'update category',
        '127.0.0.1',
        `更新分类: ${category.category_name} (ID: ${category.category_id})`
      )
    }

    return success
  }

  /**
   * 删除分类
   * 检查是否有图书使用此分类或有子分类，如有则不允许删除
   * @param categoryId 分类ID
   * @param userId 操作用户ID，用于记录日志
   * @returns 操作结果对象，包含success和message字段
   */
  deleteCategory(categoryId: number, userId?: number): { success: boolean; message: string } {
    // 检查是否有图书使用此分类
    const booksWithCategory = this.db
      .prepare('SELECT COUNT(*) as count FROM book WHERE category_id = ?')
      .get(categoryId) as { count: number }

    if (booksWithCategory && booksWithCategory.count > 0) {
      return { success: false, message: '此分类下有图书，不能删除' }
    }

    // 检查是否有子分类
    const childCategories = this.db
      .prepare('SELECT COUNT(*) as count FROM book_category WHERE parent_id = ?')
      .get(categoryId) as { count: number }

    if (childCategories && childCategories.count > 0) {
      return { success: false, message: '此分类下有子分类，不能删除' }
    }

    // 获取分类信息用于日志
    const category = this.getCategoryById(categoryId)

    // 执行删除
    const stmt = this.db.prepare('DELETE FROM book_category WHERE category_id = ?')
    const result = stmt.run(categoryId)
    const success = result.changes > 0

    // 记录操作日志
    if (success && userId && category) {
      this.systemService.logOperation(
        userId,
        'delete category',
        '127.0.0.1',
        `删除分类: ${category.category_name} (ID: ${categoryId})`
      )
    }

    return { success, message: '' }
  }

  /**
   * 获取分类树形结构
   * 将平面分类列表转换为树形结构
   * @returns 树形结构的分类数组
   */
  getCategoryTree(): any[] {
    // 获取所有分类
    const categories = this.getAllCategories()

    // 转换为树形结构
    const categoryMap = new Map()
    const roots: any[] = []

    // 先建立映射关系
    categories.forEach((category: any) => {
      category.children = []
      categoryMap.set(category.category_id, category)
    })

    // 构建树形结构
    categories.forEach((category: any) => {
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id)
        if (parent) {
          parent.children.push(category)
        } else {
          // 如果找不到父分类，就放到根节点
          roots.push(category)
        }
      } else {
        roots.push(category)
      }
    })

    return roots
  }
}
