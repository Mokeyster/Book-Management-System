import Database from 'better-sqlite3'
import { IPublisher } from '../../types/publisherTypes'

export class PublisherService {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  // 获取所有出版社
  getAllPublishers(): IPublisher[] {
    return this.db.prepare('SELECT * FROM publisher').all() as IPublisher[]
  }

  // 根据ID获取出版社
  getPublisherById(publisherId: number): IPublisher | undefined {
    return this.db.prepare('SELECT * FROM publisher WHERE publisher_id = ?').get(publisherId) as
      | IPublisher
      | undefined
  }

  // 搜索出版社
  searchPublishers(query: string): IPublisher[] {
    return this.db
      .prepare(
        `
      SELECT * FROM publisher
      WHERE name LIKE ? OR contact_person LIKE ? OR phone LIKE ? OR email LIKE ?
    `
      )
      .all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`) as IPublisher[]
  }

  // 添加出版社
  addPublisher(publisher: Omit<IPublisher, 'publisher_id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO publisher (
        name, address, contact_person, phone,
        email, website, description, cooperation_history
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      publisher.name,
      publisher.address,
      publisher.contact_person,
      publisher.phone,
      publisher.email,
      publisher.website,
      publisher.description,
      publisher.cooperation_history
    )

    return result.lastInsertRowid as number
  }

  // 更新出版社信息
  updatePublisher(publisher: IPublisher): boolean {
    const stmt = this.db.prepare(`
      UPDATE publisher SET
        name = ?, address = ?, contact_person = ?, phone = ?,
        email = ?, website = ?, description = ?, cooperation_history = ?
      WHERE publisher_id = ?
    `)

    const result = stmt.run(
      publisher.name,
      publisher.address,
      publisher.contact_person,
      publisher.phone,
      publisher.email,
      publisher.website,
      publisher.description,
      publisher.cooperation_history,
      publisher.publisher_id
    )

    return result.changes > 0
  }

  // 删除出版社
  deletePublisher(publisherId: number): { success: boolean; message: string } {
    // 检查是否有关联的图书
    const bookCount = this.db
      .prepare('SELECT COUNT(*) as count FROM book WHERE publisher_id = ?')
      .get(publisherId) as { count: number }

    if (bookCount.count > 0) {
      return { success: false, message: '存在关联图书，无法删除' }
    }

    const stmt = this.db.prepare('DELETE FROM publisher WHERE publisher_id = ?')
    const result = stmt.run(publisherId)
    return {
      success: result.changes > 0,
      message: result.changes > 0 ? '删除成功' : '出版社不存在'
    }
  }

  // 获取出版社的所有图书
  getPublisherBooks(publisherId: number): any[] {
    return this.db
      .prepare(
        `
      SELECT b.*, c.category_name
      FROM book b
      LEFT JOIN book_category c ON b.category_id = c.category_id
      WHERE b.publisher_id = ?
    `
      )
      .all(publisherId)
  }
}
