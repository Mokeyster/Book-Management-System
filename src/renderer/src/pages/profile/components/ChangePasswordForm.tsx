import { useState } from 'react'
import { toast } from 'sonner'
import { Eye, EyeOff, Lock } from 'lucide-react'

import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { useAuthStore } from '~/store/authStore'

interface ChangePasswordFormProps {
  userId: number
  onClose: () => void
}

const ChangePasswordForm = ({ userId, onClose }: ChangePasswordFormProps): React.JSX.Element => {
  const { changePassword } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  // 表单状态
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
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

  // 切换密码显示/隐藏
  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm'): void => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  // 表单验证
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.currentPassword) {
      errors.currentPassword = '请输入当前密码'
    }

    if (!formData.newPassword) {
      errors.newPassword = '请输入新密码'
    } else if (formData.newPassword.length < 6) {
      errors.newPassword = '新密码至少需要6个字符'
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = '请确认新密码'
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致'
    }

    // 验证新旧密码是否相同
    if (
      formData.currentPassword &&
      formData.newPassword &&
      formData.currentPassword === formData.newPassword
    ) {
      errors.newPassword = '新密码不能与当前密码相同'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const result = await changePassword(userId, formData.currentPassword, formData.newPassword)

      if (result.success) {
        toast.success('密码修改成功')
        onClose()
      } else {
        toast.error(result.error || '密码修改失败')
      }
    } catch (error) {
      console.error('修改密码错误:', error)
      toast.error('密码修改失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 当前密码 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          当前密码 <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <Lock className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
          <Input
            type={showPasswords.current ? 'text' : 'password'}
            placeholder="请输入当前密码"
            className="pl-9 pr-9"
            value={formData.currentPassword}
            onChange={(e) => handleInputChange('currentPassword', e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-7 w-7"
            onClick={() => togglePasswordVisibility('current')}
          >
            {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
        {formErrors.currentPassword && (
          <p className="text-sm text-destructive">{formErrors.currentPassword}</p>
        )}
      </div>

      {/* 新密码 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          新密码 <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <Lock className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
          <Input
            type={showPasswords.new ? 'text' : 'password'}
            placeholder="请输入新密码"
            className="pl-9 pr-9"
            value={formData.newPassword}
            onChange={(e) => handleInputChange('newPassword', e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-7 w-7"
            onClick={() => togglePasswordVisibility('new')}
          >
            {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
        {formErrors.newPassword && (
          <p className="text-sm text-destructive">{formErrors.newPassword}</p>
        )}
        <p className="text-xs text-muted-foreground">密码至少需要6个字符</p>
      </div>

      {/* 确认新密码 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          确认新密码 <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <Lock className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
          <Input
            type={showPasswords.confirm ? 'text' : 'password'}
            placeholder="请再次输入新密码"
            className="pl-9 pr-9"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-7 w-7"
            onClick={() => togglePasswordVisibility('confirm')}
          >
            {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
        {formErrors.confirmPassword && (
          <p className="text-sm text-destructive">{formErrors.confirmPassword}</p>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end pt-4 space-x-2">
        <Button variant="outline" onClick={onClose} type="button">
          取消
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? '修改中...' : '确认修改'}
        </Button>
      </div>
    </form>
  )
}

export default ChangePasswordForm
