// Import types from main process
import { ISystemUser } from '../types/systemTypes'

// Report types
export interface IReportResult {
  success: boolean
  filePath?: string
  error?: string
}

// Dialog result types
export interface IFileDialogResult {
  canceled: boolean
  filePaths: string[]
  bookmarks?: string[]
}

// Login result type
export interface ILoginResult {
  success: boolean
  user?: ISystemUser
  token?: string
  error?: string
}

// Password change result
export interface IPasswordChangeResult {
  success: boolean
  error?: string
}
