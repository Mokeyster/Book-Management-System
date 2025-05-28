import Database from 'better-sqlite3'
import { IPublisher } from '../../types/publisherTypes'

/**
 * 出版社服务类
 * 提供出版社数据的增删改查功能
 */
export class PublisherService {
  /**
   * SQLite数据库实例
   * @private
   */
  private db: Database.Database

  /**
   * 构造函数
   * @param db - SQLite数据库实例
   */
  constructor(db: Database.Database) {
    this.db = db
  }

  /**
   * 获取所有出版社信息
   * @returns 包含所有出版社信息的数组
   */
  getAllPublishers(): IPublisher[] {
    // 执行SELECT查询并将结果转换为IPublisher类型数组
    return this.db.prepare('SELECT * FROM publisher').all() as IPublisher[]
  }

  /**
   * 根据ID获取特定出版社信息
   * @param publisherId - 出版社ID
   * @returns 出版社信息对象，如不存在则返回undefined
   */
  getPublisherById(publisherId: number): IPublisher | undefined {
    // 执行带参数的查询，获取指定ID的出版社信息
    return this.db.prepare('SELECT * FROM publisher WHERE publisher_id = ?').get(publisherId) as
      | IPublisher
      | undefined
  }

  /**
   * 搜索出版社信息
   * @param query - 搜索关键词
   * @returns 符合搜索条件的出版社数组
   */
  searchPublishers(query: string): IPublisher[] {
    // 使用LIKE进行模糊查询，搜索多个字段
    return this.db
      .prepare(
        `
      SELECT * FROM publisher
      WHERE name LIKE ? OR contact_person LIKE ? OR phone LIKE ? OR email LIKE ?
    `
      )
      .all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`) as IPublisher[]
  }

  /**
   * 添加新出版社
   * @param publisher - 不包含ID的出版社信息对象
   * @returns 新添加出版社的ID
   */
  addPublisher(publisher: Omit<IPublisher, 'publisher_id'>): number {
    // 准备INSERT语句
    const stmt = this.db.prepare(`
      INSERT INTO publisher (
        name, address, contact_person, phone,
        email, website, description, cooperation_history
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    // 执行插入操作
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

    // 返回自动生成的行ID
    return result.lastInsertRowid as number
  }

  /**
   * 更新出版社信息
   * @param publisher - 包含ID的完整出版社信息对象
   * @returns 是否成功更新
   */
  updatePublisher(publisher: IPublisher): boolean {
    // 准备UPDATE语句
    const stmt = this.db.prepare(`
      UPDATE publisher SET
        name = ?, address = ?, contact_person = ?, phone = ?,
        email = ?, website = ?, description = ?, cooperation_history = ?
      WHERE publisher_id = ?
    `)

    // 执行更新操作
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

    // 返回是否有记录被更改
    return result.changes > 0
  }

  /**
   * 删除出版社
   * @param publisherId - 要删除的出版社ID
   * @returns 包含操作结果和消息的对象
   */
  deletePublisher(publisherId: number): { success: boolean; message: string } {
    // 检查是否有关联的图书，防止违反引用完整性
    const bookCount = this.db
      .prepare('SELECT COUNT(*) as count FROM book WHERE publisher_id = ?')
      .get(publisherId) as { count: number }

    // 如果有关联图书，拒绝删除
    if (bookCount.count > 0) {
      return { success: false, message: '存在关联图书，无法删除' }
    }

    // 准备DELETE语句
    const stmt = this.db.prepare('DELETE FROM publisher WHERE publisher_id = ?')

    // 执行删除操作
    const result = stmt.run(publisherId)

    // 返回操作结果和相应消息
    return {
      success: result.changes > 0,
      message: result.changes > 0 ? '删除成功' : '出版社不存在'
    }
  }

  /**
   * 获取出版社的所有图书
   * @param publisherId - 出版社ID
   * @returns 该出版社的所有图书信息数组，包含分类名称
   */
  getPublisherBooks(publisherId: number): any[] {
    // 执行联表查询，获取图书及其分类信息
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
