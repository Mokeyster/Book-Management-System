import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import {
  IBookStatistics,
  IBorrowStatistics,
  IReaderStatistics,
  IReportResult,
  IBorrowReportData,
  IInventoryReportData,
  IReaderReportData,
  IOverdueReportData
} from '../../types/statisticsTypes'

export class StatisticsService {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  // 图书统计分析
  getBookStatistics(): IBookStatistics {
    const totalBooks = this.db.prepare('SELECT COUNT(*) as count FROM book').get() as {
      count: number
    }

    const statusCount = this.db
      .prepare(
        `
      SELECT status, COUNT(*) as count FROM book GROUP BY status
    `
      )
      .all() as { status: number; count: number }[]

    const categoryDistribution = this.db
      .prepare(
        `
      SELECT c.category_name, COUNT(b.book_id) as count
      FROM book b
      JOIN book_category c ON b.category_id = c.category_id
      GROUP BY b.category_id
      ORDER BY count DESC
    `
      )
      .all() as { category_name: string; count: number }[]

    const publisherDistribution = this.db
      .prepare(
        `
      SELECT p.name as publisher_name, COUNT(b.book_id) as count
      FROM book b
      JOIN publisher p ON b.publisher_id = p.publisher_id
      GROUP BY b.publisher_id
      ORDER BY count DESC
      LIMIT 10
    `
      )
      .all() as { publisher_name: string; count: number }[]

    return {
      totalBooks: totalBooks.count,
      statusCount,
      categoryDistribution,
      publisherDistribution
    }
  }

