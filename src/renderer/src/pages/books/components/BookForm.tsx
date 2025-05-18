import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Input } from '@ui/input'
import { Textarea } from '@ui/textarea'
import { Calendar } from '@ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover'
import { cn } from '~/utils'
import { IBook } from '@appTypes/bookTypes'
import { IBookCategory } from '@appTypes/bookTypes'
import { IPublisher } from '@appTypes/publisherTypes'

interface BookFormProps {
  book: IBook | null
  onClose: () => void
  onSubmit: (book: IBook, isNew: boolean) => void
}

const BookForm = ({ book, onClose, onSubmit }: BookFormProps): React.JSX.Element => {
  const [publishers, setPublishers] = useState<IPublisher[]>([])
  const [categories, setCategories] = useState<IBookCategory[]>([])
  const [loading, setLoading] = useState(false)

  // 表单错误状态
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 表单状态
  const [formData, setFormData] = useState<Partial<IBook>>({
    book_id: book?.book_id,
    isbn: book?.isbn || '',
    title: book?.title || '',
    author: book?.author || '',
    publisher_id: book?.publisher_id || undefined,
    publish_date: book?.publish_date || undefined,
    price: book?.price || undefined,
    category_id: book?.category_id || undefined,
    location: book?.location || '',
    description: book?.description || '',
    status: book?.status || 1
  })

  // 加载出版社和分类数据
  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        // 获取出版社数据
        const publishersData = await window.api.publisher.getAll()
        setPublishers(publishersData)

        // 获取图书分类数据
        const categoriesData = await window.api.book.getAllCategories()
        setCategories(categoriesData)
      } catch (error) {
        console.error('获取数据失败:', error)
        toast.error('加载表单数据失败')
      }
    }

    fetchData()
  }, [])

  // 表单验证函数
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // 验证书名（必填项）
    if (!formData.title || formData.title.trim() === '') {
      newErrors.title = '书名不能为空'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 处理表单字段变化
  const handleChange = (field: keyof IBook, value: any): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))

    // 清除当前字段的错误（如果有）
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev }
        delete updated[field]
        return updated
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    // 验证表单
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const isNew = !formData.book_id

      // 处理日期格式
      const submitData = { ...formData }
      if (submitData.publish_date) {
        submitData.publish_date = new Date(submitData.publish_date).toISOString().split('T')[0]
      }

      let result: number | boolean
      if (isNew) {
        // 添加新图书
        result = await window.api.book.add(submitData as IBook)
        if (typeof result === 'number' && result > 0) {
          toast.success('图书添加成功')
          // 更新book_id并返回完整图书对象
          onSubmit({ ...submitData, book_id: result } as IBook, isNew)
        } else {
          toast.error('图书添加失败')
        }
      } else {
        // 更新图书
        result = await window.api.book.update(submitData as IBook)
        if (result === true) {
          toast.success('图书更新成功')
          onSubmit(submitData as IBook, isNew)
        } else {
          toast.error('图书更新失败')
        }
      }
    } catch (error) {
      console.error('提交图书数据错误:', error)
      toast.error('提交图书数据失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-foreground">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 图书标题 */}
        <div className="flex flex-col space-y-2">
          <label className="font-medium">
            书名 <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="请输入图书名称"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
          />
          {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
        </div>

        {/* ISBN */}
        <div className="flex flex-col space-y-2">
          <label className="font-medium">ISBN</label>
          <Input
            placeholder="请输入ISBN编号"
            value={formData.isbn || ''}
            onChange={(e) => handleChange('isbn', e.target.value)}
          />
        </div>

        {/* 作者 */}
        <div className="flex flex-col space-y-2">
          <label className="font-medium">作者</label>
          <Input
            placeholder="请输入作者"
            value={formData.author || ''}
            onChange={(e) => handleChange('author', e.target.value)}
          />
        </div>

        {/* 出版社 */}
        <div className="flex flex-col space-y-2">
          <label className="font-medium">出版社</label>
          <Select
            value={formData.publisher_id?.toString() || ''}
            onValueChange={(value) => handleChange('publisher_id', Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择出版社" />
            </SelectTrigger>
            <SelectContent>
              {publishers.map((publisher) => (
                <SelectItem key={publisher.publisher_id} value={publisher.publisher_id.toString()}>
                  {publisher.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 出版日期 */}
        <div className="flex flex-col space-y-2">
          <label className="font-medium">出版日期</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className={cn(
                  'w-full pl-3 text-left font-normal',
                  !formData.publish_date && 'text-muted-foreground'
                )}
              >
                {formData.publish_date ? (
                  format(new Date(formData.publish_date), 'yyyy-MM-dd')
                ) : (
                  <span>请选择出版日期</span>
                )}
                <CalendarIcon className="w-4 h-4 ml-auto opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.publish_date ? new Date(formData.publish_date) : undefined}
                onSelect={(date) =>
                  handleChange('publish_date', date ? format(date, 'yyyy-MM-dd') : '')
                }
                disabled={(date) => date > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* 价格 */}
        <div className="flex flex-col space-y-2">
          <label className="font-medium">价格</label>
          <Input
            type="number"
            step="0.01"
            placeholder="请输入价格"
            value={formData.price || ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : Number(e.target.value)
              handleChange('price', val)
            }}
          />
        </div>

        {/* 分类 */}
        <div className="flex flex-col space-y-2">
          <label className="font-medium">图书分类</label>
          <Select
            value={formData.category_id?.toString() || ''}
            onValueChange={(value) => handleChange('category_id', Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择分类" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.category_id} value={category.category_id.toString()}>
                  {category.category_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 馆藏位置 */}
        <div className="flex flex-col space-y-2">
          <label className="font-medium">馆藏位置</label>
          <Input
            placeholder="请输入馆藏位置"
            value={formData.location || ''}
            onChange={(e) => handleChange('location', e.target.value)}
          />
        </div>

        {/* 图书状态 */}
        <div className="flex flex-col space-y-2">
          <label className="font-medium">图书状态</label>
          <Select
            value={formData.status?.toString() || '1'}
            onValueChange={(value) => handleChange('status', Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">在库</SelectItem>
              <SelectItem value="2">借出</SelectItem>
              <SelectItem value="3">预约</SelectItem>
              <SelectItem value="4">损坏</SelectItem>
              <SelectItem value="5">丢失</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 图书简介 */}
      <div className="flex flex-col space-y-2">
        <label className="font-medium">图书简介</label>
        <Textarea
          placeholder="请输入图书简介"
          className="min-h-32"
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
        />
      </div>

      {/* 表单操作按钮 */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose} type="button">
          取消
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {book ? '保存修改' : '添加图书'}
        </Button>
      </div>
    </form>
  )
}

export default BookForm
