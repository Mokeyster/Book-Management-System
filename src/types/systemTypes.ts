// 系统用户类型定义
export interface ISystemUser {
  user_id: number
  username: string
  password_hash: string
  real_name?: string
  role_id: number
  role_name?: string
  phone?: string
  email?: string
  status: number // 1:正常, 2:锁定, 3:禁用
  last_login?: string
  permissions?: string
}

// 系统角色类型定义
export interface ISystemRole {
  role_id: number
  role_name: string
  permissions: string
}

// 系统配置类型定义
export interface ISystemConfig {
  config_id: number
  config_key: string
  config_value: string
  description?: string
}

// 操作日志类型定义
export interface IOperationLog {
  log_id: number
  user_id: number
  username?: string
  real_name?: string
  operation: string
  operation_time: string
  ip: string
  details?: string
}

// 数据备份类型定义
export interface IDataBackup {
  backup_id: number
  backup_date: string
  backup_path: string
  backup_size: string
  operator_id?: number
  remark?: string
}

// 统计报表类型定义
export interface IStatReport {
  report_id: number
  report_name: string
  report_type: string
  generate_date: string
  stats_period?: string
  operator_id?: number
  report_path: string
}
