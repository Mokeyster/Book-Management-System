import { useEffect, useState } from 'react'
import { formatDate } from '~/utils/format'
import {
  ChartBar,
  Download,
  FileSpreadsheet,
  BookOpen,
  Users,
  Clock,
  FileText,
  Loader2,
  BarChart
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table'
import { Calendar as CalendarComponent } from '@ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'

import { IStatReport, IReportResult } from '~/types/system'

interface ReportCardProps {
  title: string
  description: string
  icon: React.ReactNode
  onClick: () => void
  isGenerating: boolean
}

const ReportCard = ({
  title,
  description,
  icon,
  onClick,
  isGenerating
}: ReportCardProps): React.ReactElement => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-lg">
          {icon}
          <span className="ml-2">{title}</span>
        </CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <p className="text-sm text-muted-foreground">生成包含详细数据的报表文件，可下载或打印。</p>
      </CardContent>
      <CardFooter className="flex justify-end pt-4 mt-4 border-t">
        <Button onClick={onClick} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              生成报表
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

const ReportCenter = (): React.ReactElement => {
  const [reports, setReports] = useState<IStatReport[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [isDateRangeDialogOpen, setIsDateRangeDialogOpen] = useState(false)
  const [currentReportType, setCurrentReportType] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingReportType, setGeneratingReportType] = useState('')

  // 加载报表列表
  useEffect(() => {
    fetchReports()
  }, [])

  // 获取报表历史
  const fetchReports = async (): Promise<void> => {
    setLoading(true)
    try {
      // 这里应该从API获取历史报表数据
      // 使用模拟数据
      const mockReports: IStatReport[] = [
        {
          report_id: 1,
          report_name: '图书库存报表',
          report_type: 'inventory',
          generate_date: '2025-05-15 14:30:00',
          stats_period: '全时间段',
          operator_id: 1,
          report_path: '/reports/inventory_20250515.xlsx'
        },
        {
          report_id: 2,
          report_name: '借阅统计报表',
          report_type: 'borrow',
          generate_date: '2025-05-10 09:15:00',
          stats_period: '2025-04-01 至 2025-04-30',
          operator_id: 1,
          report_path: '/reports/borrow_202504.xlsx'
        },
        {
          report_id: 3,
          report_name: '读者活跃度报表',
          report_type: 'reader',
          generate_date: '2025-05-01 10:00:00',
          stats_period: '2025-04-01 至 2025-04-30',
          operator_id: 1,
          report_path: '/reports/reader_202504.xlsx'
        }
      ]
      setReports(mockReports)
    } catch (error) {
      console.error('获取报表历史失败:', error)
      toast.error('获取报表历史失败')
    } finally {
      setLoading(false)
    }
  }

  // 选择日期范围
  const openDateRangeDialog = (reportType: string): void => {
    setCurrentReportType(reportType)
    setStartDate(new Date())
    setEndDate(new Date())
    setIsDateRangeDialogOpen(true)
  }

  // 生成图书库存报表
  const generateInventoryReport = async (): Promise<void> => {
    setIsGenerating(true)
    setGeneratingReportType('inventory')
    try {
      const result = await window.api.stats.generateInventoryReport(1) // 假设当前用户ID为1
      handleReportResult(result, '图书库存报表')
    } catch (error) {
      console.error('生成库存报表失败:', error)
      toast.error('生成报表失败')
    } finally {
      setIsGenerating(false)
      setGeneratingReportType('')
    }
  }

  // 生成借阅统计报表
  const generateBorrowReport = async (): Promise<void> => {
    setIsDateRangeDialogOpen(false)
    setIsGenerating(true)
    setGeneratingReportType('borrow')
    try {
      const startDateStr = format(startDate, 'yyyy-MM-dd')
      const endDateStr = format(endDate, 'yyyy-MM-dd')
      const result = await window.api.stats.generateBorrowReport(
        startDateStr,
        endDateStr,
        1 // 假设当前用户ID为1
      )
      handleReportResult(result, '借阅统计报表')
    } catch (error) {
      console.error('生成借阅报表失败:', error)
      toast.error('生成报表失败')
    } finally {
      setIsGenerating(false)
      setGeneratingReportType('')
    }
  }

  // 生成读者统计报表
  const generateReaderReport = async (): Promise<void> => {
    setIsGenerating(true)
    setGeneratingReportType('reader')
    try {
      const result = await window.api.stats.generateReaderReport(1) // 假设当前用户ID为1
      handleReportResult(result, '读者统计报表')
    } catch (error) {
      console.error('生成读者报表失败:', error)
      toast.error('生成报表失败')
    } finally {
      setIsGenerating(false)
      setGeneratingReportType('')
    }
  }

  // 生成逾期记录报表
  const generateOverdueReport = async (): Promise<void> => {
    setIsGenerating(true)
    setGeneratingReportType('overdue')
    try {
      const result = await window.api.stats.generateOverdueReport(1) // 假设当前用户ID为1
      handleReportResult(result, '逾期记录报表')
    } catch (error) {
      console.error('生成逾期报表失败:', error)
      toast.error('生成报表失败')
    } finally {
      setIsGenerating(false)
      setGeneratingReportType('')
    }
  }

  // 处理报表生成结果
  const handleReportResult = (result: IReportResult, reportName: string): void => {
    if (result.success) {
      toast.success(`${reportName}生成成功`)
      // 刷新报表列表
      fetchReports()
    } else {
      toast.error(`${reportName}生成失败: ${result.error || '未知错误'}`)
    }
  }

  // 根据报表类型生成报表
  const generateReportByType = async (): Promise<void> => {
    switch (currentReportType) {
      case 'inventory':
        await generateInventoryReport()
        break
      case 'borrow':
        await generateBorrowReport()
        break
      case 'reader':
        await generateReaderReport()
        break
      case 'overdue':
        await generateOverdueReport()
        break
      default:
        console.error('未知的报表类型:', currentReportType)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">报表中心</h1>
        <div className="flex items-center">
          <ChartBar className="w-5 h-5 mr-2 text-muted-foreground" />
          <span className="text-muted-foreground">统计数据与报表</span>
        </div>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">生成报表</TabsTrigger>
          <TabsTrigger value="history">历史报表</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* 图书库存报表 */}
            <ReportCard
              title="图书库存报表"
              description="生成包含所有图书当前库存状态的详细报表"
              icon={<BookOpen className="w-5 h-5" />}
              onClick={() => generateInventoryReport()}
              isGenerating={isGenerating && generatingReportType === 'inventory'}
            />

            {/* 借阅统计报表 */}
            <ReportCard
              title="借阅统计报表"
              description="生成指定日期范围内的借阅、归还、续借统计报表"
              icon={<BarChart className="w-5 h-5" />}
              onClick={() => openDateRangeDialog('borrow')}
              isGenerating={isGenerating && generatingReportType === 'borrow'}
            />

            {/* 读者统计报表 */}
            <ReportCard
              title="读者统计报表"
              description="生成读者类型、活跃度、借阅行为等统计报表"
              icon={<Users className="w-5 h-5" />}
              onClick={() => generateReaderReport()}
              isGenerating={isGenerating && generatingReportType === 'reader'}
            />

            {/* 逾期记录报表 */}
            <ReportCard
              title="逾期记录报表"
              description="生成当前和历史逾期记录的统计报表"
              icon={<Clock className="w-5 h-5" />}
              onClick={() => generateOverdueReport()}
              isGenerating={isGenerating && generatingReportType === 'overdue'}
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                历史报表记录
              </CardTitle>
              <CardDescription>查看之前生成的所有报表</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  <p className="ml-2 text-lg text-muted-foreground">加载报表历史中...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-2">
                  <FileSpreadsheet className="w-10 h-10 text-muted-foreground" />
                  <p className="text-lg text-muted-foreground">暂无历史报表记录</p>
                  <Button variant="outline" onClick={() => fetchReports()}>
                    刷新
                  </Button>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>报表名称</TableHead>
                        <TableHead>生成时间</TableHead>
                        <TableHead>统计周期</TableHead>
                        <TableHead>报表类型</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.report_id}>
                          <TableCell className="font-medium">{report.report_name}</TableCell>
                          <TableCell>{formatDate(report.generate_date)}</TableCell>
                          <TableCell>{report.stats_period || '全部'}</TableCell>
                          <TableCell>
                            {report.report_type === 'inventory' && '库存报表'}
                            {report.report_type === 'borrow' && '借阅报表'}
                            {report.report_type === 'reader' && '读者报表'}
                            {report.report_type === 'overdue' && '逾期报表'}
                            {!['inventory', 'borrow', 'reader', 'overdue'].includes(
                              report.report_type
                            ) && report.report_type}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // 这里应该处理下载或查看报表的逻辑
                                toast.info(`报表文件路径: ${report.report_path}`)
                              }}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              下载
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 日期范围选择对话框 */}
      <Dialog open={isDateRangeDialogOpen} onOpenChange={setIsDateRangeDialogOpen}>
        <DialogContent className="w-auto max-w-none">
          <DialogHeader>
            <DialogTitle>选择日期范围</DialogTitle>
            <DialogDescription>请选择报表统计的开始和结束日期</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-2 text-sm font-medium">开始日期</p>
              <div className="p-1 border rounded-md">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  disabled={(date) => date > endDate}
                  initialFocus
                />
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">结束日期</p>
              <div className="p-1 border rounded-md">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => date && setEndDate(date)}
                  disabled={(date) => date < startDate || date > new Date()}
                  initialFocus
                />
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            选择的日期范围: {startDate ? format(startDate, 'yyyy-MM-dd') : '未选择'} 至{' '}
            {endDate ? format(endDate, 'yyyy-MM-dd') : '未选择'}
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDateRangeDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={generateReportByType} disabled={!startDate || !endDate}>
              确认并生成报表
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ReportCenter
