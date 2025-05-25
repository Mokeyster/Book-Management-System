import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Input } from '@ui/input'
import { Calendar } from '@ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover'
import { cn } from '~/utils'
import { IReader, IReaderType } from '@appTypes/readerTypes'
import { RadioGroup, RadioGroupItem } from '@ui/radio-group'
import { useAuthStore } from '~/store/authStore'

interface ReaderFormProps {
  reader: IReader | null
  onClose: () => void
  onSubmit: (reader: IReader, isNew: boolean) => void
}

const ReaderForm = ({ reader, onClose, onSubmit }: ReaderFormProps): React.JSX.Element => {
  const currentUser = useAuthStore((state) => state.currentUser)
  const [readerTypes, setReaderTypes] = useState<IReaderType[]>([])
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // 表单状态
  const [formData, setFormData] = useState({
    reader_id: reader?.reader_id,
    name: reader?.name || '',
    gender: reader?.gender || '男',
    id_card: reader?.id_card || '',
    phone: reader?.phone || '',
    email: reader?.email || '',
    address: reader?.address || '',
    register_date: reader?.register_date || format(new Date(), 'yyyy-MM-dd'),
    status: reader?.status || 1,
    type_id: reader?.type_id
  })

  // 加载读者类型数据
  useEffect(() => {
    const fetchReaderTypes = async (): Promise<void> => {
      try {
        const types = await window.api.reader.getTypes()
        setReaderTypes(types)
      } catch (error) {
        console.error('获取读者类型失败:', error)
        toast.error('加载读者类型数据失败')
      }
    }

    fetchReaderTypes()
  }, [])

  // 处理表单字段变化
  const handleInputChange = (field: string, value: any): void => {
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

    // 姓名验证（必填）
    if (!formData.name || formData.name.trim() === '') {
      errors.name = '姓名不能为空'
    }

    // 邮箱验证（如果有值，必须是有效格式）
    if (formData.email && formData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        errors.email = '请输入有效的邮箱地址'
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

    setLoading(true)
    try {
      const isNew = !formData.reader_id

      // 处理日期格式
      const submitData = { ...formData }
      if (submitData.register_date) {
        submitData.register_date = new Date(submitData.register_date).toISOString().split('T')[0]
      }

      let result: number | boolean
      if (isNew) {
        // 添加新读者
        result = await window.api.reader.add(submitData as IReader, currentUser?.user_id)
        if (typeof result === 'number' && result > 0) {
          toast.success('读者添加成功')
          // 更新reader_id并返回完整读者对象
          onSubmit({ ...submitData, reader_id: result } as IReader, isNew)
        } else {
          toast.error('读者添加失败')
        }
      } else {
        // 更新读者
        result = await window.api.reader.update(submitData as IReader, currentUser?.user_id)
        if (result === true) {
          toast.success('读者更新成功')
          onSubmit(submitData as IReader, isNew)
        } else {
          toast.error('读者更新失败')
        }
      }
    } catch (error) {
      console.error('提交读者数据错误:', error)
      toast.error('提交读者数据失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 读者姓名 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            姓名 <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="请输入读者姓名"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
          />
          {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
        </div>

        {/* 性别 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">性别</label>
          <RadioGroup
            value={formData.gender || '男'}
            onValueChange={(value) => handleInputChange('gender', value)}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="男" id="male" />
              <label htmlFor="male" className="text-sm font-normal cursor-pointer">
                男
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="女" id="female" />
              <label htmlFor="female" className="text-sm font-normal cursor-pointer">
                女
              </label>
            </div>
          </RadioGroup>
        </div>

        {/* 身份证号码 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">身份证号码</label>
          <Input
            placeholder="请输入身份证号"
            value={formData.id_card || ''}
            onChange={(e) => handleInputChange('id_card', e.target.value)}
          />
        </div>

        {/* 手机号码 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">手机号码</label>
          <Input
            placeholder="请输入手机号码"
            value={formData.phone || ''}
            onChange={(e) => handleInputChange('phone', e.target.value)}
          />
        </div>

        {/* 邮箱 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">电子邮箱</label>
          <Input
            placeholder="请输入邮箱地址"
            value={formData.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
          />
          {formErrors.email && <p className="text-sm text-red-500">{formErrors.email}</p>}
        </div>

        {/* 注册日期 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">注册日期</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full pl-3 text-left font-normal',
                  !formData.register_date && 'text-muted-foreground'
                )}
              >
                {formData.register_date ? (
                  format(new Date(formData.register_date), 'yyyy-MM-dd')
                ) : (
                  <span>请选择注册日期</span>
                )}
                <CalendarIcon className="w-4 h-4 ml-auto opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.register_date ? new Date(formData.register_date) : undefined}
                onSelect={(date) =>
                  handleInputChange('register_date', date ? format(date, 'yyyy-MM-dd') : '')
                }
                disabled={(date) => date > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* 读者类型 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">读者类型</label>
          <Select
            value={formData.type_id?.toString() || ''}
            onValueChange={(value) => handleInputChange('type_id', Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择读者类型" />
            </SelectTrigger>
            <SelectContent>
              {readerTypes.map((type) => (
                <SelectItem key={type.type_id} value={type.type_id.toString()}>
                  {type.type_name} (最多借{type.max_borrow_count}本, {type.max_borrow_days}天)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 状态 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">状态</label>
          <Select
            value={formData.status?.toString() || '1'}
            onValueChange={(value) => handleInputChange('status', Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">正常</SelectItem>
              <SelectItem value="2">暂停</SelectItem>
              <SelectItem value="3">注销</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 地址 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">地址</label>
        <Input
          placeholder="请输入地址"
          value={formData.address || ''}
          onChange={(e) => handleInputChange('address', e.target.value)}
        />
      </div>

      {/* 表单操作按钮 */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose} type="button">
          取消
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {reader ? '保存修改' : '添加读者'}
        </Button>
      </div>
    </form>
  )
}

export default ReaderForm
