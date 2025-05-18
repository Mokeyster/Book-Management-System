import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { DialogFooter } from '@ui/dialog'

interface ResetPasswordFormProps {
  userId: number
  onClose: () => void
}

const ResetPasswordForm = ({ userId, onClose }: ResetPasswordFormProps): React.JSX.Element => {
  const [loading, setLoading] = useState(false)

  // 表单状态
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  // 表单错误状态
  const [formErrors, setFormErrors] = useState<{
    newPassword?: string
    confirmPassword?: string
  }>({})

  // 处理输入变化
  const handleInputChange = (field: string, value: string): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))

    // 清除当前字段的错误（如果有）
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors((prev) => {
        const updated = { ...prev }
        delete updated[field as keyof typeof formErrors]
        return updated
      })
    }
  }

  // 表单验证
  const validateForm = (): boolean => {
    const errors: {
      newPassword?: string
      confirmPassword?: string
    } = {}

    // 验证新密码
    if (!formData.newPassword) {
      errors.newPassword = '请输入新密码'
    } else if (formData.newPassword.length < 6) {
      errors.newPassword = '密码至少需要6个字符'
    }

    // 验证确认密码
    if (!formData.confirmPassword) {
      errors.confirmPassword = '请确认新密码'
    } else if (formData.confirmPassword.length < 6) {
      errors.confirmPassword = '密码至少需要6个字符'
    }

    // 验证两次密码是否匹配
    if (
      formData.newPassword &&
      formData.confirmPassword &&
      formData.newPassword !== formData.confirmPassword
    ) {
      errors.confirmPassword = '两次输入的密码不匹配'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    // 表单验证
    if (!validateForm()) {
      return
    }

    if (userId <= 0) {
      toast.error('用户ID无效')
      return
    }

    setLoading(true)
    try {
      const result = await window.api.system.resetPassword(userId, formData.newPassword)

      if (result) {
        toast.success('密码重置成功')
        onClose()
      } else {
        toast.error('密码重置失败')
      }
    } catch (error) {
      console.error('重置密码错误:', error)
      toast.error('重置密码失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 新密码 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">新密码</label>
        <Input
          type="password"
          placeholder="请输入新密码"
          value={formData.newPassword}
          onChange={(e) => handleInputChange('newPassword', e.target.value)}
        />
        {formErrors.newPassword && <p className="text-sm text-red-500">{formErrors.newPassword}</p>}
      </div>

      {/* 确认密码 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">确认密码</label>
        <Input
          type="password"
          placeholder="请再次输入新密码"
          value={formData.confirmPassword}
          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
        />
        {formErrors.confirmPassword && (
          <p className="text-sm text-red-500">{formErrors.confirmPassword}</p>
        )}
      </div>

      <DialogFooter className="mt-6">
        <Button variant="outline" onClick={onClose} type="button">
          取消
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          重置密码
        </Button>
      </DialogFooter>
    </form>
  )
}

export default ResetPasswordForm
