import { useEffect, useState } from 'react'
import { formatDate, borrowStatusMap } from '~/utils'
import { Filter, Download, FileText } from 'lucide-react'
import { Calendar as CalendarIcon } from 'lucide-react' // 重命名图标组件
import { toast } from 'sonner'
import { format } from 'date-fns'

// 导入正确的Calendar组件
import { Calendar } from '@ui/calendar' // 确保导入正确的日历组件

import { Input } from '@ui/input'
import { Button } from '@ui/button'
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover'

import { IBorrowRecord } from '@appTypes/borrowTypes'

const PAGE_SIZE = 10

// 日期选择器组件
const DateRangePicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange
}: {
  startDate: string | null
  endDate: string | null
  onStartDateChange: (date: string | null) => void
  onEndDateChange: (date: string | null) => void
}): React.JSX.Element => {
  return (
    <div className="flex items-center space-x-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
            <CalendarIcon className="w-4 h-4 mr-2" />
            {startDate ? format(new Date(startDate), 'yyyy-MM-dd') : '选择开始日期'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={startDate ? new Date(startDate) : undefined}
            onSelect={(date: Date | undefined) =>
              onStartDateChange(date ? format(date, 'yyyy-MM-dd') : null)
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <span className="text-muted-foreground">至</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
            <CalendarIcon className="w-4 h-4 mr-2" />
            {endDate ? format(new Date(endDate), 'yyyy-MM-dd') : '选择结束日期'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={endDate ? new Date(endDate) : undefined}
            onSelect={(date: Date | undefined) =>
              onEndDateChange(date ? format(date, 'yyyy-MM-dd') : null)
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

const BorrowHistory = (): React.ReactElement => {
  const [borrowRecords, setBorrowRecords] = useState<IBorrowRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<IBorrowRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // 加载借阅记录
  useEffect(() => {
    fetchBorrowRecords()
  }, [])

  // 过滤借阅记录
  useEffect(() => {
    let result = [...borrowRecords]

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (record) =>
          record.book_title?.toLowerCase().includes(query) ||
          record.isbn?.toLowerCase().includes(query) ||
          record.author?.toLowerCase().includes(query) ||
          record.reader_name?.toLowerCase().includes(query) ||
          record.id_card?.toLowerCase().includes(query)
      )
    }

    // 日期过滤
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      result = result.filter((record) => {
        const borrowDate = new Date(record.borrow_date)
        return borrowDate >= start
      })
    }

    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      result = result.filter((record) => {
        const borrowDate = new Date(record.borrow_date)
        return borrowDate <= end
      })
    }

    // 状态过滤
    if (statusFilter !== 'all') {
      const status = parseInt(statusFilter)
      result = result.filter((record) => record.status === status)
    }

    setFilteredRecords(result)
    setCurrentPage(1) // 重置到第一页
  }, [searchQuery, borrowRecords, startDate, endDate, statusFilter])

  // 获取当前页的记录
  const getCurrentPageRecords = (): IBorrowRecord[] => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredRecords.slice(startIndex, startIndex + PAGE_SIZE)
  }

  // 获取总页数
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE))

  // 加载所有借阅记录
  const fetchBorrowRecords = async (): Promise<void> => {
    setLoading(true)
    try {
      // 获取所有借阅记录
      const data = await window.api.borrow.getAll()
      setBorrowRecords(data)
      setFilteredRecords(data)
    } catch (error) {
      console.error('获取借阅记录失败:', error)
      toast.error('获取借阅记录失败')
    } finally {
      setLoading(false)
    }
  }

  // 清除过滤器
  const clearFilters = (): void => {
    setSearchQuery('')
    setStartDate(null)
    setEndDate(null)
    setStatusFilter('all')
  }

  // 导出借阅报告
  const exportBorrowReport = async (): Promise<void> => {
    try {
      const result = await window.api.stats.generateBorrowReport(
        startDate || format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 默认30天前
        endDate || format(new Date(), 'yyyy-MM-dd'), // 默认今天
        1 // 当前用户ID
      )

      if (result.success) {
        toast.success(`报告已生成: ${result.filePath}`)
      } else {
        toast.error('生成报告失败')
      }
    } catch (error) {
      console.error('导出报告失败:', error)
      toast.error('导出借阅报告失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">借阅历史</h1>
        <Button onClick={exportBorrowReport}>
          <Download className="w-4 h-4 mr-2" />
          导出借阅报告
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Filter className="w-4 h-4 mr-2" />
            查询过滤
          </CardTitle>
          <CardDescription>您可以通过多种条件过滤借阅记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <Input
                  placeholder="搜索图书、读者或ISBN"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="借阅状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="1">借出</SelectItem>
                    <SelectItem value="2">已归还</SelectItem>
                    <SelectItem value="3">逾期</SelectItem>
                    <SelectItem value="4">续借</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
              />

              <Button variant="outline" onClick={clearFilters}>
                清除过滤器
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-lg text-muted-foreground">加载借阅历史中...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-2">
          <FileText className="w-10 h-10 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">
            {searchQuery || startDate || endDate || statusFilter !== 'all'
              ? '没有找到匹配的借阅记录'
              : '暂无借阅记录'}
          </p>
          {(searchQuery || startDate || endDate || statusFilter !== 'all') && (
            <Button variant="outline" onClick={clearFilters}>
              清除过滤条件
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>借阅ID</TableHead>
                  <TableHead>图书名称</TableHead>
                  <TableHead>ISBN</TableHead>
                  <TableHead>读者姓名</TableHead>
                  <TableHead>借阅日期</TableHead>
                  <TableHead>应还日期</TableHead>
                  <TableHead>实际归还</TableHead>
                  <TableHead>续借次数</TableHead>
                  <TableHead>罚款</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getCurrentPageRecords().map((record) => (
                  <TableRow key={record.borrow_id}>
                    <TableCell>{record.borrow_id}</TableCell>
                    <TableCell>{record.book_title}</TableCell>
                    <TableCell>{record.isbn || '-'}</TableCell>
                    <TableCell>{record.reader_name}</TableCell>
                    <TableCell>{formatDate(record.borrow_date)}</TableCell>
                    <TableCell>{formatDate(record.due_date)}</TableCell>
                    <TableCell>
                      {record.return_date ? formatDate(record.return_date) : '-'}
                    </TableCell>
                    <TableCell>{record.renew_count}</TableCell>
                    <TableCell>
                      {record.fine_amount > 0 ? `¥${record.fine_amount.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.status === 1
                            ? 'default'
                            : record.status === 2
                              ? 'secondary'
                              : record.status === 3
                                ? 'destructive'
                                : 'outline'
                        }
                      >
                        {borrowStatusMap[record.status]?.text || `状态${record.status}`}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
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

          <div className="text-sm text-right text-muted-foreground">
            共 {filteredRecords.length} 条借阅记录
          </div>
        </>
      )}
    </div>
  )
}

export default BorrowHistory
