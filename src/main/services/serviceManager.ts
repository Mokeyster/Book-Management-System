import { initDatabase } from '../db/initDatabase'
import { BookService } from './bookService'
import { ReaderService } from './readerService'
import { BorrowService } from './borrowService'
import { PublisherService } from './publisherService'
import { SystemService } from './systemService'
import { StatisticsService } from './statisticsService'

// 服务管理器，用于创建和管理所有服务实例
export class ServiceManager {
  private static instance: ServiceManager

  // 服务实例
  private _bookService: BookService
  private _readerService: ReaderService
  private _borrowService: BorrowService
  private _publisherService: PublisherService
  private _systemService: SystemService
  private _statisticsService: StatisticsService

  private constructor() {
    // 初始化数据库
    const db = initDatabase()

    // 创建服务实例
    this._bookService = new BookService(db)
    this._readerService = new ReaderService(db)
    this._borrowService = new BorrowService(db)
    this._publisherService = new PublisherService(db)
    this._systemService = new SystemService(db)
    this._statisticsService = new StatisticsService(db)
  }

  // 单例模式获取实例
  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager()
    }
    return ServiceManager.instance
  }

  // 获取图书服务
  public get bookService(): BookService {
    return this._bookService
  }

  // 获取读者服务
  public get readerService(): ReaderService {
    return this._readerService
  }

  // 获取借阅服务
  public get borrowService(): BorrowService {
    return this._borrowService
  }

  // 获取出版社服务
  public get publisherService(): PublisherService {
    return this._publisherService
  }

  // 获取系统服务
  public get systemService(): SystemService {
    return this._systemService
  }

  // 获取统计服务
  public get statisticsService(): StatisticsService {
    return this._statisticsService
  }
}
