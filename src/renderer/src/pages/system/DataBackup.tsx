import { useEffect, useState } from 'react'
import { Database, Save, Download, Trash2, FileArchive, Info, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '~/utils/format'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Separator } from '@ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@ui/dialog'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from '@ui/pagination'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/tooltip'

import { IDataBackup } from '~/types/system'

const PAGE_SIZE = 10

const DataBackup = (): React.ReactElement => {
  const [backups, setBackups] = useState<IDataBackup[]>([])
  const [loading, setLoading] = useState(true)
  const [isBackuping, setIsBackuping] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedBackup, setSelectedBackup] = useState<IDataBackup | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 加载备份记录
  useEffect(() => {
    fetchBackups()
  }, [])

  // 获取当前页的备份数据
  const getCurrentPageBackups = (): IDataBackup[] => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return backups.slice(startIndex, startIndex + PAGE_SIZE)
  }

  // 获取总页数
  const totalPages = Math.max(1, Math.ceil(backups.length / PAGE_SIZE))

  // 获取备份记录列表
  const fetchBackups = async (): Promise<void> => {
    setLoading(true)
    try {
      // 这里需要后端提供获取备份记录的 API
      // 先使用模拟数据
      const mockBackups: IDataBackup[] = [
        {
          backup_id: 1,
          backup_date: '2025-05-15 14:32:45',
          backup_path: 'C:\\data\\backups\\library_backup_2025-05-15.db',
          backup_size: '2.34 MB',
          operator_id: 1,
          remark: '手动备份'
        },
        {
          backup_id: 2,
          backup_date: '2025-05-12 08:00:00',
          backup_path: 'C:\\data\\backups\\library_backup_2025-05-12.db',
          backup_size: '2.31 MB',
          operator_id: 0,
          remark: '自动备份'
        }
      ]
      setBackups(mockBackups)
    } catch (error) {
      console.error('获取备份记录失败:', error)
      toast.error('获取备份记录失败')
    } finally {
      setLoading(false)
    }
  }

  // 创建新备份
  const handleCreateBackup = async (): Promise<void> => {
    setIsBackuping(true)
    try {
      const result = await window.api.system.backupDatabase()

      if (result.success) {
        toast.success('数据库备份成功!')
        // 刷新备份列表
        await fetchBackups()
      } else {
        toast.error(`备份失败: ${result.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('备份数据库错误:', error)
      toast.error('备份数据库时出错')
    } finally {
      setIsBackuping(false)
    }
  }

  // 恢复备份（这个功能需要谨慎实现）
  const handleRestoreBackup = (_backup: IDataBackup): void => {
    // 这里应该显示确认对话框，并执行恢复操作
    toast.info('还原备份功能需要谨慎实现，暂不提供')
  }

  // 删除备份
  const handleDeleteBackup = async (): Promise<void> => {
    if (!selectedBackup) return

    setIsDeleting(true)
    try {
      // 这里需要后端提供删除备份的 API
      // 现在我们模拟成功
      const result = true

      if (result) {
        toast.success('备份删除成功')
        setBackups((prev) => prev.filter((b) => b.backup_id !== selectedBackup.backup_id))
        setIsDeleteDialogOpen(false)
      } else {
        toast.error('备份删除失败')
      }
    } catch (error) {
      console.error('删除备份错误:', error)
      toast.error('删除备份时出错')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">数据库备份与恢复</h1>
        <Button onClick={handleCreateBackup} disabled={isBackuping}>
          {isBackuping ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              备份中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              创建新备份
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            数据备份说明
          </CardTitle>
          <CardDescription>定期备份数据库是防止数据丢失的重要措施</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm">
              系统会按照配置的频率自动执行备份任务，建议至少保留最近30天的备份。重要变更前，
              也应手动创建额外备份。若需要恢复备份，请联系系统管理员。
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="p-4 rounded-md bg-muted">
                <p className="text-sm font-medium text-muted-foreground">总备份数</p>
                <p className="text-lg font-bold">{backups.length}</p>
              </div>
              <div className="p-4 rounded-md bg-muted">
                <p className="text-sm font-medium text-muted-foreground">最后备份时间</p>
                <p className="text-lg font-bold">
                  {backups.length > 0 ? formatDate(backups[0].backup_date) : '无备份记录'}
                </p>
              </div>
              <div className="p-4 rounded-md bg-muted">
                <p className="text-sm font-medium text-muted-foreground">下次自动备份</p>
                <p className="text-lg font-bold">2025-05-19 08:00</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div>
        <h2 className="mb-4 text-xl font-semibold">备份历史记录</h2>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="ml-2 text-lg text-muted-foreground">加载备份历史中...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-2">
            <FileArchive className="w-10 h-10 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">暂无备份记录</p>
          </div>
        ) : (
          <>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>备份ID</TableHead>
                    <TableHead>备份时间</TableHead>
                    <TableHead>文件大小</TableHead>
                    <TableHead>备份方式</TableHead>
                    <TableHead>备份路径</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getCurrentPageBackups().map((backup) => (
                    <TableRow key={backup.backup_id}>
                      <TableCell>{backup.backup_id}</TableCell>
                      <TableCell>{formatDate(backup.backup_date)}</TableCell>
                      <TableCell>{backup.backup_size}</TableCell>
                      <TableCell>
                        <Badge variant={backup.operator_id ? 'default' : 'outline'}>
                          {backup.operator_id ? '手动备份' : '自动备份'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="max-w-[200px] truncate">{backup.backup_path}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedBackup(backup)
                                    setIsDetailsDialogOpen(true)
                                  }}
                                >
                                  <Info className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>查看详情</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRestoreBackup(backup)}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>还原备份</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedBackup(backup)
                                    setIsDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>删除备份</p>
                              </TooltipContent>
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
            <Pagination className="mt-4">
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
      </div>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除备份</DialogTitle>
            <DialogDescription>
              您确定要删除这个数据库备份吗？此操作无法撤销，删除后将无法恢复该备份文件。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteBackup} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  删除中...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除备份
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 备份详情对话框 */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>备份详情</DialogTitle>
            <DialogDescription>数据库备份文件的详细信息</DialogDescription>
          </DialogHeader>

          {selectedBackup && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">备份ID</p>
                  <p>{selectedBackup.backup_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">大小</p>
                  <p>{selectedBackup.backup_size}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">备份类型</p>
                  <p>{selectedBackup.operator_id ? '手动备份' : '自动备份'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">备份时间</p>
                <p>{formatDate(selectedBackup.backup_date)}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">文件路径</p>
                <p className="font-mono text-xs break-all">{selectedBackup.backup_path}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">备注</p>
                <p>{selectedBackup.remark || '无'}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DataBackup