  // 借阅统计分析
  getBorrowStatistics(startDate?: string, endDate?: string): IBorrowStatistics {
    let dateFilter = ''
    if (startDate && endDate) {
      dateFilter = `WHERE borrow_date BETWEEN '${startDate}' AND '${endDate}'`
    } else if (startDate) {
      dateFilter = `WHERE borrow_date >= '${startDate}'`
    } else if (endDate) {
      dateFilter = `WHERE borrow_date <= '${endDate}'`
    }

    const totalBorrows = this.db
      .prepare(
        `
      SELECT COUNT(*) as count FROM borrow_record ${dateFilter}
    `
      )
      .get() as { count: number }

    const statusCount = this.db
      .prepare(
        `
      SELECT status, COUNT(*) as count FROM borrow_record ${dateFilter} GROUP BY status
    `
      )
      .all() as { status: number; count: number }[]

    const monthlyStats = this.db
      .prepare(
        `
      SELECT
        strftime('%Y-%m', borrow_date) as month,
        COUNT(*) as count
      FROM borrow_record
      ${dateFilter}
      GROUP BY month
      ORDER BY month
    `
      )
      .all() as { month: string; count: number }[]

    // 获取今日借阅数量
    const todayDate = new Date().toISOString().split('T')[0]
    const todayBorrowCount = this.db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM borrow_record
      WHERE date(borrow_date) = ?
    `
      )
      .get(todayDate) as { count: number }

    // 获取最近7天的每日借阅数据
    const dailyBorrowStats = this.db
      .prepare(
        `
      SELECT
        date(borrow_date) as date,
        COUNT(*) as count
      FROM borrow_record
      WHERE date(borrow_date) >= date('now', '-6 days')
      GROUP BY date(borrow_date)
      ORDER BY date(borrow_date)
    `
      )
      .all() as { date: string; count: number }[]

    // 获取热门图书
    const popularBooks = this.db
      .prepare(
        `
      SELECT
        b.book_id,
        b.title,
        COUNT(br.borrow_id) as borrow_count
      FROM book b
      JOIN borrow_record br ON b.book_id = br.book_id
      GROUP BY b.book_id
      ORDER BY borrow_count DESC
      LIMIT 10
    `
      )
      .all() as { book_id: number; title: string; borrow_count: number }[]

    const overdueCount = this.db
      .prepare(
        `
      SELECT COUNT(*) as count FROM borrow_record WHERE status = 3 ${dateFilter ? 'AND ' + dateFilter.substring(6) : ''}
    `
      )
      .get() as { count: number }

    const averageBorrowDuration = this.db
      .prepare(
        `
      SELECT AVG(julianday(return_date) - julianday(borrow_date)) as avg_days
      FROM borrow_record
      WHERE return_date IS NOT NULL ${dateFilter ? 'AND ' + dateFilter.substring(6) : ''}
    `
      )
      .get() as { avg_days: number }

    return {
      totalBorrows: totalBorrows.count,
      statusCount,
      monthlyStats,
      overdueCount: overdueCount.count,
      averageBorrowDuration: averageBorrowDuration.avg_days
        ? Math.round(averageBorrowDuration.avg_days * 10) / 10
        : 0,
      todayBorrowCount: todayBorrowCount.count,
      dailyBorrowStats,
      popularBooks
    }
  }

  // 读者统计分析
  getReaderStatistics(): IReaderStatistics {
    const totalReaders = this.db.prepare('SELECT COUNT(*) as count FROM reader').get() as {
      count: number
    }

    const statusCount = this.db
      .prepare(
        `
      SELECT status, COUNT(*) as count FROM reader GROUP BY status
    `
      )
      .all() as { status: number; count: number }[]

    const typeDistribution = this.db
      .prepare(
        `
      SELECT rt.type_name, COUNT(r.reader_id) as count
      FROM reader r
      JOIN reader_type rt ON r.type_id = rt.type_id
      GROUP BY r.type_id
    `
      )
      .all() as { type_name: string; count: number }[]

    const mostActiveReaders = this.db
      .prepare(
        `
      SELECT r.reader_id, r.name, COUNT(br.borrow_id) as borrow_count
      FROM reader r
      JOIN borrow_record br ON r.reader_id = br.reader_id
      GROUP BY r.reader_id
      ORDER BY borrow_count DESC
      LIMIT 10
    `
      )
      .all() as { reader_id: number; name: string; borrow_count: number }[]

    const readerGrowth = this.db
      .prepare(
        `
      SELECT
        strftime('%Y-%m', register_date) as month,
        COUNT(*) as count
      FROM reader
      GROUP BY month
      ORDER BY month
    `
      )
      .all() as { month: string; count: number }[]

    return {
      totalReaders: totalReaders.count,
      statusCount,
      typeDistribution,
      mostActiveReaders,
      readerGrowth
    }
  }

  // 生成借阅记录报表
  generateBorrowReport(startDate: string, endDate: string, operatorId: number): IReportResult {
    try {
      const reportData = this.db
        .prepare(
          `
        SELECT
          br.borrow_id, br.borrow_date, br.due_date, br.return_date, br.status,
          b.isbn, b.title as book_title, b.author,
          r.name as reader_name, r.id_card, r.phone,
          u.username as operator_name
        FROM borrow_record br
        JOIN book b ON br.book_id = b.book_id
        JOIN reader r ON br.reader_id = r.reader_id
        LEFT JOIN system_user u ON br.operator_id = u.user_id
        WHERE br.borrow_date BETWEEN ? AND ?
        ORDER BY br.borrow_date DESC
      `
        )
        .all(startDate, endDate) as IBorrowReportData[]

      // 创建CSV数据
      let csvContent =
        '借阅ID,图书ISBN,图书名称,作者,读者姓名,借阅日期,应还日期,实际归还日期,状态,操作员\n'

      reportData.forEach((record: IBorrowReportData) => {
        const status = ['未知', '借出', '已归还', '逾期', '续借'][record.status] || '未知'
        csvContent += `${record.borrow_id},${record.isbn || ''},${record.book_title || ''},${record.author || ''},${record.reader_name || ''},${record.borrow_date || ''},${record.due_date || ''},${record.return_date || ''},${status},${record.operator_name || ''}\n`
      })

      // 确保报表目录存在
      const reportsDir = path.join(app.getPath('userData'), 'reports')
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true })
      }

      // 生成文件名和路径
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `borrow_report_${startDate}_to_${endDate}_${timestamp}.csv`
      const filePath = path.join(reportsDir, fileName)

      // 写入文件
      fs.writeFileSync(filePath, csvContent, 'utf8')

      // 记录报表信息
      this.db
        .prepare(
          `
        INSERT INTO stat_report (
          report_name, report_type, stats_period, operator_id, report_path
        ) VALUES (?, ?, ?, ?, ?)
      `
        )
        .run(
          `借阅记录报表 (${startDate} 至 ${endDate})`,
          'borrow',
          `${startDate} 至 ${endDate}`,
          operatorId,
          filePath
        )

      return { success: true, message: '报表生成成功', filePath }
    } catch (error) {
      return {
        success: false,
        message: `报表生成失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  // 生成库存报表
  generateInventoryReport(operatorId: number): IReportResult {
    try {
      const reportData = this.db
        .prepare(
          `
        SELECT
          b.book_id, b.isbn, b.title, b.author, b.publish_date, b.price,
          p.name as publisher_name,
          c.category_name,
          b.location, b.status,
          CASE
            WHEN b.status = 1 THEN '在库'
            WHEN b.status = 2 THEN '借出'
            WHEN b.status = 3 THEN '预约'
            WHEN b.status = 4 THEN '损坏'
            WHEN b.status = 5 THEN '丢失'
            ELSE '未知'
          END as status_name
        FROM book b
        LEFT JOIN publisher p ON b.publisher_id = p.publisher_id
        LEFT JOIN book_category c ON b.category_id = c.category_id
        ORDER BY b.book_id
      `
        )
        .all() as IInventoryReportData[]

      // 创建CSV数据
      let csvContent = '图书ID,ISBN,书名,作者,出版社,分类,出版日期,价格,馆内位置,状态\n'

      reportData.forEach((book: IInventoryReportData) => {
        csvContent += `${book.book_id},${book.isbn || ''},${book.title || ''},${book.author || ''},${book.publisher_name || ''},${book.category_name || ''},${book.publish_date || ''},${book.price || ''},${book.location || ''},${book.status_name || ''}\n`
      })

      // 确保报表目录存在
      const reportsDir = path.join(app.getPath('userData'), 'reports')
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true })
      }

