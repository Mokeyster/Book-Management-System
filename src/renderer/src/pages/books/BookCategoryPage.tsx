import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Folder, FolderPlus, Pencil, Trash2, ChevronRight, ChevronDown } from 'lucide-react'
import { IBookCategory } from '@appTypes/bookTypes'

import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Textarea } from '@ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Separator } from '@ui/separator'

interface ICategory {
  category_id: number
  category_name: string
  category_code?: string
  parent_id?: number
  level: number
  description?: string
  children?: ICategory[]
}

const BookCategoryPage = (): React.ReactElement => {
  const [categories, setCategories] = useState<ICategory[]>([])
  const [expandedCategories, setExpandedCategories] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ICategory | null>(null)
  const [parentCategories, setParentCategories] = useState<ICategory[]>([])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // 表单状态
  const [formData, setFormData] = useState({
    category_id: 0,
    category_name: '',
    category_code: '',
    parent_id: null as number | null,
    level: 1,
    description: ''
  })

  // 加载分类数据
  useEffect(() => {
    loadCategories()
  }, [])

  // 设置编辑时的表单初始值
  useEffect(() => {
    if (editingCategory) {
      setFormData({
        category_id: editingCategory.category_id,
        category_name: editingCategory.category_name,
        category_code: editingCategory.category_code || '',
        parent_id: editingCategory.parent_id || null,
        level: editingCategory.level,
        description: editingCategory.description || ''
      })
    } else {
      setFormData({
        category_id: 0,
        category_name: '',
        category_code: '',
        parent_id: null,
        level: 1,
        description: ''
      })
    }
    // 重置表单错误
    setFormErrors({})
  }, [editingCategory])

  // 加载分类树
  const loadCategories = async (): Promise<void> => {
    setLoading(true)
    try {
      // 获取分类树
      const categoryTree = await window.api.book.getCategoryTree()

      // 获取所有分类（不含树形结构，用于父分类选择）
      const allCategories = await window.api.book.getAllCategories()

      setCategories(categoryTree)
      setParentCategories(allCategories)
      setLoading(false)
    } catch (error) {
      console.error('获取分类数据失败:', error)
      toast.error('获取分类数据失败')
      setLoading(false)
    }
  }

  // 切换类别的展开/折叠状态
  const toggleExpand = (categoryId: number): void => {
    setExpandedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId)
      } else {
        return [...prev, categoryId]
      }
    })
  }

  // 表单变更处理
  const handleInputChange = (field: string, value: any): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))

    // 清除对应字段的错误
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // 表单验证
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.category_name.trim()) {
      errors.category_name = '分类名称不能为空'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // 处理提交
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      let result

      if (editingCategory) {
        // 更新分类
        const updateData = {
          ...formData,
          // 将 null 转换为 undefined 以匹配 IBookCategory 接口
          parent_id: formData.parent_id === null ? undefined : formData.parent_id
        }
        result = await window.api.book.updateCategory(updateData as IBookCategory)
        if (result) {
          toast.success('分类更新成功')
          await loadCategories()
        } else {
          toast.error('分类更新失败')
        }
      } else {
        // 添加分类
        const addData = {
          ...formData,
          // 将 null 转换为 undefined 以匹配 IBookCategory 接口
          parent_id: formData.parent_id === null ? undefined : formData.parent_id,
          // 确保有 category_id，因为 API 需要，这个值会被服务端替换
          category_id: 0
        }
        result = await window.api.book.addCategory(addData as IBookCategory)
        if (result) {
          toast.success('分类添加成功')
          await loadCategories()
        } else {
          toast.error('分类添加失败')
        }
      }

      // 关闭对话框
      handleDialogClose()
    } catch (error) {
      console.error('保存分类失败:', error)
      toast.error('保存分类失败')
    }
  }

  // 删除分类
  const handleDelete = async (category: ICategory): Promise<void> => {
    if (!confirm(`确定要删除分类"${category.category_name}"吗？`)) {
      return
    }

    try {
      const result = await window.api.book.deleteCategory(category.category_id)

      if (result.success) {
        toast.success('分类删除成功')
        await loadCategories()
      } else {
        toast.error(`分类删除失败: ${result.message}`)
      }
    } catch (error) {
      console.error('删除分类失败:', error)
      toast.error('删除分类失败')
    }
  }

  // 关闭对话框
  const handleDialogClose = (): void => {
    setIsDialogOpen(false)
    setEditingCategory(null)
  }

  // 处理父分类变更并自动调整层级
  const handleParentChange = (value: string): void => {
    const parentId = value === 'none' ? null : parseInt(value)
    handleInputChange('parent_id', parentId)

    // 如果选择了父分类，自动设置层级
    if (parentId) {
      const parentCategory = parentCategories.find((cat) => cat.category_id === parentId)
      if (parentCategory) {
        handleInputChange('level', parentCategory.level + 1)
      }
    } else {
      handleInputChange('level', 1)
    }
  }

  // 渲染分类树
  const renderCategoryTree = (categories: ICategory[], depth = 0): React.ReactNode => {
    return categories.map((category) => (
      <>
        <TableRow key={category.category_id}>
          <TableCell>
            <div className="flex items-center" style={{ paddingLeft: `${depth * 1.5}rem` }}>
              {category.children && category.children.length > 0 ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 p-0 mr-1"
                  onClick={() => toggleExpand(category.category_id)}
                >
                  {expandedCategories.includes(category.category_id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              ) : (
                <div className="w-7"></div>
              )}
              <Folder className="w-4 h-4 mr-2 text-muted-foreground" />
              <span>{category.category_name}</span>
            </div>
          </TableCell>
          <TableCell>{category.category_code || '-'}</TableCell>
          <TableCell>{category.level}</TableCell>
          <TableCell>
            <div className="max-w-xs truncate">{category.description || '-'}</div>
          </TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingCategory(category)
                  setIsDialogOpen(true)
                }}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(category)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>

        {/* 渲染子分类 */}
        {category.children &&
          category.children.length > 0 &&
          expandedCategories.includes(category.category_id) &&
          renderCategoryTree(category.children, depth + 1)}
      </>
    ))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">图书分类管理</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <FolderPlus className="w-4 h-4 mr-2" />
          添加分类
        </Button>
      </div>

      <Separator />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-lg text-muted-foreground">加载分类数据中...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-2">
          <Folder className="w-10 h-10 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">暂无分类数据</p>
          <Button onClick={() => setIsDialogOpen(true)} variant="outline">
            添加分类
          </Button>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>分类名称</TableHead>
                <TableHead>分类编码</TableHead>
                <TableHead>层级</TableHead>
                <TableHead>描述</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{renderCategoryTree(categories)}</TableBody>
          </Table>
        </div>
      )}

      {/* 添加/编辑分类对话框 */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleDialogClose()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? '编辑分类' : '添加分类'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? '修改图书分类信息' : '添加新的图书分类'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 分类名称 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                分类名称 <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="请输入分类名称"
                value={formData.category_name}
                onChange={(e) => handleInputChange('category_name', e.target.value)}
              />
              {formErrors.category_name && (
                <p className="text-sm text-red-500">{formErrors.category_name}</p>
              )}
            </div>

            {/* 分类编码 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">分类编码</label>
              <Input
                placeholder="请输入分类编码"
                value={formData.category_code}
                onChange={(e) => handleInputChange('category_code', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">可选，用于分类的唯一标识</p>
            </div>

            {/* 父分类 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">父分类</label>
              <Select
                value={formData.parent_id?.toString() || 'none'}
                onValueChange={handleParentChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择父分类（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无（顶级分类）</SelectItem>
                  {parentCategories
                    .filter(
                      (cat) =>
                        // 排除当前编辑的分类和其子分类
                        !editingCategory || cat.category_id !== editingCategory.category_id
                    )
                    .map((category) => (
                      <SelectItem
                        key={category.category_id}
                        value={category.category_id.toString()}
                      >
                        {category.level > 1
                          ? '　'.repeat(category.level - 1) + '└ ' + category.category_name
                          : category.category_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* 层级 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">层级</label>
              <Input
                type="number"
                min="1"
                value={formData.level}
                onChange={(e) => handleInputChange('level', parseInt(e.target.value))}
                disabled
              />
              <p className="text-xs text-muted-foreground">根据父分类自动设置</p>
            </div>

            {/* 描述 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">描述</label>
              <Textarea
                placeholder="请输入分类描述"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleDialogClose}>
                取消
              </Button>
              <Button type="submit">{editingCategory ? '保存修改' : '添加分类'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BookCategoryPage
