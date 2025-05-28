import Database from 'better-sqlite3'
import { IReader, IReaderType } from '../../types/readerTypes'
import { SystemService } from './systemService'

/**
 * 读者服务类
 * 提供读者信息管理的各种操作，如添加、更新、删除、查询读者信息等
 */
export class ReaderService {
  private db: Database.Database
  private systemService: SystemService

  /**
   * 构造函数
   * @param db 数据库连接实例
   */
  constructor(db: Database.Database) {
    this.db = db
    this.systemService = new SystemService(db)
  }

  /**
   * 获取所有读者信息（排除已删除的读者）
   * @returns 读者信息数组
   */
  getAllReaders(): IReader[] {
    return this.db
      .prepare(
        `
      SELECT r.*, rt.type_name
      FROM reader r
      LEFT JOIN reader_type rt ON r.type_id = rt.type_id
      WHERE r.status != 3  -- 排除已注销/删除的读者
    `
      )
      .all() as IReader[]
  }

  /**
   * 根据读者ID获取读者信息
   * @param readerId 读者ID
   * @returns 读者信息对象，如果不存在则返回undefined
   */
  getReaderById(readerId: number): IReader | undefined {
    return this.db
      .prepare(
        `
      SELECT r.*, rt.type_name
      FROM reader r
      LEFT JOIN reader_type rt ON r.type_id = rt.type_id
      WHERE r.reader_id = ?
    `
      )
      .get(readerId) as IReader | undefined
  }

