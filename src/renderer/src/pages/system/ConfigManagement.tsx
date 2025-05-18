import { useEffect, useState } from 'react'
import { Settings, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Separator } from '@ui/separator'
import { Textarea } from '@ui/textarea'
import { Switch } from '@ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'

import { ISystemConfig } from '~/types/system'

interface ConfigItemProps {
  config: ISystemConfig
  onSave: (key: string, value: string) => Promise<boolean>
}

const ConfigItem = ({ config, onSave }: ConfigItemProps): React.ReactElement => {
  const [isSaving, setIsSaving] = useState(false)
  const [configValue, setConfigValue] = useState(config.config_value)
  const [error, setError] = useState<string | null>(null)

  // 特殊处理布尔类型的配置
  const isBoolean = config.config_value === 'true' || config.config_value === 'false'

  // 判断是否应使用文本区域
  const useTextarea =
    config.config_key.includes('description') || config.config_key.includes('notice')

  const handleChange = (value: string): void => {
    setConfigValue(value)
    // 清除错误（如果有）
    if (error) {
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    // 简单验证
    if (!configValue.trim()) {
      setError('配置值不能为空')
      return
    }

    setIsSaving(true)
    try {
      const result = await onSave(config.config_key, configValue)
      if (result) {
        toast.success('配置更新成功')
      } else {
        toast.error('配置更新失败')
      }
    } catch (error) {
      console.error('保存配置失败:', error)
      toast.error('保存配置失败')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">{config.config_key}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">配置值</label>
            {isBoolean ? (
              <div className="flex items-center space-x-2">
                <Switch
                  checked={configValue === 'true'}
                  onCheckedChange={(checked) => {
                    handleChange(checked ? 'true' : 'false')
                  }}
                />
                <span>{configValue === 'true' ? '启用' : '禁用'}</span>
              </div>
            ) : useTextarea ? (
              <Textarea
                placeholder="请输入配置值"
                className="min-h-[100px]"
                value={configValue}
                onChange={(e) => handleChange(e.target.value)}
              />
            ) : (
              <Input
                placeholder="请输入配置值"
                value={configValue}
                onChange={(e) => handleChange(e.target.value)}
              />
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                保存
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

const ConfigManagement = (): React.ReactElement => {
  const [configs, setConfigs] = useState<ISystemConfig[]>([])
  const [loading, setLoading] = useState(true)

  // 分类配置
  const borrowConfigs = configs.filter((c) => c.config_key.startsWith('borrow_'))
  const systemConfigs = configs.filter((c) => c.config_key.startsWith('system_'))
  const notificationConfigs = configs.filter((c) => c.config_key.startsWith('notification_'))
  const otherConfigs = configs.filter(
    (c) =>
      !c.config_key.startsWith('borrow_') &&
      !c.config_key.startsWith('system_') &&
      !c.config_key.startsWith('notification_')
  )

  // 加载系统配置
  useEffect(() => {
    const loadConfigs = async (): Promise<void> => {
      setLoading(true)
      try {
        const data = await window.api.system.getConfigs()
        setConfigs(data)
      } catch (error) {
        console.error('加载系统配置失败:', error)
        toast.error('加载系统配置失败')
      } finally {
        setLoading(false)
      }
    }

    loadConfigs()
  }, [])

  // 保存配置
  const handleSaveConfig = async (key: string, value: string): Promise<boolean> => {
    try {
      const result = await window.api.system.updateConfig(key, value)

      if (result) {
        // 更新本地状态
        setConfigs((prevConfigs) =>
          prevConfigs.map((config) =>
            config.config_key === key ? { ...config, config_value: value } : config
          )
        )
      }

      return result
    } catch (error) {
      console.error('更新配置错误:', error)
      return false
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="ml-2 text-lg text-muted-foreground">加载系统配置中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">系统配置管理</h1>
        <div className="flex items-center">
          <Settings className="w-5 h-5 mr-2 text-muted-foreground" />
          <span className="text-muted-foreground">共 {configs.length} 个配置项</span>
        </div>
      </div>

      <Separator />

      <Tabs defaultValue="borrow" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="borrow">借阅设置</TabsTrigger>
          <TabsTrigger value="system">系统设置</TabsTrigger>
          <TabsTrigger value="notification">通知设置</TabsTrigger>
          <TabsTrigger value="other">其他设置</TabsTrigger>
        </TabsList>

        <TabsContent value="borrow" className="mt-6">
          <h2 className="mb-4 text-xl font-semibold">借阅相关设置</h2>
          {borrowConfigs.length > 0 ? (
            borrowConfigs.map((config) => (
              <ConfigItem key={config.config_id} config={config} onSave={handleSaveConfig} />
            ))
          ) : (
            <p className="text-muted-foreground">暂无借阅相关配置</p>
          )}
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <h2 className="mb-4 text-xl font-semibold">系统核心设置</h2>
          {systemConfigs.length > 0 ? (
            systemConfigs.map((config) => (
              <ConfigItem key={config.config_id} config={config} onSave={handleSaveConfig} />
            ))
          ) : (
            <p className="text-muted-foreground">暂无系统核心配置</p>
          )}
        </TabsContent>

        <TabsContent value="notification" className="mt-6">
          <h2 className="mb-4 text-xl font-semibold">通知提醒设置</h2>
          {notificationConfigs.length > 0 ? (
            notificationConfigs.map((config) => (
              <ConfigItem key={config.config_id} config={config} onSave={handleSaveConfig} />
            ))
          ) : (
            <p className="text-muted-foreground">暂无通知提醒配置</p>
          )}
        </TabsContent>

        <TabsContent value="other" className="mt-6">
          <h2 className="mb-4 text-xl font-semibold">其他设置</h2>
          {otherConfigs.length > 0 ? (
            otherConfigs.map((config) => (
              <ConfigItem key={config.config_id} config={config} onSave={handleSaveConfig} />
            ))
          ) : (
            <p className="text-muted-foreground">暂无其他配置</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ConfigManagement
