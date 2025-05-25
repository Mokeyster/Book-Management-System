import Database from 'better-sqlite3'
import { IBook } from '../../types/bookTypes'
import { SystemService } from './systemService'

export class BookService {
  private db: Database.Database
  private systemService: SystemService

  constructor(db: Database.Database) {
    this.db = db
    this.systemService = new SystemService(db)
  }

  // 获取所有图书
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

  // 根据ID获取图书
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

  // 搜索图书
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

  // 添加新图书
  addBook(book: Omit<IBook, 'book_id'>, userId?: number): number {
    const stmt = this.db.prepare(`
      INSERT INTO book (
        isbn, title, author, publisher_id, publish_date,
        price, category_id, location, description, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

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
      book.status || 1
    )

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

  // 更新图书信息
  updateBook(book: IBook, userId?: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE book SET
        isbn = ?, title = ?, author = ?, publisher_id = ?,
        publish_date = ?, price = ?, category_id = ?,
        location = ?, description = ?, status = ?,
        update_time = datetime('now', 'localtime')
      WHERE book_id = ?
    `)

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

  // 软删除图书（将状态设置为"已删除"）
  deleteBook(bookId: number, userId?: number): { success: boolean; message: string } {
    try {
      // 检查是否有未归还的借阅记录
      const activeBorrows = this.db
        .prepare(
          'SELECT COUNT(*) as count FROM borrow_record WHERE book_id = ? AND (status = 1 OR status = 3 OR status = 4)'
        )
        .get(bookId) as { count: number }

      if (activeBorrows && activeBorrows.count > 0) {
        return { success: false, message: '该图书有未归还的借阅记录，不能删除' }
      }

      // 获取图书信息用于日志
      const book = this.getBookById(bookId)

      // 将图书状态更新为"已删除"(假设用6表示已删除状态)
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

  // 如果需要真正从数据库删除图书（管理员功能）
  hardDeleteBook(bookId: number): { success: boolean; message: string } {
    return this.safeDeleteBook(bookId)
  }

  // 安全删除图书（处理所有外键关系）
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

  // 更新图书状态
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

  // 获取状态文本
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

  // 获取图书的标签
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

  // 为图书添加标签
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
      return false
    }
  }

  // 删除图书标签
  removeBookTag(bookId: number, tagId: number): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM book_tag
      WHERE book_id = ? AND tag_id = ?
    `)

    const result = stmt.run(bookId, tagId)
    return result.changes > 0
  }

  // 图书分类管理相关方法
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

  // 获取分类树形结构
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
