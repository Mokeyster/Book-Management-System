import { useEffect, useState } from 'react'
import { formatDate } from '~/utils/format'
import { FileText, Info, Filter, RefreshCw, User, Loader2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

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
import { Separator } from '@ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/tooltip'
import { Calendar as CalendarComponent } from '@ui/calendar'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'

import { IOperationLog } from '~/types/system'

const PAGE_SIZE = 15

const OperationLogs = (): React.ReactElement => {
  const [logs, setLogs] = useState<IOperationLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<IOperationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)
  const [selectedLog, setSelectedLog] = useState<IOperationLog | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined)
  const [filterUser, setFilterUser] = useState<string | undefined>(undefined)
  const [filterOperation, setFilterOperation] = useState<string | undefined>(undefined)

  // 操作类型列表 - 使用英文关键词，直接匹配数据库中的英文操作描述
  const operationTypes = [
    { value: 'login', label: '用户登录' },
    { value: 'logout', label: '用户退出' },
    { value: 'add', label: '添加数据' },
    { value: 'update', label: '更新数据' },
    { value: 'delete', label: '删除数据' },
    { value: 'borrow', label: '借阅操作' },
    { value: 'return', label: '归还操作' },
    { value: 'renew', label: '续借操作' },
    { value: 'reserve', label: '预约操作' },
    { value: 'backup', label: '数据备份' },
    { value: 'config', label: '配置修改' },
    { value: 'import', label: '数据导入' },
    { value: 'export', label: '数据导出' }
  ]

  // 英文操作类型到数据库关键词的映射
  const getEnglishKeywords = (englishType: string): string[] => {
    const keywordMap: Record<string, string[]> = {
      login: ['login'],
      logout: ['logout'],
      add: ['add'],
      update: ['update'],
      delete: ['delete'],
      borrow: ['borrow'],
      return: ['return'],
      renew: ['renew'],
      reserve: ['reserve'],
      backup: ['backup'],
      config: ['config'],
      import: ['import'],
      export: ['export']
    }
    return keywordMap[englishType] || []
  }

  // 加载操作日志
  useEffect(() => {
    fetchLogs()
  }, [])

  // 根据搜索和过滤条件更新日志列表
  useEffect(() => {
    filterLogs()
  }, [searchQuery, filterDate, filterUser, filterOperation, logs])

  // 获取当前页的日志
  const getCurrentPageLogs = (): IOperationLog[] => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredLogs.slice(startIndex, startIndex + PAGE_SIZE)
  }

  // 获取总页数
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE))

  // 获取操作日志
  const fetchLogs = async (): Promise<void> => {
    setLoading(true)
    try {
      // 这里需要获取实际的操作日志数据
      const limit = 100 // 获取最近100条日志，可以根据需要调整
      const data = await window.api.system.getOperationLogs(limit, 0)
      setLogs(data)
      setFilteredLogs(data)
      setTotalLogs(data.length) // 这里可能需要从API获取总日志数
    } catch (error) {
      console.error('获取操作日志失败:', error)
      toast.error('获取操作日志失败')
    } finally {
      setLoading(false)
    }
  }

  // 根据条件过滤日志
  const filterLogs = (): void => {
    let filtered = [...logs]

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (log) =>
          log.username?.toLowerCase().includes(query) ||
          log.real_name?.toLowerCase().includes(query) ||
          log.operation.toLowerCase().includes(query) ||
          log.details?.toLowerCase().includes(query)
      )
    }

    // 日期过滤
    if (filterDate) {
      const dateString = format(filterDate, 'yyyy-MM-dd')
      filtered = filtered.filter((log) => log.operation_time.startsWith(dateString))
    }

    // 用户过滤
    if (filterUser) {
      filtered = filtered.filter(
        (log) => log.username === filterUser || log.real_name === filterUser
      )
    }

    // 操作类型过滤
    if (filterOperation) {
      const englishKeywords = getEnglishKeywords(filterOperation)
      filtered = filtered.filter((log) =>
        englishKeywords.some((keyword) => log.operation.includes(keyword))
      )
    }

    setFilteredLogs(filtered)
    setCurrentPage(1) // 重置到第一页
  }

  // 导出操作日志
  const handleExportLogs = async (): Promise<void> => {
    setIsExporting(true)
    try {
      // 构建过滤条件
      const filters: any = {}

      if (filterDate) {
        filters.startDate = format(filterDate, 'yyyy-MM-dd')
        filters.endDate = format(filterDate, 'yyyy-MM-dd')
      }

      if (filterOperation) {
        // 将英文操作类型转换为英文关键词进行过滤
        const englishKeywords = getEnglishKeywords(filterOperation)
        filters.operation = englishKeywords[0] // 使用第一个英文关键词
      }

      const result = await window.api.system.exportOperationLogs(filters)

      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('导出操作日志失败:', error)
      toast.error('导出操作日志失败')
    } finally {
      setIsExporting(false)
    }
  }

  // 清除过滤条件
  const clearFilters = (): void => {
    setSearchQuery('')
    setFilterDate(undefined)
    setFilterUser(undefined)
    setFilterOperation(undefined)
  }

  // 格式化操作类型显示 - 基于英文操作描述
  const getOperationBadge = (operation: string): React.ReactNode => {
    const lowerOperation = operation.toLowerCase()

    if (lowerOperation.includes('login')) {
      return <Badge variant="outline">登录</Badge>
    } else if (lowerOperation.includes('logout')) {
      return <Badge variant="outline">登出</Badge>
    } else if (lowerOperation.includes('add')) {
      return <Badge variant="default">添加</Badge>
    } else if (lowerOperation.includes('update')) {
      return <Badge variant="secondary">更新</Badge>
    } else if (lowerOperation.includes('delete')) {
      return <Badge variant="destructive">删除</Badge>
    } else if (lowerOperation.includes('borrow')) {
      return (
        <Badge variant="default" className="bg-blue-500">
          借阅
        </Badge>
      )
    } else if (lowerOperation.includes('return')) {
      return (
        <Badge variant="default" className="bg-green-500">
          归还
        </Badge>
      )
    } else if (lowerOperation.includes('renew')) {
      return (
        <Badge variant="default" className="bg-orange-500">
          续借
        </Badge>
      )
    } else if (lowerOperation.includes('reserve')) {
      return (
        <Badge variant="default" className="bg-cyan-500">
          预约
        </Badge>
      )
    } else if (lowerOperation.includes('backup')) {
      return (
        <Badge variant="default" className="bg-purple-500">
          备份
        </Badge>
      )
    } else if (lowerOperation.includes('config')) {
      return (
        <Badge variant="default" className="bg-yellow-500">
          配置
        </Badge>
      )
    } else if (lowerOperation.includes('import') || lowerOperation.includes('export')) {
      return (
        <Badge variant="default" className="bg-indigo-500">
          数据传输
        </Badge>
      )
    }
    return <Badge>{operation}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">操作日志</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchLogs}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button onClick={handleExportLogs} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                导出日志
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">日志概览</CardTitle>
          <CardDescription>系统操作日志统计信息</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="p-4 rounded-md bg-muted">
              <p className="text-sm font-medium text-muted-foreground">总日志数</p>
              <p className="text-lg font-bold">{totalLogs}</p>
            </div>
            <div className="p-4 rounded-md bg-muted">
              <p className="text-sm font-medium text-muted-foreground">今日操作</p>
              <p className="text-lg font-bold">
                {
                  logs.filter((log) => {
                    const today = new Date().toISOString().split('T')[0]
                    return log.operation_time.startsWith(today)
                  }).length
                }
              </p>
            </div>
            <div className="p-4 rounded-md bg-muted">
              <p className="text-sm font-medium text-muted-foreground">用户登录</p>
              <p className="text-lg font-bold">
                {
                  logs.filter((log) =>
                    getEnglishKeywords('login').some((keyword) => log.operation.includes(keyword))
                  ).length
                }
              </p>
            </div>
            <div className="p-4 rounded-md bg-muted">
              <p className="text-sm font-medium text-muted-foreground">数据操作</p>
              <p className="text-lg font-bold">
                {
                  logs.filter((log) => {
                    const dataOperationKeywords = [
                      ...getEnglishKeywords('add'),
                      ...getEnglishKeywords('update'),
                      ...getEnglishKeywords('delete')
                    ]
                    return dataOperationKeywords.some((keyword) => log.operation.includes(keyword))
                  }).length
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="搜索用户、操作内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />

          {searchQuery && (
            <Button variant="ghost" onClick={() => setSearchQuery('')} size="sm">
              清除
            </Button>
          )}

          {/* 日期过滤 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                {filterDate ? format(filterDate, 'yyyy-MM-dd') : '选择日期'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filterDate}
                onSelect={setFilterDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* 操作类型过滤 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                {filterOperation || '操作类型'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <p className="text-sm font-medium">选择操作类型</p>
                <div className="flex flex-wrap gap-1">
                  {operationTypes.map((type) => (
                    <Badge
                      key={type.value}
                      variant={filterOperation === type.value ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() =>
                        setFilterOperation(filterOperation === type.value ? undefined : type.value)
                      }
                    >
                      {type.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center">
          {(searchQuery || filterDate || filterUser || filterOperation) && (
            <Button variant="ghost" onClick={clearFilters} size="sm">
              清除所有过滤
            </Button>
          )}
          <span className="ml-2 text-sm text-muted-foreground">
            共 {filteredLogs.length} 条记录
          </span>
        </div>
      </div>

      <Separator />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="ml-2 text-lg text-muted-foreground">加载操作日志中...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-2">
          <FileText className="w-10 h-10 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">
            {searchQuery || filterDate || filterUser || filterOperation
              ? '没有找到匹配的日志记录'
              : '暂无操作日志记录'}
          </p>
        </div>
      ) : (
        <>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>操作类型</TableHead>
                  <TableHead>IP地址</TableHead>
                  <TableHead>操作详情</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getCurrentPageLogs().map((log) => (
                  <TableRow key={log.log_id}>
                    <TableCell className="font-medium">{log.log_id}</TableCell>
                    <TableCell>{formatDate(log.operation_time)}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1 text-muted-foreground" />
                        {log.real_name || log.username || `未知用户(${log.user_id})`}
                      </div>
                    </TableCell>
                    <TableCell>{getOperationBadge(log.operation)}</TableCell>
                    <TableCell className="font-mono text-xs">{log.ip}</TableCell>
                    <TableCell>
                      <p className="max-w-[200px] truncate">{log.details || log.operation}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedLog(log)
                                setIsDetailsDialogOpen(true)
                              }}
                            >
                              <Info className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>查看详情</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                {currentPage === 1 ? (
                  <span className="opacity-50 cursor-not-allowed">
                    <PaginationPrevious className="pointer-events-none" />
                  </span>
                ) : (
                  <PaginationPrevious
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  />
                )}
              </PaginationItem>
              <PaginationItem>
                <span className="px-4">
                  {currentPage} / {totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                {currentPage === totalPages ? (
                  <span className="opacity-50 cursor-not-allowed">
                    <PaginationNext className="pointer-events-none" />
                  </span>
                ) : (
                  <PaginationNext
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  />
                )}
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </>
      )}

      {/* 日志详情对话框 */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>操作日志详情</DialogTitle>
            <DialogDescription>查看操作日志的详细信息</DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">日志ID</p>
                  <p>{selectedLog.log_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">操作时间</p>
                  <p>{formatDate(selectedLog.operation_time)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">用户</p>
                  <p>
                    {selectedLog.real_name ||
                      selectedLog.username ||
                      `未知用户(${selectedLog.user_id})`}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">IP地址</p>
                  <p className="font-mono">{selectedLog.ip}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">操作类型</p>
                <p>{selectedLog.operation}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">详细信息</p>
                <pre className="p-4 mt-2 overflow-x-auto text-sm rounded-md bg-muted">
                  {selectedLog.details || '无详细信息'}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default OperationLogs
