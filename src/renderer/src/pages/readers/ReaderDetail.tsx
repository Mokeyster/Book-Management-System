import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { formatDate, readerStatusMap, borrowStatusMap } from '~/utils'
import {
  ArrowLeft,
  User,
  Edit,
  Calendar,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  BookOpen,
  Tag,
  History
} from 'lucide-react'

import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Separator } from '@ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'

import { IReader } from '@appTypes/readerTypes'
import { IBorrowRecord } from '@appTypes/borrowTypes'
import ReaderForm from './components/ReaderForm'

const ReaderDetail = (): React.JSX.Element => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [reader, setReader] = useState<IReader | null>(null)
  const [borrowHistory, setBorrowHistory] = useState<IBorrowRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentBorrowings, setCurrentBorrowings] = useState<IBorrowRecord[]>([])
  const [historicalBorrowings, setHistoricalBorrowings] = useState<IBorrowRecord[]>([])

  // 加载读者详情
  useEffect(() => {
    if (!id) return

    const fetchReaderDetails = async (): Promise<void> => {
      setLoading(true)
      try {
        // 获取读者详情
        const readerData = await window.api.reader.getById(parseInt(id))
        setReader(readerData)

        // 获取读者借阅历史
        const borrowHistoryData = await window.api.reader.getBorrowHistory(parseInt(id))
        setBorrowHistory(borrowHistoryData || [])

        // 分离当前借阅和历史借阅
        const current = borrowHistoryData.filter(
          (record) => record.status === 1 || record.status === 3 || record.status === 4
        )
        const historical = borrowHistoryData.filter((record) => record.status === 2)

        setCurrentBorrowings(current)
        setHistoricalBorrowings(historical)
      } catch (error) {
        console.error('获取读者详情失败:', error)
        toast.error('获取读者详情失败')
      } finally {
        setLoading(false)
      }
    }

    fetchReaderDetails()
  }, [id])

  // 处理读者更新
  const handleReaderUpdate = (updatedReader: IReader): void => {
    setReader(updatedReader)
    setIsEditDialogOpen(false)
  }

  // 返回读者列表
  const handleBack = (): void => {
    navigate('/readers')
  }

  // 计算逾期次数
  const getOverdueCount = (): number => {
    return borrowHistory.filter((record) => record.status === 3).length
  }

  // 计算借阅总次数
  const getTotalBorrowings = (): number => {
    return borrowHistory.length
  }

  // 获取格式化的性别
  const getGenderText = (gender?: string): string => {
    if (!gender) return '未设置'
    return gender === 'M' ? '男' : gender === 'F' ? '女' : '其他'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-lg text-muted-foreground">加载读者详情中...</p>
      </div>
    )
  }

  if (!reader) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-lg text-muted-foreground">未找到读者信息</p>
        <Button onClick={handleBack}>返回读者列表</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部区域 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">{reader.name}</h1>
          <Badge
            variant={
              reader.status === 1 ? 'outline' : reader.status === 2 ? 'secondary' : 'destructive'
            }
            className="ml-2"
          >
            {readerStatusMap[reader.status]?.text || `状态${reader.status}`}
          </Badge>
        </div>
        <Button onClick={() => setIsEditDialogOpen(true)}>
          <Edit className="w-4 h-4 mr-2" />
          编辑读者
        </Button>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">读者详情</TabsTrigger>
          <TabsTrigger value="current-borrowings">当前借阅</TabsTrigger>
          <TabsTrigger value="borrow-history">借阅历史</TabsTrigger>
        </TabsList>

        {/* 详情标签页 */}
        <TabsContent value="details" className="space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                基本信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* 姓名 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">姓名</p>
                  <p className="text-base font-semibold">{reader.name}</p>
                </div>

                {/* 性别 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">性别</p>
                  <p>{getGenderText(reader.gender)}</p>
                </div>

                {/* 身份证号 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">身份证号</p>
                  <p className="flex items-center">
                    <CreditCard className="w-4 h-4 mr-1 text-muted-foreground" />
                    {reader.id_card || '未填写'}
                  </p>
                </div>

                {/* 电话 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">联系电话</p>
                  <p className="flex items-center">
                    <Phone className="w-4 h-4 mr-1 text-muted-foreground" />
                    {reader.phone || '未填写'}
                  </p>
                </div>

                {/* 邮箱 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">电子邮箱</p>
                  <p className="flex items-center">
                    <Mail className="w-4 h-4 mr-1 text-muted-foreground" />
                    {reader.email || '未填写'}
                  </p>
                </div>

                {/* 地址 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">地址</p>
                  <p className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-muted-foreground" />
                    {reader.address || '未填写'}
                  </p>
                </div>

                {/* 注册日期 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">注册日期</p>
                  <p className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1 text-muted-foreground" />
                    {reader.register_date ? formatDate(reader.register_date) : '未知'}
                  </p>
                </div>

                {/* 读者类型 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">读者类型</p>
                  <p className="flex items-center">
                    <Tag className="w-4 h-4 mr-1 text-muted-foreground" />
                    {reader.type_name || '普通读者'}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* 借阅统计信息 */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="p-4 rounded-md bg-muted">
                  <p className="text-sm font-medium text-muted-foreground">当前借阅数量</p>
                  <p className="text-lg font-bold">
                    {currentBorrowings.length} / {reader.borrow_quota || 5}
                  </p>
                </div>
                <div className="p-4 rounded-md bg-muted">
                  <p className="text-sm font-medium text-muted-foreground">历史借阅次数</p>
                  <p className="text-lg font-bold">{getTotalBorrowings()}</p>
                </div>
                <div className="p-4 rounded-md bg-muted">
                  <p className="text-sm font-medium text-muted-foreground">逾期次数</p>
                  <p className="text-lg font-bold">{getOverdueCount()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 当前借阅标签页 */}
        <TabsContent value="current-borrowings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="w-5 h-5 mr-2" />
                当前借阅图书
              </CardTitle>
              <CardDescription>显示读者正在借阅的图书</CardDescription>
            </CardHeader>
            <CardContent>
              {currentBorrowings.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">暂无借阅图书</p>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>借阅ID</TableHead>
                        <TableHead>图书名称</TableHead>
                        <TableHead>ISBN</TableHead>
                        <TableHead>借阅日期</TableHead>
                        <TableHead>应还日期</TableHead>
                        <TableHead>续借次数</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentBorrowings.map((record) => (
                        <TableRow key={record.borrow_id}>
                          <TableCell>{record.borrow_id}</TableCell>
                          <TableCell>
                            <Button
                              variant="link"
                              className="h-auto p-0"
                              onClick={() => navigate(`/books/${record.book_id}`)}
                            >
                              {record.book_title}
                            </Button>
                          </TableCell>
                          <TableCell>{record.isbn || '-'}</TableCell>
                          <TableCell>{formatDate(record.borrow_date)}</TableCell>
                          <TableCell>{formatDate(record.due_date)}</TableCell>
                          <TableCell>{record.renew_count}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                record.status === 1
                                  ? 'default'
                                  : record.status === 3
                                    ? 'destructive'
                                    : record.status === 4
                                      ? 'secondary'
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 借阅历史标签页 */}
        <TabsContent value="borrow-history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="w-5 h-5 mr-2" />
                借阅历史记录
              </CardTitle>
              <CardDescription>显示读者的历史借阅记录</CardDescription>
            </CardHeader>
            <CardContent>
              {historicalBorrowings.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">暂无历史借阅记录</p>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>借阅ID</TableHead>
                        <TableHead>图书名称</TableHead>
                        <TableHead>ISBN</TableHead>
                        <TableHead>借阅日期</TableHead>
                        <TableHead>归还日期</TableHead>
                        <TableHead>续借次数</TableHead>
                        <TableHead>罚款</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historicalBorrowings.map((record) => (
                        <TableRow key={record.borrow_id}>
                          <TableCell>{record.borrow_id}</TableCell>
                          <TableCell>
                            <Button
                              variant="link"
                              className="h-auto p-0"
                              onClick={() => navigate(`/books/${record.book_id}`)}
                            >
                              {record.book_title}
                            </Button>
                          </TableCell>
                          <TableCell>{record.isbn || '-'}</TableCell>
                          <TableCell>{formatDate(record.borrow_date)}</TableCell>
                          <TableCell>
                            {record.return_date ? formatDate(record.return_date) : '-'}
                          </TableCell>
                          <TableCell>{record.renew_count}</TableCell>
                          <TableCell>
                            {record.fine_amount > 0 ? `¥${record.fine_amount.toFixed(2)}` : '-'}
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

      {/* 编辑读者对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑读者</DialogTitle>
            <DialogDescription>修改读者信息</DialogDescription>
          </DialogHeader>
          <ReaderForm
            reader={reader}
            onClose={() => setIsEditDialogOpen(false)}
            onSubmit={handleReaderUpdate}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ReaderDetail
