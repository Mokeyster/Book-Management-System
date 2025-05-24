import { ElectronAPI } from '@electron-toolkit/preload'
import { IBook, ITag, IBookCategory } from '../types/bookTypes'
import { IBorrowRecord, IBorrowRequest, IReservation } from '../types/borrowTypes'
import { IPublisher } from '../types/publisherTypes'
import { IReader, IReaderType } from '../types/readerTypes'
import {
  ISystemUser,
  ISystemRole,
  ISystemConfig,
  IOperationLog,
  IDataBackup
} from '../types/systemTypes'
import { IBookStatistics, IBorrowStatistics, IReaderStatistics } from '../types/statisticsTypes'
import { IReportResult, IFileDialogResult, ILoginResult, IPasswordChangeResult } from './types'

interface BookAPI {
  getAll: () => Promise<IBook[]>
  getById: (bookId: number) => Promise<IBook>
  search: (query: string) => Promise<IBook[]>
  add: (book: IBook) => Promise<number>
  update: (book: IBook) => Promise<boolean>
  delete: (bookId: number) => Promise<{ success: boolean; message: string }>
  updateStatus: (bookId: number, status: number) => Promise<boolean>
  getTags: (bookId: number) => Promise<ITag[]>

  // 图书分类相关
  getAllCategories: () => Promise<IBookCategory[]>
  getCategoryById: (categoryId: number) => Promise<IBookCategory>
  addCategory: (category: IBookCategory) => Promise<number>
  updateCategory: (category: IBookCategory) => Promise<boolean>
  deleteCategory: (categoryId: number) => Promise<{ success: boolean; message: string }>
  getCategoryTree: () => Promise<IBookCategory[]>
}

interface ReaderAPI {
  getAll: () => Promise<IReader[]>
  getById: (readerId: number) => Promise<IReader>
  search: (query: string) => Promise<IReader[]>
  add: (reader: IReader) => Promise<number>
  update: (reader: IReader) => Promise<boolean>
  delete: (readerId: number) => Promise<{ success: boolean; message: string }>
  getTypes: () => Promise<IReaderType[]>
  getBorrowHistory: (readerId: number) => Promise<IBorrowRecord[]>
}

interface BorrowAPI {
  getAll: () => Promise<IBorrowRecord[]>
  getCurrent: () => Promise<IBorrowRecord[]>
  getOverdue: () => Promise<IBorrowRecord[]>
  getBookBorrowHistory: (bookId: number) => Promise<IBorrowRecord[]>
  borrowBook: (borrowRequest: IBorrowRequest) => Promise<{
    success: boolean
    message: string
    borrowId?: number
  }>
  returnBook: (borrowId: number) => Promise<IBorrowRecord>
  renewBook: (borrowId: number) => Promise<IBorrowRecord>
}

interface ReservationAPI {
  getAll: () => Promise<IReservation[]>
  reserve: (bookId: number, readerId: number) => Promise<IReservation>
  cancel: (reservationId: number) => Promise<IReservation>
}

interface PublisherAPI {
  getAll: () => Promise<IPublisher[]>
  getById: (publisherId: number) => Promise<IPublisher>
  add: (publisher: IPublisher) => Promise<number>
  update: (publisher: IPublisher) => Promise<boolean>
  delete: (publisherId: number) => Promise<{ success: boolean; message: string }>
}

interface SystemAPI {
  login: (username: string, password: string) => Promise<ILoginResult>
  logout: () => Promise<void>
  getAllUsers: () => Promise<ISystemUser[]>
  addUser: (user: ISystemUser) => Promise<number>
  updateUser: (user: ISystemUser) => Promise<boolean>
  deleteUser: (userId: number) => Promise<boolean>
  changePassword: (
    userId: number,
    oldPassword: string,
    newPassword: string
  ) => Promise<IPasswordChangeResult>
  resetPassword: (userId: number, newPassword: string) => Promise<boolean>
  getAllRoles: () => Promise<ISystemRole[]>
  getConfigs: () => Promise<ISystemConfig[]>
  updateConfig: (configKey: string, configValue: string) => Promise<boolean>
  backupDatabase: () => Promise<IReportResult>
  getAllBackups: () => Promise<IDataBackup[]>
  deleteBackup: (backupId: number) => Promise<{ success: boolean; message: string }>
  restoreBackup: (backupId: number) => Promise<{ success: boolean; message: string }>
  getOperationLogs: (limit?: number, offset?: number) => Promise<IOperationLog[]>
}

interface StatsAPI {
  getBookStatistics: () => Promise<IBookStatistics>
  getBorrowStatistics: (startDate?: string, endDate?: string) => Promise<IBorrowStatistics>
  getReaderStatistics: () => Promise<IReaderStatistics>
  generateBorrowReport: (
    startDate: string,
    endDate: string,
    operatorId: number
  ) => Promise<IReportResult>
  generateInventoryReport: (operatorId: number) => Promise<IReportResult>
  generateReaderReport: (operatorId: number) => Promise<IReportResult>
  generateOverdueReport: (operatorId: number) => Promise<IReportResult>
}

interface DialogAPI {
  openFile: () => Promise<IFileDialogResult>
}

export interface LibraryAPI {
  book: BookAPI
  reader: ReaderAPI
  borrow: BorrowAPI
  reservation: ReservationAPI
  publisher: PublisherAPI
  system: SystemAPI
  stats: StatsAPI
  dialog: DialogAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: LibraryAPI
  }
}
