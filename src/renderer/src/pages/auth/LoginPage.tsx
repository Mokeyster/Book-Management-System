import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Book, Lock, User } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@ui/card'
import { Input } from '@ui/input'
import { useAuthStore } from '~/store/authStore'

const LoginPage = (): React.JSX.Element => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)

  // 表单状态
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })

  // 表单错误状态
  const [formErrors, setFormErrors] = useState({
    username: '',
    password: ''
  })

  // 获取登录后重定向的路径
  const from = location.state?.from?.pathname || '/dashboard'

  // 处理输入改变
  const handleInputChange = (field: string, value: string): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))

    // 清除当前字段的错误（如果有）
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  // 表单验证
  const validateForm = (): boolean => {
    const errors = {
      username: '',
      password: ''
    }

    if (!formData.username) {
      errors.username = '请输入用户名'
    }

    if (!formData.password) {
      errors.password = '请输入密码'
    }

    setFormErrors(errors)
    return !errors.username && !errors.password
  }

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const result = await login(formData.username, formData.password)
      if (result.success) {
        toast.success('登录成功')
        navigate(from, { replace: true })
      } else {
        toast.error(result.error || '登录失败')
      }
    } catch (error) {
      console.error('登录错误:', error)
      toast.error('登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center w-screen min-h-screen bg-background">
      <Card className="w-[400px] shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <Book className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">图书管理系统</CardTitle>
          <CardDescription>请输入您的账号和密码登录系统</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">用户名</label>
              <div className="relative">
                <User className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="请输入用户名"
                  className="pl-9"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                />
              </div>
              {formErrors.username && <p className="text-sm text-red-500">{formErrors.username}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">密码</label>
              <div className="relative">
                <Lock className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="请输入密码"
                  className="pl-9"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                />
              </div>
              {formErrors.password && <p className="text-sm text-red-500">{formErrors.password}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '登录中...' : '登 录'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} 图书管理系统
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default LoginPage
