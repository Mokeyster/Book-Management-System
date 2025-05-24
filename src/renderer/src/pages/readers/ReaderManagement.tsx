import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate, readerStatusMap } from '~/utils'
import { Edit, Eye, Plus, Trash2, Users } from 'lucide-react'
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

import { IReader } from '@appTypes/readerTypes'
import ReaderForm from './components/ReaderForm'

const PAGE_SIZE = 10

const ReaderManagement = (): React.ReactElement => {
  const navigate = useNavigate()
  const [readers, setReaders] = useState<IReader[]>([])
  const [filteredReaders, setFilteredReaders] = useState<IReader[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedReader, setSelectedReader] = useState<IReader | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 加载读者数据
  useEffect(() => {
    fetchReaders()
  }, [])

  // 根据搜索条件和分页过滤读者
  useEffect(() => {
    let result = [...readers]

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (reader) =>
          reader.name.toLowerCase().includes(query) ||
          reader.phone?.toLowerCase().includes(query) ||
          reader.id_card?.toLowerCase().includes(query) ||
          reader.email?.toLowerCase().includes(query)
      )
    }

    setFilteredReaders(result)
    setCurrentPage(1) // 重置到第一页
  }, [searchQuery, readers])

  // 获取当前页的读者
  const getCurrentPageReaders = (): IReader[] => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredReaders.slice(startIndex, startIndex + PAGE_SIZE)
  }

  // 获取总页数
  const totalPages = Math.max(1, Math.ceil(filteredReaders.length / PAGE_SIZE))

  // 加载所有读者
  const fetchReaders = async (): Promise<void> => {
    setLoading(true)
    try {
      const data = await window.api.reader.getAll()
      setReaders(data)
      setFilteredReaders(data)
    } catch (error) {
      console.error('获取读者失败:', error)
      toast.error('获取读者列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 删除读者
  const handleDelete = async (): Promise<void> => {
    if (!selectedReader) return

    setIsDeleting(true)
    try {
      const result = await window.api.reader.delete(selectedReader.reader_id)
      if (result.success) {
        toast.success('读者删除成功')
        // 更新读者列表
        setReaders((prev) => prev.filter((reader) => reader.reader_id !== selectedReader.reader_id))
        setIsDeleteDialogOpen(false)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('删除读者错误:', error)
      toast.error('删除读者时出错')
    } finally {
      setIsDeleting(false)
    }
  }

  // 处理读者表单提交（添加或更新）
  const handleReaderSubmit = (updatedReader: IReader, isNew: boolean): void => {
    if (isNew) {
      setReaders((prev) => [...prev, updatedReader])
    } else {
      setReaders((prev) =>
        prev.map((reader) =>
          reader.reader_id === updatedReader.reader_id ? updatedReader : reader
        )
      )
    }
    setIsDialogOpen(false)
    setSelectedReader(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">读者管理</h1>
        <Button
          onClick={() => {
            setSelectedReader(null)
            setIsDialogOpen(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          添加读者
        </Button>
      </div>

      <div className="flex items-center max-w-md space-x-2">
        <Input
          placeholder="搜索读者 (姓名, 手机号, 身份证号)"
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
          <p className="text-lg text-muted-foreground">加载读者数据中...</p>
        </div>
      ) : filteredReaders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-2">
          <Users className="w-10 h-10 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">
            {searchQuery ? '没有找到匹配的读者' : '暂无读者数据'}
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
                  <TableHead className="min-w-[120px]">姓名</TableHead>
                  <TableHead>性别</TableHead>
                  <TableHead>手机号码</TableHead>
                  <TableHead>身份证号</TableHead>
                  <TableHead>注册日期</TableHead>
                  <TableHead>可借数量</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getCurrentPageReaders().map((reader) => (
                  <TableRow key={reader.reader_id}>
                    <TableCell>{reader.reader_id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{reader.name}</div>
                      {reader.type_name && (
                        <div className="text-xs text-muted-foreground">{reader.type_name}</div>
                      )}
                    </TableCell>
                    <TableCell>{reader.gender || '-'}</TableCell>
                    <TableCell>{reader.phone || '-'}</TableCell>
                    <TableCell>{reader.id_card || '-'}</TableCell>
                    <TableCell>
                      {reader.register_date ? formatDate(reader.register_date) : '-'}
                    </TableCell>
                    <TableCell>{reader.borrow_quota || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          reader.status === 1
                            ? 'outline'
                            : reader.status === 2
                              ? 'default'
                              : 'destructive'
                        }
                      >
                        {readerStatusMap[reader.status]?.text || `状态${reader.status}`}
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
                                onClick={() => navigate(`/readers/${reader.reader_id}`)}
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
                                  setSelectedReader(reader)
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
                                  setSelectedReader(reader)
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

      {/* 读者表单弹窗 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedReader ? '编辑读者' : '添加读者'}</DialogTitle>
            <DialogDescription>
              {selectedReader ? '修改读者信息' : '添加新读者到系统'}
            </DialogDescription>
          </DialogHeader>
          <ReaderForm
            reader={selectedReader}
            onClose={() => setIsDialogOpen(false)}
            onSubmit={handleReaderSubmit}
          />
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              {`您确定要删除读者 "${selectedReader?.name}" 吗？此操作无法撤销，且将影响相关的借阅记录。`}
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

export default ReaderManagement
