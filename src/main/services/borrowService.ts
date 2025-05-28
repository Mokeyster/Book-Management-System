import Database from 'better-sqlite3'
import { IBorrowRecord, IBorrowRequest, IReservation } from '../../types/borrowTypes'
import { SystemService } from './systemService'

/**
 * 图书借阅服务类 - 处理所有与借阅相关的业务逻辑
 * 包括借书、还书、续借、预约等功能
 */
export class BorrowService {
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
   * 获取所有借阅记录（排除已删除图书和已删除读者）
   * @returns 借阅记录数组
   */
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

  /**
   * 根据ID获取借阅记录（排除已删除图书和已删除读者）
   * @param borrowId 借阅记录ID
   * @returns 借阅记录对象或undefined（如果不存在）
   */
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

  /**
   * 获取当前借出的图书（排除已删除图书和已删除读者）
   * @returns 当前借出的借阅记录数组
   */
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

  /**
   * 获取指定图书的借阅历史（排除已删除读者）
   * @param bookId 图书ID
   * @returns 该图书的借阅记录数组
   */
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

  /**
   * 获取指定读者的借阅历史（排除已删除图书）
   * @param readerId 读者ID
   * @returns 该读者的借阅记录数组
   */
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

  /**
   * 获取逾期借阅（排除已删除图书和已删除读者）
   * @returns 逾期的借阅记录数组
   */
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

  /**
   * 借书
   * @param borrowRequest 借阅请求对象，包含图书ID、读者ID和操作员ID
   * @returns 操作结果，包含成功状态、消息和借阅ID（如果成功）
   */
  borrowBook(borrowRequest: IBorrowRequest): {
    success: boolean
    message: string
    borrowId?: number
  } {
    try {
      // 开始事务，确保数据的完整性
      this.db.prepare('BEGIN').run()

      // 检查图书是否可借
      const book = this.db
        .prepare('SELECT status FROM book WHERE book_id = ?')
        .get(borrowRequest.book_id) as { status: number } | undefined

      if (!book) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '图书不存在' }
      }

