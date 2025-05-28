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

/**
 * 统计服务类：提供图书管理系统中各种统计分析与报表功能
 */
export class StatisticsService {
  private db: Database.Database

  /**
   * 创建统计服务实例
   * @param db - better-sqlite3数据库实例
   */
  constructor(db: Database.Database) {
    this.db = db
  }

  /**
   * 获取图书统计数据
   * 包括总册数、图书状态分布、分类分布和出版社分布
   * @returns {IBookStatistics} 图书统计结果
   */
  getBookStatistics(): IBookStatistics {
    // 查询图书总数
    const totalBooks = this.db.prepare('SELECT COUNT(*) as count FROM book').get() as {
      count: number
    }

    // 查询图书不同状态的数量分布
    // 状态码: 1-在库, 2-借出, 3-预约, 4-损坏, 5-丢失
    const statusCount = this.db
      .prepare(
        `
      SELECT status, COUNT(*) as count FROM book GROUP BY status
    `
      )
      .all() as { status: number; count: number }[]

    // 查询图书分类分布情况
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

    // 查询前10个出版社的图书分布情况
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

    // 返回汇总的图书统计信息
    return {
      totalBooks: totalBooks.count,
      statusCount,
      categoryDistribution,
      publisherDistribution
    }
  }

  /**
   * 获取借阅统计数据
   * 包括总借阅量、借阅状态分布、月度借阅趋势等
   * @param {string} [startDate] 可选的开始日期过滤条件
   * @param {string} [endDate] 可选的结束日期过滤条件
   * @returns {IBorrowStatistics} 借阅统计结果
   */
  getBorrowStatistics(startDate?: string, endDate?: string): IBorrowStatistics {
    // 构建日期过滤条件SQL片段
    let dateFilter = ''
    if (startDate && endDate) {
      dateFilter = `WHERE borrow_date BETWEEN '${startDate}' AND '${endDate}'`
    } else if (startDate) {
      dateFilter = `WHERE borrow_date >= '${startDate}'`
    } else if (endDate) {
      dateFilter = `WHERE borrow_date <= '${endDate}'`
    }

    // 查询借阅总次数
    const totalBorrows = this.db
      .prepare(
        `
      SELECT COUNT(*) as count FROM borrow_record ${dateFilter}
    `
      )
      .get() as { count: number }

    // 查询不同借阅状态的数量分布
    // 状态码: 1-借阅中, 2-已归还, 3-逾期未还
    const statusCount = this.db
      .prepare(
        `
      SELECT status, COUNT(*) as count FROM borrow_record ${dateFilter} GROUP BY status
    `
      )
      .all() as { status: number; count: number }[]

    // 查询月度借阅统计数据
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

    // 获取借阅次数最多的10本热门图书
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

    // 获取逾期未还的借阅记录总数
    const overdueCount = this.db
      .prepare(
        `
      SELECT COUNT(*) as count FROM borrow_record WHERE status = 3 ${dateFilter ? 'AND ' + dateFilter.substring(6) : ''}
    `
      )
      .get() as { count: number }

    // 计算平均借阅天数（从借出到归还）
    const averageBorrowDuration = this.db
      .prepare(
        `
      SELECT AVG(julianday(return_date) - julianday(borrow_date)) as avg_days
      FROM borrow_record
      WHERE return_date IS NOT NULL ${dateFilter ? 'AND ' + dateFilter.substring(6) : ''}
    `
      )
      .get() as { avg_days: number }

    // 返回汇总的借阅统计信息
    return {
      totalBorrows: totalBorrows.count,
      statusCount,
      monthlyStats,
      overdueCount: overdueCount.count,
      // 保留一位小数
      averageBorrowDuration: averageBorrowDuration.avg_days
        ? Math.round(averageBorrowDuration.avg_days * 10) / 10
        : 0,
      todayBorrowCount: todayBorrowCount.count,
      dailyBorrowStats,
      popularBooks
    }
  }

  /**
   * 获取读者统计数据
   * 包括读者总数、状态分布、类型分布、活跃读者和增长趋势
   * @returns {IReaderStatistics} 读者统计结果
   */
  getReaderStatistics(): IReaderStatistics {
    // 查询读者总人数
    const totalReaders = this.db.prepare('SELECT COUNT(*) as count FROM reader').get() as {
      count: number
    }

    // 查询不同读者状态的数量分布
    // 状态码: 1-正常, 2-暂停, 3-注销
    const statusCount = this.db
      .prepare(
        `
      SELECT status, COUNT(*) as count FROM reader GROUP BY status
    `
      )
      .all() as { status: number; count: number }[]

    // 查询不同读者类型的分布
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

    // 查询借阅次数最多的10名活跃读者
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

    // 查询读者每月注册增长趋势
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

    // 返回汇总的读者统计信息
    return {
      totalReaders: totalReaders.count,
      statusCount,
      typeDistribution,
      mostActiveReaders,
      readerGrowth
    }
  }