      // 生成文件名和路径
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `inventory_report_${timestamp}.csv`
      const filePath = path.join(reportsDir, fileName)

      // 写入文件
      fs.writeFileSync(filePath, csvContent, 'utf8')

      // 记录报表信息
      this.db
        .prepare(
          `
        INSERT INTO stat_report (
          report_name, report_type, stats_period, operator_id, report_path
        ) VALUES (?, ?, ?, ?, ?)
      `
        )
        .run(
          `库存报表`,
          'inventory',
          `截至 ${new Date().toISOString().split('T')[0]}`,
          operatorId,
          filePath
        )

      return { success: true, message: '报表生成成功', filePath }
    } catch (error) {
      return {
        success: false,
        message: `报表生成失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  // 生成读者统计报表
  generateReaderReport(operatorId: number): IReportResult {
    try {
      const reportData = this.db
        .prepare(
          `
        SELECT
          r.reader_id, r.name, r.gender, r.id_card, r.phone, r.email,
          r.register_date, r.borrow_quota,
          rt.type_name,
          CASE
            WHEN r.status = 1 THEN '正常'
            WHEN r.status = 2 THEN '暂停'
            WHEN r.status = 3 THEN '注销'
            ELSE '未知'
          END as status_name,
          (SELECT COUNT(*) FROM borrow_record WHERE reader_id = r.reader_id) as borrow_count,
          (SELECT COUNT(*) FROM borrow_record WHERE reader_id = r.reader_id AND status = 1) as current_borrow_count
        FROM reader r
        LEFT JOIN reader_type rt ON r.type_id = rt.type_id
        ORDER BY r.reader_id
      `
        )
        .all() as IReaderReportData[]

      // 创建CSV数据
      let csvContent =
        '读者ID,姓名,性别,证件号,电话,邮箱,注册日期,读者类型,状态,借阅限额,历史借阅次数,当前借阅数\n'

      reportData.forEach((reader: IReaderReportData) => {
        csvContent += `${reader.reader_id},${reader.name || ''},${reader.gender || ''},${reader.id_card || ''},${reader.phone || ''},${reader.email || ''},${reader.register_date || ''},${reader.type_name || ''},${reader.status_name || ''},${reader.borrow_quota || ''},${reader.borrow_count || 0},${reader.current_borrow_count || 0}\n`
      })

      // 确保报表目录存在
      const reportsDir = path.join(app.getPath('userData'), 'reports')
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true })
      }

      // 生成文件名和路径
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `reader_report_${timestamp}.csv`
      const filePath = path.join(reportsDir, fileName)

      // 写入文件
      fs.writeFileSync(filePath, csvContent, 'utf8')

      // 记录报表信息
      this.db
        .prepare(
          `
        INSERT INTO stat_report (
          report_name, report_type, stats_period, operator_id, report_path
        ) VALUES (?, ?, ?, ?, ?)
      `
        )
        .run(
          `读者统计报表`,
          'reader',
          `截至 ${new Date().toISOString().split('T')[0]}`,
          operatorId,
          filePath
        )

      return { success: true, message: '报表生成成功', filePath }
    } catch (error) {
      return {
        success: false,
        message: `报表生成失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  // 生成逾期未还报表
  generateOverdueReport(operatorId: number): IReportResult {
    try {
      const reportData = this.db
        .prepare(
          `
        SELECT
          br.borrow_id, br.borrow_date, br.due_date,
          julianday('now') - julianday(br.due_date) as overdue_days,
          b.isbn, b.title as book_title, b.author,
          r.name as reader_name, r.id_card, r.phone, r.email
        FROM borrow_record br
        JOIN book b ON br.book_id = b.book_id
        JOIN reader r ON br.reader_id = r.reader_id
        WHERE br.status = 3
        ORDER BY overdue_days DESC
      `
        )
        .all() as IOverdueReportData[]

      // 创建CSV数据
      let csvContent =
        '借阅ID,图书ISBN,图书名称,作者,读者姓名,读者证件号,联系电话,邮箱,借阅日期,应还日期,逾期天数\n'

      reportData.forEach((record: IOverdueReportData) => {
        csvContent += `${record.borrow_id},${record.isbn || ''},${record.book_title || ''},${record.author || ''},${record.reader_name || ''},${record.id_card || ''},${record.phone || ''},${record.email || ''},${record.borrow_date || ''},${record.due_date || ''},${Math.floor(record.overdue_days) || 0}\n`
      })

      // 确保报表目录存在
      const reportsDir = path.join(app.getPath('userData'), 'reports')
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true })
      }

      // 生成文件名和路径
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `overdue_report_${timestamp}.csv`
      const filePath = path.join(reportsDir, fileName)

      // 写入文件
      fs.writeFileSync(filePath, csvContent, 'utf8')

      // 记录报表信息
      this.db
        .prepare(
          `
        INSERT INTO stat_report (
          report_name, report_type, stats_period, operator_id, report_path
        ) VALUES (?, ?, ?, ?, ?)
      `
        )
        .run(
          `逾期未还报表`,
          'overdue',
          `截至 ${new Date().toISOString().split('T')[0]}`,
          operatorId,
          filePath
        )

      return { success: true, message: '报表生成成功', filePath }
    } catch (error) {
      return {
        success: false,
        message: `报表生成失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }
}