  /**
   * 搜索读者信息（排除已删除的读者）
   * @param query 搜索关键词（姓名、身份证、电话、邮箱）
   * @returns 匹配的读者信息数组
   */
  searchReaders(query: string): IReader[] {
    return this.db
      .prepare(
        `
      SELECT r.*, rt.type_name
      FROM reader r
      LEFT JOIN reader_type rt ON r.type_id = rt.type_id
      WHERE (r.name LIKE ? OR r.id_card LIKE ? OR r.phone LIKE ? OR r.email LIKE ?)
      AND r.status != 3  -- 排除已注销/删除的读者
    `
      )
      .all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`) as IReader[]
  }

  /**
   * 添加新读者
   * @param reader 读者信息对象（不包含reader_id）
   * @param userId 操作用户ID（用于记录操作日志）
   * @returns 新添加读者的ID
   */
  addReader(reader: Omit<IReader, 'reader_id'>, userId?: number): number {
    const stmt = this.db.prepare(`
      INSERT INTO reader (
        name, gender, id_card, phone, email,
        address, status, borrow_quota, type_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    // 执行插入操作
    const result = stmt.run(
      reader.name,
      reader.gender,
      reader.id_card,
      reader.phone,
      reader.email,
      reader.address,
      reader.status || 1, // 默认状态为1（正常）
      reader.borrow_quota,
      reader.type_id
    )

    // 获取新插入记录的ID
    const readerId = result.lastInsertRowid as number

    // 记录操作日志（如果提供了用户ID）
    if (userId) {
      this.systemService.logOperation(
        userId,
        'add reader',
        '127.0.0.1',
        `添加读者: ${reader.name} (身份证: ${reader.id_card})`
      )
    }

    return readerId
  }

  /**
   * 更新读者信息
   * @param reader 包含完整信息的读者对象
   * @param userId 操作用户ID（用于记录操作日志）
   * @returns 操作是否成功
   */
  updateReader(reader: IReader, userId?: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE reader SET
        name = ?, gender = ?, id_card = ?, phone = ?,
        email = ?, address = ?, status = ?,
        borrow_quota = ?, type_id = ?
      WHERE reader_id = ?
    `)

    // 执行更新操作
    const result = stmt.run(
      reader.name,
      reader.gender,
      reader.id_card,
      reader.phone,
      reader.email,
      reader.address,
      reader.status,
      reader.borrow_quota,
      reader.type_id,
      reader.reader_id
    )

    // 检查是否有记录被更新
    const success = result.changes > 0

    // 记录操作日志（如果操作成功且提供了用户ID）
    if (success && userId) {
      this.systemService.logOperation(
        userId,
        'update reader',
        '127.0.0.1',
        `更新读者: ${reader.name} (ID: ${reader.reader_id})`
      )
    }

    return success
  }

  /**
   * 软删除读者（将状态设置为"已注销"）
   * @param readerId 读者ID
   * @param userId 操作用户ID（用于记录操作日志）
   * @returns 包含操作结果和消息的对象
   */
  deleteReader(readerId: number, userId?: number): { success: boolean; message: string } {
    try {
      // 开始事务，确保数据一致性
      this.db.exec('BEGIN TRANSACTION')

      // 检查是否有未归还的借阅记录
      const borrowCount = (
        this.db
          .prepare(
            'SELECT COUNT(*) as count FROM borrow_record WHERE reader_id = ? AND status != 2'
          )
          .get(readerId) as { count: number }
      ).count

      // 如果有未归还的借阅，回滚事务并返回错误
      if (borrowCount > 0) {
        this.db.exec('ROLLBACK')
        return { success: false, message: '该读者有未归还的借阅记录，无法删除' }
      }

      // 获取读者信息（用于记录日志）
      const reader = this.getReaderById(readerId)

      // 更新读者状态为"已注销"（状态码3）
      const stmt = this.db.prepare('UPDATE reader SET status = 3 WHERE reader_id = ?')
      const result = stmt.run(readerId)

      // 提交事务
      this.db.exec('COMMIT')

      // 检查是否有记录被更新
      const success = result.changes > 0

      // 记录操作日志
      if (success && userId && reader) {
        this.systemService.logOperation(
          userId,
          'delete reader',
          '127.0.0.1',
          `删除读者: ${reader.name} (ID: ${readerId})`
        )
      }

      return {
        success,
        message: success ? '读者已成功注销' : '读者不存在或已被注销'
      }
    } catch (error) {
      // 发生错误时回滚事务
      this.db.exec('ROLLBACK')
      console.error('删除读者失败:', error)
      return {
        success: false,
        message: `操作失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 硬删除读者（管理员专用功能）
   * 将读者记录从数据库中彻底删除
   * @param readerId 读者ID
   * @returns 包含操作结果和消息的对象
   */
  hardDeleteReader(readerId: number): { success: boolean; message: string } {
    try {
      // 开始事务，确保数据一致性
      this.db.exec('BEGIN TRANSACTION')

      // 检查是否有任何借阅记录（包括已归还的）
      const borrowCount = (
        this.db
          .prepare('SELECT COUNT(*) as count FROM borrow_record WHERE reader_id = ?')
          .get(readerId) as { count: number }
      ).count

      // 如果有借阅历史，建议使用软删除而非硬删除
      if (borrowCount > 0) {
        this.db.exec('ROLLBACK')
        return {
          success: false,
          message: '该读者有借阅历史记录，建议使用软删除保留数据完整性'
        }
      }

      // 删除相关的预约记录
      this.db.prepare('DELETE FROM reservation WHERE reader_id = ?').run(readerId)

      // 执行读者记录删除
      const stmt = this.db.prepare('DELETE FROM reader WHERE reader_id = ?')
      const result = stmt.run(readerId)

      // 提交事务
      this.db.exec('COMMIT')

      return {
        success: result.changes > 0,
        message: result.changes > 0 ? '读者已永久删除' : '读者不存在'
      }
    } catch (error) {
      // 发生错误时回滚事务
      this.db.exec('ROLLBACK')
      console.error('硬删除读者失败:', error)
      return {
        success: false,
        message: `操作失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 恢复已删除（注销）的读者
   * @param readerId 读者ID
   * @returns 包含操作结果和消息的对象
   */
  restoreReader(readerId: number): { success: boolean; message: string } {
    try {
      // 获取读者信息
      const reader = this.getReaderById(readerId)

      // 检查读者是否存在
      if (!reader) {
        return { success: false, message: '读者不存在' }
      }

      // 检查读者状态是否为已注销
      if (reader.status !== 3) {
        return { success: false, message: '读者未被注销，无需恢复' }
      }

      // 将读者状态恢复为正常（状态码1）
      const stmt = this.db.prepare('UPDATE reader SET status = 1 WHERE reader_id = ?')
      const result = stmt.run(readerId)

      return {
        success: result.changes > 0,
        message: result.changes > 0 ? '读者已成功恢复' : '恢复失败'
      }
    } catch (error) {
      console.error('恢复读者失败:', error)
      return {
        success: false,
        message: `操作失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 更新读者状态
   * @param readerId 读者ID
   * @param status 新状态码（1:正常, 2:挂失, 3:注销, 等）
   * @returns 操作是否成功
   */
  updateReaderStatus(readerId: number, status: number): boolean {
    const stmt = this.db.prepare('UPDATE reader SET status = ? WHERE reader_id = ?')
    const result = stmt.run(status, readerId)
    return result.changes > 0
  }

  /**
   * 获取所有读者类型
   * @returns 读者类型数组
   */
  getAllReaderTypes(): IReaderType[] {
    return this.db.prepare('SELECT * FROM reader_type').all() as IReaderType[]
  }

  /**
   * 根据类型ID获取读者类型
   * @param typeId 类型ID
   * @returns 读者类型对象，如果不存在则返回undefined
   */
  getReaderTypeById(typeId: number): IReaderType | undefined {
    return this.db.prepare('SELECT * FROM reader_type WHERE type_id = ?').get(typeId) as
      | IReaderType
      | undefined
  }

  /**
   * 添加读者类型
   * @param readerType 读者类型信息（不包含type_id）
   * @returns 新添加类型的ID
   */
  addReaderType(readerType: Omit<IReaderType, 'type_id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO reader_type (
        type_name, max_borrow_count, max_borrow_days,
        can_renew, max_renew_count
      ) VALUES (?, ?, ?, ?, ?)
    `)

    // 执行插入操作
    const result = stmt.run(
      readerType.type_name,
      readerType.max_borrow_count,
      readerType.max_borrow_days,
      readerType.can_renew,
      readerType.max_renew_count
    )

    // 返回新插入类型的ID
    return result.lastInsertRowid as number
  }

  /**
   * 更新读者类型信息
   * @param readerType 读者类型完整信息
   * @returns 操作是否成功
   */
  updateReaderType(readerType: IReaderType): boolean {
    const stmt = this.db.prepare(`
      UPDATE reader_type SET
        type_name = ?, max_borrow_count = ?,
        max_borrow_days = ?, can_renew = ?,
        max_renew_count = ?
      WHERE type_id = ?
    `)

    // 执行更新操作
    const result = stmt.run(
      readerType.type_name,
      readerType.max_borrow_count,
      readerType.max_borrow_days,
      readerType.can_renew,
      readerType.max_renew_count,
      readerType.type_id
    )

    // 检查是否有记录被更新
    return result.changes > 0
  }

  /**
   * 删除读者类型
   * 删除前会检查该类型是否被任何读者使用
   * @param typeId 读者类型ID
   * @returns 包含操作结果和消息的对象
   */
  deleteReaderType(typeId: number): { success: boolean; message: string } {
    try {
      // 检查是否有读者使用此类型
      const readerCount = (
        this.db.prepare('SELECT COUNT(*) as count FROM reader WHERE type_id = ?').get(typeId) as {
          count: number
        }
      ).count

      // 如果有读者使用此类型，则无法删除
      if (readerCount > 0) {
        return { success: false, message: '有读者正在使用此读者类型，无法删除' }
      }

      // 执行删除操作
      const stmt = this.db.prepare('DELETE FROM reader_type WHERE type_id = ?')
      const result = stmt.run(typeId)

      return {
        success: result.changes > 0,
        message: result.changes > 0 ? '删除成功' : '读者类型不存在'
      }
    } catch (error) {
      console.error('删除读者类型失败:', error)
      return {
        success: false,
        message: `操作失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 获取读者的借阅历史记录
   * 排除已删除的图书
   * @param readerId 读者ID
   * @returns 借阅记录数组
   */
  getReaderBorrowHistory(readerId: number): any[] {
    return this.db
      .prepare(
        `
      SELECT br.*, b.title, b.isbn, b.author
      FROM borrow_record br
      JOIN book b ON br.book_id = b.book_id
      WHERE br.reader_id = ? AND b.status != 6  -- 排除已删除图书
      ORDER BY br.borrow_date DESC
    `
      )
      .all(readerId)
  }

  /**
   * 获取读者当前借阅的图书
   * 排除已删除的图书，只包含状态为借出(1)、续借(3)或逾期(4)的记录
   * @param readerId 读者ID
   * @returns 当前借阅记录数组
   */
  getReaderCurrentBorrows(readerId: number): any[] {
    return this.db
      .prepare(
        `
      SELECT br.*, b.title, b.isbn, b.author
      FROM borrow_record br
      JOIN book b ON br.book_id = b.book_id
      WHERE br.reader_id = ? AND (br.status = 1 OR br.status = 3 OR br.status = 4)
      AND b.status != 6  -- 排除已删除图书
      ORDER BY br.borrow_date DESC
    `
      )
      .all(readerId)
  }

  /**
   * 获取已删除（注销）的读者列表
   * 此功能仅供管理员使用
   * @returns 已删除读者信息数组
   */
  getDeletedReaders(): IReader[] {
    return this.db
      .prepare(
        `
      SELECT r.*, rt.type_name
      FROM reader r
      LEFT JOIN reader_type rt ON r.type_id = rt.type_id
      WHERE r.status = 3  -- 只获取已注销/删除的读者
    `
      )
      .all() as IReader[]
  }
}
