// 统计结果类型定义

// 图书状态统计
export interface IBookStatusCount {
  status: number
  count: number
}

// 分类分布统计
export interface ICategoryDistribution {
  category_name: string
  count: number
}

// 出版社分布统计
export interface IPublisherDistribution {
  publisher_name: string
  count: number
}

// 图书统计结果
export interface IBookStatistics {
  totalBooks: number
  statusCount: IBookStatusCount[]
  categoryDistribution: ICategoryDistribution[]
  publisherDistribution: IPublisherDistribution[]
}

// 借阅状态统计
export interface IBorrowStatusCount {
  status: number
  count: number
}

// 月度借阅统计
export interface IMonthlyBorrowStats {
  month: string
  count: number
}

// 每日借阅统计
export interface IDailyBorrowStats {
  date: string
  count: number
}

// 热门图书
export interface IPopularBook {
  book_id: number
  title: string
  borrow_count: number
}

// 借阅统计结果
export interface IBorrowStatistics {
  totalBorrows: number
  statusCount: IBorrowStatusCount[]
  monthlyStats: IMonthlyBorrowStats[]
  overdueCount: number
  averageBorrowDuration: number
  todayBorrowCount: number
  dailyBorrowStats: IDailyBorrowStats[]
  popularBooks: IPopularBook[]
}

// 读者类型分布
export interface IReaderTypeDistribution {
  type_name: string
  count: number
}

// 最活跃读者
export interface IMostActiveReader {
  reader_id: number
  name: string
  borrow_count: number
}

// 读者增长
export interface IReaderGrowth {
  month: string
  count: number
}

// 读者统计结果
export interface IReaderStatistics {
  totalReaders: number
  statusCount: { status: number; count: number }[]
  typeDistribution: IReaderTypeDistribution[]
  mostActiveReaders: IMostActiveReader[]
  readerGrowth: IReaderGrowth[]
}

// 借阅记录报表数据
export interface IBorrowReportData {
  borrow_id: number
  borrow_date: string
  due_date: string
  return_date?: string
  status: number
  isbn?: string
  book_title?: string
  author?: string
  reader_name?: string
  id_card?: string
  phone?: string
  operator_name?: string
}

// 库存报表数据
export interface IInventoryReportData {
  book_id: number
  isbn?: string
  title?: string
  author?: string
  publish_date?: string
  price?: number
  publisher_name?: string
  category_name?: string
  location?: string
  status: number
  status_name?: string
}

// 读者报表数据
export interface IReaderReportData {
  reader_id: number
  name?: string
  gender?: string
  id_card?: string
  phone?: string
  email?: string
  register_date?: string
  borrow_quota?: number
  type_name?: string
  status_name?: string
  borrow_count: number
  current_borrow_count: number
}

// 逾期报表数据
export interface IOverdueReportData {
  borrow_id: number
  borrow_date: string
  due_date: string
  overdue_days: number
  isbn?: string
  book_title?: string
  author?: string
  reader_name?: string
  id_card?: string
  phone?: string
  email?: string
}

// 报表生成结果
export interface IReportResult {
  success: boolean
  message: string
  filePath?: string
}
