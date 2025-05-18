import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { formatDate, bookStatusMap } from '~/utils'
import {
  ArrowLeft,
  BookOpen,
  Edit,
  Calendar,
  Tag,
  MapPin,
  Building,
  Banknote,
  Hash,
  User,
  History
} from 'lucide-react'

import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Separator } from '@ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'

import { IBook } from '@appTypes/bookTypes'
import { IBorrowRecord } from '@appTypes/borrowTypes'
import BookForm from './components/BookForm'

const BookDetail = (): React.JSX.Element => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [book, setBook] = useState<IBook | null>(null)
  const [borrowHistory, setBorrowHistory] = useState<IBorrowRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [tags, setTags] = useState<any[]>([])

  // 加载图书详情
  useEffect(() => {
    if (!id) return

    const fetchBookDetails = async (): Promise<void> => {
      setLoading(true)
      try {
        // 获取图书详情
        const bookData = await window.api.book.getById(parseInt(id))
        setBook(bookData)

        // 获取图书标签
        const tagsData = await window.api.book.getTags(parseInt(id))
        setTags(tagsData || [])

        // 获取图书借阅历史
        const borrowHistoryData = await window.api.borrow.getBookBorrowHistory(parseInt(id))
        setBorrowHistory(borrowHistoryData || [])
      } catch (error) {
        console.error('获取图书详情失败:', error)
        toast.error('获取图书详情失败')
      } finally {
        setLoading(false)
      }
    }

    fetchBookDetails()
  }, [id])

  // 处理图书更新
  const handleBookUpdate = (updatedBook: IBook): void => {
    setBook(updatedBook)
    setIsEditDialogOpen(false)
  }

  // 返回图书列表
  const handleBack = (): void => {
    navigate('/books')
  }

  // 定义一个函数来获取适当的Badge变体类型
  const getStatusBadgeVariant = (
    status: number
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 1:
        return 'secondary' // 在库，使用secondary替代success
      case 2:
        return 'default' // 借出
      case 3:
        return 'secondary' // 预约
      case 4:
        return 'destructive' // 损坏
      default:
        return 'outline' // 其他
    }
  }

  // 定义一个函数来获取借阅记录Badge变体类型
  const getBorrowStatusBadgeVariant = (
    status: number
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 1:
        return 'default' // 借出
      case 2:
        return 'secondary' // 已归还，使用secondary替代success
      case 3:
        return 'destructive' // 逾期
      case 4:
        return 'secondary' // 续借
      default:
        return 'outline' // 其他
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-lg text-muted-foreground">加载图书详情中...</p>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-lg text-muted-foreground">未找到图书信息</p>
        <Button onClick={handleBack}>返回图书列表</Button>
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
          <h1 className="text-2xl font-bold">{book.title}</h1>
          <Badge variant={getStatusBadgeVariant(book.status)} className="ml-2">
            {bookStatusMap[book.status]?.text || `状态${book.status}`}
          </Badge>
        </div>
        <Button onClick={() => setIsEditDialogOpen(true)}>
          <Edit className="w-4 h-4 mr-2" />
          编辑图书
        </Button>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">图书详情</TabsTrigger>
          <TabsTrigger value="borrow-history">借阅历史</TabsTrigger>
        </TabsList>

        {/* 详情标签页 */}
        <TabsContent value="details" className="space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="w-5 h-5 mr-2" />
                基本信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* 书名 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">书名</p>
                  <p className="text-base font-semibold">{book.title}</p>
                </div>

                {/* ISBN */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">ISBN</p>
                  <p className="flex items-center">
                    <Hash className="w-4 h-4 mr-1 text-muted-foreground" />
                    {book.isbn || '无'}
                  </p>
                </div>

                {/* 作者 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">作者</p>
                  <p className="flex items-center">
                    <User className="w-4 h-4 mr-1 text-muted-foreground" />
                    {book.author || '无'}
                  </p>
                </div>

                {/* 出版社 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">出版社</p>
                  <p className="flex items-center">
                    <Building className="w-4 h-4 mr-1 text-muted-foreground" />
                    {book.publisher_name || '无'}
                  </p>
                </div>

                {/* 出版日期 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">出版日期</p>
                  <p className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1 text-muted-foreground" />
                    {book.publish_date ? formatDate(book.publish_date) : '无'}
                  </p>
                </div>

                {/* 价格 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">价格</p>
                  <p className="flex items-center">
                    <Banknote className="w-4 h-4 mr-1 text-muted-foreground" />
                    {book.price ? `¥${book.price.toFixed(2)}` : '无'}
                  </p>
                </div>

                {/* 分类 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">分类</p>
                  <p className="flex items-center">
                    <Tag className="w-4 h-4 mr-1 text-muted-foreground" />
                    {book.category_name || '无'}
                  </p>
                </div>

                {/* 馆藏位置 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">馆藏位置</p>
                  <p className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-muted-foreground" />
                    {book.location || '无'}
                  </p>
                </div>
              </div>

              {/* 图书简介 */}
              {book.description && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">图书简介</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {book.description}
                    </p>
                  </div>
                </>
              )}

              {/* 标签 */}
              {tags.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">标签</p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge key={tag.tag_id} variant="outline">
                          {tag.tag_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* 创建和更新时间 */}
              <Separator className="my-4" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <p>
                  创建时间:{' '}
                  {book.create_time ? formatDate(book.create_time, 'yyyy-MM-dd HH:mm') : '未知'}
                </p>
                <p>
                  更新时间:{' '}
                  {book.update_time ? formatDate(book.update_time, 'yyyy-MM-dd HH:mm') : '未知'}
                </p>
              </div>
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
              <CardDescription>显示图书的全部借阅记录</CardDescription>
            </CardHeader>
            <CardContent>
              {borrowHistory.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">暂无借阅记录</p>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>借阅ID</TableHead>
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
                      {borrowHistory.map((record) => (
                        <TableRow key={record.borrow_id}>
                          <TableCell>{record.borrow_id}</TableCell>
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
                            <Badge variant={getBorrowStatusBadgeVariant(record.status)}>
                              {record.status === 1
                                ? '借出'
                                : record.status === 2
                                  ? '已归还'
                                  : record.status === 3
                                    ? '逾期'
                                    : record.status === 4
                                      ? '续借'
                                      : '未知'}
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
      </Tabs>

      {/* 编辑图书对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑图书</DialogTitle>
            <DialogDescription>修改图书信息</DialogDescription>
          </DialogHeader>
          <BookForm
            book={book}
            onClose={() => setIsEditDialogOpen(false)}
            onSubmit={handleBookUpdate}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BookDetail
