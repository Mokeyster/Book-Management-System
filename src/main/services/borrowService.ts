import Database from 'better-sqlite3'
import { IBorrowRecord, IBorrowRequest, IReservation } from '../../types/borrowTypes'

export class BorrowService {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  // 获取所有借阅记录
  getAllBorrowRecords(): IBorrowRecord[] {
    return this.db
      .prepare(
        `
      SELECT br.*, b.title as book_title, b.isbn, b.author,
             r.name as reader_name, r.id_card, r.phone
      FROM borrow_record br
      JOIN book b ON br.book_id = b.book_id
      JOIN reader r ON br.reader_id = r.reader_id
      ORDER BY br.borrow_date DESC
    `
      )
      .all() as IBorrowRecord[]
  }

  // 根据ID获取借阅记录
  getBorrowRecordById(borrowId: number): IBorrowRecord | undefined {
    return this.db
      .prepare(
        `
      SELECT br.*, b.title as book_title, b.isbn, b.author,
             r.name as reader_name, r.id_card, r.phone
      FROM borrow_record br
      JOIN book b ON br.book_id = b.book_id
      JOIN reader r ON br.reader_id = r.reader_id
      WHERE br.borrow_id = ?
    `
      )
      .get(borrowId) as IBorrowRecord | undefined
  }

  // 获取当前借出的图书
  getCurrentBorrows(): IBorrowRecord[] {
    return this.db
      .prepare(
        `
      SELECT br.*, b.title as book_title, b.isbn, b.author,
             r.name as reader_name, r.id_card, r.phone
      FROM borrow_record br
      JOIN book b ON br.book_id = b.book_id
      JOIN reader r ON br.reader_id = r.reader_id
      WHERE br.status = 1 OR br.status = 3 OR br.status = 4
      ORDER BY br.borrow_date DESC
    `
      )
      .all() as IBorrowRecord[]
  }

  // 获取指定图书的借阅历史
  getBookBorrowHistory(bookId: number): IBorrowRecord[] {
    return this.db
      .prepare(
        `
      SELECT br.*, b.title as book_title, b.isbn, b.author,
             r.name as reader_name, r.id_card, r.phone
      FROM borrow_record br
      JOIN book b ON br.book_id = b.book_id
      JOIN reader r ON br.reader_id = r.reader_id
      WHERE br.book_id = ?
      ORDER BY br.borrow_date DESC
    `
      )
      .all(bookId) as IBorrowRecord[]
  }

  // 获取逾期借阅
  getOverdueBorrows(): IBorrowRecord[] {
    return this.db
      .prepare(
        `
      SELECT br.*, b.title as book_title, b.isbn, b.author,
             r.name as reader_name, r.id_card, r.phone
      FROM borrow_record br
      JOIN book b ON br.book_id = b.book_id
      JOIN reader r ON br.reader_id = r.reader_id
      WHERE br.status = 3
      ORDER BY br.due_date ASC
    `
      )
      .all() as IBorrowRecord[]
  }

  // 借书
  borrowBook(borrowRequest: IBorrowRequest): {
    success: boolean
    message: string
    borrowId?: number
  } {
    try {
      // 开始事务
      this.db.prepare('BEGIN').run()

      // 检查图书是否可借
      const book = this.db
        .prepare('SELECT status FROM book WHERE book_id = ?')
        .get(borrowRequest.book_id) as { status: number } | undefined

      if (!book) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '图书不存在' }
      }

