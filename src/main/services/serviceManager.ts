import { initDatabase } from '../db/initDatabase'
import { BookService } from './bookService'
import { ReaderService } from './readerService'
import { BorrowService } from './borrowService'
import { PublisherService } from './publisherService'
import { SystemService } from './systemService'
import { StatisticsService } from './statisticsService'

/**
 * 服务管理器类
 *
 * 该类采用单例模式设计，负责创建和管理系统中所有服务实例
 * 提供统一的服务访问入口，集中管理所有服务的创建和初始化过程
 * 避免重复创建服务实例导致的资源浪费和数据不一致问题
 */
export class ServiceManager {
  /**
   * 单例实例存储
   *
   * 用于保存ServiceManager的唯一实例
   * 确保整个应用程序中只有一个ServiceManager实例
   */
  private static instance: ServiceManager

  /**
   * 图书服务实例
   *
   * 负责处理与图书相关的业务逻辑，如图书的添加、删除、修改、查询等操作
   */
  private _bookService: BookService

  /**
   * 读者服务实例
   *
   * 负责处理与读者相关的业务逻辑，如读者的注册、信息修改、查询等操作
   */
  private _readerService: ReaderService

  /**
   * 借阅服务实例
   *
   * 负责处理图书借阅、归还、续借等借阅相关的业务逻辑
   * 管理借阅记录和借阅状态
   */
  private _borrowService: BorrowService

  /**
   * 出版社服务实例
   *
   * 负责处理出版社信息的管理，包括添加、修改、查询出版社等操作
   */
  private _publisherService: PublisherService

  /**
   * 系统服务实例
   *
   * 负责处理系统级别的功能，如系统配置、用户认证、权限管理等
   */
  private _systemService: SystemService

  /**
   * 统计服务实例
   *
   * 负责处理数据统计相关的业务逻辑，如借阅量统计、图书分类统计等
   */
  private _statisticsService: StatisticsService

  /**
   * 私有构造函数
   *
   * 单例模式的关键，禁止外部直接创建实例
   * 在构造函数内初始化数据库连接并创建所有服务实例
   */
  private constructor() {
    // 初始化数据库连接
    const db = initDatabase()

    // 创建各个服务实例，并将数据库连接注入到每个服务中
    // 这样所有服务共享同一个数据库连接，保证数据一致性
    this._bookService = new BookService(db)
    this._readerService = new ReaderService(db)
    this._borrowService = new BorrowService(db)
    this._publisherService = new PublisherService(db)
    this._systemService = new SystemService(db)
    this._statisticsService = new StatisticsService(db)
  }

  /**
   * 获取ServiceManager的单例实例
   *
   * 如果实例不存在，则创建一个新实例
   * 如果实例已存在，则返回现有实例
   * 确保整个应用程序中只有一个ServiceManager实例
   *
   * @returns ServiceManager的单例实例
   */
  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager()
    }
    return ServiceManager.instance
  }

  /**
   * 获取图书服务实例
   *
   * 提供对图书相关业务逻辑的访问接口
   *
   * @returns 图书服务实例
   */
  public get bookService(): BookService {
    return this._bookService
  }

  /**
   * 获取读者服务实例
   *
   * 提供对读者相关业务逻辑的访问接口
   *
   * @returns 读者服务实例
   */
  public get readerService(): ReaderService {
    return this._readerService
  }

  /**
   * 获取借阅服务实例
   *
   * 提供对借阅相关业务逻辑的访问接口
   *
   * @returns 借阅服务实例
   */
  public get borrowService(): BorrowService {
    return this._borrowService
  }

  /**
   * 获取出版社服务实例
   *
   * 提供对出版社相关业务逻辑的访问接口
   *
   * @returns 出版社服务实例
   */
  public get publisherService(): PublisherService {
    return this._publisherService
  }

  /**
   * 获取系统服务实例
   *
   * 提供对系统级功能的访问接口
   *
   * @returns 系统服务实例
   */
  public get systemService(): SystemService {
    return this._systemService
  }

  /**
   * 获取统计服务实例
   *
   * 提供对数据统计相关业务逻辑的访问接口
   *
   * @returns 统计服务实例
   */
  public get statisticsService(): StatisticsService {
    return this._statisticsService
  }
}
