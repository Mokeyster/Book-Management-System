import { useEffect, useState } from 'react'
import { formatDate, borrowStatusMap } from '~/utils'
import { PlusCircle, Clock, RefreshCw, BookMarked, BookX } from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@ui/input'
import { Button } from '@ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from '@ui/pagination'
import { Badge } from '@ui/badge'
import { Separator } from '@ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'

import { useAuthStore } from '~/store/authStore'

import { IBorrowRecord, IBorrowRequest } from '@appTypes/borrowTypes'
import { IBook } from '@appTypes/bookTypes'
import { IReader } from '@appTypes/readerTypes'

const PAGE_SIZE = 10

const BorrowManagement = (): React.JSX.Element => {
  const [activeTab, setActiveTab] = useState('current')
  const [borrowRecords, setBorrowRecords] = useState<IBorrowRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<IBorrowRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isRenewDialogOpen, setIsRenewDialogOpen] = useState(false)
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<IBorrowRecord | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [books, setBooks] = useState<IBook[]>([])
  const [readers, setReaders] = useState<IReader[]>([])
  const [searchBook, setSearchBook] = useState('')
  const [searchReader, setSearchReader] = useState('')
  const currentUser = useAuthStore((state) => state.currentUser)

  // 借阅表单状态
  const [formData, setFormData] = useState({
    book_id: 0,
    reader_id: 0,
    operator_id: 0
  })

  // 表单错误状态
  const [formErrors, setFormErrors] = useState<{
    book_id?: string
    reader_id?: string
  }>({})

  // 当类型变化时加载对应的借阅记录
  useEffect(() => {
    loadBorrowRecords()
  }, [activeTab])

  // 加载借阅记录
  const loadBorrowRecords = async (): Promise<void> => {
    setLoading(true)
    try {
      let records: IBorrowRecord[] = []

      if (activeTab === 'current') {
        records = await window.api.borrow.getCurrent()
      } else if (activeTab === 'all') {
        records = await window.api.borrow.getAll()
      } else if (activeTab === 'overdue') {
        records = await window.api.borrow.getOverdue()
      }

      setBorrowRecords(records)
      setFilteredRecords(records)
    } catch (error) {
      console.error('加载借阅记录失败:', error)
      toast.error('无法加载借阅记录')
    } finally {
      setLoading(false)
    }
  }

  // 加载图书和读者数据
  const loadBooksAndReaders = async (): Promise<void> => {
    try {
      const [booksData, readersData] = await Promise.all([
        window.api.book.getAll(),
        window.api.reader.getAll()
      ])

      // 只显示在库的图书
      setBooks(booksData.filter((book) => book.status === 1))
      // 只显示状态正常的读者
      setReaders(readersData.filter((reader) => reader.status === 1))
    } catch (error) {
      console.error('加载图书和读者数据失败:', error)
      toast.error('加载图书和读者数据失败')
    }
  }

  // 搜索过滤
  useEffect(() => {
    let results = [...borrowRecords]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      results = results.filter(
        (record) =>
          record.book_title?.toLowerCase().includes(query) ||
          '' ||
          record.isbn?.toLowerCase().includes(query) ||
          '' ||
          record.reader_name?.toLowerCase().includes(query) ||
          '' ||
          record.id_card?.toLowerCase().includes(query) ||
          ''
      )
    }

    setFilteredRecords(results)
    setCurrentPage(1) // 重置到第一页
  }, [searchQuery, borrowRecords])

  // 获取当前页的借阅记录
  const getCurrentPageRecords = (): IBorrowRecord[] => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredRecords.slice(startIndex, startIndex + PAGE_SIZE)
  }

  // 获取总页数
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE))

  // 表单验证
  const validateForm = (): boolean => {
    const errors: { book_id?: string; reader_id?: string } = {}

    if (formData.book_id === 0) {
      errors.book_id = '请选择图书'
    }

    if (formData.reader_id === 0) {
      errors.reader_id = '请选择读者'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // 处理新借阅表单提交
  const handleBorrowSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (!currentUser) {
      toast.error('无法获取当前用户信息')
      return
    }

    const data = {
      ...formData,
      operator_id: currentUser.user_id
    }

    setIsSubmitting(true)
    try {
      const result = await window.api.borrow.borrowBook(data as IBorrowRequest)

      if (result.success && result.borrowId) {
        toast.success('借阅成功')
        setIsDialogOpen(false)
        resetForm()
        await loadBorrowRecords()
      } else {
        toast.error(`借阅失败: ${result?.message || '未知错误'}`)
      }
    } catch (error) {
      console.error('借阅处理错误:', error)
      toast.error('借阅处理失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 重置表单
  const resetForm = (): void => {
    setFormData({
      book_id: 0,
      reader_id: 0,
      operator_id: 0
    })
    setFormErrors({})
  }

  // 处理归还图书
  const handleReturn = async (): Promise<void> => {
    if (!selectedRecord) return

    setIsSubmitting(true)
    try {
      const result = await window.api.borrow.returnBook(selectedRecord.borrow_id)

      if (result) {
        toast.success('图书归还成功')
        setIsReturnDialogOpen(false)
        await loadBorrowRecords()
      } else {
        toast.error('图书归还失败')
      }
    } catch (error) {
      console.error('归还图书错误:', error)
      toast.error('归还图书失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 处理续借图书
  const handleRenew = async (): Promise<void> => {
    if (!selectedRecord) return

    setIsSubmitting(true)
    try {
      const result = await window.api.borrow.renewBook(selectedRecord.borrow_id)

      if (result) {
        toast.success('图书续借成功')
        setIsRenewDialogOpen(false)
        await loadBorrowRecords()
      } else {
        toast.error('图书续借失败')
      }
    } catch (error) {
      console.error('续借图书错误:', error)
      toast.error('续借图书失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 打开新借阅对话框
  const openBorrowDialog = (): void => {
    resetForm()
    loadBooksAndReaders()
    setIsDialogOpen(true)
  }

  // 选择图书
  const handleSelectBook = (bookId: number): void => {
    setFormData((prev) => ({
      ...prev,
      book_id: bookId
    }))

    if (formErrors.book_id) {
      setFormErrors((prev) => ({
        ...prev,
        book_id: undefined
      }))
    }
  }

  // 选择读者
  const handleSelectReader = (readerId: number): void => {
    setFormData((prev) => ({
      ...prev,
      reader_id: readerId
    }))

    if (formErrors.reader_id) {
      setFormErrors((prev) => ({
        ...prev,
        reader_id: undefined
      }))
    }
  }

  // 过滤图书列表
  const filteredBooks = books.filter(
    (book) =>
      searchBook === '' ||
      book.title.toLowerCase().includes(searchBook.toLowerCase()) ||
      book.isbn?.toLowerCase().includes(searchBook.toLowerCase())
  )

  // 过滤读者列表
  const filteredReaders = readers.filter(
    (reader) =>
      searchReader === '' ||
      reader.name.toLowerCase().includes(searchReader.toLowerCase()) ||
      reader.id_card?.toLowerCase().includes(searchReader.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">借阅管理</h1>
        <Button onClick={openBorrowDialog}>
          <PlusCircle className="w-4 h-4 mr-2" />
          新增借阅
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">当前借阅</TabsTrigger>
          <TabsTrigger value="overdue">逾期借阅</TabsTrigger>
          <TabsTrigger value="all">所有记录</TabsTrigger>
        </TabsList>

        {/* 所有标签页共享的内容 */}
        <TabsContent value={activeTab} className="mt-4 space-y-4">
          <div className="flex items-center max-w-md space-x-2">
            <Input
              placeholder="搜索借阅记录 (书名, ISBN, 读者姓名)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
            {searchQuery && (
              <Button variant="ghost" onClick={() => setSearchQuery('')} size="sm">
                清除
              </Button>
            )}
          </div>

          <Separator />

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-lg text-muted-foreground">加载借阅记录中...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-2">
              <BookMarked className="w-10 h-10 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">
                {searchQuery ? '没有找到匹配的借阅记录' : '暂无借阅记录'}
              </p>
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  清除搜索
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">ID</TableHead>
                      <TableHead>图书信息</TableHead>
                      <TableHead>读者信息</TableHead>
                      <TableHead>借阅日期</TableHead>
                      <TableHead>应还日期</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>续借次数</TableHead>
                      <TableHead>罚金金额</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getCurrentPageRecords().map((record) => (
                      <TableRow key={record.borrow_id}>
                        <TableCell>{record.borrow_id}</TableCell>
                        <TableCell>
                          <div className="font-medium">{record.book_title}</div>
                          {record.isbn && (
                            <div className="text-xs text-muted-foreground">ISBN: {record.isbn}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>{record.reader_name}</div>
                          {record.phone && (
                            <div className="text-xs text-muted-foreground">{record.phone}</div>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(record.borrow_date)}</TableCell>
                        <TableCell>{formatDate(record.due_date)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.status === 1
                                ? 'default'
                                : record.status === 2
                                  ? 'outline' // 修改：将'success'替换为'outline'
                                  : record.status === 3
                                    ? 'destructive'
                                    : 'secondary'
                            }
                          >
                            {borrowStatusMap[record.status]?.text || `状态${record.status}`}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.renew_count}</TableCell>
                        <TableCell>
                          {record.fine_amount > 0 ? `¥${record.fine_amount}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {record.status === 1 && (
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRecord(record)
                                  setIsReturnDialogOpen(true)
                                }}
                              >
                                <BookX className="w-3 h-3 mr-1" />
                                归还
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRecord(record)
                                  setIsRenewDialogOpen(true)
                                }}
                                disabled={record.renew_count >= 3}
                              >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                续借
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 分页 - 修改：使用条件渲染替代disabled属性 */}
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    {currentPage > 1 ? (
                      <PaginationPrevious
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      />
                    ) : (
                      <PaginationPrevious className="opacity-50 pointer-events-none" />
                    )}
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-4">
                      {currentPage} / {totalPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    {currentPage < totalPages ? (
                      <PaginationNext
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      />
                    ) : (
                      <PaginationNext className="opacity-50 pointer-events-none" />
                    )}
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* 新增借阅对话框 */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) setIsDialogOpen(false)
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>新增借阅</DialogTitle>
            <DialogDescription>选择图书和读者以处理借阅</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBorrowSubmit} className="space-y-4">
            {/* 图书选择 */}
            <div className="space-y-2">
              <div className="text-sm font-medium">选择图书</div>
              <Input
                placeholder="搜索图书 (书名或ISBN)"
                value={searchBook}
                onChange={(e) => setSearchBook(e.target.value)}
              />
              <div className="h-48 overflow-y-auto border rounded-md">
                {filteredBooks.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    无可借图书
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredBooks.slice(0, 50).map((book) => (
                      <div
                        key={book.book_id}
                        className={`p-2 cursor-pointer hover:bg-accent ${
                          formData.book_id === book.book_id ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => handleSelectBook(book.book_id)}
                      >
                        <div className="font-medium">{book.title}</div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>ISBN: {book.isbn || '无'}</span>
                          <span>作者: {book.author || '无'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {formErrors.book_id && (
                <p className="text-sm text-destructive">{formErrors.book_id}</p>
              )}
            </div>

            {/* 读者选择 */}
            <div className="space-y-2">
              <div className="text-sm font-medium">选择读者</div>
              <Input
                placeholder="搜索读者 (姓名或身份证号)"
                value={searchReader}
                onChange={(e) => setSearchReader(e.target.value)}
              />
              <div className="h-48 overflow-y-auto border rounded-md">
                {filteredReaders.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    无可用读者
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredReaders.slice(0, 50).map((reader) => (
                      <div
                        key={reader.reader_id}
                        className={`p-2 cursor-pointer hover:bg-accent ${
                          formData.reader_id === reader.reader_id ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => handleSelectReader(reader.reader_id)}
                      >
                        <div className="font-medium">{reader.name}</div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          {reader.phone && <span>电话: {reader.phone}</span>}
                          {reader.type_name && <span>类型: {reader.type_name}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {formErrors.reader_id && (
                <p className="text-sm text-destructive">{formErrors.reader_id}</p>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} type="button">
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '处理中...' : '确认借阅'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 归还确认对话框 */}
      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认归还</DialogTitle>
            <DialogDescription>确认以下图书已经归还:</DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="py-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">图书:</span>
                <span className="font-medium">{selectedRecord.book_title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">借阅人:</span>
                <span>{selectedRecord.reader_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">借阅日期:</span>
                <span>{formatDate(selectedRecord.borrow_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">应还日期:</span>
                <span>{formatDate(selectedRecord.due_date)}</span>
              </div>

              {new Date(selectedRecord.due_date) < new Date() && (
                <div className="flex items-center p-3 mt-4 space-x-2 rounded-md bg-destructive/10">
                  <Clock className="w-5 h-5 text-destructive" />
                  <div>
                    <p className="font-semibold text-destructive">图书已逾期</p>
                    <p className="text-sm text-destructive">需缴纳逾期罚金</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleReturn} disabled={isSubmitting}>
              {isSubmitting ? '处理中...' : '确认归还'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 续借确认对话框 */}
      <Dialog open={isRenewDialogOpen} onOpenChange={setIsRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认续借</DialogTitle>
            <DialogDescription>您要续借以下图书吗?</DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="py-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">图书:</span>
                <span className="font-medium">{selectedRecord.book_title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">借阅人:</span>
                <span>{selectedRecord.reader_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">当前应还日期:</span>
                <span>{formatDate(selectedRecord.due_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">已续借次数:</span>
                <span>{selectedRecord.renew_count} / 3</span>
              </div>

              {selectedRecord.renew_count >= 3 && (
                <div className="p-3 mt-4 rounded-md bg-destructive/10">
                  <p className="font-semibold text-destructive">无法续借</p>
                  <p className="text-sm text-destructive">该图书已达到最大续借次数 (3次)</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenewDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleRenew}
              disabled={isSubmitting || (selectedRecord?.renew_count || 0) >= 3}
            >
              {isSubmitting ? '处理中...' : '确认续借'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BorrowManagement
