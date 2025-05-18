import { useEffect, useState } from 'react'
import { formatDate, userStatusMap } from '~/utils'
import { Edit, Plus, Trash2, Users, Key } from 'lucide-react'
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

import { useAuthStore } from '~/store/authStore'

import { ISystemUser } from '@appTypes/systemTypes'
import UserForm from './components/UserForm'
import ResetPasswordForm from './components/ResetPasswordForm'

const PAGE_SIZE = 10

const UserManagement = (): React.ReactElement => {
  const [users, setUsers] = useState<ISystemUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<ISystemUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<ISystemUser | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const currentUser = useAuthStore((state) => state.currentUser)

  // 加载用户数据
  useEffect(() => {
    fetchUsers()
  }, [])

  // 根据搜索条件过滤用户
  useEffect(() => {
    let result = [...users]

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (user) =>
          user.username.toLowerCase().includes(query) ||
          user.real_name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.phone?.toLowerCase().includes(query) ||
          user.role_name?.toLowerCase().includes(query)
      )
    }

    setFilteredUsers(result)
    setCurrentPage(1) // 重置到第一页
  }, [searchQuery, users])

  // 获取当前页的用户
  const getCurrentPageUsers = (): ISystemUser[] => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredUsers.slice(startIndex, startIndex + PAGE_SIZE)
  }

  // 获取总页数
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))

  // 加载所有用户
  const fetchUsers = async (): Promise<void> => {
    setLoading(true)
    try {
      const data = await window.api.system.getAllUsers()
      setUsers(data)
      setFilteredUsers(data)
    } catch (error) {
      console.error('获取用户失败:', error)
      toast.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 删除用户
  const handleDelete = async (): Promise<void> => {
    if (!selectedUser) return

    // 不能删除自己
    if (currentUser && selectedUser.user_id === currentUser.user_id) {
      toast.error('不能删除当前登录的用户')
      setIsDeleteDialogOpen(false)
      return
    }

    setIsDeleting(true)
    try {
      const result = await window.api.system.deleteUser(selectedUser.user_id)
      if (result) {
        toast.success('用户删除成功')
        // 更新用户列表
        setUsers((prev) => prev.filter((user) => user.user_id !== selectedUser.user_id))
        setIsDeleteDialogOpen(false)
      } else {
        toast.error('用户删除失败')
      }
    } catch (error) {
      console.error('删除用户错误:', error)
      toast.error('删除用户时出错')
    } finally {
      setIsDeleting(false)
    }
  }

  // 用户表单提交处理（添加或更新）
  const handleUserSubmit = (updatedUser: ISystemUser, isNew: boolean): void => {
    if (isNew) {
      setUsers((prev) => [...prev, updatedUser])
    } else {
      setUsers((prev) =>
        prev.map((user) => (user.user_id === updatedUser.user_id ? updatedUser : user))
      )
    }
    setIsAddDialogOpen(false)
    setIsEditDialogOpen(false)
  }

  // 判断用户是否有编辑权限
  const canEdit = (user: ISystemUser): boolean => {
    // 如果当前用户是管理员或超级管理员，可以编辑所有用户
    if (currentUser && currentUser.role_id === 1) {
      return true
    }
    // 普通管理员只能编辑非超级管理员用户
    return user.role_id !== 1
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <Button
          onClick={() => {
            setSelectedUser(null)
            setIsAddDialogOpen(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          添加用户
        </Button>
      </div>

      <div className="flex items-center max-w-md space-x-2">
        <Input
          placeholder="搜索用户 (用户名, 姓名, 邮箱)"
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
          <p className="text-lg text-muted-foreground">加载用户数据中...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-2">
          <Users className="w-10 h-10 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">
            {searchQuery ? '没有找到匹配的用户' : '暂无用户数据'}
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
                  <TableHead className="min-w-[120px]">用户名</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>电话</TableHead>
                  <TableHead>最后登录</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getCurrentPageUsers().map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>{user.user_id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{user.username}</div>
                    </TableCell>
                    <TableCell>{user.real_name || '-'}</TableCell>
                    <TableCell>{user.role_name || '-'}</TableCell>
                    <TableCell>{user.email || '-'}</TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                    <TableCell>{user.last_login ? formatDate(user.last_login) : '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.status === 1
                            ? 'outline'
                            : user.status === 2
                              ? 'default'
                              : 'destructive'
                        }
                      >
                        {userStatusMap[user.status]?.text || `状态${user.status}`}
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
                                onClick={() => {
                                  setSelectedUser(user)
                                  setIsResetPasswordDialogOpen(true)
                                }}
                                disabled={!canEdit(user)}
                              >
                                <Key className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>重置密码</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setIsEditDialogOpen(true)
                                }}
                                disabled={!canEdit(user)}
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
                                  setSelectedUser(user)
                                  setIsDeleteDialogOpen(true)
                                }}
                                disabled={!canEdit(user) || currentUser?.user_id === user.user_id}
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

      {/* 添加用户弹窗 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加用户</DialogTitle>
            <DialogDescription>添加新用户到系统</DialogDescription>
          </DialogHeader>
          <UserForm
            user={null}
            onClose={() => setIsAddDialogOpen(false)}
            onSubmit={handleUserSubmit}
            isNew={true}
          />
        </DialogContent>
      </Dialog>

      {/* 编辑用户弹窗 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription>修改用户信息</DialogDescription>
          </DialogHeader>
          <UserForm
            user={selectedUser}
            onClose={() => setIsEditDialogOpen(false)}
            onSubmit={handleUserSubmit}
            isNew={false}
          />
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              {`您确定要删除用户 "${selectedUser?.username}" 吗？此操作无法撤销。`}
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

      {/* 重置密码弹窗 */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
            <DialogDescription>{`重置用户 "${selectedUser?.username}" 的密码`}</DialogDescription>
          </DialogHeader>
          <ResetPasswordForm
            userId={selectedUser?.user_id || 0}
            onClose={() => setIsResetPasswordDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UserManagement