      if (book.status !== 1) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '图书不可借阅，当前状态不是在库' }
      }

      // 检查读者是否可以借书
      const reader = this.db
        .prepare(
          `
        SELECT r.*, rt.max_borrow_count
        FROM reader r
        LEFT JOIN reader_type rt ON r.type_id = rt.type_id
        WHERE r.reader_id = ?
      `
        )
        .get(borrowRequest.reader_id) as any

      if (!reader) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '读者不存在' }
      }

      if (reader.status !== 1) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '读者状态异常，无法借阅' }
      }

      // 检查读者当前借阅数量
      const borrowCount = this.db
        .prepare(
          `
        SELECT COUNT(*) as count
        FROM borrow_record
        WHERE reader_id = ? AND (status = 1 OR status = 3 OR status = 4)
      `
        )
        .get(borrowRequest.reader_id) as { count: number }

      if (borrowCount.count >= reader.max_borrow_count) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '已达到最大借阅数量' }
      }

      // 获取系统配置
      const readerType = this.db
        .prepare('SELECT * FROM reader_type WHERE type_id = ?')
        .get(reader.type_id) as any

      // 设置借阅期限
      const borrowDate = new Date()
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + readerType.max_borrow_days)

      // 创建借阅记录
      const stmt = this.db.prepare(`
        INSERT INTO borrow_record (
          book_id, reader_id, borrow_date, due_date, status, operator_id
        ) VALUES (?, ?, ?, ?, 1, ?)
      `)

      const insertResult = stmt.run(
        borrowRequest.book_id,
        borrowRequest.reader_id,
        borrowDate.toISOString().split('T')[0],
        dueDate.toISOString().split('T')[0],
        borrowRequest.operator_id
      )

      // 更新图书状态
      this.db.prepare('UPDATE book SET status = 2 WHERE book_id = ?').run(borrowRequest.book_id)

      // 如果有预约，更新预约状态
      this.db
        .prepare(
          `
        UPDATE reservation SET status = 2
        WHERE book_id = ? AND reader_id = ? AND status = 1
      `
        )
        .run(borrowRequest.book_id, borrowRequest.reader_id)

      // 提交事务
      this.db.prepare('COMMIT').run()

      return {
        success: true,
        message: '借阅成功',
        borrowId: insertResult.lastInsertRowid as number
      }
    } catch (error) {
      this.db.prepare('ROLLBACK').run()
      return {
        success: false,
        message: `借阅失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  // 归还图书
  returnBook(borrowId: number): { success: boolean; message: string; fine?: number } {
    try {
      // 开始事务
      this.db.prepare('BEGIN').run()

      // 获取借阅记录
      const borrowRecord = this.getBorrowRecordById(borrowId)

      if (!borrowRecord) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '借阅记录不存在' }
      }

      if (borrowRecord.status === 2) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '图书已归还' }
      }

      // 计算罚款
      let fineAmount = 0
      const returnDate = new Date()
      const dueDate = new Date(borrowRecord.due_date)

      if (returnDate > dueDate) {
        const overdueDays = Math.ceil(
          (returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        // 获取罚款率
        const fineRateResult = this.db
          .prepare("SELECT config_value FROM system_config WHERE config_key = 'fine_rate'")
          .get() as { config_value: string } | undefined
        const fineRate = fineRateResult ? parseFloat(fineRateResult.config_value) : 0.5

        fineAmount = overdueDays * fineRate
      }

      // 更新借阅记录
      this.db
        .prepare(
          `
        UPDATE borrow_record SET
          status = 2,
          return_date = datetime('now', 'localtime'),
          fine_amount = ?
        WHERE borrow_id = ?
      `
        )
        .run(fineAmount, borrowId)

      // 更新图书状态
      this.db.prepare('UPDATE book SET status = 1 WHERE book_id = ?').run(borrowRecord.book_id)

      // 提交事务
      this.db.prepare('COMMIT').run()

      return {
        success: true,
        message: '归还成功',
        fine: fineAmount
      }
    } catch (error) {
      this.db.prepare('ROLLBACK').run()
      return {
        success: false,
        message: `归还失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  // 续借图书
  renewBook(borrowId: number): { success: boolean; message: string; newDueDate?: string } {
    try {
      // 开始事务
      this.db.prepare('BEGIN').run()

      // 获取借阅记录
      const borrowRecord = this.getBorrowRecordById(borrowId)

      if (!borrowRecord) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '借阅记录不存在' }
      }

      if (borrowRecord.status === 2) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '图书已归还，无法续借' }
      }

      // 获取读者类型配置
      const reader = this.db
        .prepare(
          `
        SELECT r.*, rt.*
        FROM reader r
        LEFT JOIN reader_type rt ON r.type_id = rt.type_id
        WHERE r.reader_id = ?
      `
        )
        .get(borrowRecord.reader_id) as any

      if (!reader) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '读者信息不存在' }
      }

      if (reader.can_renew !== 1) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '该读者类型不允许续借' }
      }

      if (borrowRecord.renew_count >= reader.max_renew_count) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '已达到最大续借次数' }
      }

      // 设置新的应还日期
      const dueDate = new Date(borrowRecord.due_date)
      dueDate.setDate(dueDate.getDate() + reader.max_borrow_days)
      const newDueDate = dueDate.toISOString().split('T')[0]

      // 更新借阅记录
      this.db
        .prepare(
          `
        UPDATE borrow_record SET
          due_date = ?,
          renew_count = renew_count + 1,
          status = 4
        WHERE borrow_id = ?
      `
        )
        .run(newDueDate, borrowId)

      // 提交事务
      this.db.prepare('COMMIT').run()

      return {
        success: true,
        message: '续借成功',
        newDueDate
      }
    } catch (error) {
      this.db.prepare('ROLLBACK').run()
      return {
        success: false,
        message: `续借失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  // 预约图书
  reserveBook(
    bookId: number,
    readerId: number
  ): { success: boolean; message: string; reservationId?: number } {
    try {
      // 开始事务
      this.db.prepare('BEGIN').run()

      // 检查图书是否存在
      const book = this.db.prepare('SELECT status FROM book WHERE book_id = ?').get(bookId) as
        | { status: number }
        | undefined

      if (!book) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '图书不存在' }
      }

      // 检查读者是否存在且状态正常
      const reader = this.db
        .prepare('SELECT status FROM reader WHERE reader_id = ?')
        .get(readerId) as { status: number } | undefined

      if (!reader) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '读者不存在' }
      }

      if (reader.status !== 1) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '读者状态异常，无法预约' }
      }

      // 检查是否已经预约过该书
      const existingReservation = this.db
        .prepare(
          `
        SELECT * FROM reservation
        WHERE book_id = ? AND reader_id = ? AND (status = 1 OR status = 2)
      `
        )
        .get(bookId, readerId)

      if (existingReservation) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '已经预约过该书' }
      }

      // 设置预约过期时间（默认为30天后）
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 30)

      // 创建预约记录
      const stmt = this.db.prepare(`
        INSERT INTO reservation (
          book_id, reader_id, reserve_date, expiry_date, status
        ) VALUES (?, ?, datetime('now', 'localtime'), ?, 1)
      `)

      const result = stmt.run(bookId, readerId, expiryDate.toISOString().split('T')[0])

      // 如果图书在库，则更新状态为已预约
      if (book.status === 1) {
        this.db.prepare('UPDATE book SET status = 3 WHERE book_id = ?').run(bookId)
      }

      // 提交事务
      this.db.prepare('COMMIT').run()

      return {
        success: true,
        message: '预约成功',
        reservationId: result.lastInsertRowid as number
      }
    } catch (error) {
      this.db.prepare('ROLLBACK').run()
      return {
        success: false,
        message: `预约失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  // 取消预约
  cancelReservation(reservationId: number): { success: boolean; message: string } {
    try {
      // 开始事务
      this.db.prepare('BEGIN').run()

      // 检查预约是否存在
      const reservation = this.db
        .prepare('SELECT * FROM reservation WHERE reservation_id = ?')
        .get(reservationId) as IReservation | undefined

      if (!reservation) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '预约记录不存在' }
      }

      if (reservation.status !== 1) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '预约已处理，无法取消' }
      }

      // 更新预约状态
      this.db
        .prepare('UPDATE reservation SET status = 4 WHERE reservation_id = ?')
        .run(reservationId)

      // 检查是否有其他预约
      const otherReservations = this.db
        .prepare(
          `
        SELECT * FROM reservation
        WHERE book_id = ? AND status = 1 AND reservation_id != ?
        ORDER BY reserve_date ASC
        LIMIT 1
      `
        )
        .get(reservation.book_id, reservationId)

      // 如果没有其他预约，且图书状态为"已预约"，则更新为"在库"
      if (!otherReservations) {
        const book = this.db
          .prepare('SELECT status FROM book WHERE book_id = ?')
          .get(reservation.book_id) as { status: number }

        if (book.status === 3) {
          this.db.prepare('UPDATE book SET status = 1 WHERE book_id = ?').run(reservation.book_id)
        }
      }

      // 提交事务
      this.db.prepare('COMMIT').run()

      return { success: true, message: '取消预约成功' }
    } catch (error) {
      this.db.prepare('ROLLBACK').run()
      return {
        success: false,
        message: `取消预约失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  // 获取所有预约
  getAllReservations(): IReservation[] {
    return this.db
      .prepare(
        `
      SELECT r.*, b.title as book_title, b.isbn, b.author,
             rd.name as reader_name, rd.id_card, rd.phone
      FROM reservation r
      JOIN book b ON r.book_id = b.book_id
      JOIN reader rd ON r.reader_id = rd.reader_id
      ORDER BY r.reserve_date DESC
    `
      )
      .all() as IReservation[]
  }

  // 获取图书的预约记录
  getBookReservations(bookId: number): IReservation[] {
    return this.db
      .prepare(
        `
      SELECT r.*, rd.name as reader_name, rd.id_card, rd.phone
      FROM reservation r
      JOIN reader rd ON r.reader_id = rd.reader_id
      WHERE r.book_id = ?
      ORDER BY r.reserve_date ASC
    `
      )
      .all(bookId) as IReservation[]
  }

  // 获取读者的预约记录
  getReaderReservations(readerId: number): IReservation[] {
    return this.db
      .prepare(
        `
      SELECT r.*, b.title as book_title, b.isbn, b.author
      FROM reservation r
      JOIN book b ON r.book_id = b.book_id
      WHERE r.reader_id = ?
      ORDER BY r.reserve_date DESC
    `
      )
      .all(readerId) as IReservation[]
  }
}
