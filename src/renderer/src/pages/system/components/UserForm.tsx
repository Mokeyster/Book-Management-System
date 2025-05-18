import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Input } from '@ui/input'
import { ISystemUser, ISystemRole } from '@appTypes/systemTypes'

interface UserFormProps {
  user: ISystemUser | null
  onClose: () => void
  onSubmit: (user: ISystemUser, isNew: boolean) => void
  isNew: boolean
}

const UserForm = ({ user, onClose, onSubmit, isNew }: UserFormProps): React.JSX.Element => {
  const [roles, setRoles] = useState<ISystemRole[]>([])
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // 表单状态
  const [formData, setFormData] = useState({
    user_id: user?.user_id,
    username: user?.username || '',
    password_hash: '',
    real_name: user?.real_name || '',
    role_id: user?.role_id || 2, // 默认为普通管理员
    phone: user?.phone || '',
    email: user?.email || '',
    status: user?.status || 1
  })

  // 加载角色数据
  useEffect(() => {
    const fetchRoles = async (): Promise<void> => {
      try {
        const rolesData = await window.api.system.getAllRoles()
        setRoles(rolesData)
      } catch (error) {
        console.error('获取角色数据失败:', error)
        toast.error('加载角色数据失败')
      }
    }

    fetchRoles()
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

    // 验证用户名
    if (!formData.username) {
      errors.username = '用户名不能为空'
    } else if (formData.username.length < 3) {
      errors.username = '用户名至少需要3个字符'
    }

    // 验证密码（仅在添加新用户时）
    if (isNew) {
      if (!formData.password_hash) {
        errors.password_hash = '密码不能为空'
      } else if (formData.password_hash.length < 6) {
        errors.password_hash = '密码至少需要6个字符'
      }
    }

    // 验证角色
    if (!formData.role_id) {
      errors.role_id = '请选择角色'
    }

    // 验证邮箱（如果有值）
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
      let result: number | boolean

      // 创建提交数据对象
      const submitData = { ...formData }

      if (isNew) {
        // 添加新用户
        result = await window.api.system.addUser(submitData as ISystemUser)
        if (typeof result === 'number' && result > 0) {
          toast.success('用户添加成功')
          // 返回完整用户对象，包括ID
          onSubmit({ ...submitData, user_id: result } as ISystemUser, isNew)
        } else {
          toast.error('用户添加失败')
        }
      } else {
        // 更新用户
        result = await window.api.system.updateUser(submitData as ISystemUser)
        if (result === true) {
          toast.success('用户更新成功')
          onSubmit(submitData as ISystemUser, isNew)
        } else {
          toast.error('用户更新失败')
        }
      }
    } catch (error) {
      console.error('提交用户数据错误:', error)
      toast.error('提交用户数据失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 用户名 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            用户名 <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="请输入用户名"
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
          />
          {formErrors.username && <p className="text-sm text-red-500">{formErrors.username}</p>}
        </div>

        {/* 密码 - 仅在添加时显示 */}
        {isNew && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              密码 <span className="text-red-500">*</span>
            </label>
            <Input
              type="password"
              placeholder="请输入密码"
              value={formData.password_hash}
              onChange={(e) => handleInputChange('password_hash', e.target.value)}
            />
            {formErrors.password_hash && (
              <p className="text-sm text-red-500">{formErrors.password_hash}</p>
            )}
          </div>
        )}

        {/* 真实姓名 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">真实姓名</label>
          <Input
            placeholder="请输入真实姓名"
            value={formData.real_name || ''}
            onChange={(e) => handleInputChange('real_name', e.target.value)}
          />
        </div>

        {/* 角色 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            角色 <span className="text-red-500">*</span>
          </label>
          <Select
            value={formData.role_id?.toString()}
            onValueChange={(value) => handleInputChange('role_id', Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择角色" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.role_id} value={role.role_id.toString()}>
                  {role.role_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formErrors.role_id && <p className="text-sm text-red-500">{formErrors.role_id}</p>}
        </div>

        {/* 手机号 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">手机号</label>
          <Input
            placeholder="请输入手机号"
            value={formData.phone || ''}
            onChange={(e) => handleInputChange('phone', e.target.value)}
          />
        </div>

        {/* 邮箱 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">邮箱</label>
          <Input
            type="email"
            placeholder="请输入邮箱"
            value={formData.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
          />
          {formErrors.email && <p className="text-sm text-red-500">{formErrors.email}</p>}
        </div>

        {/* 状态 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">状态</label>
          <Select
            value={formData.status?.toString()}
            onValueChange={(value) => handleInputChange('status', Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">正常</SelectItem>
              <SelectItem value="2">锁定</SelectItem>
              <SelectItem value="3">禁用</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 表单操作按钮 */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose} type="button">
          取消
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isNew ? '添加用户' : '保存修改'}
        </Button>
      </div>
    </form>
  )
}

export default UserForm
