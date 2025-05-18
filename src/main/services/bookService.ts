import Database from 'better-sqlite3'
import { IBook } from '../../types/bookTypes'

export class BookService {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
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
      WHERE b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?
    `
      )
      .all(`%${query}%`, `%${query}%`, `%${query}%`) as IBook[]
  }

  // 添加新图书
  addBook(book: Omit<IBook, 'book_id'>): number {
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

    return result.lastInsertRowid as number
  }

  // 更新图书信息
  updateBook(book: IBook): boolean {
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

    return result.changes > 0
  }

  // 删除图书
  deleteBook(bookId: number): boolean {
    const stmt = this.db.prepare('DELETE FROM book WHERE book_id = ?')
    const result = stmt.run(bookId)
    return result.changes > 0
  }

  // 更新图书状态
  updateBookStatus(bookId: number, status: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE book SET
        status = ?,
        update_time = datetime('now', 'localtime')
      WHERE book_id = ?
    `)

    const result = stmt.run(status, bookId)
    return result.changes > 0
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

  addCategory(category: any): number {
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
      return Number(result.lastInsertRowid)
    }
    return 0
  }

  updateCategory(category: any): boolean {
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

    return result.changes > 0
  }

  deleteCategory(categoryId: number): { success: boolean; message: string } {
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

    // 执行删除
    const stmt = this.db.prepare('DELETE FROM book_category WHERE category_id = ?')
    const result = stmt.run(categoryId)

    return { success: result.changes > 0, message: '' }
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
