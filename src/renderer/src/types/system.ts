// Re-export types from the main process for use in the renderer
export interface ISystemConfig {
  config_id: number
  config_key: string
  config_value: string
  description?: string
}

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

export interface IDataBackup {
  backup_id: number
  backup_date: string
  backup_path: string
  backup_size: string
  operator_id?: number
  remark?: string
}

export interface IStatReport {
  report_id: number
  report_name: string
  report_type: string
  generate_date: string
  stats_period?: string
  operator_id?: number
  report_path: string
}

export interface IReportResult {
  success: boolean
  filePath?: string
  error?: string
}
