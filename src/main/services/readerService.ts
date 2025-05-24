import Database from 'better-sqlite3'
import { IReader, IReaderType } from '../../types/readerTypes'

export class ReaderService {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  // 获取所有读者（排除已删除的读者）
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

  // 根据ID获取读者
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

  // 搜索读者（排除已删除的读者）
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

  // 添加新读者
  addReader(reader: Omit<IReader, 'reader_id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO reader (
        name, gender, id_card, phone, email,
        address, status, borrow_quota, type_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      reader.name,
      reader.gender,
      reader.id_card,
      reader.phone,
      reader.email,
      reader.address,
      reader.status || 1,
      reader.borrow_quota,
      reader.type_id
    )

    return result.lastInsertRowid as number
  }

  // 更新读者信息
  updateReader(reader: IReader): boolean {
    const stmt = this.db.prepare(`
      UPDATE reader SET
        name = ?, gender = ?, id_card = ?, phone = ?,
        email = ?, address = ?, status = ?,
        borrow_quota = ?, type_id = ?
      WHERE reader_id = ?
    `)

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

    return result.changes > 0
  }

  // 软删除读者（将状态设置为"已注销"）
  deleteReader(readerId: number): { success: boolean; message: string } {
    try {
      // 开始事务
      this.db.exec('BEGIN TRANSACTION')

      // 检查是否有关联的未归还借阅记录
      const borrowCount = (
        this.db
          .prepare(
            'SELECT COUNT(*) as count FROM borrow_record WHERE reader_id = ? AND status != 2'
          )
          .get(readerId) as { count: number }
      ).count

      if (borrowCount > 0) {
        this.db.exec('ROLLBACK')
        return { success: false, message: '该读者有未归还的借阅记录，无法删除' }
      }

      // 更新读者状态为"已注销"（状态3）
      const stmt = this.db.prepare('UPDATE reader SET status = 3 WHERE reader_id = ?')
      const result = stmt.run(readerId)

      // 提交事务
      this.db.exec('COMMIT')

      return {
        success: result.changes > 0,
        message: result.changes > 0 ? '读者已成功注销' : '读者不存在或已被注销'
      }
    } catch (error) {
      // 回滚事务
      this.db.exec('ROLLBACK')
      console.error('删除读者失败:', error)
      return {
        success: false,
        message: `操作失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  // 硬删除读者（管理员专用，真正从数据库删除）
  hardDeleteReader(readerId: number): { success: boolean; message: string } {
    try {
      // 开始事务
      this.db.exec('BEGIN TRANSACTION')

      // 检查是否有任何借阅记录（包括已归还）
      const borrowCount = (
        this.db
          .prepare('SELECT COUNT(*) as count FROM borrow_record WHERE reader_id = ?')
          .get(readerId) as { count: number }
      ).count

      if (borrowCount > 0) {
        this.db.exec('ROLLBACK')
        return {
          success: false,
          message: '该读者有借阅历史记录，建议使用软删除保留数据完整性'
        }
      }

      // 删除任何预约记录
      this.db.prepare('DELETE FROM reservation WHERE reader_id = ?').run(readerId)

      // 真正删除读者
      const stmt = this.db.prepare('DELETE FROM reader WHERE reader_id = ?')
      const result = stmt.run(readerId)

      // 提交事务
      this.db.exec('COMMIT')

      return {
        success: result.changes > 0,
        message: result.changes > 0 ? '读者已永久删除' : '读者不存在'
      }
    } catch (error) {
      // 回滚事务
      this.db.exec('ROLLBACK')
      console.error('硬删除读者失败:', error)
      return {
        success: false,
        message: `操作失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  // 恢复已删除的读者
  restoreReader(readerId: number): { success: boolean; message: string } {
    try {
      const reader = this.getReaderById(readerId)

      if (!reader) {
        return { success: false, message: '读者不存在' }
      }

      if (reader.status !== 3) {
        return { success: false, message: '读者未被注销，无需恢复' }
      }

      // 恢复读者状态为正常
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

  // 更新读者状态
  updateReaderStatus(readerId: number, status: number): boolean {
    const stmt = this.db.prepare('UPDATE reader SET status = ? WHERE reader_id = ?')
    const result = stmt.run(status, readerId)
    return result.changes > 0
  }

  // 获取所有读者类型
  getAllReaderTypes(): IReaderType[] {
    return this.db.prepare('SELECT * FROM reader_type').all() as IReaderType[]
  }

  // 根据ID获取读者类型
  getReaderTypeById(typeId: number): IReaderType | undefined {
    return this.db.prepare('SELECT * FROM reader_type WHERE type_id = ?').get(typeId) as
      | IReaderType
      | undefined
  }

  // 添加读者类型
  addReaderType(readerType: Omit<IReaderType, 'type_id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO reader_type (
        type_name, max_borrow_count, max_borrow_days,
        can_renew, max_renew_count
      ) VALUES (?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      readerType.type_name,
      readerType.max_borrow_count,
      readerType.max_borrow_days,
      readerType.can_renew,
      readerType.max_renew_count
    )

    return result.lastInsertRowid as number
  }

  // 更新读者类型
  updateReaderType(readerType: IReaderType): boolean {
    const stmt = this.db.prepare(`
      UPDATE reader_type SET
        type_name = ?, max_borrow_count = ?,
        max_borrow_days = ?, can_renew = ?,
        max_renew_count = ?
      WHERE type_id = ?
    `)

    const result = stmt.run(
      readerType.type_name,
      readerType.max_borrow_count,
      readerType.max_borrow_days,
      readerType.can_renew,
      readerType.max_renew_count,
      readerType.type_id
    )

    return result.changes > 0
  }

  // 删除读者类型前检查是否有读者使用该类型
  deleteReaderType(typeId: number): { success: boolean; message: string } {
    try {
      // 检查是否有读者使用此类型
      const readerCount = (
        this.db.prepare('SELECT COUNT(*) as count FROM reader WHERE type_id = ?').get(typeId) as {
          count: number
        }
      ).count

      if (readerCount > 0) {
        return { success: false, message: '有读者正在使用此读者类型，无法删除' }
      }

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

  // 获取读者的借阅历史（排除已删除的图书）
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

  // 获取读者当前借阅（排除已删除的图书）
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

  // 获取已删除的读者列表（仅管理员可用）
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