  /**
   * 辅助函数：生成Excel友好的CSV文件
   * 处理特殊字符并添加UTF-8 BOM标记
   * @param {any[]} data 需要写入CSV的数据对象数组
   * @param {string} headers CSV的表头行
   * @param {string} filePath 文件保存路径
   * @param {string[]} textFields 需要强制作为文本处理的字段名（避免Excel自动转换，如ISBN等）
   */
  private generateExcelFriendlyCsv(
    data: any[],
    headers: string,
    filePath: string,
    textFields: string[] = [] // 需要强制作为文本处理的字段名
  ): void {
    let csvContent = headers + '\n'

    data.forEach((row) => {
      const rowValues: string[] = []

      // 处理每个字段
      Object.entries(row).forEach(([key, value]) => {
        // 检查是否需要强制作为文本处理
        const forceText = textFields.includes(key)

        if (value === null || value === undefined) {
          rowValues.push('""')
        } else if (forceText) {
          // 强制作为文本处理，添加=前缀，防止Excel自动转换格式
          const str = String(value).replace(/"/g, '""')
          rowValues.push(`="${str}"`)
        } else {
          // 普通处理，双引号转义
          const str = String(value).replace(/"/g, '""')
          rowValues.push(`"${str}"`)
        }
      })

      csvContent += rowValues.join(',') + '\n'
    })

    // 添加BOM标记以确保Excel正确识别UTF-8编码
    const BOM = '\ufeff'
    fs.writeFileSync(filePath, BOM + csvContent, 'utf8')
  }

  /**
   * 确保报表存储目录存在
   * @returns {string} 报表存储目录的路径
   */
  private ensureReportsDirectory(): string {
    // 在用户数据目录下创建reports子目录
    const reportsDir = path.join(app.getPath('userData'), 'reports')
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }
    return reportsDir
  }

  /**
   * 生成借阅记录报表
   * 导出指定日期范围内的所有借阅记录
   * @param {string} startDate 开始日期
   * @param {string} endDate 结束日期
   * @param {number} operatorId 操作员ID
   * @returns {IReportResult} 报表生成结果
   */
  generateBorrowReport(startDate: string, endDate: string, operatorId: number): IReportResult {
    try {
      // 查询指定日期范围内的所有借阅记录
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

      // 确保报表目录存在
      const reportsDir = this.ensureReportsDirectory()

      // 生成包含时间戳的唯一文件名和路径
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `borrow_report_${startDate}_to_${endDate}_${timestamp}.csv`
      const filePath = path.join(reportsDir, fileName)

      // 生成CSV文件，指定需要作为文本处理的字段
      this.generateExcelFriendlyCsv(
        reportData,
        '借阅ID,图书ISBN,图书名称,作者,读者姓名,借阅日期,应还日期,实际归还日期,状态,操作员',
        filePath,
        ['isbn', 'id_card', 'phone'] // 需要作为文本处理的字段
      )

      // 在数据库中记录报表生成信息
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

  /**
   * 生成库存报表
   * 导出当前所有图书的库存状态
   * @param {number} operatorId 操作员ID
   * @returns {IReportResult} 报表生成结果
   */
  generateInventoryReport(operatorId: number): IReportResult {
    try {
      // 查询所有图书的详细信息和当前状态
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

      // 确保报表目录存在
      const reportsDir = this.ensureReportsDirectory()

      // 生成包含时间戳的唯一文件名和路径
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `inventory_report_${timestamp}.csv`
      const filePath = path.join(reportsDir, fileName)

      // 生成CSV文件，指定需要作为文本处理的字段
      this.generateExcelFriendlyCsv(
        reportData,
        '图书ID,ISBN,书名,作者,出版社,分类,出版日期,价格,馆内位置,状态',
        filePath,
        ['isbn', 'book_id'] // 需要作为文本处理的字段
      )

      // 在数据库中记录报表生成信息
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

  /**
   * 生成读者统计报表
   * 导出所有读者信息和借阅统计
   * @param {number} operatorId 操作员ID
   * @returns {IReportResult} 报表生成结果
   */
  generateReaderReport(operatorId: number): IReportResult {
    try {
      // 查询所有读者信息及其借阅统计数据
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

      // 确保报表目录存在
      const reportsDir = this.ensureReportsDirectory()

      // 生成包含时间戳的唯一文件名和路径
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `reader_report_${timestamp}.csv`
      const filePath = path.join(reportsDir, fileName)

      // 生成CSV文件，指定需要作为文本处理的字段
      this.generateExcelFriendlyCsv(
        reportData,
        '读者ID,姓名,性别,证件号,电话,邮箱,注册日期,读者类型,状态,借阅限额,历史借阅次数,当前借阅数',
        filePath,
        ['id_card', 'phone', 'reader_id'] // 需要作为文本处理的字段
      )

      // 在数据库中记录报表生成信息
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

  /**
   * 生成逾期未还报表
   * 导出当前所有逾期未还的借阅记录
   * @param {number} operatorId 操作员ID
   * @returns {IReportResult} 报表生成结果
   */
  generateOverdueReport(operatorId: number): IReportResult {
    try {
      // 查询所有逾期未还的借阅记录及相关信息
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

      // 确保报表目录存在
      const reportsDir = this.ensureReportsDirectory()

      // 生成包含时间戳的唯一文件名和路径
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `overdue_report_${timestamp}.csv`
      const filePath = path.join(reportsDir, fileName)

      // 生成CSV文件，指定需要作为文本处理的字段
      this.generateExcelFriendlyCsv(
        reportData,
        '借阅ID,图书ISBN,图书名称,作者,读者姓名,读者证件号,联系电话,邮箱,借阅日期,应还日期,逾期天数',
        filePath,
        ['isbn', 'id_card', 'phone', 'borrow_id'] // 需要作为文本处理的字段
      )

      // 在数据库中记录报表生成信息
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
