import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ILoginResult, IPasswordChangeResult } from '../../../preload/types'
import { ISystemUser } from '../../../types/systemTypes'

interface AuthState {
  isAuthenticated: boolean
  currentUser: ISystemUser | null
  token: string | null
  login: (username: string, password: string) => Promise<ILoginResult>
  logout: () => void
  changePassword: (
    userId: number,
    oldPassword: string,
    newPassword: string
  ) => Promise<IPasswordChangeResult>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      currentUser: null,
      token: null,
      login: async (username: string, password: string) => {
        try {
          const result = await window.api.system.login(username, password)
          if (result.success && result.user) {
            set({
              isAuthenticated: true,
              currentUser: result.user,
              token: result.token || null
            })
          }
          return result
        } catch (error) {
          console.error('Login error:', error)
          return { success: false, error: 'Login failed. Please try again.' }
        }
      },
      logout: () => {
        set({
          isAuthenticated: false,
          currentUser: null,
          token: null
        })
      },
      changePassword: async (userId: number, oldPassword: string, newPassword: string) => {
        try {
          return await window.api.system.changePassword(userId, oldPassword, newPassword)
        } catch (error) {
          console.error('Change password error:', error)
          return { success: false, error: 'Password change failed. Please try again.' }
        }
      }
    }),
    {
      name: 'book-management-auth'
    }
  )
)
