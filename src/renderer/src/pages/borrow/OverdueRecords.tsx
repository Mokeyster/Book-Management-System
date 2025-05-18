import { useEffect, useState } from 'react'
import { formatDate } from '~/utils'
import { AlertTriangle, Download, Phone } from 'lucide-react'
import { toast } from 'sonner'

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
import { Card, CardHeader, CardTitle, CardContent } from '@ui/card'

import { IBorrowRecord } from '@appTypes/borrowTypes'

const PAGE_SIZE = 10

const OverdueRecords = (): React.ReactElement => {
  const [overdueRecords, setOverdueRecords] = useState<IBorrowRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<IBorrowRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [statistics, setStatistics] = useState({
    totalOverdue: 0,
    totalReaders: 0,
    totalFine: 0
  })

  // 加载逾期记录
  useEffect(() => {
    fetchOverdueRecords()
  }, [])

  // 过滤记录
  useEffect(() => {
    let result = [...overdueRecords]

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (record) =>
          record.book_title?.toLowerCase().includes(query) ||
          record.isbn?.toLowerCase().includes(query) ||
          record.reader_name?.toLowerCase().includes(query) ||
          record.id_card?.toLowerCase().includes(query) ||
          record.phone?.toLowerCase().includes(query)
      )
    }

    setFilteredRecords(result)
    setCurrentPage(1) // 重置到第一页
  }, [searchQuery, overdueRecords])

  // 获取当前页的记录
  const getCurrentPageRecords = (): IBorrowRecord[] => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredRecords.slice(startIndex, startIndex + PAGE_SIZE)
  }

  // 获取总页数
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE))

  // 加载逾期记录
  const fetchOverdueRecords = async (): Promise<void> => {
    setLoading(true)
    try {
      const data = await window.api.borrow.getOverdue()
      setOverdueRecords(data)
      setFilteredRecords(data)

      // 计算统计信息
      const uniqueReaders = new Set(data.map((record) => record.reader_id))
      const totalFine = data.reduce((sum, record) => sum + (record.fine_amount || 0), 0)

      setStatistics({
        totalOverdue: data.length,
        totalReaders: uniqueReaders.size,
        totalFine: totalFine
      })
    } catch (error) {
      console.error('获取逾期记录失败:', error)
      toast.error('获取逾期记录失败')
    } finally {
      setLoading(false)
    }
  }

  // 导出逾期报告
  const exportOverdueReport = async (): Promise<void> => {
    try {
      const result = await window.api.stats.generateOverdueReport(1) // 1是当前操作员ID

      if (result.success) {
        toast.success(`报告已生成: ${result.filePath}`)
      } else {
        toast.error('生成报告失败')
      }
    } catch (error) {
      console.error('导出报告失败:', error)
      toast.error('导出逾期报告失败')
    }
  }

  // 计算逾期天数
  const calculateOverdueDays = (dueDate: string): number => {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = today.getTime() - due.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">逾期记录</h1>
        <Button onClick={exportOverdueReport}>
          <Download className="w-4 h-4 mr-2" />
          导出逾期报告
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              逾期记录总数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalOverdue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">涉及读者数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalReaders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总罚款金额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{statistics.totalFine.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center max-w-md space-x-2">
        <Input
          placeholder="搜索图书、读者或编号"
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
          <p className="text-lg text-muted-foreground">加载逾期记录中...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-2">
          <AlertTriangle className="w-10 h-10 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">
            {searchQuery ? '没有找到匹配的逾期记录' : '暂无逾期记录'}
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
                  <TableHead>图书名称</TableHead>
                  <TableHead>读者姓名</TableHead>
                  <TableHead>联系方式</TableHead>
                  <TableHead>借阅日期</TableHead>
                  <TableHead>应还日期</TableHead>
                  <TableHead>逾期天数</TableHead>
                  <TableHead>罚款金额</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getCurrentPageRecords().map((record) => {
                  const overdueDays = calculateOverdueDays(record.due_date)

                  return (
                    <TableRow key={record.borrow_id}>
                      <TableCell>
                        <div className="font-medium">{record.book_title}</div>
                        <div className="text-xs text-muted-foreground">
                          {record.isbn || '无ISBN'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{record.reader_name}</div>
                        <div className="text-xs text-muted-foreground">{record.id_card || ''}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {record.phone && (
                            <div className="flex items-center text-xs">
                              <Phone className="w-3 h-3 mr-1" />
                              {record.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(record.borrow_date)}</TableCell>
                      <TableCell>
                        <div className="text-red-500">{formatDate(record.due_date)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{overdueDays} 天</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          ¥{record.fine_amount?.toFixed(2) || '0.00'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            onClick={() => {
                              // 这里可以实现查看详情或联系读者功能
                              toast.info(`提醒读者 ${record.reader_name} 归还图书`)
                            }}
                          >
                            提醒归还
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
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
        </>
      )}
    </div>
  )
}

export default OverdueRecords
