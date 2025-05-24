import Database from 'better-sqlite3'
import { IBorrowRecord, IBorrowRequest, IReservation } from '../../types/borrowTypes'

export class BorrowService {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  // 获取所有借阅记录（排除已删除图书和已删除读者）
  getAllBorrowRecords(): IBorrowRecord[] {
    return this.db
      .prepare(
        `
      SELECT br.*, b.title as book_title, b.isbn, b.author,
             r.name as reader_name, r.id_card, r.phone
      FROM borrow_record br
      JOIN book b ON br.book_id = b.book_id
      JOIN reader r ON br.reader_id = r.reader_id
      WHERE b.status != 6 AND r.status != 3  -- 排除已删除图书和已删除读者
      ORDER BY br.borrow_date DESC
    `
      )
      .all() as IBorrowRecord[]
  }

  // 根据ID获取借阅记录（排除已删除图书和已删除读者）
  getBorrowRecordById(borrowId: number): IBorrowRecord | undefined {
    return this.db
      .prepare(
        `
      SELECT br.*, b.title as book_title, b.isbn, b.author,
             r.name as reader_name, r.id_card, r.phone
      FROM borrow_record br
      JOIN book b ON br.book_id = b.book_id
      JOIN reader r ON br.reader_id = r.reader_id
      WHERE br.borrow_id = ? AND b.status != 6 AND r.status != 3  -- 排除已删除图书和已删除读者
    `
      )
      .get(borrowId) as IBorrowRecord | undefined
  }

  // 获取当前借出的图书（排除已删除图书和已删除读者）
  getCurrentBorrows(): IBorrowRecord[] {
    return this.db
      .prepare(
        `
      SELECT br.*, b.title as book_title, b.isbn, b.author,
             r.name as reader_name, r.id_card, r.phone
      FROM borrow_record br
      JOIN book b ON br.book_id = b.book_id
      JOIN reader r ON br.reader_id = r.reader_id
      WHERE (br.status = 1 OR br.status = 3) AND b.status != 6 AND r.status != 3  -- 排除已删除图书和已删除读者，只包含借出和逾期状态
      ORDER BY br.borrow_date DESC
    `
      )
      .all() as IBorrowRecord[]
  }

  // 获取指定图书的借阅历史（排除已删除读者）
  getBookBorrowHistory(bookId: number): IBorrowRecord[] {
    return this.db
      .prepare(
        `
      SELECT br.*, b.title as book_title, b.isbn, b.author,
             r.name as reader_name, r.id_card, r.phone
      FROM borrow_record br
      JOIN book b ON br.book_id = b.book_id
      JOIN reader r ON br.reader_id = r.reader_id
      WHERE br.book_id = ? AND b.status != 6 AND r.status != 3  -- 排除已删除图书和已删除读者
      ORDER BY br.borrow_date DESC
    `
      )
      .all(bookId) as IBorrowRecord[]
  }

  // 获取指定读者的借阅历史（新方法）
  getReaderBorrowHistory(readerId: number): IBorrowRecord[] {
    return this.db
      .prepare(
        `
      SELECT br.*, b.title as book_title, b.isbn, b.author,
             r.name as reader_name, r.id_card, r.phone
      FROM borrow_record br
      JOIN book b ON br.book_id = b.book_id
      JOIN reader r ON br.reader_id = r.reader_id
      WHERE br.reader_id = ? AND b.status != 6
      ORDER BY br.borrow_date DESC
    `
      )
      .all(readerId) as IBorrowRecord[]
  }

