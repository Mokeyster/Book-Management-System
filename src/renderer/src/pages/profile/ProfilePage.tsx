import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { User, Edit, Save, X, Phone, Mail, UserCheck, Calendar, Shield } from 'lucide-react'

import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Input } from '@ui/input'
import { Badge } from '@ui/badge'
import { Separator } from '@ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@ui/dialog'

import { useAuthStore } from '~/store/authStore'
import { ISystemUser } from '@appTypes/systemTypes'
import { formatDate, userStatusMap } from '~/utils'
import ChangePasswordForm from './components/ChangePasswordForm'

const ProfilePage = (): React.JSX.Element => {
  const { currentUser } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // 表单数据状态
  const [formData, setFormData] = useState({
    real_name: currentUser?.real_name || '',
    phone: currentUser?.phone || '',
    email: currentUser?.email || ''
  })

  // 表单错误状态
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // 初始化表单数据
  useEffect(() => {
    if (currentUser) {
      setFormData({
        real_name: currentUser.real_name || '',
        phone: currentUser.phone || '',
        email: currentUser.email || ''
      })
    }
  }, [currentUser])

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

    // 验证邮箱（如果有值，必须是有效格式）
    if (formData.email && formData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        errors.email = '请输入有效的邮箱地址'
      }
    }

    // 验证手机号（如果有值，必须是有效格式）
    if (formData.phone && formData.phone.trim() !== '') {
      const phoneRegex = /^1[3-9]\d{9}$/
      if (!phoneRegex.test(formData.phone)) {
        errors.phone = '请输入有效的手机号码'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // 保存用户信息
  const handleSave = async (): Promise<void> => {
    if (!validateForm()) {
      return
    }

    if (!currentUser) {
      toast.error('无法获取当前用户信息')
      return
    }

    setLoading(true)
    try {
      // 创建更新数据
      const updateData: ISystemUser = {
        ...currentUser,
        real_name: formData.real_name || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined
      }

      const result = await window.api.system.updateUser(updateData)
      if (result) {
        toast.success('个人信息更新成功')
        setIsEditing(false)

        // 这里应该更新 authStore 中的用户信息
        // 但由于当前 authStore 没有 updateUser 方法，我们需要刷新页面或重新获取用户信息
        window.location.reload()
      } else {
        toast.error('个人信息更新失败')
      }
    } catch (error) {
      console.error('更新用户信息错误:', error)
      toast.error('更新个人信息失败')
    } finally {
      setLoading(false)
    }
  }

  // 取消编辑
  const handleCancel = (): void => {
    setIsEditing(false)
    setFormErrors({})
    // 重置表单数据
    if (currentUser) {
      setFormData({
        real_name: currentUser.real_name || '',
        phone: currentUser.phone || '',
        email: currentUser.email || ''
      })
    }
  }

  // 获取角色徽章颜色
  const getRoleBadgeVariant = (roleId?: number): 'default' | 'secondary' | 'destructive' => {
    switch (roleId) {
      case 1:
        return 'destructive' // 超级管理员
      case 2:
        return 'default' // 普通管理员
      default:
        return 'secondary'
    }
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-lg text-muted-foreground">无法获取用户信息</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部区域 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">个人资料</h1>
          <Badge variant={getRoleBadgeVariant(currentUser.role_id)} className="ml-2">
            {currentUser.role_name || '未知角色'}
          </Badge>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 mr-2" />
            编辑资料
          </Button>
        )}
      </div>

      <Tabs defaultValue="basic-info" className="w-full">
        <TabsList>
          <TabsTrigger value="basic-info">基本信息</TabsTrigger>
          <TabsTrigger value="account-info">账户信息</TabsTrigger>
          <TabsTrigger value="security">安全设置</TabsTrigger>
        </TabsList>

        {/* 基本信息标签页 */}
        <TabsContent value="basic-info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                基本信息
              </CardTitle>
              <CardDescription>
                {isEditing ? '编辑您的个人基本信息' : '查看您的个人基本信息'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* 真实姓名 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">真实姓名</label>
                      <Input
                        placeholder="请输入您的真实姓名"
                        value={formData.real_name}
                        onChange={(e) => handleInputChange('real_name', e.target.value)}
                      />
                    </div>

                    {/* 手机号码 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">手机号码</label>
                      <Input
                        placeholder="请输入手机号码"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                      />
                      {formErrors.phone && (
                        <p className="text-sm text-destructive">{formErrors.phone}</p>
                      )}
                    </div>

                    {/* 邮箱地址 */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">邮箱地址</label>
                      <Input
                        type="email"
                        placeholder="请输入邮箱地址"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                      {formErrors.email && (
                        <p className="text-sm text-destructive">{formErrors.email}</p>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="w-4 h-4 mr-2" />
                      取消
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? '保存中...' : '保存'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* 真实姓名 */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">真实姓名</p>
                    <p className="text-base font-semibold">{currentUser.real_name || '未填写'}</p>
                  </div>

                  {/* 手机号码 */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">手机号码</p>
                    <p className="flex items-center">
                      <Phone className="w-4 h-4 mr-1 text-muted-foreground" />
                      {currentUser.phone || '未填写'}
                    </p>
                  </div>

                  {/* 邮箱地址 */}
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">邮箱地址</p>
                    <p className="flex items-center">
                      <Mail className="w-4 h-4 mr-1 text-muted-foreground" />
                      {currentUser.email || '未填写'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 账户信息标签页 */}
        <TabsContent value="account-info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="w-5 h-5 mr-2" />
                账户信息
              </CardTitle>
              <CardDescription>查看您的账户相关信息</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* 用户ID */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">用户ID</p>
                  <p className="text-base font-semibold">{currentUser.user_id}</p>
                </div>

                {/* 用户名 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">用户名</p>
                  <p className="text-base font-semibold">{currentUser.username}</p>
                </div>

                {/* 角色 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">角色</p>
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 mr-1 text-muted-foreground" />
                    <Badge variant={getRoleBadgeVariant(currentUser.role_id)}>
                      {currentUser.role_name || '未知角色'}
                    </Badge>
                  </div>
                </div>

                {/* 账户状态 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">账户状态</p>
                  <Badge
                    variant={
                      currentUser.status === 1
                        ? 'outline'
                        : currentUser.status === 2
                          ? 'default'
                          : 'destructive'
                    }
                  >
                    {userStatusMap[currentUser.status]?.text || `状态${currentUser.status}`}
                  </Badge>
                </div>

                {/* 最后登录时间 */}
                <div className="space-y-1 md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">最后登录时间</p>
                  <p className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1 text-muted-foreground" />
                    {currentUser.last_login
                      ? formatDate(currentUser.last_login, 'yyyy-MM-dd HH:mm')
                      : '无记录'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 安全设置标签页 */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                安全设置
              </CardTitle>
              <CardDescription>管理您的账户安全设置</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-md">
                  <div>
                    <h4 className="font-medium">修改密码</h4>
                    <p className="text-sm text-muted-foreground">定期更换密码以确保账户安全</p>
                  </div>
                  <Button variant="outline" onClick={() => setIsChangePasswordDialogOpen(true)}>
                    修改密码
                  </Button>
                </div>

                <Separator />

                <div className="p-4 border rounded-md bg-muted/50">
                  <h4 className="mb-2 font-medium">安全建议</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• 使用包含字母、数字和特殊字符的强密码</li>
                    <li>• 定期更换密码，建议每3-6个月更换一次</li>
                    <li>• 不要在多个账户中使用相同的密码</li>
                    <li>• 保护好您的登录凭据，不要与他人分享</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 修改密码对话框 */}
      <Dialog open={isChangePasswordDialogOpen} onOpenChange={setIsChangePasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>请输入当前密码和新密码以修改您的登录密码</DialogDescription>
          </DialogHeader>
          <ChangePasswordForm
            userId={currentUser.user_id}
            onClose={() => setIsChangePasswordDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProfilePage
