import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
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

// 自定义API，暴露给渲染进程使用
const api = {
  // 图书相关API
  book: {
    getAll: (): Promise<IBook[]> => ipcRenderer.invoke('book:getAll'),
    getById: (bookId: number): Promise<IBook> => ipcRenderer.invoke('book:getById', bookId),
    search: (query: string): Promise<IBook[]> => ipcRenderer.invoke('book:search', query),
    add: (book: IBook): Promise<number> => ipcRenderer.invoke('book:add', book),
    update: (book: IBook): Promise<boolean> => ipcRenderer.invoke('book:update', book),
    delete: (bookId: number): Promise<boolean> => ipcRenderer.invoke('book:delete', bookId),
    updateStatus: (bookId: number, status: number): Promise<boolean> =>
      ipcRenderer.invoke('book:updateStatus', bookId, status),
    getTags: (bookId: number): Promise<ITag[]> => ipcRenderer.invoke('book:getTags', bookId),

    // 图书分类相关
    getAllCategories: (): Promise<IBookCategory[]> => ipcRenderer.invoke('book:getAllCategories'),
    getCategoryById: (categoryId: number): Promise<IBookCategory> =>
      ipcRenderer.invoke('book:getCategoryById', categoryId),
    addCategory: (category: IBookCategory): Promise<number> =>
      ipcRenderer.invoke('book:addCategory', category),
    updateCategory: (category: IBookCategory): Promise<boolean> =>
      ipcRenderer.invoke('book:updateCategory', category),
    deleteCategory: (categoryId: number): Promise<{ success: boolean; message: string }> =>
      ipcRenderer.invoke('book:deleteCategory', categoryId),
    getCategoryTree: (): Promise<IBookCategory[]> => ipcRenderer.invoke('book:getCategoryTree')
  },

  // 读者相关API
  reader: {
    getAll: (): Promise<IReader[]> => ipcRenderer.invoke('reader:getAll'),
    getById: (readerId: number): Promise<IReader> => ipcRenderer.invoke('reader:getById', readerId),
    search: (query: string): Promise<IReader[]> => ipcRenderer.invoke('reader:search', query),
    add: (reader: IReader): Promise<number> => ipcRenderer.invoke('reader:add', reader),
    update: (reader: IReader): Promise<boolean> => ipcRenderer.invoke('reader:update', reader),
    delete: (readerId: number): Promise<boolean> => ipcRenderer.invoke('reader:delete', readerId),
    getTypes: (): Promise<IReaderType[]> => ipcRenderer.invoke('reader:getTypes'),
    getBorrowHistory: (readerId: number): Promise<IBorrowRecord[]> =>
      ipcRenderer.invoke('reader:getBorrowHistory', readerId)
  },

  // 借阅相关API
  borrow: {
    getAll: (): Promise<IBorrowRecord[]> => ipcRenderer.invoke('borrow:getAll'),
    getCurrent: (): Promise<IBorrowRecord[]> => ipcRenderer.invoke('borrow:getCurrent'),
    getOverdue: (): Promise<IBorrowRecord[]> => ipcRenderer.invoke('borrow:getOverdue'),
    getBookBorrowHistory: (bookId: number): Promise<IBorrowRecord[]> =>
      ipcRenderer.invoke('borrow:getBookBorrowHistory', bookId),
    borrowBook: (borrowRequest: IBorrowRequest): Promise<IBorrowRecord> =>
      ipcRenderer.invoke('borrow:borrowBook', borrowRequest),
    returnBook: (borrowId: number): Promise<IBorrowRecord> =>
      ipcRenderer.invoke('borrow:returnBook', borrowId),
    renewBook: (borrowId: number): Promise<IBorrowRecord> =>
      ipcRenderer.invoke('borrow:renewBook', borrowId)
  },

  // 预约相关API
  reservation: {
    getAll: (): Promise<IReservation[]> => ipcRenderer.invoke('reservation:getAll'),
    reserve: (bookId: number, readerId: number): Promise<IReservation> =>
      ipcRenderer.invoke('reservation:reserve', bookId, readerId),
    cancel: (reservationId: number): Promise<IReservation> =>
      ipcRenderer.invoke('reservation:cancel', reservationId)
  },

  // 出版社相关API
  publisher: {
    getAll: (): Promise<IPublisher[]> => ipcRenderer.invoke('publisher:getAll'),
    getById: (publisherId: number): Promise<IPublisher> =>
      ipcRenderer.invoke('publisher:getById', publisherId),
    add: (publisher: IPublisher): Promise<number> => ipcRenderer.invoke('publisher:add', publisher),
    update: (publisher: IPublisher): Promise<boolean> =>
      ipcRenderer.invoke('publisher:update', publisher),
    delete: (publisherId: number): Promise<boolean> =>
      ipcRenderer.invoke('publisher:delete', publisherId)
  },

  // 系统相关API
  system: {
    login: (username: string, password: string): Promise<ILoginResult> => {
      return ipcRenderer.invoke('user:login', username, password)
    },
    getAllUsers: (): Promise<ISystemUser[]> => ipcRenderer.invoke('system:getAllUsers'),
    addUser: (user: ISystemUser): Promise<number> => ipcRenderer.invoke('system:addUser', user),
    updateUser: (user: ISystemUser): Promise<boolean> =>
      ipcRenderer.invoke('system:updateUser', user),
    deleteUser: (userId: number): Promise<boolean> =>
      ipcRenderer.invoke('system:deleteUser', userId),
    changePassword: (
      userId: number,
      oldPassword: string,
      newPassword: string
    ): Promise<IPasswordChangeResult> =>
      ipcRenderer.invoke('system:changePassword', userId, oldPassword, newPassword),
    resetPassword: (userId: number, newPassword: string): Promise<boolean> =>
      ipcRenderer.invoke('system:resetPassword', userId, newPassword),
    getAllRoles: (): Promise<ISystemRole[]> => ipcRenderer.invoke('system:getAllRoles'),
    getConfigs: (): Promise<ISystemConfig[]> => ipcRenderer.invoke('system:getConfigs'),
    updateConfig: (configKey: string, configValue: string): Promise<boolean> =>
      ipcRenderer.invoke('system:updateConfig', configKey, configValue),
    backupDatabase: (): Promise<IReportResult> => ipcRenderer.invoke('system:backupDatabase'),
    getAllBackups: (): Promise<IDataBackup[]> => ipcRenderer.invoke('system:getAllBackups'),
    deleteBackup: (backupId: number): Promise<{ success: boolean; message: string }> =>
      ipcRenderer.invoke('system:deleteBackup', backupId),
    restoreBackup: (backupId: number): Promise<{ success: boolean; message: string }> =>
      ipcRenderer.invoke('system:restoreBackup', backupId),
    getOperationLogs: (limit?: number, offset?: number): Promise<IOperationLog[]> =>
      ipcRenderer.invoke('system:getOperationLogs', limit, offset)
  },

  // 统计报表相关API
  stats: {
    getBookStatistics: (): Promise<IBookStatistics> =>
      ipcRenderer.invoke('stats:getBookStatistics'),
    getBorrowStatistics: (startDate?: string, endDate?: string): Promise<IBorrowStatistics> =>
      ipcRenderer.invoke('stats:getBorrowStatistics', startDate, endDate),
    getReaderStatistics: (): Promise<IReaderStatistics> =>
      ipcRenderer.invoke('stats:getReaderStatistics'),
    generateBorrowReport: (
      startDate: string,
      endDate: string,
      operatorId: number
    ): Promise<IReportResult> =>
      ipcRenderer.invoke('stats:generateBorrowReport', startDate, endDate, operatorId),
    generateInventoryReport: (operatorId: number): Promise<IReportResult> =>
      ipcRenderer.invoke('stats:generateInventoryReport', operatorId),
    generateReaderReport: (operatorId: number): Promise<IReportResult> =>
      ipcRenderer.invoke('stats:generateReaderReport', operatorId),
    generateOverdueReport: (operatorId: number): Promise<IReportResult> =>
      ipcRenderer.invoke('stats:generateOverdueReport', operatorId)
  },

  // 对话框相关API
  dialog: {
    openFile: (): Promise<IFileDialogResult> => ipcRenderer.invoke('dialog:openFile')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
