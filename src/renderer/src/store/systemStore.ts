import { create } from 'zustand'
import { ISystemUser, ISystemRole, ISystemConfig, IOperationLog } from '../../../types/systemTypes'

interface SystemState {
  users: ISystemUser[]
  roles: ISystemRole[]
  configs: ISystemConfig[]
  logs: IOperationLog[]
  loading: boolean
  error: string | null

  fetchAllUsers: () => Promise<void>
  fetchAllRoles: () => Promise<void>
  fetchAllConfigs: () => Promise<void>
  fetchOperationLogs: (limit?: number, offset?: number) => Promise<void>

  addUser: (user: ISystemUser) => Promise<number>
  updateUser: (user: ISystemUser) => Promise<boolean>
  deleteUser: (userId: number) => Promise<boolean>
  resetPassword: (userId: number, newPassword: string) => Promise<boolean>

  updateConfig: (configKey: string, configValue: string) => Promise<boolean>
  backupDatabase: () => Promise<{ success: boolean; filePath?: string; error?: string }>
}

export const useSystemStore = create<SystemState>((set) => ({
  users: [],
  roles: [],
  configs: [],
  logs: [],
  loading: false,
  error: null,

  fetchAllUsers: async () => {
    set({ loading: true, error: null })
    try {
      const users = await window.api.system.getAllUsers()
      set({ users, loading: false })
    } catch (error) {
      console.error('Error fetching users:', error)
      set({ error: 'Failed to fetch users', loading: false })
    }
  },

  fetchAllRoles: async () => {
    set({ loading: true, error: null })
    try {
      const roles = await window.api.system.getAllRoles()
      set({ roles, loading: false })
    } catch (error) {
      console.error('Error fetching roles:', error)
      set({ error: 'Failed to fetch roles', loading: false })
    }
  },

  fetchAllConfigs: async () => {
    set({ loading: true, error: null })
    try {
      const configs = await window.api.system.getConfigs()
      set({ configs, loading: false })
    } catch (error) {
      console.error('Error fetching configs:', error)
      set({ error: 'Failed to fetch configs', loading: false })
    }
  },

  fetchOperationLogs: async (limit = 100, offset = 0) => {
    set({ loading: true, error: null })
    try {
      const logs = await window.api.system.getOperationLogs(limit, offset)
      set({ logs, loading: false })
    } catch (error) {
      console.error('Error fetching logs:', error)
      set({ error: 'Failed to fetch logs', loading: false })
    }
  },

  addUser: async (user) => {
    set({ loading: true, error: null })
    try {
      const userId = await window.api.system.addUser(user)
      if (userId > 0) {
        // Refresh user list after adding
        const users = await window.api.system.getAllUsers()
        set({ users, loading: false })
      }
      return userId
    } catch (error) {
      console.error('Error adding user:', error)
      set({ error: 'Failed to add user', loading: false })
      return 0
    }
  },

  updateUser: async (user) => {
    set({ loading: true, error: null })
    try {
      const success = await window.api.system.updateUser(user)
      if (success) {
        // Refresh user list after updating
        const users = await window.api.system.getAllUsers()
        set({ users, loading: false })
      }
      return success
    } catch (error) {
      console.error('Error updating user:', error)
      set({ error: 'Failed to update user', loading: false })
      return false
    }
  },

  deleteUser: async (userId) => {
    set({ loading: true, error: null })
    try {
      const success = await window.api.system.deleteUser(userId)
      if (success) {
        // Remove user from store after deleting
        set((state) => ({
          users: state.users.filter((user) => user.user_id !== userId),
          loading: false
        }))
      }
      return success
    } catch (error) {
      console.error('Error deleting user:', error)
      set({ error: 'Failed to delete user', loading: false })
      return false
    }
  },

  resetPassword: async (userId, newPassword) => {
    set({ loading: true, error: null })
    try {
      const success = await window.api.system.resetPassword(userId, newPassword)
      set({ loading: false })
      return success
    } catch (error) {
      console.error('Error resetting password:', error)
      set({ error: 'Failed to reset password', loading: false })
      return false
    }
  },

  updateConfig: async (configKey, configValue) => {
    set({ loading: true, error: null })
    try {
      const success = await window.api.system.updateConfig(configKey, configValue)
      if (success) {
        // Refresh config list after updating
        const configs = await window.api.system.getConfigs()
        set({ configs, loading: false })
      }
      return success
    } catch (error) {
      console.error('Error updating config:', error)
      set({ error: 'Failed to update config', loading: false })
      return false
    }
  },

  backupDatabase: async () => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.system.backupDatabase()
      set({ loading: false })
      return result
    } catch (error) {
      console.error('Error backing up database:', error)
      set({ error: 'Failed to backup database', loading: false })
      return { success: false, error: 'Failed to backup database' }
    }
  }
}))