      // 检查图书是否已删除（状态6表示已删除）
      if (book.status === 6) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '该图书已删除，无法借阅' }
      }

      // 检查图书是否在库（状态1表示在库）
      if (book.status !== 1) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '图书不可借阅，当前状态不是在库' }
      }

      // 检查读者是否可以借书，包括读者类型和最大借阅数量
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

      // 检查读者是否已删除（状态3表示已注销）
      if (reader.status === 3) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '该读者已被注销，无法借阅' }
      }

      // 检查读者状态是否正常（状态1表示正常）
      if (reader.status !== 1) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '读者状态异常，无法借阅' }
      }

      // 检查读者当前借阅数量是否已达到上限
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

      // 获取读者类型配置以确定借阅期限
      const readerType = this.db
        .prepare('SELECT * FROM reader_type WHERE type_id = ?')
        .get(reader.type_id) as any

      // 设置借阅日期和应还日期
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
        borrowDate.toISOString().split('T')[0], // 格式化为yyyy-MM-dd
        dueDate.toISOString().split('T')[0], // 格式化为yyyy-MM-dd
        borrowRequest.operator_id
      )

      // 更新图书状态为借出（状态2）
      this.db.prepare('UPDATE book SET status = 2 WHERE book_id = ?').run(borrowRequest.book_id)

      // 如果该读者之前有预约该图书，则更新预约状态为已借阅（状态2）
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

      const borrowId = insertResult.lastInsertRowid as number

      // 记录操作日志
      if (borrowRequest.operator_id) {
        const book = this.db
          .prepare('SELECT title FROM book WHERE book_id = ?')
          .get(borrowRequest.book_id) as { title: string } | undefined
        const reader = this.db
          .prepare('SELECT name FROM reader WHERE reader_id = ?')
          .get(borrowRequest.reader_id) as { name: string } | undefined

        this.systemService.logOperation(
          borrowRequest.operator_id,
          'borrow book',
          '127.0.0.1',
          `借阅图书: ${book?.title || `图书ID:${borrowRequest.book_id}`} - 读者: ${reader?.name || `读者ID:${borrowRequest.reader_id}`}`
        )
      }

      return {
        success: true,
        message: '借阅成功',
        borrowId
      }
    } catch (error) {
      // 如果发生错误，回滚事务
      this.db.prepare('ROLLBACK').run()
      return {
        success: false,
        message: `借阅失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 归还图书
   * @param borrowId 借阅记录ID
   * @param userId 操作用户ID（可选）
   * @returns 操作结果，包含成功状态、消息和罚款金额（如果有）
   */
  returnBook(
    borrowId: number,
    userId?: number
  ): { success: boolean; message: string; fine?: number } {
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

      // 检查图书是否已归还（状态2表示已归还）
      if (borrowRecord.status === 2) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '图书已归还' }
      }

      // 计算罚款（如果超过应还日期）
      let fineAmount = 0
      const returnDate = new Date()
      const dueDate = new Date(borrowRecord.due_date)

      if (returnDate > dueDate) {
        // 计算逾期天数
        const overdueDays = Math.ceil(
          (returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        // 获取罚款率（从系统配置中）
        const fineRateResult = this.db
          .prepare("SELECT config_value FROM system_config WHERE config_key = 'fine_rate'")
          .get() as { config_value: string } | undefined
        const fineRate = fineRateResult ? parseFloat(fineRateResult.config_value) : 0.5

        // 计算总罚款金额
        fineAmount = overdueDays * fineRate
      }

      // 更新借阅记录为已归还状态，记录归还日期和罚款金额
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

      // 如果图书未被删除，更新图书状态为在库（状态1）
      if (borrowRecord.book_status !== 6) {
        this.db.prepare('UPDATE book SET status = 1 WHERE book_id = ?').run(borrowRecord.book_id)
      }

      // 提交事务
      this.db.prepare('COMMIT').run()

      // 记录操作日志
      if (borrowRecord.operator_id) {
        const book = this.db
          .prepare('SELECT title FROM book WHERE book_id = ?')
          .get(borrowRecord.book_id) as { title: string } | undefined
        const reader = this.db
          .prepare('SELECT name FROM reader WHERE reader_id = ?')
          .get(borrowRecord.reader_id) as { name: string } | undefined

        this.systemService.logOperation(
          userId || borrowRecord.operator_id,
          'return book',
          '127.0.0.1',
          `归还图书: ${book?.title || `图书ID:${borrowRecord.book_id}`} - 读者: ${reader?.name || `读者ID:${borrowRecord.reader_id}`}${fineAmount > 0 ? ` (罚金: ${fineAmount} 元)` : ''}`
        )
      }

      return {
        success: true,
        message: '归还成功',
        fine: fineAmount
      }
    } catch (error) {
      // 如果发生错误，回滚事务
      this.db.prepare('ROLLBACK').run()
      return {
        success: false,
        message: `归还失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 续借图书（不改变借阅状态，只更新到期日期和续借次数）
   * @param borrowId 借阅记录ID
   * @param userId 操作用户ID（可选）
   * @returns 操作结果，包含成功状态、消息和新的到期日期（如果成功）
   */
  renewBook(
    borrowId: number,
    userId?: number
  ): { success: boolean; message: string; newDueDate?: string } {
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

      // 检查图书是否已归还
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

      // 检查该读者类型是否允许续借
      if (reader.can_renew !== 1) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '该读者类型不允许续借' }
      }

      // 检查是否超过最大续借次数
      if (borrowRecord.renew_count >= reader.max_renew_count) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '已达到最大续借次数' }
      }

      // 计算新的应还日期（从当前应还日期起，再加上借阅天数）
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

      // 记录操作日志
      if (borrowRecord.operator_id) {
        const book = this.db
          .prepare('SELECT title FROM book WHERE book_id = ?')
          .get(borrowRecord.book_id) as { title: string } | undefined
        const reader = this.db
          .prepare('SELECT name FROM reader WHERE reader_id = ?')
          .get(borrowRecord.reader_id) as { name: string } | undefined

        this.systemService.logOperation(
          userId || borrowRecord.operator_id,
          'renew book',
          '127.0.0.1',
          `续借图书: ${book?.title || `图书ID:${borrowRecord.book_id}`} - 读者: ${reader?.name || `读者ID:${borrowRecord.reader_id}`} (新到期日期: ${newDueDate})`
        )
      }

      return {
        success: true,
        message: '续借成功',
        newDueDate
      }
    } catch (error) {
      // 如果发生错误，回滚事务
      this.db.prepare('ROLLBACK').run()
      return {
        success: false,
        message: `续借失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 预约图书
   * @param bookId 图书ID
   * @param readerId 读者ID
   * @returns 操作结果，包含成功状态、消息和预约ID（如果成功）
   */
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

      // 检查读者状态是否正常
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

      // 如果图书在库，则更新状态为已预约（状态3）
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
      // 如果发生错误，回滚事务
      this.db.prepare('ROLLBACK').run()
      return {
        success: false,
        message: `预约失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 取消预约
   * @param reservationId 预约ID
   * @returns 操作结果，包含成功状态和消息
   */
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

      // 检查预约是否可以取消（只有状态为1-待处理的预约可以取消）
      if (reservation.status !== 1) {
        this.db.prepare('ROLLBACK').run()
        return { success: false, message: '预约已处理，无法取消' }
      }

      // 更新预约状态为已取消（状态4）
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

          // 如果图书状态为已预约（状态3），则更新为在库（状态1）
          if (book.status === 3) {
            this.db.prepare('UPDATE book SET status = 1 WHERE book_id = ?').run(reservation.book_id)
          }
        }
      }

      // 提交事务
      this.db.prepare('COMMIT').run()

      return { success: true, message: '取消预约成功' }
    } catch (error) {
      // 如果发生错误，回滚事务
      this.db.prepare('ROLLBACK').run()
      return {
        success: false,
        message: `取消预约失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 获取所有预约（排除已删除图书和已删除读者）
   * @returns 预约记录数组
   */
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

  /**
   * 获取图书的预约记录（排除已删除读者）
   * @param bookId 图书ID
   * @returns 该图书的预约记录数组
   */
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

  /**
   * 获取读者的预约记录（排除已删除图书）
   * @param readerId 读者ID
   * @returns 该读者的预约记录数组
   */
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

  /**
   * 获取所有借阅历史记录（包括已删除的图书和读者，仅管理员使用）
   * @returns 所有借阅记录数组
   */
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

  /**
   * 更新逾期状态（系统定时任务调用）
   * 将已超过应还日期但未标记为逾期的借阅记录状态更新为逾期
   * @returns 操作结果，包含更新记录数和消息
   */
  updateOverdueStatus(): { updated: number; message: string } {
    try {
      // 开始事务
      this.db.prepare('BEGIN').run()

      // 更新所有逾期但状态不是已归还的借阅记录
      // 将状态更新为逾期（状态3）
      const result = this.db
        .prepare(
          `
        UPDATE borrow_record
        SET status = 3
        WHERE due_date < date('now')
        AND status != 2  -- 非已归还
        AND status != 3  -- 非已逾期
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

  /**
   * 更新预约过期状态（系统定时任务调用）
   * 将已超过预约期限但未处理的预约记录标记为过期
   * @returns 操作结果，包含更新记录数和消息
   */
  updateExpiredReservations(): { updated: number; message: string } {
    try {
      // 开始事务
      this.db.prepare('BEGIN').run()

      // 查询需要处理的预约记录（已过期但状态仍为待处理）
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
        // 更新预约状态为已过期（状态3）
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

          // 如果图书状态为已预约（状态3），则更新为在库（状态1）
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