  // 获取逾期借阅（排除已删除图书和已删除读者）
  getOverdueBorrows(): IBorrowRecord[] {
    return this.db
      .prepare(
        `
      SELECT br.*, b.title as book_title, b.isbn, b.author,
             r.name as reader_name, r.id_card, r.phone
      FROM borrow_record br
      JOIN book b ON br.book_id = b.book_id
      JOIN reader r ON br.reader_id = r.reader_id
      WHERE br.status = 3 AND b.status != 6 AND r.status != 3  -- 排除已删除图书和已删除读者
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

      // 检查图书是否已删除
      if (book.status === 6) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '该图书已删除，无法借阅' }
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

      // 检查读者是否已删除
      if (reader.status === 3) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '该读者已被注销，无法借阅' }
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
        FROM borrow_record br
        JOIN book b ON br.book_id = b.book_id
        WHERE br.reader_id = ? AND (br.status = 1 OR br.status = 3) AND b.status != 6
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

      // 获取借阅记录（包括检查图书状态和读者状态）
      const borrowRecord = this.db
        .prepare(
          `
        SELECT br.*, b.status as book_status, r.status as reader_status
        FROM borrow_record br
        JOIN book b ON br.book_id = b.book_id
        JOIN reader r ON br.reader_id = r.reader_id
        WHERE br.borrow_id = ?
      `
        )
        .get(borrowId) as
        | (IBorrowRecord & { book_status: number; reader_status: number })
        | undefined

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

      // 如果图书未被删除，更新图书状态为在库
      if (borrowRecord.book_status !== 6) {
        this.db.prepare('UPDATE book SET status = 1 WHERE book_id = ?').run(borrowRecord.book_id)
      }

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

  // 续借图书（不改变借阅状态，只更新到期日期和续借次数）
  renewBook(borrowId: number): { success: boolean; message: string; newDueDate?: string } {
    try {
      // 开始事务
      this.db.prepare('BEGIN').run()

      // 获取借阅记录（包括图书状态和读者状态）
      const borrowRecord = this.db
        .prepare(
          `
        SELECT br.*, b.status as book_status, r.status as reader_status
        FROM borrow_record br
        JOIN book b ON br.book_id = b.book_id
        JOIN reader r ON br.reader_id = r.reader_id
        WHERE br.borrow_id = ?
      `
        )
        .get(borrowId) as
        | (IBorrowRecord & { book_status: number; reader_status: number })
        | undefined

      if (!borrowRecord) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '借阅记录不存在' }
      }

      // 检查图书是否已删除
      if (borrowRecord.book_status === 6) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '该图书已删除，无法续借' }
      }

      // 检查读者是否已注销
      if (borrowRecord.reader_status === 3) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '该读者已被注销，无法续借' }
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

      // 更新借阅记录 - 只更新到期日期和续借次数，保持原有状态
      this.db
        .prepare(
          `
        UPDATE borrow_record SET
          due_date = ?,
          renew_count = renew_count + 1
        WHERE borrow_id = ?
      `
        )
        .run(newDueDate, borrowId)

      // 如果当前是逾期状态，且新的到期日期在当前日期之后，则更新状态为借出
      if (borrowRecord.status === 3) {
        const now = new Date()
        if (dueDate > now) {
          this.db.prepare('UPDATE borrow_record SET status = 1 WHERE borrow_id = ?').run(borrowId)
        }
      }

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

      // 检查图书是否存在且未删除
      const book = this.db.prepare('SELECT status FROM book WHERE book_id = ?').get(bookId) as
        | { status: number }
        | undefined

      if (!book) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '图书不存在' }
      }

      // 检查图书是否已删除
      if (book.status === 6) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '该图书已删除，无法预约' }
      }

      // 检查读者是否存在且状态正常
      const reader = this.db
        .prepare('SELECT status FROM reader WHERE reader_id = ?')
        .get(readerId) as { status: number } | undefined

      if (!reader) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '读者不存在' }
      }

      // 检查读者是否已删除
      if (reader.status === 3) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '该读者已被注销，无法预约' }
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
        .prepare(
          `
          SELECT r.*, b.status as book_status, rd.status as reader_status
          FROM reservation r
          JOIN book b ON r.book_id = b.book_id
          JOIN reader rd ON r.reader_id = rd.reader_id
          WHERE r.reservation_id = ?
        `
        )
        .get(reservationId) as
        | (IReservation & { book_status: number; reader_status: number })
        | undefined

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

      // 如果图书已删除，不需要更新图书状态
      if (reservation.book_status !== 6) {
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

  // 获取所有预约（排除已删除图书和已删除读者）
  getAllReservations(): IReservation[] {
    return this.db
      .prepare(
        `
      SELECT r.*, b.title as book_title, b.isbn, b.author,
             rd.name as reader_name, rd.id_card, rd.phone
      FROM reservation r
      JOIN book b ON r.book_id = b.book_id
      JOIN reader rd ON r.reader_id = rd.reader_id
      WHERE b.status != 6 AND rd.status != 3  -- 排除已删除图书和已删除读者
      ORDER BY r.reserve_date DESC
    `
      )
      .all() as IReservation[]
  }

  // 获取图书的预约记录（排除已删除读者）
  getBookReservations(bookId: number): IReservation[] {
    return this.db
      .prepare(
        `
      SELECT r.*, rd.name as reader_name, rd.id_card, rd.phone
      FROM reservation r
      JOIN reader rd ON r.reader_id = rd.reader_id
      JOIN book b ON r.book_id = b.book_id
      WHERE r.book_id = ? AND b.status != 6 AND rd.status != 3  -- 排除已删除图书和已删除读者
      ORDER BY r.reserve_date ASC
    `
      )
      .all(bookId) as IReservation[]
  }

  // 获取读者的预约记录（排除已删除图书）
  getReaderReservations(readerId: number): IReservation[] {
    return this.db
      .prepare(
        `
      SELECT r.*, b.title as book_title, b.isbn, b.author
      FROM reservation r
      JOIN book b ON r.book_id = b.book_id
      WHERE r.reader_id = ? AND b.status != 6  -- 排除已删除图书
      ORDER BY r.reserve_date DESC
    `
      )
      .all(readerId) as IReservation[]
  }

  // 获取所有借阅历史记录（包括已删除的图书和读者，仅管理员使用）
  getAllBorrowHistory(): IBorrowRecord[] {
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

  // 更新逾期状态（系统定时任务调用）
  updateOverdueStatus(): { updated: number; message: string } {
    try {
      // 开始事务
      this.db.prepare('BEGIN').run()

      // 更新所有逾期但状态不是已归还的借阅记录
      const result = this.db
        .prepare(
          `
        UPDATE borrow_record
        SET status = 3
        WHERE due_date < date('now')
        AND status != 2
        AND status != 3
      `
        )
        .run()

      // 提交事务
      this.db.prepare('COMMIT').run()

      return {
        updated: result.changes,
        message: `成功更新 ${result.changes} 条逾期记录`
      }
    } catch (error) {
      // 回滚事务
      this.db.prepare('ROLLBACK').run()
      console.error('更新逾期状态失败:', error)
      return {
        updated: 0,
        message: `更新失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  // 更新预约过期状态（系统定时任务调用）
  updateExpiredReservations(): { updated: number; message: string } {
    try {
      // 开始事务
      this.db.prepare('BEGIN').run()

      // 查询需要处理的预约记录
      const expiredReservations = this.db
        .prepare(
          `
        SELECT *
        FROM reservation
        WHERE expiry_date < date('now')
        AND status = 1
      `
        )
        .all() as IReservation[]

      let updatedCount = 0

      // 更新每条过期的预约记录
      for (const reservation of expiredReservations) {
        // 更新预约状态为已过期
        this.db
          .prepare('UPDATE reservation SET status = 3 WHERE reservation_id = ?')
          .run(reservation.reservation_id)

        // 检查是否有其他活动的预约
        const otherReservations = this.db
          .prepare(
            `
          SELECT *
          FROM reservation
          WHERE book_id = ? AND status = 1 AND reservation_id != ?
          ORDER BY reserve_date ASC
          LIMIT 1
        `
          )
          .get(reservation.book_id, reservation.reservation_id)

        // 如果没有其他预约且图书状态是已预约，则更新为在库
        if (!otherReservations) {
          const book = this.db
            .prepare('SELECT status FROM book WHERE book_id = ?')
            .get(reservation.book_id) as { status: number } | undefined

          if (book && book.status === 3) {
            this.db.prepare('UPDATE book SET status = 1 WHERE book_id = ?').run(reservation.book_id)
          }
        }

        updatedCount++
      }

      // 提交事务
      this.db.prepare('COMMIT').run()

      return {
        updated: updatedCount,
        message: `成功更新 ${updatedCount} 条过期预约记录`
      }
    } catch (error) {
      // 回滚事务
      this.db.prepare('ROLLBACK').run()
      console.error('更新预约过期状态失败:', error)
      return {
        updated: 0,
        message: `更新失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }
}
