import { ipcMain, dialog, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import { ServiceManager } from '../services/serviceManager'

/**
 * 设置所有IPC处理程序
 */
export function setupIpcHandlers(): void {
  // 创建服务管理器实例
  const serviceManager = ServiceManager.getInstance()

  // 用户相关处理
  ipcMain.handle('user:login', async (_event, username: string, password: string) => {
    return serviceManager.systemService.login(username, password)
  })

  // 图书相关处理
  ipcMain.handle('book:getAll', async () => {
    return serviceManager.bookService.getAllBooks()
  })

  ipcMain.handle('book:getById', async (_event, bookId: number) => {
    return serviceManager.bookService.getBookById(bookId)
  })

  ipcMain.handle('book:search', async (_event, query: string) => {
    return serviceManager.bookService.searchBooks(query)
  })

  ipcMain.handle('book:add', async (_event, book: any) => {
    return serviceManager.bookService.addBook(book)
  })

  ipcMain.handle('book:update', async (_event, book: any) => {
    return serviceManager.bookService.updateBook(book)
  })

  ipcMain.handle('book:delete', async (_event, bookId: number) => {
    return serviceManager.bookService.deleteBook(bookId)
  })

  ipcMain.handle('book:updateStatus', async (_event, bookId: number, status: number) => {
    return serviceManager.bookService.updateBookStatus(bookId, status)
  })

  ipcMain.handle('book:getTags', async (_event, bookId: number) => {
    return serviceManager.bookService.getBookTags(bookId)
  })

  // 图书分类相关处理
  ipcMain.handle('book:getAllCategories', async () => {
    return serviceManager.bookService.getAllCategories()
  })

  ipcMain.handle('book:getCategoryById', async (_event, categoryId: number) => {
    return serviceManager.bookService.getCategoryById(categoryId)
  })

  ipcMain.handle('book:addCategory', async (_event, category: any) => {
    return serviceManager.bookService.addCategory(category)
  })

  ipcMain.handle('book:updateCategory', async (_event, category: any) => {
    return serviceManager.bookService.updateCategory(category)
  })

  ipcMain.handle('book:deleteCategory', async (_event, categoryId: number) => {
    return serviceManager.bookService.deleteCategory(categoryId)
  })

  ipcMain.handle('book:getCategoryTree', async () => {
    return serviceManager.bookService.getCategoryTree()
  })

  // 读者相关处理
  ipcMain.handle('reader:getAll', async () => {
    return serviceManager.readerService.getAllReaders()
  })

  ipcMain.handle('reader:getById', async (_event, readerId: number) => {
    return serviceManager.readerService.getReaderById(readerId)
  })

  ipcMain.handle('reader:search', async (_event, query: string) => {
    return serviceManager.readerService.searchReaders(query)
  })

  ipcMain.handle('reader:add', async (_event, reader: any) => {
    return serviceManager.readerService.addReader(reader)
  })

  ipcMain.handle('reader:update', async (_event, reader: any) => {
    return serviceManager.readerService.updateReader(reader)
  })

  ipcMain.handle('reader:delete', async (_event, readerId: number) => {
    return serviceManager.readerService.deleteReader(readerId)
  })

  ipcMain.handle('reader:getTypes', async () => {
    return serviceManager.readerService.getAllReaderTypes()
  })

  ipcMain.handle('reader:getBorrowHistory', async (_event, readerId: number) => {
    return serviceManager.readerService.getReaderBorrowHistory(readerId)
  })

  // 借阅相关处理
  ipcMain.handle('borrow:getAll', async () => {
    return serviceManager.borrowService.getAllBorrowRecords()
  })

  ipcMain.handle('borrow:getCurrent', async () => {
    return serviceManager.borrowService.getCurrentBorrows()
  })

  ipcMain.handle('borrow:getOverdue', async () => {
    return serviceManager.borrowService.getOverdueBorrows()
  })

  ipcMain.handle('borrow:getBookBorrowHistory', async (_event, bookId: number) => {
    return serviceManager.borrowService.getBookBorrowHistory(bookId)
  })

  ipcMain.handle('borrow:borrowBook', async (_event, borrowRequest: any) => {
    return serviceManager.borrowService.borrowBook(borrowRequest)
  })

  ipcMain.handle('borrow:returnBook', async (_event, borrowId: number) => {
    return serviceManager.borrowService.returnBook(borrowId)
  })

  ipcMain.handle('borrow:renewBook', async (_event, borrowId: number) => {
    return serviceManager.borrowService.renewBook(borrowId)
  })

  ipcMain.handle('reservation:getAll', async () => {
    return serviceManager.borrowService.getAllReservations()
  })

  ipcMain.handle('reservation:reserve', async (_event, bookId: number, readerId: number) => {
    return serviceManager.borrowService.reserveBook(bookId, readerId)
  })

  ipcMain.handle('reservation:cancel', async (_event, reservationId: number) => {
    return serviceManager.borrowService.cancelReservation(reservationId)
  })

  // 出版社相关处理
  ipcMain.handle('publisher:getAll', async () => {
    return serviceManager.publisherService.getAllPublishers()
  })

  ipcMain.handle('publisher:getById', async (_event, publisherId: number) => {
    return serviceManager.publisherService.getPublisherById(publisherId)
  })

  ipcMain.handle('publisher:add', async (_event, publisher: any) => {
    return serviceManager.publisherService.addPublisher(publisher)
  })

  ipcMain.handle('publisher:update', async (_event, publisher: any) => {
    return serviceManager.publisherService.updatePublisher(publisher)
  })

  ipcMain.handle('publisher:delete', async (_event, publisherId: number) => {
    return serviceManager.publisherService.deletePublisher(publisherId)
  })

  // 系统相关处理
  ipcMain.handle('system:getAllUsers', async () => {
    return serviceManager.systemService.getAllUsers()
  })

  ipcMain.handle('system:addUser', async (_event, user: any) => {
    return serviceManager.systemService.addUser(user)
  })

  ipcMain.handle('system:updateUser', async (_event, user: any) => {
    return serviceManager.systemService.updateUser(user)
  })

  ipcMain.handle('system:deleteUser', async (_event, userId: number) => {
    return serviceManager.systemService.deleteUser(userId)
  })

  ipcMain.handle(
    'system:changePassword',
    async (_event, userId: number, oldPassword: string, newPassword: string) => {
      return serviceManager.systemService.changePassword(userId, oldPassword, newPassword)
    }
  )

  ipcMain.handle('system:resetPassword', async (_event, userId: number, newPassword: string) => {
    return serviceManager.systemService.resetPassword(userId, newPassword)
  })

  ipcMain.handle('system:getAllRoles', async () => {
    return serviceManager.systemService.getAllRoles()
  })

  ipcMain.handle('system:getConfigs', async () => {
    return serviceManager.systemService.getAllConfigs()
  })

  ipcMain.handle('system:updateConfig', async (_event, configKey: string, configValue: string) => {
    return serviceManager.systemService.updateConfig(configKey, configValue)
  })

  ipcMain.handle('system:backupDatabase', async () => {
    return serviceManager.systemService.backupDatabase()
  })

  ipcMain.handle('system:getAllBackups', async () => {
    return serviceManager.systemService.getAllBackups()
  })

  ipcMain.handle('system:deleteBackup', async (_event, backupId: number) => {
    return serviceManager.systemService.deleteBackup(backupId)
  })

  ipcMain.handle('system:restoreBackup', async (_event, backupId: number) => {
    return serviceManager.systemService.restoreBackup(backupId)
  })

  ipcMain.handle('system:getOperationLogs', async (_event, limit = 100, offset = 0) => {
    return serviceManager.systemService.getOperationLogs(limit, offset)
  })

  // 统计报表相关处理
  ipcMain.handle('stats:getBookStatistics', async () => {
    return serviceManager.statisticsService.getBookStatistics()
  })

  ipcMain.handle(
    'stats:getBorrowStatistics',
    async (_event, startDate?: string, endDate?: string) => {
      return serviceManager.statisticsService.getBorrowStatistics(startDate, endDate)
    }
  )

  ipcMain.handle('stats:getReaderStatistics', async () => {
    return serviceManager.statisticsService.getReaderStatistics()
  })

  ipcMain.handle(
    'stats:generateBorrowReport',
    async (_event, startDate: string, endDate: string, operatorId: number) => {
      const result = serviceManager.statisticsService.generateBorrowReport(
        startDate,
        endDate,
        operatorId
      )
      if (result.success && result.filePath) {
        shell.openPath(path.dirname(result.filePath))
      }
      return result
    }
  )

  ipcMain.handle('stats:generateInventoryReport', async (_event, operatorId: number) => {
    const result = serviceManager.statisticsService.generateInventoryReport(operatorId)
    if (result.success && result.filePath) {
      shell.openPath(path.dirname(result.filePath))
    }
    return result
  })

  ipcMain.handle('stats:generateReaderReport', async (_event, operatorId: number) => {
    const result = serviceManager.statisticsService.generateReaderReport(operatorId)
    if (result.success && result.filePath) {
      shell.openPath(path.dirname(result.filePath))
    }
    return result
  })

  ipcMain.handle('stats:generateOverdueReport', async (_event, operatorId: number) => {
    const result = serviceManager.statisticsService.generateOverdueReport(operatorId)
    if (result.success && result.filePath) {
      shell.openPath(path.dirname(result.filePath))
    }
    return result
  })

  // 文件对话框处理
  ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif'] }]
    })
    if (canceled) {
      return null
    } else {
      const filePath = filePaths[0]
      const fileContent = fs.readFileSync(filePath)
      return {
        path: filePath,
        content: fileContent.toString('base64')
      }
    }
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))
}
