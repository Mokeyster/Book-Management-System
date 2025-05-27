import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate, bookStatusMap } from '~/utils'
import { Book, Edit, Eye, Plus, Search, Trash2 } from 'lucide-react'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/tooltip'

import { useAuthStore } from '~/store/authStore'
import { IBook } from '@appTypes/bookTypes'
import BookForm from './components/BookForm'

const PAGE_SIZE = 10

const BookManagement = (): React.ReactElement => {
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.currentUser)
  const [books, setBooks] = useState<IBook[]>([])
  const [filteredBooks, setFilteredBooks] = useState<IBook[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedBook, setSelectedBook] = useState<IBook | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 加载图书数据
  useEffect(() => {
    fetchBooks()
  }, [])

  // 根据搜索条件和分页过滤图书
  useEffect(() => {
    let result = [...books]

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (book) =>
          book.title.toLowerCase().includes(query) ||
          book.author?.toLowerCase().includes(query) ||
          book.isbn?.toLowerCase().includes(query) ||
          book.publisher_name?.toLowerCase().includes(query)
      )
    }

    setFilteredBooks(result)
    setCurrentPage(1) // 重置到第一页
  }, [searchQuery, books])

  // 获取当前页的图书
  const getCurrentPageBooks = (): IBook[] => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredBooks.slice(startIndex, startIndex + PAGE_SIZE)
  }

  // 获取总页数
  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE))

  // 加载所有图书
  const fetchBooks = async (): Promise<void> => {
    setLoading(true)
    try {
      const data = await window.api.book.getAll()
      setBooks(data)
      setFilteredBooks(data)
    } catch (error) {
      console.error('获取图书失败:', error)
      toast.error('获取图书列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 删除图书
  const handleDelete = async (): Promise<void> => {
    if (!selectedBook) return

    setIsDeleting(true)
    try {
      const result = await window.api.book.delete(selectedBook.book_id, currentUser?.user_id)
      if (result.success) {
        toast.success('图书删除成功')
        // 更新图书列表
        setBooks((prev) => prev.filter((book) => book.book_id !== selectedBook.book_id))
        setIsDeleteDialogOpen(false)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('删除图书错误:', error)
      toast.error('删除图书时出错')
    } finally {
      setIsDeleting(false)
    }
  }

  // 处理图书表单提交（添加或更新）
  const handleBookSubmit = (updatedBook: IBook, isNew: boolean): void => {
    if (isNew) {
      setBooks((prev) => [...prev, updatedBook])
    } else {
      setBooks((prev) =>
        prev.map((book) => (book.book_id === updatedBook.book_id ? updatedBook : book))
      )
    }
    setIsDialogOpen(false)
    setSelectedBook(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">图书管理</h1>
        <Button
          onClick={() => {
            setSelectedBook(null)
            setIsDialogOpen(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          添加图书
        </Button>
      </div>

      <div className="flex items-center max-w-md space-x-2">
        <div className="relative flex items-center max-w-md">
          <div className="absolute left-2">
            <Search className="w-4 h-4 text-muted-foreground" />
          </div>
          <Input
            placeholder="搜索图书 (书名, 作者, ISBN, 出版社)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md pl-8 w-[300px]"
          />
        </div>
        {searchQuery && (
          <Button variant="ghost" onClick={() => setSearchQuery('')} size="sm">
            清除
          </Button>
        )}
      </div>

      <Separator />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-lg text-muted-foreground">加载图书数据中...</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-2">
          <Book className="w-10 h-10 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">
            {searchQuery ? '没有找到匹配的图书' : '暂无图书数据'}
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
                  <TableHead className="min-w-[200px]">书名</TableHead>
                  <TableHead>ISBN</TableHead>
                  <TableHead>作者</TableHead>
                  <TableHead>出版社</TableHead>
                  <TableHead>出版日期</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getCurrentPageBooks().map((book) => (
                  <TableRow key={book.book_id}>
                    <TableCell>{book.book_id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{book.title}</div>
                      {book.category_name && (
                        <div className="text-xs text-muted-foreground">{book.category_name}</div>
                      )}
                    </TableCell>
                    <TableCell>{book.isbn || '-'}</TableCell>
                    <TableCell>{book.author || '-'}</TableCell>
                    <TableCell>{book.publisher_name || '-'}</TableCell>
                    <TableCell>{book.publish_date ? formatDate(book.publish_date) : '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          book.status === 1
                            ? 'secondary' // 在库，使用secondary替代success
                            : book.status === 2
                              ? 'default' // 借出
                              : book.status === 3
                                ? 'secondary' // 预约
                                : book.status === 4
                                  ? 'destructive' // 损坏
                                  : 'outline' // 其他状态
                        }
                      >
                        {bookStatusMap[book.status]?.text || `状态${book.status}`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/books/${book.book_id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>查看详情</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedBook(book)
                                  setIsDialogOpen(true)
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>编辑</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedBook(book)
                                  setIsDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>删除</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
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
                <PaginationPrevious
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-4">
                  {currentPage} / {totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </>
      )}

      {/* 图书表单弹窗 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBook ? '编辑图书' : '添加图书'}</DialogTitle>
            <DialogDescription>
              {selectedBook ? '修改图书信息' : '添加新图书到系统'}
            </DialogDescription>
          </DialogHeader>
          <BookForm
            book={selectedBook}
            onClose={() => setIsDialogOpen(false)}
            onSubmit={handleBookSubmit}
          />
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              您确定要删除图书 &ldquo;{selectedBook?.title}&rdquo; 吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BookManagement
