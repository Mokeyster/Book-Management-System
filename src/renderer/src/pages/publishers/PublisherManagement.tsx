import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Building, Globe, Mail, Phone, User } from 'lucide-react'
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
import { Separator } from '@ui/separator'
import { Textarea } from '@ui/textarea'

import { IPublisher } from '@appTypes/publisherTypes'

const PAGE_SIZE = 10

// 出版社表单组件
const PublisherForm = ({
  publisher,
  onClose,
  onSubmit
}: {
  publisher?: IPublisher
  onClose: () => void
  onSubmit: (values: IPublisher) => void
}): React.JSX.Element => {
  // 表单状态
  const [formData, setFormData] = useState({
    publisher_id: publisher?.publisher_id,
    name: publisher?.name || '',
    address: publisher?.address || '',
    contact_person: publisher?.contact_person || '',
    phone: publisher?.phone || '',
    email: publisher?.email || '',
    website: publisher?.website || '',
    description: publisher?.description || '',
    cooperation_history: publisher?.cooperation_history || ''
  })

  // 表单错误状态
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // 处理表单字段变化
  const handleInputChange = (field: string, value: string): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))

    // 清除当前字段的错误（如果有）
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const updated = { ...prev }
        delete updated[field]
        return updated
      })
    }
  }

  // 表单验证
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // 验证出版社名称（必填）
    if (!formData.name || formData.name.trim() === '') {
      errors.name = '出版社名称不能为空'
    }

    // 验证邮箱格式（如果有值）
    if (formData.email && formData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        errors.email = '请输入有效的邮箱地址'
      }
    }

    // 验证网站地址格式（如果有值）
    if (formData.website && formData.website.trim() !== '') {
      try {
        new URL(formData.website)
      } catch (_e) {
        errors.website = '请输入有效的网址'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      let result

      if (formData.publisher_id) {
        // 更新出版社
        result = await window.api.publisher.update(formData as IPublisher)

        if (result) {
          toast.success('出版社更新成功')
          onSubmit(formData as IPublisher)
        } else {
          toast.error('出版社更新失败')
        }
      } else {
        // 添加出版社
        result = await window.api.publisher.add(formData as IPublisher)

        if (typeof result === 'number' && result > 0) {
          toast.success('出版社添加成功')
          onSubmit({ ...formData, publisher_id: result } as IPublisher)
        } else {
          toast.error('出版社添加失败')
        }
      }
    } catch (error) {
      console.error('提交出版社数据错误:', error)
      toast.error('提交出版社数据失败')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 出版社名称 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            出版社名称 <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="请输入出版社名称"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
          />
          {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
        </div>

        {/* 联系人 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">联系人</label>
          <Input
            placeholder="请输入联系人姓名"
            value={formData.contact_person}
            onChange={(e) => handleInputChange('contact_person', e.target.value)}
          />
        </div>

        {/* 电话 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">联系电话</label>
          <Input
            placeholder="请输入联系电话"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
          />
        </div>

        {/* 邮箱 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">电子邮箱</label>
          <Input
            placeholder="请输入电子邮箱"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
          />
          {formErrors.email && <p className="text-sm text-red-500">{formErrors.email}</p>}
        </div>

        {/* 网站 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">网站</label>
          <Input
            placeholder="请输入网站地址"
            value={formData.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
          />
          {formErrors.website && <p className="text-sm text-red-500">{formErrors.website}</p>}
        </div>

        {/* 地址 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">地址</label>
          <Input
            placeholder="请输入出版社地址"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
          />
        </div>
      </div>

      {/* 描述 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">出版社简介</label>
        <Textarea
          placeholder="请输入出版社简介"
          className="min-h-24"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
        />
      </div>

      {/* 合作历史 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">合作历史</label>
        <Textarea
          placeholder="请输入与该出版社的合作历史"
          className="min-h-24"
          value={formData.cooperation_history}
          onChange={(e) => handleInputChange('cooperation_history', e.target.value)}
        />
        <p className="text-sm text-muted-foreground">记录与该出版社的合作历史、注意事项等</p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} type="button">
          取消
        </Button>
        <Button type="submit">{publisher ? '保存修改' : '添加出版社'}</Button>
      </DialogFooter>
    </form>
  )
}

const PublisherManagement = (): React.ReactElement => {
  const [publishers, setPublishers] = useState<IPublisher[]>([])
  const [filteredPublishers, setFilteredPublishers] = useState<IPublisher[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPublisher, setSelectedPublisher] = useState<IPublisher | undefined>(undefined)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 加载出版社数据
  useEffect(() => {
    fetchPublishers()
  }, [])

  // 根据搜索条件和分页过滤出版社
  useEffect(() => {
    let result = [...publishers]

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (publisher) =>
          publisher.name.toLowerCase().includes(query) ||
          publisher.contact_person?.toLowerCase().includes(query) ||
          publisher.phone?.toLowerCase().includes(query) ||
          publisher.email?.toLowerCase().includes(query)
      )
    }

    setFilteredPublishers(result)
    setCurrentPage(1) // 重置到第一页
  }, [searchQuery, publishers])

  // 获取当前页的出版社
  const getCurrentPagePublishers = (): IPublisher[] => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredPublishers.slice(startIndex, startIndex + PAGE_SIZE)
  }

  // 获取总页数
  const totalPages = Math.max(1, Math.ceil(filteredPublishers.length / PAGE_SIZE))

  // 加载所有出版社
  const fetchPublishers = async (): Promise<void> => {
    setLoading(true)
    try {
      const data = await window.api.publisher.getAll()
      setPublishers(data)
      setFilteredPublishers(data)
    } catch (error) {
      console.error('获取出版社失败:', error)
      toast.error('获取出版社列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 删除出版社
  const handleDelete = async (): Promise<void> => {
    if (!selectedPublisher) return

    setIsDeleting(true)
    try {
      const result = await window.api.publisher.delete(selectedPublisher.publisher_id)

      if (result) {
        toast.success('出版社删除成功')
        setPublishers((prev) =>
          prev.filter((p) => p.publisher_id !== selectedPublisher.publisher_id)
        )
        setIsDeleteDialogOpen(false)
      } else {
        toast.error('出版社删除失败')
      }
    } catch (error) {
      console.error('删除出版社错误:', error)
      toast.error('删除出版社时出错')
    } finally {
      setIsDeleting(false)
    }
  }

  // 处理出版社表单提交（添加或更新）
  const handlePublisherSubmit = (publisher: IPublisher): void => {
    if (selectedPublisher) {
      // 更新
      setPublishers((prev) =>
        prev.map((p) => (p.publisher_id === publisher.publisher_id ? publisher : p))
      )
    } else {
      // 添加
      setPublishers((prev) => [...prev, publisher])
    }

    setIsDialogOpen(false)
    setSelectedPublisher(undefined)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">出版社管理</h1>
        <Button
          onClick={() => {
            setSelectedPublisher(undefined)
            setIsDialogOpen(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          添加出版社
        </Button>
      </div>

      <div className="flex items-center max-w-md space-x-2">
        <Input
          placeholder="搜索出版社 (名称、联系人、电话、邮箱)"
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
          <p className="text-lg text-muted-foreground">加载出版社数据中...</p>
        </div>
      ) : filteredPublishers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-2">
          <Building className="w-10 h-10 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">
            {searchQuery ? '没有找到匹配的出版社' : '暂无出版社数据'}
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
                  <TableHead>出版社名称</TableHead>
                  <TableHead>联系人</TableHead>
                  <TableHead>联系电话</TableHead>
                  <TableHead>电子邮箱</TableHead>
                  <TableHead>网站</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getCurrentPagePublishers().map((publisher) => (
                  <TableRow key={publisher.publisher_id}>
                    <TableCell>
                      <div className="font-medium">{publisher.name}</div>
                      {publisher.address && (
                        <div className="text-xs text-muted-foreground">{publisher.address}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {publisher.contact_person ? (
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-1 text-muted-foreground" />
                          {publisher.contact_person}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {publisher.phone ? (
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-1 text-muted-foreground" />
                          {publisher.phone}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {publisher.email ? (
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-1 text-muted-foreground" />
                          {publisher.email}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {publisher.website ? (
                        <div className="flex items-center">
                          <Globe className="w-4 h-4 mr-1 text-muted-foreground" />
                          <a
                            href={publisher.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            访问网站
                          </a>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPublisher(publisher)
                            setIsDialogOpen(true)
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPublisher(publisher)
                            setIsDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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

      {/* 出版社表单对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedPublisher ? '编辑出版社' : '添加出版社'}</DialogTitle>
            <DialogDescription>
              {selectedPublisher ? '修改出版社信息' : '添加新出版社到系统'}
            </DialogDescription>
          </DialogHeader>
          <PublisherForm
            publisher={selectedPublisher}
            onClose={() => setIsDialogOpen(false)}
            onSubmit={handlePublisherSubmit}
          />
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              {`您确定要删除出版社 "${selectedPublisher?.name}" 吗？此操作无法撤销。`}
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

export default PublisherManagement
