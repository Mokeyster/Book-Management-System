import Database from 'better-sqlite3'
import { IReader, IReaderType } from '../../types/readerTypes'

export class ReaderService {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  // 获取所有读者
  getAllReaders(): IReader[] {
    return this.db
      .prepare(
        `
      SELECT r.*, rt.type_name
      FROM reader r
      LEFT JOIN reader_type rt ON r.type_id = rt.type_id
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

  // 搜索读者
  searchReaders(query: string): IReader[] {
    return this.db
      .prepare(
        `
      SELECT r.*, rt.type_name
      FROM reader r
      LEFT JOIN reader_type rt ON r.type_id = rt.type_id
      WHERE r.name LIKE ? OR r.id_card LIKE ? OR r.phone LIKE ? OR r.email LIKE ?
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

  // 删除读者
  deleteReader(readerId: number): boolean {
    const stmt = this.db.prepare('DELETE FROM reader WHERE reader_id = ?')
    const result = stmt.run(readerId)
    return result.changes > 0
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

  // 删除读者类型
  deleteReaderType(typeId: number): boolean {
    const stmt = this.db.prepare('DELETE FROM reader_type WHERE type_id = ?')
    const result = stmt.run(typeId)
    return result.changes > 0
  }

  // 获取读者的借阅历史
  getReaderBorrowHistory(readerId: number): any[] {
    return this.db
      .prepare(
        `
      SELECT br.*, b.title, b.isbn, b.author
      FROM borrow_record br
      JOIN book b ON br.book_id = b.book_id
      WHERE br.reader_id = ?
      ORDER BY br.borrow_date DESC
    `
      )
      .all(readerId)
  }

  // 获取读者当前借阅
  getReaderCurrentBorrows(readerId: number): any[] {
    return this.db
      .prepare(
        `
      SELECT br.*, b.title, b.isbn, b.author
      FROM borrow_record br
      JOIN book b ON br.book_id = b.book_id
      WHERE br.reader_id = ? AND (br.status = 1 OR br.status = 3 OR br.status = 4)
      ORDER BY br.borrow_date DESC
    `
      )
      .all(readerId)
  }
}
